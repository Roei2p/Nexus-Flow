// Dumps exact option VALUES + displayOptions for the fields the templates need.
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const BASE = '/usr/local/lib/node_modules/n8n/node_modules/.pnpm'
  + '/n8n-nodes-base@file++++home+runner+_work+n8n+n8n+packages+nodes-base'
  + '/node_modules/n8n-nodes-base/dist/nodes';

const WANT = {
  'Google/Sheet/v2/GoogleSheetsV2.node.js':
    ['authentication', 'resource', 'operation', 'documentId', 'sheetName', 'dataMode', 'columns', 'fieldsUi'],
  'EmailSend/v2/EmailSendV2.node.js':
    ['operation', 'fromEmail', 'toEmail', 'subject', 'emailFormat', 'text', 'html', 'options'],
  'WhatsApp/WhatsApp.node.js':
    ['resource', 'operation', 'messagingProduct', 'phoneNumberId', 'recipientPhoneNumber', 'messageType', 'textBody'],
};

for (const [rel, names] of Object.entries(WANT)) {
  const m = require(`${BASE}/${rel}`);
  const cls = Object.values(m).find((v) => typeof v === 'function');
  let d = null;
  try { d = new cls().description; } catch { /* ignore */ }
  d = d || cls.description;
  console.log(`\n########## ${rel}  version=${JSON.stringify(d.version)}`);
  for (const x of (d.properties || [])) {
    if (!names.includes(x.name)) continue;
    const opts = Array.isArray(x.options)
      ? x.options.map((o) => (o.value !== undefined ? { n: o.name, v: o.value } : o.name))
      : undefined;
    console.log(JSON.stringify({
      name: x.name, type: x.type, default: x.default,
      displayOptions: x.displayOptions, modes: x.modes,
      opts,
    }));
  }
}
