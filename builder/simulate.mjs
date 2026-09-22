// Dry-run simulator. Walks the workflow graph in-process and executes the
// logic-bearing nodes. Anything that needs a credential or the outside world
// is STUBBED: we record exactly what would happen instead of doing it.
import vm from 'node:vm';

const TRIGGERS = new Set([
  'n8n-nodes-base.webhook', 'n8n-nodes-base.scheduleTrigger', 'n8n-nodes-base.manualTrigger',
  'n8n-nodes-base.errorTrigger', 'n8n-nodes-base.formTrigger',
]);

/** node type -> side-effect category */
function classify(type, params = {}) {
  if (TRIGGERS.has(type)) return 'trigger';

  // Decide by URL first: any http call is either an external side effect, the
  // Nexus event sink, or the WhatsApp channel proxy - regardless of node type.
  const url = String(params.url || '');
  if (type === 'n8n-nodes-base.httpRequest' || (url && /https?:\/\//i.test(url))) {
    if (/whatsapp\/send/i.test(url)) return 'channel';
    if (/nexus:3000|localhost:3000|\bnexus\b/i.test(url)) return 'internal';
    return 'external';
  }

  switch (type) {
    case 'n8n-nodes-base.set':
    case 'n8n-nodes-base.code':
    case 'n8n-nodes-base.if':
    case 'n8n-nodes-base.filter':
    case 'n8n-nodes-base.merge':
    case 'n8n-nodes-base.noOp':
    case 'n8n-nodes-base.splitOut':
    case 'n8n-nodes-base.splitInBatches':
    case 'n8n-nodes-base.limit':
    case 'n8n-nodes-base.removeDuplicates':
    case 'n8n-nodes-base.sort':
    case 'n8n-nodes-base.aggregate':
      return 'logic';
    case 'n8n-nodes-base.respondToWebhook':
      return 'respond';
    case 'n8n-nodes-base.httpRequest': {
      const url = String(params.url || '');
      if (/nexus:3000|localhost:3000/i.test(url)) {
        return /whatsapp\/send/i.test(url) ? 'channel' : 'internal';
      }
      return 'external';
    }
    case 'n8n-nodes-base.wait':
      return 'wait';
    default:
      return 'sideeffect';
  }
}

const CHANNEL_DESC = {
  'n8n-nodes-base.emailSend': 'email',
  'n8n-nodes-base.gmail': 'email',
  'n8n-nodes-base.googleSheets': 'spreadsheet row',
  'n8n-nodes-base.whatsApp': 'WhatsApp message',
  'n8n-nodes-base.telegram': 'Telegram message',
  'n8n-nodes-base.slack': 'Slack message',
  'n8n-nodes-base.httpRequest': 'HTTP request',
};

// ---------------------------------------------------------------------------
// Expression evaluation. n8n expressions are JS inside {{ }}. We bind the
// handful of globals n8n exposes so typical generated expressions just work.
// ---------------------------------------------------------------------------
function makeDollar(nodesByName, currentItem) {
  const $ = (name) => {
    const n = nodesByName.get(name);
    const item = n && n.__lastOutput ? n.__lastOutput : { json: {} };
    return { item, first: { json: item.json }, all: () => [item] };
  };
  $.first = (name) => $(name).first;
  $.all = (name) => $(name).all();
  return $;
}

function evaluate(raw, ctx) {
  if (raw === null || raw === undefined) return raw;
  if (typeof raw !== 'string') return raw;
  const m = raw.match(/^\s*=\s*\{\{([\s\S]*?)\}\}\s*$/);
  if (!m) return raw;
  const expr = m[1];
  try {
    const fn = new Function(
      '$json', '$now', '$workflow', '$execution', '$input', '$', '$item', '$nodeName', '$environment',
      `"use strict"; return (${expr});`,
    );
    return fn(
      ctx.json, ctx.$now, ctx.$workflow, ctx.$execution, ctx.$input,
      ctx.$, ctx.$item, ctx.nodeName, ctx.$environment,
    );
  } catch (e) {
    return { __exprError: String(e.message), __expr: expr };
  }
}

function runCode(code, items, mode) {
  const sandbox = {
    $input: {
      all: () => items,
      first: () => items[0],
      last: () => items[items.length - 1],
      item: items[0],
      params: {},
    },
    $json: items[0] ? items[0].json : {},
    console: { log: (...a) => sandbox.__logs.push(a.join(' ')) },
    __logs: [],
    Date, JSON, Math, String, Number, Boolean, Array, Object, RegExp, parseInt, parseFloat,
    isNaN, encodeURIComponent, splitByKeys: undefined,
  };
  sandbox.exports = {};
  try {
    const ctx = vm.createContext(sandbox, { timeout: 2000 });
    const body = mode === 'each'
      ? `(function(){ return (${code})($json); })()`
      : `(function(){ return (${code})(); })()`;
    const out = vm.runInContext(body, ctx, { timeout: 2000 });
    return { ok: true, out: normaliseCodeOutput(out, items) };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

function normaliseCodeOutput(out, items) {
  if (Array.isArray(out)) {
    if (out.length && typeof out[0] === 'object' && out[0] !== null && !('json' in out[0])) {
      return out.map((json) => ({ json }));
    }
    return out.map((json) => (json && typeof json === 'object' && 'json' in json ? json : { json }));
  }
  if (out && typeof out === 'object' && 'json' in out) return [out];
  if (out && typeof out === 'object') return [{ json: out }];
  if (out === undefined) return items;
  return [{ json: { value: out } }];
}

// ---------------------------------------------------------------------------
function evaluateIf(params, item) {
  const conds = params.conditions;
  if (!conds) return true;
  const list = conds.conditions || [];
  const combinator = conds.options?.combinator || 'and';
  if (!list.length) return true;
  const results = list.map((c) => {
    const left = evaluate(c.leftValue, { json: item.json, $now: new Date(), $: () => ({ item }) });
    const right = evaluate(c.rightValue, { json: item.json, $now: new Date(), $: () => ({ item }) });
    return compare(left, right, c.operator);
  });
  return combinator === 'or' ? results.some(Boolean) : results.every(Boolean);
}

function compare(left, right, operator) {
  const type = operator?.type;
  const op = operator?.operation;
  switch (`${type}.${op}`) {
    case 'boolean.true': return Boolean(left) === true;
    case 'boolean.false': return Boolean(left) === false;
    case 'string.equals': return String(left) === String(right);
    case 'string.notEquals': return String(left) !== String(right);
    case 'string.contains': return String(left).includes(String(right));
    case 'string.notContains': return !String(left).includes(String(right));
    case 'string.startsWith': return String(left).startsWith(String(right));
    case 'string.endsWith': return String(left).endsWith(String(right));
    case 'string.empty': return left === '' || left === null || left === undefined;
    case 'string.notEmpty': return !(left === '' || left === null || left === undefined);
    case 'number.equals': return Number(left) === Number(right);
    case 'number.notEquals': return Number(left) !== Number(right);
    case 'number.gt': return Number(left) > Number(right);
    case 'number.gte': return Number(left) >= Number(right);
    case 'number.lt': return Number(left) < Number(right);
    case 'number.lte': return Number(left) <= Number(right);
    case 'array.empty': return Array.isArray(left) && left.length === 0;
    case 'array.notEmpty': return Array.isArray(left) && left.length > 0;
    default:
      if (op === 'true') return Boolean(left);
      if (op === 'false') return Boolean(left) === false;
      if (op === 'equals') return String(left) === String(right);
      if (op === 'notEquals') return String(left) !== String(right);
      if (op === 'contains') return String(left).includes(String(right));
      return Boolean(left);
  }
}

// ---------------------------------------------------------------------------
/**
 * @param {object} wf       n8n workflow JSON
 * @param {object} options  { triggerInput, maxSteps, now }
 * @returns {object} trace with per-node input/output and stubbed side effects
 */
export function simulate(wf, options = {}) {
  const trace = [];
  const stubbed = [];
  const errors = [];
  const maxSteps = options.maxSteps || 60;
  const now = options.now || new Date();

  const nodes = wf.nodes || [];
  const nodesByName = new Map(nodes.map((n) => [n.name, n]));
  const conns = wf.connections || {};

  const trigger = nodes.find((n) => TRIGGERS.has(n.type)) || nodes[0];
  if (!trigger) return { ok: false, trace: [], stubbed: [], errors: ['no nodes'] };

  const triggerInput = options.triggerInput
    ?? (trigger.type === 'n8n-nodes-base.webhook'
      ? { body: { hello: 'world', test: true, sentAt: now.toISOString() }, headers: {}, query: {} }
      : { timestamp: now.toISOString() });

  let steps = 0;
  const queue = [{ node: trigger, items: [{ json: triggerInput }] }];

  while (queue.length && steps < maxSteps) {
    const { node, items } = queue.shift();
    steps++;
    const kind = classify(node.type, node.parameters || {});
    const params = node.parameters || {};
    const entry = {
      step: steps, node: node.name, type: node.type, kind,
      in: items.map((i) => i.json),
      out: null, note: '', stub: null,
    };
    nodesByName.set(node.name, node);

    try {
      switch (node.type) {
        case 'n8n-nodes-base.set': {
          const assigns = params.assignments?.assignments || [];
          const out = items.map((item) => {
            const json = { ...item.json };
            for (const a of assigns) {
              const v = evaluate(a.value, {
                json: item.json, $now: now, $workflow: { name: wf.name },
                $execution: { id: 'dry-run' }, $input: items,
                $: makeDollar(nodesByName, item), $item: item, nodeName: node.name,
              });
              json[a.name] = coerce(a.type, v);
            }
            return { json };
          });
          entry.out = out.map((i) => i.json);
          entry.note = `${assigns.length} field(s) set`;
          node.__lastOutput = out[0];
          emit(node, out);
          break;
        }
        case 'n8n-nodes-base.code': {
          const mode = params.mode === 'runOnceForEachItem' ? 'each' : 'all';
          const code = params.jsCode || params.functionCode || '';
          const r = runCode(code, items, mode);
          if (!r.ok) { entry.note = `ERROR: ${r.error}`; errors.push(`"${node.name}": ${r.error}`); }
          else { entry.out = r.out.map((i) => i.json); entry.note = `${mode} mode`; node.__lastOutput = r.out[0]; emit(node, r.out); }
          break;
        }
        case 'n8n-nodes-base.if': {
          const branches = { true: [], false: [] };
          for (const item of items) branches[String(evaluateIf(params, item))].push(item);
          entry.out = { 'true': branches.true.map((i) => i.json), 'false': branches.false.map((i) => i.json) };
          entry.note = `true=${branches.true.length} false=${branches.false.length}`;
          pushBranches(node, branches);
          break;
        }
        case 'n8n-nodes-base.filter': {
          const kept = items.filter((item) => evaluateIf(params, item));
          entry.out = kept.map((i) => i.json);
          entry.note = `${kept.length}/${items.length} kept`;
          node.__lastOutput = kept[0];
          emit(node, kept);
          break;
        }
        case 'n8n-nodes-base.noOp':
        case 'n8n-nodes-base.limit':
        case 'n8n-nodes-base.sort':
        case 'n8n-nodes-base.removeDuplicates':
        case 'n8n-nodes-base.aggregate':
        case 'n8n-nodes-base.splitOut':
          entry.out = items.map((i) => i.json);
          entry.note = 'passthrough (logic not simulated)';
          node.__lastOutput = items[0];
          emit(node, items);
          break;
        case 'n8n-nodes-base.merge': {
          entry.out = items.map((i) => i.json);
          entry.note = 'merge - inputs combined in order reached';
          node.__lastOutput = items[0];
          emit(node, items);
          break;
        }
        case 'n8n-nodes-base.splitInBatches': {
          entry.out = items.map((i) => i.json);
          entry.note = `${items.length} batch(es) - loop executed once in dry-run`;
          node.__lastOutput = items[0];
          emit(node, items);
          break;
        }
        case 'n8n-nodes-base.respondToWebhook': {
          const resp = evaluate(params.responseBody || '={{ $json }}', {
            json: items[0]?.json || {}, $now: now,
            $: makeDollar(nodesByName, items[0] || { json: {} }), $input: items,
          });
          entry.out = [{ response: resp }];
          entry.note = `would respond: ${JSON.stringify(resp).slice(0, 160)}`;
          break;
        }
        case 'n8n-nodes-base.wait':
          entry.out = items.map((i) => i.json);
          entry.note = `would pause ${params.resume || '...'} (skipped in dry-run)`;
          node.__lastOutput = items[0];
          emit(node, items);
          break;
        default: {
          // URL-bearing nodes that slipped past classify() still need handling.
          const rawUrl = String(params.url || '');
          if (rawUrl && /whatsapp\/send/i.test(rawUrl)) {
            const body = evaluate(params.jsonBody, {
              json: items[0]?.json || {}, $now: now, $workflow: { name: wf.name },
              $input: items, $: makeDollar(nodesByName, items[0] || { json: {} }),
            });
            const obj = body && typeof body === 'object' ? body : {};
            stubbed.push({
              node: node.name, type: node.type, target: 'WhatsApp (via Nexus proxy)',
              credentialsRequired: [],
              wouldDo: `POST ${rawUrl} :: chatId=${JSON.stringify(String(obj.chatId ?? items[0]?.json?.chatId ?? '?'))} `
                + `message=${JSON.stringify(String(obj.message ?? items[0]?.json?.message ?? '').slice(0, 90))}`,
            });
            entry.out = items.map((i) => i.json);
            entry.note = 'STUBBED - would send via Nexus -> Green API';
            node.__lastOutput = items[0];
            emit(node, items);
            break;
          }
          if (kind === 'channel') {
        const preview = buildPreview(node, items, now);
        const stub = {
          node: node.name, type: node.type, target: 'WhatsApp (via Nexus proxy)',
          credentialsRequired: [], // proxy holds the token - n8n needs no credential
          wouldDo: `POST ${params.url} :: ${preview}`,
        };
        stubbed.push(stub);
        entry.stub = stub;
        entry.out = items.map((i) => i.json);
        entry.note = 'STUBBED - would send via Nexus -> Green API';
        node.__lastOutput = items[0];
        emit(node, items);
        break;
      }
      if (kind === 'external' || kind === 'sideeffect') {
            const target = CHANNEL_DESC[node.type] || 'external service';
            const credentials = Object.keys(node.credentials || {});
            const preview = buildPreview(node, items, now);
            const stub = {
              node: node.name, type: node.type, target,
              credentialsRequired: credentials.length ? credentials : ['(not yet attached)'],
              wouldDo: preview,
            };
            stubbed.push(stub);
            entry.stub = stub;
            entry.out = items.map((i) => i.json);
            entry.note = `STUBBED - would send to ${target}`;
            node.__lastOutput = items[0];
            emit(node, items); // data keeps flowing so the rest of the graph is proven
            break;
          }
          if (kind === 'internal') {
            entry.out = items.map((i) => i.json);
            entry.note = `STUBBED - POST ${params.url} (kept local in dry-run)`;
            stubbed.push({
              node: node.name, type: node.type, target: 'Nexus-Flow',
              credentialsRequired: [], wouldDo: `POST ${params.url}`,
            });
            node.__lastOutput = items[0];
            emit(node, items);
            break;
          }
          entry.out = items.map((i) => i.json);
          entry.note = 'executed';
          node.__lastOutput = items[0];
          emit(node, items);
        }
      }
    } catch (e) {
      entry.note = `ERROR: ${e.message}`;
      errors.push(`"${node.name}": ${e.message}`);
    }

    trace.push(entry);
    if (errors.length > 5) break;
  }

  if (queue.length) trace.push({ step: steps + 1, node: '…', type: '', kind: 'truncated', in: [], out: null, note: `stopped at maxSteps=${maxSteps}` });

  return {
    ok: errors.length === 0,
    executedSteps: steps,
    trigger: { name: trigger.name, type: trigger.type },
    trace,
    stubbed,
    errors,
    credentialsRequired: [...new Set(stubbed.flatMap((s) => s.credentialsRequired))],
  };

  function emit(node, items) {
    const branches = conns[node.name];
    if (!branches) return;
    const main = branches.main || [];
    main.forEach((group, gi) => {
      (group || []).forEach((link) => {
        if (!link || !link.node) return;
        const target = nodesByName.get(link.node);
        if (target) queue.push({ node: target, items: items.length ? items : [{ json: {} }] });
        void gi;
      });
    });
  }

  function pushBranches(node, branches) {
    const conn = conns[node.name] || {};
    ['true', 'false'].forEach((br) => {
      const group = (conn[br] || [])[0] || [];
      const target = branches[br];
      if (!target.length) return;
      group.forEach((link) => {
        const t = nodesByName.get(link.node);
        if (t) queue.push({ node: t, items: target });
      });
    });
    // legacy v1 if-node uses main[0]=true, main[1]=false
    if (!conn.true && !conn.false) {
      const main = conn.main || [];
      if (branches.true.length && main[0]) main[0].forEach((l) => { const t = nodesByName.get(l.node); if (t) queue.push({ node: t, items: branches.true }); });
      if (branches.false.length && main[1]) main[1].forEach((l) => { const t = nodesByName.get(l.node); if (t) queue.push({ node: t, items: branches.false }); });
    }
  }
}

function coerce(type, v) {
  if (v === undefined || v === null) return v;
  switch (type) {
    case 'number': {
      const n = Number(v);
      if (Number.isNaN(n)) throw new Error(`cannot coerce ${JSON.stringify(v)} to number`);
      return n;
    }
    case 'boolean': return v === true || v === 'true' || v === 1 || v === '1';
    case 'array': return Array.isArray(v) ? v : [v];
    case 'object': return typeof v === 'string' ? safeJson(v) : v;
    case 'string': return typeof v === 'object' && v !== null ? JSON.stringify(v) : String(v);
    default: return v;
  }
}

function safeJson(s) {
  if (typeof s !== 'string') return s;
  try { return JSON.parse(s); } catch { return s; }
}

function buildPreview(node, items, now) {
  const p = node.parameters || {};
  const first = items[0]?.json || {};
  const val = (x) => (typeof x === 'string'
    ? evaluate(x, {
      json: first, $now: now, $workflow: { name: '' }, $input: items,
      $: () => ({ item: { json: first } }),
    })
    : x);

  if (node.type === 'n8n-nodes-base.httpRequest') {
    const url = String(p.url || '');
    if (/whatsapp\/send/i.test(url)) {
      // The body is an n8n expression string - resolve it rather than JSON.parse.
      const body = evaluate(p.jsonBody, {
        json: first, $now: now, $workflow: { name: '' },
        $: () => ({ item: { json: first } }), $input: items,
      });
      const obj = (body && typeof body === 'object') ? body : {};
      const chat = obj.chatId || obj.phone || first.chatId || first.phone || '?';
      const msg = obj.message || first.message || '';
      return `POST ${url} chatId=${JSON.stringify(String(chat))} message=${JSON.stringify(String(val(msg)).slice(0, 100))}`;
    }
    return `POST ${url}`;
  }

  switch (node.type) {
    case 'n8n-nodes-base.emailSend':
      return `to=${p.toEmail || '?'} from=${p.fromEmail || '?'} subject=${JSON.stringify(val(p.subject))}`;
    case 'n8n-nodes-base.whatsApp':
      return `to=${p.recipientPhoneNumber || '?'} text=${JSON.stringify(String(val(p.textBody)).slice(0, 120))}`;
    case 'n8n-nodes-base.googleSheets':
      return `doc=${p.documentId?.value || '?'} sheet=${p.sheetName?.value || '?'} op=${p.operation} row=${JSON.stringify(first).slice(0, 120)}`;
    case 'n8n-nodes-base.telegram':
      return `chatId=${p.chatId || '?'} text=${JSON.stringify(String(val(p.text)).slice(0, 120))}`;
    default:
      return JSON.stringify(first).slice(0, 160);
  }
}
