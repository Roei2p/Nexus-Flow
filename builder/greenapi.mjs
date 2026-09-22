// Green API (WhatsApp gateway) client.
//
// Auth shape is PATH-BASED:  {base}/waInstance{id}/{method}/{token}
// That means the token can never be sent as a header, so this module is the
// ONLY place that ever reads it. n8n workflows call Nexus-Flow instead, and
// the secret never appears inside an n8n workflow definition.
//
// Docs: https://green-api.com/en/docs/api/
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..');

function readEnvFiles() {
  const found = {};
  for (const file of ['.env', 'env']) {
    const p = path.join(ROOT, file);
    if (!fs.existsSync(p)) continue;
    for (const line of fs.readFileSync(p, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && m[2] && found[m[1]] === undefined) found[m[1]] = m[2].trim();
    }
  }
  return found;
}

const env = { ...readEnvFiles(), ...process.env };

export const CONFIG = {
  base: (process.env.GREENAPI_BASE || env.GREENAPI_BASE || 'https://api.greenapi.com').replace(/\/+$/, ''),
  idInstance: env.idInstance || env.ID_INSTANCE || '',
  apiTokenInstance: env.apiTokenInstance || env.API_TOKEN_INSTANCE || '',
};

export const isConfigured = () => Boolean(CONFIG.idInstance && CONFIG.apiTokenInstance);

const mask = (s) => (s && s.length > 12 ? `${s.slice(0, 6)}…${s.slice(-4)}` : '***');

let lastCall = 0;
const MIN_GAP_MS = 400; // observed 429 when polling getStateInstance too fast
// Keep retries SHORT: every retry runs inside the queue, so a long backoff
// multiplies the wait for everyone queued behind it. 2 tries x 15s stays well
// inside the 30s the HTTP client on the other side allows.
const MAX_RETRIES = 2;
const FETCH_TIMEOUT_MS = 15000;
const MAX_QUEUE = 8;

// Serialize every Green API call through one promise chain. The gap check alone
// is not enough: two requests arriving together both see the same `lastCall`
// and fire at once, which Green API answers with 429.
let chain = Promise.resolve();
let queued = 0;

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function once(method, body) {
  const gap = MIN_GAP_MS - (Date.now() - lastCall);
  if (gap > 0) await wait(gap);
  lastCall = Date.now();

  const url = `${CONFIG.base}/waInstance${CONFIG.idInstance}/${method}/${CONFIG.apiTokenInstance}`;
  const res = await fetch(url, {
    method: body ? 'POST' : 'GET',
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });

  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }

  if (res.status === 429) {
    const e = new Error('Green API rate limited (429) - retry shortly');
    e.status = 429;
    e.body = data;
    throw e;
  }
  if (!res.ok) {
    const e = new Error(`Green API ${method} -> ${res.status}: ${typeof data === 'string' ? data.slice(0, 200) : JSON.stringify(data)}`);
    e.status = res.status === 403 ? 502 : res.status;
    e.body = data;
    throw e;
  }
  return data;
}

async function call(method, body) {
  if (!isConfigured()) {
    const e = new Error('Green API not configured: need idInstance + apiTokenInstance in env');
    e.status = 503;
    throw e;
  }
  // Fail fast rather than let callers hang behind a growing backlog.
  if (queued >= MAX_QUEUE) {
    const e = new Error('Green API busy - too many queued calls, retry shortly');
    e.status = 429;
    throw e;
  }
  queued++;
  const task = chain.then(async () => {
    let lastErr;
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        return await once(method, body);
      } catch (e) {
        lastErr = e;
        if (e.status !== 429 || attempt === MAX_RETRIES) throw e;
        await wait(500 * (attempt + 1)); // 500ms, 1s - short, queue-friendly
      }
    }
    throw lastErr;
  }).finally(() => { queued--; });
  // Keep the chain alive even when a caller's request fails.
  chain = task.catch(() => {});
  return task;
}

/** Connection health - safe to poll. */
export async function status() {
  const started = Date.now();
  const stateInstance = await call('getStateInstance');
  return {
    configured: true,
    host: CONFIG.base,
    idInstance: CONFIG.idInstance,
    token: mask(CONFIG.apiTokenInstance),
    stateInstance: stateInstance.stateInstance,
    authorized: stateInstance.stateInstance === 'authorized',
    latencyMs: Date.now() - started,
  };
}

/** Account settings, incl. the instance's own WhatsApp id (wid). */
export async function settings() {
  const s = await call('getSettings');
  return { wid: s.wid, webhookUrl: s.webhookUrl || null, raw: s };
}

/** Normalize a bare phone number into Green API's chatId form. */
export function toChatId(input) {
  const raw = String(input || '').trim();
  if (raw.includes('@')) return raw; // already 1234@c.us / 123@g.us
  const digits = raw.replace(/\D/g, '');
  if (!digits) throw Object.assign(new Error('chatId/phone is empty'), { status: 400 });
  return `${digits}@c.us`;
}

/**
 * Send a text message.
 * @param {{chatId?:string, phone?:string, message:string}} payload
 */
export async function sendMessage({ chatId, phone, message }) {
  const text = String(message ?? '');
  if (!text) throw Object.assign(new Error('message is required'), { status: 400 });
  const id = toChatId(chatId || phone);
  const res = await call('sendMessage', { chatId: id, message: text });
  return { ok: true, chatId: id, idMessage: res?.idMessage ?? null, ...res };
}

/** Convenience: send to the instance's own number ("Message yourself"). */
export async function sendToSelf(message) {
  const s = await settings();
  const wid = s.wid;
  if (!wid) throw Object.assign(new Error('instance wid unknown'), { status: 502 });
  return sendMessage({ chatId: wid, message });
}
