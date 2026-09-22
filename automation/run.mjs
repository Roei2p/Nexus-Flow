// End-to-end verification of the n8n <-> Nexus-Flow integration.
// Usage:  node automation/run.mjs
import { n8n, nexus, N8N_URL, NEXUS_URL, sleep } from './lib.mjs';

const results = [];
const t0 = Date.now();
const ts = () => `+${Math.round((Date.now() - t0) / 1000)}s`;

function check(name, ok, detail = '') {
  results.push({ name, ok, detail });
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  return ok;
}

async function waitFor(label, fn, timeoutMs, everyMs = 3000) {
  const end = Date.now() + timeoutMs;
  while (Date.now() < end) {
    try {
      const v = await fn();
      if (v) return v;
    } catch { /* transient */ }
    await sleep(everyMs);
  }
  console.log(`  ...   ${label} - timeout after ${Math.round(timeoutMs / 1000)}s`);
  return null;
}

// clear the bus so we only count what this run produces
await nexus('/api/events', { method: 'DELETE' }).catch(() => {});
const startedAt = Date.now();

console.log('\n[1] Service health');
check('Nexus /healthz', (await nexus('/healthz').then((h) => h.status === 'ok').catch(() => false)), NEXUS_URL);
check('n8n /healthz', await fetch(`${N8N_URL}/healthz`).then((r) => r.ok).catch(() => false), N8N_URL);

console.log('\n[2] Workflows deployed & active');
const wfs = (await n8n('/api/v1/workflows?limit=100')).data;
const want = ['Nexus - Webhook Hello', 'Nexus - Heartbeat'];
for (const name of want) {
  const w = wfs.find((x) => x.name === name);
  check(`active: ${name}`, !!w && w.active, w ? `id=${w.id}` : 'missing');
}

console.log('\n[3] Webhook flow (external call -> n8n -> Nexus)');
const hookBody = { ping: 'from-run.mjs', ts: new Date().toISOString(), nonce: Math.random().toString(36).slice(2) };
const hook = await fetch(`${N8N_URL}/webhook/nexus-hello`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(hookBody),
}).catch((e) => ({ ok: false, status: e.message }));
check('POST /webhook/nexus-hello accepted', hook.ok, `HTTP ${hook.status}`);

const gotHook = await waitFor('webhook event', async () => {
  const ev = await nexus('/api/events');
  return ev.data.find((e) => e.event === 'webhook.hello' && String(e.received || '').includes(hookBody.nonce));
}, 30000);
check('n8n pushed webhook event into Nexus', !!gotHook, gotHook ? `id=${gotHook.id}` : 'never arrived');
console.log(`  ${ts()} event payload: ${gotHook ? JSON.stringify({ event: gotHook.event, source: gotHook.source, workflow: gotHook.workflow }) : '-'}`);

console.log('\n[4] Schedule flow (n8n fires on its own -> Nexus)');
console.log(`  waiting for the every-minute trigger, up to 100s ...`);
const gotBeat = await waitFor('heartbeat event', async () => {
  const ev = await nexus('/api/events');
  return ev.data.find((e) => e.event === 'heartbeat');
}, 100000, 5000);
check('scheduled workflow pushed a heartbeat into Nexus', !!gotBeat, gotBeat ? `exec=${gotBeat.executionId}` : 'never arrived');

console.log('\n[5] n8n execution history');
const execs = (await n8n('/api/v1/executions?limit=20')).data || [];
const fresh = execs.filter((e) => new Date(e.startedAt).getTime() >= startedAt - 5000);
const succeeded = fresh.filter((e) => e.status === 'success');
const errored = fresh.filter((e) => e.status === 'error');
check('executions recorded since run start', fresh.length > 0, `${fresh.length} total`);
check('no errored executions', errored.length === 0, errored.length ? errored.map((e) => e.id).join(',') : 'clean');
console.log(`  executions: ${succeeded.length} success / ${errored.length} error`);

const summary = await nexus('/api/summary');
console.log(`\n[6] Dashboard summary`);
console.log(`  n8n reachable : ${summary.n8n.reachable}`);
console.log(`  workflows     : ${summary.counts.workflows} (active ${summary.counts.active})`);
console.log(`  executions    : ${summary.counts.executions}`);
console.log(`  events        : ${summary.events.count}`);

const failed = results.filter((r) => !r.ok);
console.log(`\n${'='.repeat(52)}`);
console.log(`${results.length - failed.length}/${results.length} checks passed`);
if (failed.length) {
  console.log('FAILED:');
  for (const f of failed) console.log(`  - ${f.name} ${f.detail}`);
}
console.log(`Open ${NEXUS_URL} to see it live.`);
process.exit(failed.length ? 1 : 0);
