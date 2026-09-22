// Stage 1 of the pipeline: natural-language request -> n8n workflow JSON.
// The LLM never invents node types: it picks from a catalog slice extracted
// from THIS n8n install, and validate.mjs proves the result before deploy.
import { chat, extractJson, detectProvider } from './llm.mjs';
import { selectNodes, promptLines } from './nodes.mjs';
import { validate } from './validate.mjs';

const SYSTEM = `You are the workflow compiler inside Nexus-Flow, an n8n automation console.

You convert a customer's request (often Hebrew) into an n8n workflow definition.

STRICT RULES
1. Output ONE JSON object only. No prose, no markdown fences, no comments.
2. Shape:
   {"name":string,"summary":string (Hebrew, 1-2 sentences),
    "assumptions":string[] (Hebrew, what you assumed),
    "testPayload":object (sample POST body for the webhook),
    "workflow":{"name":string,"nodes":[...],"connections":{...},"settings":{"executionOrder":"v1"}}}
3. node.type MUST be copied verbatim from the CATALOG below. Never invent a type.
4. node.typeVersion MUST be copied verbatim from the CATALOG entry you used.
5. node.parameters MUST only use parameter names listed for that type in the CATALOG.
6. Exactly ONE trigger node (webhook OR scheduleTrigger), placed first.
   - webhook: parameters {"httpMethod":"POST","path":"<kebab-case>","responseMode":"onReceived","options":{}}
   - scheduleTrigger: parameters {"rule":{"interval":[{"field":"minutes","minutesInterval":N}]}}
7. Give every node a unique "name", an "id" (short uuid-like string) and
   "position":[x,y] with x increasing by 240 per column.
8. connections use node NAMES as keys:
   {"<Source Name>":{"main":[[{"node":"<Target Name>","type":"main","index":0}]]}}
   For if-nodes use keys "true" and "false" instead of "main".
9. Set-node parameter shape (typeVersion 3.4):
   {"assignments":{"assignments":[{"id":"a1","name":"field","value":"={{ $json.x }}","type":"string"}]},"options":{}}
   "type" is one of: string, number, boolean, array, object.
10. Expressions are n8n style: "={{ ... }}" using $json, $now, $workflow.name,
    $("Node Name").item.json, $input.all().
11. Outbound channels: email/sheets/slack use their own n8n nodes; WhatsApp MUST use
    an httpRequest node POSTing to "http://nexus:3000/api/channels/whatsapp/send"
    with jsonBody "={{ JSON.stringify({ chatId: ..., message: ... }) }}" - never
    call Green API directly and never emit any token.
    Whatever the channel, also include a final httpRequest node POSTing to
    "http://nexus:3000/api/events" with jsonBody "={{ JSON.stringify($json) }}",
    so Nexus-Flow records it.
12. If you need a credential-bearing node (see "creds" in the catalog), still include it -
    the system will attach credentials later. Do NOT invent credential objects.
13. Prefer the smallest node count that satisfies the request. Max 12 nodes.
14. All node names, summaries and assumptions are written in Hebrew except node names,
    which must be English PascalCase.`;

export function buildPrompt(request, context = {}) {
  const nodes = selectNodes(request, { limit: 60 });
  const catalog = promptLines(nodes).join('\n');

  const credTypes = [...new Set(nodes.flatMap((n) => n.credentials))]
    .map((c) => `${c}`).join(', ');

  return `# CATALOG (verified against this n8n ${context.n8nVersion || ''} install)
${catalog}

credential types available in this instance: ${credTypes || '(none needed)'}

# INSTANCE FACTS
- n8n reachable at http://n8n:5678 (inside docker network)
- Nexus-Flow event sink: POST http://nexus:3000/api/events
- Dashboard origin to expose to callers: ${context.origin || 'http://localhost:5678'}
- Today: ${new Date().toISOString()}
- WhatsApp goes through the Nexus proxy, NEVER direct to Green API:
  POST http://nexus:3000/api/channels/whatsapp/send
  body {"chatId":"<digits>@c.us" | "phone":"<digits>", "message":"<text>"}
  (chatId/phone: @c.us = person, @g.us = group). Provider tokens stay in Nexus.
- For any outbound channel, end the flow with an httpRequest POST to
  http://nexus:3000/api/events so Nexus-Flow records it.
${context.extraNotes ? `- ${context.extraNotes}` : ''}

# CUSTOMER REQUEST
${request}

Return the JSON object now.`;
}

/**
 * @returns {Promise<object>} plan with .workflow plus a pre-validated .report
 */
export async function plan(request, context = {}) {
  const provider = detectProvider();
  let prompt = buildPrompt(request, context);
  const attempts = [];
  let parsed = null;

  // Two attempts rather than three: each call costs well over a minute against
  // this endpoint, and a retry that resends an identical prompt just reproduces
  // the same failure.
  for (let i = 0; i < 2; i++) {
    const t0 = Date.now();
    const { text, model } = await chat(SYSTEM, prompt, { model: context.model });
    const raw = { text, model, ms: Date.now() - t0, chars: text.length };

    try {
      parsed = extractJson(text);
      attempts.push({ ...raw, parsed: true });
      break;
    } catch (e) {
      attempts.push({ ...raw, parsed: false, error: e.message });
      // Give the model its own failure back so it can actually correct itself.
      prompt = `${prompt}\n\nYour previous reply could not be used (${e.message}). `
        + 'Reply with exactly ONE JSON object, starting with { and ending with }, '
        + 'and with no prose or markdown fences around it. Previous reply:\n'
        + text.slice(0, 1500);
    }
  }

  if (!parsed) {
    const err = new Error('LLM did not return valid JSON after 3 attempts');
    err.attempts = attempts;
    err.provider = provider?.id;
    throw err;
  }

  const wf = parsed.workflow || parsed;
  if (!wf.nodes) throw new Error('LLM response has no workflow.nodes');

  if (!wf.name) wf.name = parsed.name || 'Generated Workflow';
  wf.settings = { executionOrder: 'v1', ...(wf.settings || {}) };

  const report = validate(wf);

  return {
    provider: provider?.id,
    request,
    name: wf.name,
    summary: parsed.summary || '',
    assumptions: parsed.assumptions || [],
    testPayload: parsed.testPayload || { hello: 'world' },
    workflow: wf,
    report,
    attempts: attempts.map(({ text, ...rest }) => ({ ...rest, preview: text.slice(0, 400) })),
    catalogSize: selectNodes(request).length,
  };
}
