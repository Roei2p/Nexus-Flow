// Loads the node catalog produced by catalog.mjs and picks the subset of nodes
// relevant to a given request, so the LLM prompt stays small enough to be good.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA = path.join(__dirname, 'data');

const readJson = (f) => JSON.parse(fs.readFileSync(path.join(DATA, f), 'utf8'));

let _index = null;
let _full = null;

export const index = () => (_index ||= readJson('catalog-index.json'));
export const full = () => (_full ||= readJson('catalog-full.json'));

export function byType(type) {
  return full().find((n) => n.type === type) || null;
}

/** Nodes that must always be offered regardless of the request. */
const CORE = [
  'n8n-nodes-base.webhook',
  'n8n-nodes-base.scheduleTrigger',
  'n8n-nodes-base.manualTrigger',
  'n8n-nodes-base.set',
  'n8n-nodes-base.code',
  'n8n-nodes-base.if',
  'n8n-nodes-base.filter',
  'n8n-nodes-base.merge',
  'n8n-nodes-base.httpRequest',
  'n8n-nodes-base.respondToWebhook',
  'n8n-nodes-base.noOp',
  'n8n-nodes-base.splitInBatches',
  'n8n-nodes-base.errorTrigger',
  'n8n-nodes-base.wait',
];

/** Map of human/channel words -> node types worth showing. */
const HINTS = [
  [/whats\s?app|וואטסאפ|וואטס|green\s?api/i, ['n8n-nodes-base.whatsApp', 'n8n-nodes-base.httpRequest']],
  [/mail|email|אימייל|דואר|smtp/i, ['n8n-nodes-base.emailSend', 'n8n-nodes-base.emailReadImap']],
  [/gmail/i, ['n8n-nodes-base.gmail']],
  [/sheet|גיליון|google\s*sheet|אקסל/i, ['n8n-nodes-base.googleSheets', 'n8n-nodes-base.microsoftExcel']],
  [/telegram|טלגרם/i, ['n8n-nodes-base.telegram']],
  [/slack|סלאק/i, ['n8n-nodes-base.slack']],
  [/discord/i, ['n8n-nodes-base.discord']],
  [/airtable/i, ['n8n-nodes-base.airtable']],
  [/hubspot|lead|ליד/i, ['n8n-nodes-base.hubspot']],
  [/notion/i, ['n8n-nodes-base.notion']],
  [/stripe|payment|תשלום|ח爸יל/i, ['n8n-nodes-base.stripe']],
  [/twilio|sms|sms|סמס/i, ['n8n-nodes-base.twilio']],
  [/supabase|postgres|sql|database|מסד/i, ['n8n-nodes-base.postgres', 'n8n-nodes-base.supabase']],
  [/redis/i, ['n8n-nodes-base.redis']],
  [/http|api|webhook|fetch/i, ['n8n-nodes-base.httpRequest']],
  [/schedule|cron|תזמן|כל שעה|יומי/i, ['n8n-nodes-base.scheduleTrigger']],
  [/form|טופס/i, ['n8n-nodes-base.formTrigger', 'n8n-nodes-base.typeform']],
  [/drive/i, ['n8n-nodes-base.googleDrive']],
  [/calendar|לוח שנה/i, ['n8n-nodes-base.googleCalendar']],
  [/openai|gpt|llm|ai\b/i, ['n8n-nodes-base.openAi']],
];

/**
 * Pick a compact, relevant slice of the catalog for one planning prompt.
 * Always includes core nodes; adds hinted ones; tops up with the closest
 * name matches so the model never feels it lacks a building block.
 */
export function selectNodes(request, { limit = 70 } = {}) {
  const all = index();
  const chosen = new Map();
  const add = (type) => { const n = all.find((x) => x.type === type); if (n) chosen.set(type, n); };

  CORE.forEach(add);

  const req = String(request || '');
  for (const [re, types] of HINTS) if (re.test(req)) types.forEach(add);

  // score remaining by token overlap against displayName/type/params
  const tokens = req.toLowerCase().split(/[^a-z0-9\u0590-\u05FF]+/i).filter((t) => t.length > 2);
  const scored = all
    .filter((n) => !chosen.has(n.type))
    .map((n) => {
      const hay = `${n.displayName} ${n.type} ${n.params.join(' ')}`.toLowerCase();
      let s = 0;
      for (const t of tokens) if (hay.includes(t)) s += 1;
      return { n, s };
    })
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s);

  for (const { n } of scored) {
    if (chosen.size >= limit) break;
    chosen.set(n.type, n);
  }
  return [...chosen.values()];
}

/** Compact line per node, kept short so the prompt fits comfortably. */
export function promptLines(nodes) {
  return nodes.map((n) => `${n.type} | v${n.version} | ${n.displayName}`
    + (n.credentials.length ? ` | creds:${n.credentials.join(',')}` : '')
    + ` | params:${n.params.join(',')}`);
}
