// Live check: which configured provider actually answers, and how fast.
import { detectProvider, availableModels, chat, LlmNotConfiguredError } from './llm.mjs';

const det = detectProvider();
if (!det) { console.log(new LlmNotConfiguredError().message); process.exit(1); }
console.log(`provider : ${det.id}  (key: ${det.keyName})`);
console.log(`models   : ${det.models.join(', ')}\n`);

const candidates = [
  process.env.NEXUS_LLM_MODEL,
  ...det.models,
].filter(Boolean);

const system = 'You are a terse JSON API. Answer with JSON only, no prose.';
const user = 'Return {"ok":true,"provider":"<name you are running on>"}';

for (const model of [...new Set(candidates)]) {
  const t0 = Date.now();
  try {
    const { text } = await chat(system, user, { model });
    console.log(`OK   ${model.padEnd(42)} ${String(Date.now() - t0).padStart(5)}ms  ${text.replace(/\s+/g, ' ').slice(0, 120)}`);
  } catch (e) {
    console.log(`FAIL ${model.padEnd(42)} ${String(Date.now() - t0).padStart(5)}ms  ${e.message.replace(/\s+/g, ' ').slice(0, 160)}`);
  }
}
