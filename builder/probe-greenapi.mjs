// Correct-shape Green API probe: {{apiUrl}}/waInstance{{idInstance}}/{{method}}/{{apiTokenInstance}}
// Read-only methods first; send methods probed with EMPTY payload so nothing is delivered.
import fs from 'node:fs';

const env = fs.readFileSync(new URL('../../env', import.meta.url), 'utf8');
const get = (k) => (env.split(/\r?\n/).find((l) => l.startsWith(k + '=')) || '').slice(k.length + 1).trim();
const ID = get('idInstance');
const TOKEN = get('apiTokenInstance');

const HOSTS = [
  `https://api.greenapi.com`,
  `https://${ID}.api.greenapi.com`,
  `https://greenapi.com`,
];

const mask = (s) => (s?.length > 12 ? `${s.slice(0, 6)}…${s.slice(-4)}` : '***');
console.log(`idInstance     = ${ID}`);
console.log(`apiToken       = ${mask(TOKEN)}\n`);

async function call(base, method, path, body) {
  const url = `${base}/waInstance${ID}/${path}/${TOKEN}`;
  try {
    const res = await fetch(url, {
      method: body ? 'POST' : 'GET',
      headers: body ? { 'Content-Type': 'application/json' } : {},
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(20000),
    });
    const text = await res.text();
    let json = null;
    try { json = JSON.parse(text); } catch { json = text; }
    return { status: res.status, json, url: url.replace(TOKEN, mask(TOKEN)) };
  } catch (e) {
    let m = e.message, c = e;
    while (c.cause) { c = c.cause; m = `${m} | ${c.code || c.message}`; }
    return { status: 0, json: m, url: url.replace(TOKEN, mask(TOKEN)) };
  }
}

// 1. find a host that answers at all
console.log('--- host discovery (getStateInstance) ---');
let goodHost = null;
for (const h of HOSTS) {
  const r = await call(h, 'GET', 'getStateInstance');
  console.log(`  ${String(r.status).padEnd(4)} ${h}  ${JSON.stringify(r.json).slice(0, 140)}`);
  if (r.status === 200) { goodHost = h; break; }
}

if (!goodHost) {
  console.log('\nNo host answered 200. Probing more paths on api.greenapi.com...');
  goodHost = 'https://api.greenapi.com';
  for (const p of ['getStateInstance', 'getSettings', 'getContacts']) {
    const r = await call(goodHost, 'GET', p);
    console.log(`  ${String(r.status).padEnd(4)} /${p}  ${JSON.stringify(r.json).slice(0, 160)}`);
  }
}

console.log(`\nusing: ${goodHost}\n`);

// 2. read-only surface
console.log('--- read-only methods ---');
const readMethods = ['getStateInstance', 'getSettings', 'getMyPhoneNumber', 'getWaAccountHtml', 'getInstanceData'];
const state = {};
for (const p of readMethods) {
  const r = await call(goodHost, 'GET', p);
  const ok = r.status === 200;
  console.log(`  ${String(r.status).padEnd(4)} ${p.padEnd(20)} ${JSON.stringify(r.json).slice(0, 200)}`);
  if (ok) state[p] = r.json;
}

// 3. send-method availability, EMPTY payload => guaranteed no delivery
console.log('\n--- send methods (empty payload, nothing can be delivered) ---');
const sendMethods = ['sendMessage', 'sendTextMessage', 'sendFileByUrl', 'checkBeforeSendFile'];
const exposed = [];
for (const p of sendMethods) {
  const r = await call(goodHost, 'POST', p, { chatId: '', message: '' });
  const s = JSON.stringify(r.json);
  const missing = r.status === 404 || /not found|Not Found|Unknown|404/i.test(s);
  const badReq = r.status === 400 || /required|invalid|empty|must be/i.test(s);
  console.log(`  ${String(r.status).padEnd(4)} ${p.padEnd(20)} ${missing ? 'NOT EXPOSED' : badReq ? 'AVAILABLE' : s.slice(0, 100)}`);
  if (!missing) exposed.push(p);
}

// 4. webhook settings - inbound side
console.log('\n--- webhook / inbound config ---');
if (state.getSettings) {
  const s = state.getSettings;
  console.log(`  webhookSetupHookIsEnabled = ${s.webhookSetupHookIsEnabled}`);
  console.log(`  incomingWebhookUrl         = ${s.incomingWebhookUrl || '(not set)'}`);
  console.log(`  outgoingWebhookUrl         = ${s.outgoingWebhookUrl || '(not set)'}`);
  console.log(`  outgoingMessagesWebhookUrl = ${s.outgoingMessagesWebhookUrl || '(not set)'}`);
  console.log(`  markIncomingMessagesRead   = ${s.markIncomingMessagesRead}`);
}

console.log('\n--- summary ---');
console.log(JSON.stringify({
  host: goodHost,
  stateInstance: state.getStateInstance?.stateInstance,
  phone: state.getMyPhoneNumber?.phone || null,
  sendMethodsAvailable: exposed,
}, null, 1));
