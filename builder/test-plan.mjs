// End-to-end planner test: real Hebrew requests through the real LLM,
// then validation + dry-run. No n8n writes, so it is safe to run repeatedly.
import { plan } from './planner.mjs';
import { simulate } from './simulate.mjs';
import { availableModels, chat, LlmNotConfiguredError } from './llm.mjs';

const REQUESTS = process.argv.slice(2).length
  ? process.argv.slice(2)
  : [
    'כשהטופס באתר נשלח, שלח לי אימייל עם פרטי הלקוח',
    'כל בוקר ב-9 שלח לי בWhatsApp סיכום מכירות מהגיליון',
  ];

console.log('provider:', JSON.stringify(availableModels()));
console.log('');

const models = [
  process.env.NEXUS_LLM_MODEL,
  'deepseek-ai/deepseek-v4.1-flash',
  'openai/gpt-oss-20b',
  'nvidia/nemotron-3.5-lightning-30b-a3b',
  'meta/llama-3.2-11b-vision-instruct',
].filter(Boolean);

let grandPass = 0;
let grandTotal = 0;

for (const request of REQUESTS) {
  console.log(`${'='.repeat(76)}\nREQUEST: ${request}\n${'='.repeat(76)}`);

  let planResult = null;
  let usedModel = null;

  for (const model of [...new Set(models)]) {
    const t0 = Date.now();
    try {
      const r = await plan(request, { model });
      if (!r.report.ok && r.report.errors.length) {
        console.log(`  ${model}: produced ${r.report.errors.length} validation error(s) - trying next`);
        console.log(`     first: ${r.report.errors[0]}`);
        continue;
      }
      planResult = r;
      usedModel = model;
      console.log(`  LLM     : ${model}  (${Date.now() - t0}ms, ${r.attempts[0]?.chars} chars, catalog ${r.catalogSize} nodes)`);
      break;
    } catch (e) {
      if (e instanceof LlmNotConfiguredError) { console.log(e.message); process.exit(1); }
      console.log(`  ${model}: FAILED - ${e.message.replace(/\s+/g, ' ').slice(0, 140)}`);
    }
  }

  if (!planResult) {
    console.log('  RESULT  : no model produced a valid workflow\n');
    grandTotal++;
    continue;
  }

  const { workflow: wf, report, summary, assumptions, testPayload } = planResult;

  console.log(`  SUMMARY : ${summary}`);
  console.log(`  ASSUME  : ${assumptions.length ? assumptions.join(' | ') : '(none)'}`);
  console.log(`  VALIDATE: ${report.ok ? 'PASS' : 'FAIL'}  nodes=${report.stats.nodes} edges=${report.stats.edges} `
    + `triggers=${report.stats.triggers.map((t) => t.type.replace('n8n-nodes-base.', '')).join(',')}`
    + ` reachable=${report.stats.reachable}/${report.stats.nodes}`);
  console.log(`            needsCredentials=${report.needsCredentials.join(',') || 'none'}`
    + `  canActivate=${report.stats.canActivate}`);
  for (const w of report.warnings.slice(0, 6)) console.log(`            warn: ${w}`);
  for (const e of report.errors.slice(0, 6)) console.log(`            ERR : ${e}`);

  const sim = simulate(wf, { triggerInput: { body: testPayload, headers: {}, query: {} } });
  console.log(`  DRY-RUN : ${sim.ok ? 'PASS' : 'FAIL'}  steps=${sim.executedSteps} stubbed=${sim.stubbed.length}`
    + ` creds=${sim.credentialsRequired.join(',') || 'none'}`);
  for (const s of sim.stubbed) console.log(`            stub "${s.node}" -> ${s.target} :: ${s.wouldDo}`);
  for (const e of sim.errors.slice(0, 5)) console.log(`            ERR : ${e}`);

  const stepNames = sim.trace.map((t) => `${t.step}:${t.node}${t.stub ? '(stub)' : ''}`).join(' -> ');
  console.log(`  FLOW    : ${stepNames}`);
  console.log(`  TEST    : ${JSON.stringify(testPayload)}`);

  const pass = report.ok && sim.ok;
  grandTotal += (report.ok ? 1 : 0) + (sim.ok ? 1 : 0);
  grandPass += (report.ok ? 1 : 0) + (sim.ok ? 1 : 0);
  console.log(`  RESULT  : ${pass ? 'PASS' : 'FAIL'}   [model=${usedModel}]\n`);
}

console.log(`${'='.repeat(76)}`);
console.log(`checks passed: ${grandPass}/${grandTotal * 1 || grandTotal}`);
