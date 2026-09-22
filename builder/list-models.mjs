// Lists what this NVIDIA key can actually call, so llm.mjs never hard-codes a retired model.
import fs from 'node:fs';

const env = fs.readFileSync(new URL('../../env', import.meta.url), 'utf8');
const key = (env.split(/\r?\n/).find((l) => /^nvidia=/.test(l)) || '').slice(7).trim();

const res = await fetch('https://integrate.api.nvidia.com/v1/models', {
  headers: { Authorization: `Bearer ${key}` },
  signal: AbortSignal.timeout(30000),
});
console.log(`GET /v1/models -> ${res.status}`);
if (!res.ok) { console.log(await res.text()); process.exit(1); }

const j = await res.json();
const ids = (j.data || []).map((m) => m.id);
console.log(`models available: ${ids.length}\n`);

// Prefer instruct/chat-style models likely to do JSON tool work well.
const score = (id) => {
  let s = 0;
  if (/instruct|chat/i.test(id)) s += 3;
  if (/70b|65b|72b|405b|235b/i.test(id)) s += 3;
  if (/llama-3/i.test(id)) s += 3;
  if (/nemotron/i.test(id)) s += 2;
  if (/qwen2\.5|qwen3/i.test(id)) s += 2;
  if (/code|embed|vision|guard|rerank|steerlm/i.test(id)) s -= 5;
  if (/preview|eol/i.test(id)) s -= 2;
  return s;
};
const ranked = ids.sort((a, b) => score(b) - score(a));
console.log('top 25 by fit:');
ranked.slice(0, 25).forEach((id, i) => console.log(`  ${String(i + 1).padStart(2)}. ${id}`));

console.log('\n--- live smoke test on top 3 ---');
for (const model of ranked.slice(0, 3)) {
  const t0 = Date.now();
  try {
    const r = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, messages: [{ role: 'user', content: 'Reply with exactly: OK' }], max_tokens: 10 }),
      signal: AbortSignal.timeout(60000),
    });
    const text = await r.text();
    if (r.ok) {
      const out = JSON.parse(text).choices[0].message.content;
      console.log(`  OK   ${model}  ${Date.now() - t0}ms  -> ${JSON.stringify(out)}`);
    } else {
      console.log(`  ${r.status} ${model}  ${text.replace(/\s+/g, ' ').slice(0, 140)}`);
    }
  } catch (e) {
    console.log(`  ERR  ${model}  ${e.message}`);
  }
}
