// Shared helper for the Nexus-Flow automation CLI.
// Zero dependencies - uses the built-in fetch() of Node 18+.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const ROOT = path.resolve(__dirname, '..', '..');
export const WORKFLOW_DIR = path.join(__dirname, 'workflows');

export const N8N_URL = (process.env.N8N_URL || 'http://localhost:5678').replace(/\/+$/, '');
export const NEXUS_URL = (process.env.NEXUS_URL || 'http://localhost:3000').replace(/\/+$/, '');

/** Read the API key from either ./env (as the user keeps it) or ./.env */
export function apiKey() {
  if (process.env.N8N_API_KEY) return process.env.N8N_API_KEY.trim();
  for (const f of ['env', '.env']) {
    const p = path.join(ROOT, f);
    if (!fs.existsSync(p)) continue;
    const line = fs.readFileSync(p, 'utf8').split(/\r?\n/).find((l) => /^N8N_API_KEY=|^8N8=/.test(l));
    if (line) return line.slice(line.indexOf('=') + 1).trim();
  }
  throw new Error('No n8n API key found (looked for env / .env with N8N_API_KEY= or 8N8=)');
}

/** Call the n8n public API. Throws on non-2xx with the response body attached. */
export async function n8n(p, { method = 'GET', body } = {}) {
  const res = await fetch(N8N_URL + p, {
    method,
    headers: {
      'X-N8n-API-Key': apiKey(),
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(20000),
  });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!res.ok) {
    const err = new Error(`${method} ${p} -> ${res.status}`);
    err.status = res.status;
    err.body = data;
    throw err;
  }
  return data;
}

/** Same, against the Nexus-Flow dashboard itself. */
export async function nexus(p, { method = 'GET', body } = {}) {
  const res = await fetch(NEXUS_URL + p, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(20000),
  });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!res.ok) {
    const err = new Error(`${method} ${p} -> ${res.status}`);
    err.status = res.status;
    err.body = data;
    throw err;
  }
  return data;
}

export function loadWorkflow(file) {
  const p = path.isAbsolute(file) ? file : path.join(WORKFLOW_DIR, file);
  const wf = JSON.parse(fs.readFileSync(p, 'utf8'));
  return { file: path.basename(p), wf };
}

export function listWorkflowFiles() {
  if (!fs.existsSync(WORKFLOW_DIR)) return [];
  return fs.readdirSync(WORKFLOW_DIR).filter((f) => f.endsWith('.json')).sort();
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
