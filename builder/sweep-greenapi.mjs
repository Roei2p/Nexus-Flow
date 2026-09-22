// Which Green API hostname actually exists? Sweep candidates via DNS + HTTPS.
import dns from 'node:dns/promises';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
for (const f of ['.env', 'env']) {
  const p = path.join(ROOT, f);
  if (!fs.existsSync(p)) continue;
  for (const line of fs.readFileSync(p, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && m[2] && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
  }
}

// Instance id comes from argv or the env file - never hard-coded.
const ID = process.argv[2] || process.env.idInstance;
if (!ID) {
  console.error('Usage: node builder/sweep-greenapi.mjs <idInstance>  (or set idInstance in env)');
  process.exit(1);
}

const hosts = [
  `${ID}.api.greenapi.com`,
  `${ID}.api.greenapi.org`,
  `${ID}.api.green-api.com`,
  `${ID}.api.green-api.org`,
  'api.greenapi.com',
  'api.greenapi.org',
  'greenapi.com',
  'greenapi.org',
  'www.greenapi.com',
  'www.greenapi.org',
  'green-api.com',
  'green-api.org',
  `${ID}.apigreenapi.com`,
  '127.0.0.1',
];

console.log('--- DNS sweep ---');
for (const h of hosts) {
  try {
    const r = await dns.lookup(h, { all: true });
    console.log(`  OK   ${h.padEnd(34)} ${r.map((x) => x.address).join(', ')}`);
  } catch (e) {
    console.log(`  ${String(e.code).padEnd(5)} ${h}`);
  }
}

console.log('\n--- HTTPS probe on whatever resolves ---');
const resolved = [];
for (const h of hosts) {
  try { await dns.lookup(h); resolved.push(h); } catch { /* skip */ }
}

for (const h of resolved) {
  if (h === '127.0.0.1') continue;
  for (const path of ['/', '/wa/getStateInstance?token=x']) {
    try {
      const r = await fetch(`https://${h}${path}`, { redirect: 'manual', signal: AbortSignal.timeout(12000) });
      const body = path === '/' ? '' : ` ${(await r.text()).slice(0, 120)}`;
      console.log(`  ${String(r.status).padEnd(4)} https://${h}${path}${body.replace(/\s+/g, ' ')}`);
    } catch (e) {
      let c = e; let msg = e.message;
      while (c.cause) { c = c.cause; msg = `${msg} | ${c.code || c.message}`; }
      console.log(`  ERR  https://${h}${path}  ${msg.slice(0, 110)}`);
    }
  }
}

// TXT / CNAME at the apex sometimes reveal the real service host
console.log('\n--- zone hints ---');
for (const zone of ['greenapi.com', 'green-api.com', 'greenapi.org']) {
  for (const type of ['MX', 'TXT', 'NS']) {
    try {
      const r = await dns.resolveAny(zone);
      const pick = r.filter((x) => x[type] || x[type === 'MX' ? 'exchange' : 'nsdname']);
      if (pick.length) console.log(`  ${zone} ${type}: ${JSON.stringify(pick).slice(0, 240)}`);
    } catch { /* some resolvers refuse */ }
  }
}
