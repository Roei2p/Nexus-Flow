// Diagnose WHY the Green API host is unreachable (cause chain, DNS, TLS, proxy).
import dns from 'node:dns/promises';
import tls from 'node:tls';
import fs from 'node:fs';

const env = fs.readFileSync(new URL('../../env', import.meta.url), 'utf8');
const id = (env.split(/\r?\n/).find((l) => l.startsWith('idInstance=')) || '').slice(11).trim();
const HOST = `${id}.api.greenapi.com`;

console.log(`host: ${HOST}\n`);

// 1. DNS
try {
  const records = await dns.lookup(HOST, { all: true });
  console.log(`DNS lookup      : OK ${JSON.stringify(records)}`);
} catch (e) {
  console.log(`DNS lookup      : FAIL ${e.code} ${e.message}`);
}
try {
  const servers = dns.getServers();
  console.log(`DNS servers     : ${servers.join(', ')}`);
} catch (e) { console.log(`DNS servers     : ${e.message}`); }

// 2. alternative names Green API uses
for (const alt of ['api.greenapi.org', `${id}.api.greenapi.org`, 'greenapi.com']) {
  try { const r = await dns.lookup(alt, { all: true }); console.log(`DNS ${alt.padEnd(24)}: ${r.map((x) => x.address).join(', ')}`); }
  catch (e) { console.log(`DNS ${alt.padEnd(24)}: FAIL ${e.code}`); }
}

// 3. TCP 443 + TLS handshake + certificate subject
await new Promise((resolve) => {
  const sock = tls.connect({ host: HOST, port: 443, servername: HOST, rejectUnauthorized: false, timeout: 12000 }, () => {
    const cert = sock.getPeerCertificate();
    console.log(`TCP 443          : connected`);
    console.log(`TLS              : ${sock.getProtocol()} cipher=${sock.getCipher()?.name}`);
    console.log(`cert subject CN  : ${cert.subject?.CN}`);
    console.log(`cert issuer      : ${cert.issuer?.CN}`);
    console.log(`cert valid       : ${cert.valid_from} -> ${cert.valid_to}`);
    console.log(`cert authorized  : ${sock.authorized}${sock.authorized ? '' : ` (${sock.authorizationError})`}`);
    sock.end();
    resolve();
  });
  sock.on('timeout', () => { console.log('TCP 443          : TIMEOUT'); sock.destroy(); resolve(); });
  sock.on('error', (e) => { console.log(`TCP 443          : FAIL ${e.code} ${e.message}`); resolve(); });
});

// 4. Proxy awareness
console.log(`HTTP_PROXY       : ${process.env.HTTP_PROXY || process.env.http_proxy || '(none)'}`);
console.log(`HTTPS_PROXY      : ${process.env.HTTPS_PROXY || process.env.https_proxy || '(none)'}`);
console.log(`NO_PROXY         : ${process.env.NO_PROXY || '(none)'}`);

// 5. plain fetch with full cause chain
console.log('\n--- fetch cause chain ---');
try {
  const r = await fetch(`https://${HOST}/wa/getStateInstance?token=x`, { signal: AbortSignal.timeout(15000) });
  console.log(`fetch: ${r.status}`);
} catch (e) {
  let cur = e;
  let depth = 0;
  while (cur && depth < 6) {
    console.log(`  [${depth}] ${cur.name}: ${cur.code || ''} ${cur.message}`);
    cur = cur.cause;
    depth++;
  }
}

// 6. control: a host we know works
console.log('\n--- control ---');
try {
  const r = await fetch('https://integrate.api.nvidia.com/v1/models', { signal: AbortSignal.timeout(12000) });
  console.log(`nvidia API       : ${r.status} (so outbound HTTPS generally works)`);
} catch (e) { console.log(`nvidia API       : FAIL ${e.message}`); }
