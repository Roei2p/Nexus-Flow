import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PORT = Number(process.env.PORT || 3000);
const N8N_URL = (process.env.N8N_URL || 'http://n8n:5678').replace(/\/+$/, '');
const API_KEY = process.env.N8N_API_KEY || '';

const app = express();
app.disable('x-powered-by');
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

async function n8n(p, init = {}) {
  const res = await fetch(N8N_URL + p, {
    ...init,
    headers: {
      'X-N8n-API-Key': API_KEY,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
    signal: AbortSignal.timeout(15000),
  });
  const text = await res.text();
  let body = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  if (!res.ok) {
    const err = new Error(`n8n responded ${res.status}`);
    err.status = res.status;
    err.body = body;
    throw err;
  }
  return body;
}

app.get('/healthz', (_req, res) => res.json({ status: 'ok', service: 'nexus-flow' }));

app.get('/api/summary', async (_req, res, next) => {
  try {
    const [health, workflows, executions] = await Promise.all([
      fetch(N8N_URL + '/healthz', { signal: AbortSignal.timeout(8000) })
        .then((r) => ({ ok: r.ok, status: r.status }))
        .catch(() => ({ ok: false, status: 0 })),
      n8n('/api/v1/workflows?limit=100').catch(() => ({ data: [] })),
      n8n('/api/v1/executions?limit=20').catch(() => ({ data: [] })),
    ]);

    const wf = workflows.data || [];
    const ex = executions.data || [];

    res.json({
      n8n: { reachable: health.ok, url: N8N_URL },
      counts: {
        workflows: wf.length,
        active: wf.filter((w) => w.active).length,
        inactive: wf.filter((w) => !w.active).length,
        executions: ex.length,
      },
      workflows: wf,
      executions: ex,
      events: { count: events.length, data: events.slice(0, 50) },
    });
  } catch (e) {
    next(e);
  }
});

app.get('/api/workflows', async (_req, res, next) => {
  try { res.json(await n8n('/api/v1/workflows?limit=100')); } catch (e) { next(e); }
});

app.get('/api/executions', async (req, res, next) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 20, 100);
    res.json(await n8n(`/api/v1/executions?limit=${limit}`));
  } catch (e) { next(e); }
});

for (const action of ['activate', 'deactivate']) {
  app.post(`/api/workflows/:id/${action}`, async (req, res, next) => {
    try {
      res.json(await n8n(`/api/v1/workflows/${req.params.id}/${action}`, { method: 'POST' }));
    } catch (e) { next(e); }
  });
}

// ---- inbound event bus: n8n workflows POST here ----
const events = [];
const MAX_EVENTS = 200;

app.post('/api/events', (req, res) => {
  const body = req.body && typeof req.body === 'object' ? req.body : { value: req.body };
  const entry = { id: globalThis.crypto.randomUUID(), receivedAt: new Date().toISOString(), ...body };
  events.unshift(entry);
  if (events.length > MAX_EVENTS) events.pop();
  console.log(`[nexus] event: ${entry.event || 'unknown'} from ${entry.source || '?'}`);
  res.status(202).json({ ok: true, stored: events.length });
});

app.get('/api/events', (_req, res) => {
  res.json({ count: events.length, data: events });
});

app.delete('/api/events', (_req, res) => {
  events.length = 0;
  res.json({ ok: true, count: 0 });
});

// ---- outbound channel proxy: keeps provider secrets OUT of n8n ----------
// Green API authenticates via URL PATH (…/waInstance{id}/{method}/{token}),
// so the token cannot be sent as a header and must never sit inside an n8n
// workflow definition. n8n posts here with {chatId, message} instead.
import { isConfigured as greenReady, status as greenStatus, settings as greenSettings, sendMessage as greenSend } from './builder/greenapi.mjs';

app.get('/api/channels', async (_req, res, next) => {
  try {
    if (!greenReady()) return res.json({ whatsapp: { configured: false, provider: 'green-api' } });
    const s = await greenStatus();
    res.json({ whatsapp: { provider: 'green-api', ...s } });
  } catch (e) { next(e); }
});

// n8n's WhatsApp entry point. Body: {chatId|phone|to, message}
app.post('/api/channels/whatsapp/send', async (req, res, next) => {
  try {
    const { chatId, phone, to, message } = req.body || {};
    const id = String(chatId || phone || to || '').trim();
    if (!id) return res.status(400).json({ error: 'chatId (or phone/to) is required' });
    if (!message) return res.status(400).json({ error: 'message is required' });
    const chat_id = id.includes('@') ? id : `${id.replace(/\D/g, '')}@c.us`;
    const out = await greenSend({ chatId: chat_id, message: String(message) });

    events.unshift({
      id: globalThis.crypto.randomUUID(),
      receivedAt: new Date().toISOString(),
      event: 'whatsapp.sent',
      source: 'green-api',
      workflow: 'POST /api/channels/whatsapp/send',
      channel: 'whatsapp',
      status: 'sent',
      chatId: chat_id,
      idMessage: out?.idMessage ?? null,
    });
    if (events.length > MAX_EVENTS) events.pop();

    res.json({ ok: true, chatId: chat_id, idMessage: out?.idMessage ?? null });
  } catch (e) { next(e); }
});

app.get('/api/channels/whatsapp/status', async (_req, res, next) => {
  try { res.json(await greenStatus()); } catch (e) { next(e); }
});

app.get('/api/channels/whatsapp/settings', async (_req, res, next) => {
  try {
    const s = await greenSettings();
    res.json({ wid: s.wid, webhookUrl: s.webhookUrl || null });
  } catch (e) { next(e); }
});

// Dry-run: validates config + payload shape but sends NOTHING.
app.post('/api/channels/whatsapp/dry-run', (req, res) => {
  const { chatId, phone, to, message } = req.body || {};
  const id = String(chatId || phone || to || '').trim();
  const problems = [];
  if (!process.env.idInstance) problems.push('idInstance missing');
  if (!process.env.apiTokenInstance) problems.push('apiTokenInstance missing');
  if (!id) problems.push('chatId/phone missing');
  else if (!id.includes('@') && !id.replace(/\D/g, '')) problems.push('chatId is not a phone number');
  if (!message) problems.push('message missing');
  const chat_id = id ? (id.includes('@') ? id : `${id.replace(/\D/g, '')}@c.us`) : null;
  res.json({
    ok: problems.length === 0,
    problems,
    wouldCall: `POST ${(process.env.GREENAPI_BASE || 'https://api.greenapi.com').replace(/\/+$/, '')}/waInstance${process.env.idInstance || '<id>'}/sendMessage/<token>`,
    payload: { chatId: chat_id, messageLength: String(message || '').length },
    tokenExposedToN8n: false,
  });
});

app.use('/api', (_req, res) => res.status(404).json({ error: 'not found' }));

app.use((err, _req, res, _next) => {
  const status = err.status || 500;
  if (status >= 500) console.error('[nexus]', err.message);
  res.status(status).json({ error: err.message, details: err.body ?? null });
});

app.listen(PORT, () => {
  console.log(`Nexus-Flow listening on :${PORT} -> n8n at ${N8N_URL}`);
  if (!API_KEY) console.warn('[nexus] N8N_API_KEY is not set - n8n calls will fail');
});
