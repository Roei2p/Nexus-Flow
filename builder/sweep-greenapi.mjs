// Which Green API hostname actually exists? Sweep candidates via DNS + HTTPS.
import dns from 'node:dns/promises';

const ID = process.argv[2] || '7105249512';

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
