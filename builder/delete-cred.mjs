// Removes credentials by id using the same auth the rest of the automation uses.
import fs from 'node:fs';

const env = fs.readFileSync(new URL('../../env', import.meta.url), 'utf8');
const token = (env.split(/\r?\n/).find((l) => /^8N8=/.test(l)) || '').slice(5).trim();
const BASE = 'http://localhost:5678';

const ids = process.argv.slice(2);
if (!ids.length) { console.log('usage: node delete-cred.mjs <id> [<id> ...]'); process.exit(1); }

for (const id of ids) {
  for (const attempt of [
    { method: 'DELETE', url: `${BASE}/api/v1/credentials/${id}` },
    { method: 'DELETE', url: `${BASE}/api/v1/credentials?id=${id}` },
  ]) {
    try {
      const res = await fetch(attempt.url, {
        method: attempt.method,
        headers: { 'X-N8n-API-Key': token },
        signal: AbortSignal.timeout(15000),
      });
      const text = await res.text();
      console.log(`${res.status} ${attempt.method} ${attempt.url.replace(BASE, '')} -> ${text.slice(0, 200)}`);
      if (res.ok) { console.log(`  deleted ${id}`); break; }
    } catch (e) {
      console.log(`ERR ${attempt.url} ${e.message}`);
    }
  }
}

const list = await (await fetch(`${BASE}/api/v1/credentials`, { headers: { 'X-N8n-API-Key': token } })).json();
console.log(`remaining credentials: ${list.data.length}`);
