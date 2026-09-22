// Probe which n8n public-API endpoints this instance actually exposes.
import fs from 'node:fs';

const KEY = fs.readFileSync(new URL('../../env', import.meta.url), 'utf8')
  .split(/\r?\n/).find((l) => /8N8=|N8N_API_KEY=/.test(l));
const token = KEY.slice(KEY.indexOf('=') + 1).trim();
const BASE = process.env.N8N_URL || 'http://localhost:5678';

const paths = [
  '/api/v1/credentials',
  '/api/v1/credential-types',
  '/api/v1/workflows?limit=1',
  '/api/v1/executions?limit=1',
  '/api/v1/variables',
  '/api/v1/tags',
  '/api/v1/projects',
  '/api/v1/source-control/status',
];

for (const p of paths) {
  try {
    const res = await fetch(BASE + p, {
      headers: { 'X-N8n-API-Key': token },
      signal: AbortSignal.timeout(12000),
    });
    const text = await res.text();
    console.log(`${String(res.status).padEnd(4)} ${p.padEnd(36)} ${text.slice(0, 220).replace(/\s+/g, ' ')}`);
  } catch (e) {
    console.log(`ERR  ${p.padEnd(36)} ${e.message}`);
  }
}

// Does the API accept a credential write?
console.log('\n--- POST probe (will be undone) ---');
for (const body of [
  { name: 'nexus-probe', type: 'smtp', data: { user: 'x', password: 'y', host: 'localhost', port: 587, secure: false } },
]) {
  const res = await fetch(`${BASE}/api/v1/credentials`, {
    method: 'POST',
    headers: { 'X-N8n-API-Key': token, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(12000),
  });
  const text = await res.text();
  console.log(`${res.status} POST /api/v1/credentials -> ${text.slice(0, 300).replace(/\s+/g, ' ')}`);
  if (res.ok) {
    const created = JSON.parse(text);
    const del = await fetch(`${BASE}/api/v1/credentials/${created.data.id}`, {
      method: 'DELETE', headers: { 'X-N8n-API-Key': token }, signal: AbortSignal.timeout(12000),
    });
    console.log(`     cleanup delete -> ${del.status}`);
  }
}
