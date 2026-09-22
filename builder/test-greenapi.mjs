// Live end-to-end test of the Green API channel THROUGH the Nexus proxy.
// This actually delivers a real WhatsApp message to the instance's own
// number ("Message yourself"), so nothing leaves the account.
import fs from 'node:fs';

const NEXUS = process.env.NEXUS_URL || 'http://localhost:3000';
const env = fs.readFileSync(new URL('../../env', import.meta.url), 'utf8');
const get = (k) => (env.split(/\r?\n/).find((l) => l.startsWith(k + '=')) || '').slice(k.length + 1).trim();

const results = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok, detail });
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
};
const j = async (p, opts = {}) => {
  const r = await fetch(NEXUS + p, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
    signal: AbortSignal.timeout(45000),
  });
  const t = await r.text();
  let b = null; try { b = t ? JSON.parse(t) : null; } catch { b = t; }
  return { status: r.status, ok: r.ok, body: b };
};

console.log('\n[1] proxy reachability');
check('Nexus /healthz', (await j('/healthz')).body?.status === 'ok');

console.log('\n[2] channel configuration (no secret printed)');
const ch = await j('/api/channels');
check('/api/channels responds', ch.ok, JSON.stringify(ch.body?.whatsapp || ch.body).slice(0, 160));
const wa = ch.body?.whatsapp || {};
check('credentials configured', wa.configured === true, `idInstance=${wa.idInstance}`);
check('instance authorized', wa.authorized === true, `state=${wa.stateInstance}`);

console.log('\n[3] token isolation - the whole point of the proxy');
const wfRaw = fs.readFileSync(new URL(`../automation/workflows/06-greenapi-whatsapp.json`, import.meta.url), 'utf8');
const token = get('apiTokenInstance');
check('token absent from workflow JSON', !wfRaw.includes(token));
check('token absent from n8n-destined bodies', !wfRaw.includes('apiTokenInstance'));
check('n8n points at Nexus, not Green API', wfRaw.includes('http://nexus:3000/api/channels/whatsapp/send'));

console.log('\n[4] dry-run gate (sends nothing)');
const dr = await j('/api/channels/whatsapp/dry-run', {
  method: 'POST', body: JSON.stringify({ chatId: '972528110356@c.us', message: 'probe' }),
});
check('dry-run ok', dr.body?.ok === true, `problems=${JSON.stringify(dr.body?.problems)}`);
check('dry-run reports token not exposed', dr.body?.tokenExposedToN8n === false);
check('dry-run shows masked URL', String(dr.body?.wouldCall || '').includes('<token>'));

console.log('\n[5] n8n execution through the deployed workflow');
// The caller sends a FLAT body. n8n's webhook node puts it under $json.body,
// so the workflow reads $json.body.chatId - wrapping it here would nest twice.
const hookBody = {
  chatId: '972528110356@c.us',
  message: `Nexus-Flow E2E ${new Date().toISOString()}`,
};
const hook = await fetch('http://localhost:5678/webhook/nexus-whatsapp-green', {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(hookBody), signal: AbortSignal.timeout(30000),
}).then((r) => ({ ok: r.ok, status: r.status })).catch((e) => ({ ok: false, status: e.message }));
check('POST /webhook/nexus-whatsapp-green', hook.ok, `HTTP ${hook.status}`);

let exec = null;
for (let i = 0; i < 12 && !exec; i++) {
  await new Promise((r) => setTimeout(r, 2500));
  const list = await j('/api/executions?limit=10');
  exec = (list.body?.data || []).find((e) => e.workflowId && e.startedAt
    && Date.now() - new Date(e.startedAt).getTime() < 90000 && e.status !== 'running');
}
check('execution recorded', !!exec, exec ? `#${exec.id} status=${exec.status}` : 'none found');

let ev = null;
for (let i = 0; i < 12 && !ev; i++) {
  await new Promise((r) => setTimeout(r, 2500));
  const e = await j('/api/events');
  ev = (e.body?.data || []).find((x) => x.event === 'whatsapp.sent');
}
check('whatsapp.sent event landed in Nexus', !!ev, ev ? `idMessage=${ev.idMessage} chatId=${ev.chatId}` : 'no event');
if (ev) check('Green API returned a message id', Boolean(ev.idMessage), String(ev.idMessage));

const failed = results.filter((r) => !r.ok);
console.log(`\n${'='.repeat(56)}`);
console.log(`${results.length - failed.length}/${results.length} checks passed`);
if (failed.length) failed.forEach((f) => console.log(`  FAILED: ${f.name} ${f.detail}`));
console.log(`Live send target: ${ev?.chatId || 'instance wid (Message yourself)'}`);
process.exit(failed.length ? 1 : 0);
