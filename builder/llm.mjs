// Provider-agnostic LLM client. Reads whichever key exists in the environment
// or in C:\AI\8n8\.env  - no key is hard-coded anywhere.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..');

// Pull extra vars from the project env files without overwriting real env vars.
// Reads BOTH ".env" (docker compose) and "env" (where the user keeps raw keys).
function loadDotEnv() {
  for (const file of ['.env', 'env']) {
    const p = path.join(ROOT, file);
    if (!fs.existsSync(p)) continue;
    for (const line of fs.readFileSync(p, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && m[2] && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
    }
  }
}
loadDotEnv();

// Verified usable on this account (builder/probe-models.mjs, 11 of 82).
// Ordered by suitability for structured JSON generation; retried in order.
const NVIDIA_CATALOG = [
  'deepseek-ai/deepseek-v4.1-flash',
  'openai/gpt-oss-20b',
  'nvidia/nemotron-3.5-lightning-30b-a3b',
  'meta/llama-3.2-11b-vision-instruct',
  'poolside/laguna-xs-2.1',
];

const PROVIDERS = [
  {
    // NVIDIA API Catalog - OpenAI-compatible, key named `nvidia` in ./env
    id: 'nvidia',
    key: 'nvidia',
    models: NVIDIA_CATALOG,
    defaultModel: NVIDIA_CATALOG[0],
    chat: (model, system, user, key) => ({
      url: 'https://integrate.api.nvidia.com/v1/chat/completions',
      headers: { Authorization: `Bearer ${key}` },
      body: {
        model, temperature: 0.2, max_tokens: 4096,
        messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
      },
      pick: (j) => j.choices[0].message.content,
    }),
  },
  {
    id: 'openai',
    key: 'OPENAI_API_KEY',
    models: ['gpt-4o-mini', 'gpt-4o'],
    defaultModel: 'gpt-4o-mini',
    chat: (model, system, user, key) => ({
      url: 'https://api.openai.com/v1/chat/completions',
      headers: { Authorization: `Bearer ${key}` },
      body: { model, messages: [{ role: 'system', content: system }, { role: 'user', content: user }] },
      pick: (j) => j.choices[0].message.content,
    }),
  },
  {
    id: 'anthropic',
    key: 'ANTHROPIC_API_KEY',
    models: ['claude-sonnet-4-5', 'claude-opus-4-1', 'claude-haiku-4-5'],
    defaultModel: 'claude-sonnet-4-5',
    chat: (model, system, user, key) => ({
      url: 'https://api.anthropic.com/v1/messages',
      headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01' },
      body: { model, max_tokens: 8000, system, messages: [{ role: 'user', content: user }] },
      pick: (j) => j.content.map((c) => c.text || '').join(''),
    }),
  },
  {
    id: 'openrouter',
    key: 'OPENROUTER_API_KEY',
    models: ['anthropic/claude-sonnet-4.5', 'openai/gpt-4o-mini'],
    defaultModel: 'anthropic/claude-sonnet-4.5',
    chat: (model, system, user, key) => ({
      url: 'https://openrouter.ai/api/v1/chat/completions',
      headers: { Authorization: `Bearer ${key}` },
      body: { model, messages: [{ role: 'system', content: system }, { role: 'user', content: user }] },
      pick: (j) => j.choices[0].message.content,
    }),
  },
  {
    id: 'gemini',
    key: 'GEMINI_API_KEY',
    models: ['gemini-2.0-flash', 'gemini-1.5-pro'],
    defaultModel: 'gemini-2.0-flash',
    chat: (model, system, user, key) => ({
      url: `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
      headers: {},
      body: { system_instruction: { parts: [{ text: system }] }, contents: [{ role: 'user', parts: [{ text: user }] }] },
      pick: (j) => j.candidates[0].content.parts.map((p) => p.text).join(''),
    }),
  },
  {
    id: 'ollama',
    key: 'OLLAMA_HOST',
    models: ['llama3.1', 'qwen2.5-coder'],
    defaultModel: 'llama3.1',
    chat: (model, system, user, host) => ({
      url: `${(host || 'http://localhost:11434').replace(/\/$/, '')}/v1/chat/completions`,
      headers: {},
      body: { model, messages: [{ role: 'system', content: system }, { role: 'user', content: user }] },
      pick: (j) => j.choices[0].message.content,
    }),
  },
];

/** Which provider would be used right now, or null if no key is configured. */
export function detectProvider() {
  for (const p of PROVIDERS) {
    if (process.env[p.key]) return { id: p.id, keyName: p.key, defaultModel: p.defaultModel, models: p.models };
  }
  return null;
}

export function availableModels() {
  return PROVIDERS.filter((p) => process.env[p.key]).map((p) => ({
    provider: p.id, keyName: p.key, models: p.models, default: p.defaultModel,
  }));
}

export class LlmNotConfiguredError extends Error {
  constructor() {
    super('No LLM API key configured. Set one of: OPENAI_API_KEY, ANTHROPIC_API_KEY, '
      + 'OPENROUTER_API_KEY, GEMINI_API_KEY, or OLLAMA_HOST - in C:\\AI\\8n8\\.env then restart Docker.');
    this.code = 'LLM_NOT_CONFIGURED';
  }
}

export async function chat(system, user, { model } = {}) {
  const prov = PROVIDERS.find((p) => process.env[p.key]);
  if (!prov) throw new LlmNotConfiguredError();

  const key = process.env[prov.key];
  const useModel = model || (process.env.NEXUS_LLM_MODEL) || prov.defaultModel;
  const spec = prov.chat(useModel, system, user, key);

  const res = await fetch(spec.url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...spec.headers },
    body: JSON.stringify(spec.body),
    signal: AbortSignal.timeout(180000),
  });

  if (!res.ok) {
    const t = await res.text();
    throw new Error(`LLM ${prov.id} ${res.status}: ${t.slice(0, 400)}`);
  }
  const text = spec.pick(await res.json());
  return { text, provider: prov.id, model: useModel };
}

/** Models may wrap JSON in ```json fences - strip whatever they put around it. */
export function extractJson(text) {
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fence ? fence[1] : text;
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('LLM returned no JSON object');
  return JSON.parse(raw.slice(start, end + 1));
}
