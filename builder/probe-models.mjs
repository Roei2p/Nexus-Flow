// Cheap per-model probe: which of the 82 catalog entries can THIS account call?
import fs from 'node:fs';

const env = fs.readFileSync(new URL('../../env', import.meta.url), 'utf8');
const key = (env.split(/\r?\n/).find((l) => /^nvidia=/.test(l)) || '').slice(7).trim();

const list = await (await fetch('https://integrate.api.nvidia.com/v1/models', {
  headers: { Authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(30000),
})).json();
const ids = (list.data || []).map((m) => m.id);

async function probe(model) {
  try {
    const r = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, messages: [{ role: 'user', content: 'hi' }], max_tokens: 1 }),
      signal: AbortSignal.timeout(30000),
    });
    const text = await r.text();
    if (r.ok) return { model, status: 'OK', detail: JSON.parse(text).choices[0]?.message?.content ?? '' };
    let detail = text.replace(/\s+/g, ' ').slice(0, 90);
    try { detail = JSON.parse(text).detail || JSON.parse(text).title || detail; } catch { /* keep raw */ }
    return { model, status: String(r.status), detail };
  } catch (e) {
    return { model, status: 'ERR', detail: e.message };
  }
}

const results = [];
const queue = [...ids];
const workers = Array.from({ length: 8 }, async () => {
  while (queue.length) results.push(await probe(queue.shift()));
});
await Promise.all(workers);

const ok = results.filter((r) => r.status === 'OK');
console.log(`probed ${results.length} models -> ${ok.length} usable\n`);
if (ok.length) {
  console.log('USABLE:');
  ok.forEach((r) => console.log(`  ${r.model}`));
}

const byStatus = {};
for (const r of results) (byStatus[r.status] ||= []).push(r);
console.log('\nstatus breakdown:');
for (const [s, arr] of Object.entries(byStatus)) {
  console.log(`  ${s}: ${arr.length}   e.g. ${arr[0].model} -> ${String(arr[0].detail).slice(0, 70)}`);
}

fs.writeFileSync(new URL('./data/nvidia-models.json', import.meta.url),
  JSON.stringify({ probedAt: new Date().toISOString(), usable: ok.map((r) => r.model), all: results }, null, 1));
