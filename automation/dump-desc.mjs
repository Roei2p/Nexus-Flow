// Runs INSIDE the n8n container. Dumps the real node descriptions so the
// workflow templates use exact parameter names / typeVersions / credential keys.
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';

const require = createRequire(import.meta.url);
const BASE = '/usr/local/lib/node_modules/n8n/node_modules/.pnpm'
  + '/n8n-nodes-base@file++++home+runner+_work+n8n+n8n+packages+nodes-base'
  + '/node_modules/n8n-nodes-base/dist/nodes';

const targets = [
  'WhatsApp/WhatsApp.node.js',
  'EmailSend/v2/EmailSendV2.node.js',
  'Google/Sheet/v2/GoogleSheetsV2.node.js',
];

function load(rel) {
  const p = path.join(BASE, rel);
  if (!fs.existsSync(p)) { console.error('MISSING PATH:', p); return null; }
  try {
    const m = require(p);
    let cls = Object.values(m).find((v) => typeof v === 'function');
    if (!cls) return null;
    // n8n declares `description` as an instance field, so try the instance first.
    let d = null;
    try { d = new cls().description; } catch { /* constructor may need args */ }
    d = d || cls.description || (cls.prototype && cls.prototype.description);
    if (!d) { console.error('NO DESCRIPTION:', rel, Object.keys(m)); return null; }
    return d;
  } catch (e) {
    return { __error: e.message };
  }
}

for (const rel of targets) {
  const d = load(rel);
  if (!d) { console.log(JSON.stringify({ rel, missing: true })); continue; }
  console.log(`\n### ${rel}`);
  console.log(`displayName=${d.displayName}  name=${d.name}  version=${JSON.stringify(d.version)}`);
  const credEntries = Array.isArray(d.credentials)
    ? d.credentials.map((c) => c.name)
    : Object.keys(d.credentials || {});
  console.log(`credentials=${JSON.stringify(credEntries)}`);
  const walk = (props, depth) => {
    for (const x of props || []) {
      if (depth === 0 && /json|css|body|html|template/i.test(x.name)) {
        console.log(`  (skipped bulky field: ${x.name})`);
        continue;
      }
      const opts = Array.isArray(x.options) && x.options.length <= 30
        ? ' opts=' + JSON.stringify(x.options.map((o) => o.name ?? o.value))
        : '';
      console.log(`${'  '.repeat(depth)}- ${x.name} | ${x.displayName} | type=${x.type} | default=${JSON.stringify(x.default)}${opts}${x.required ? ' | REQUIRED' : ''}`);
      if (x.type === 'collection' || x.type === 'fixedCollection') walk(x.options, depth + 1);
    }
  };
  walk(d.properties, 1);
  for (const c of (Array.isArray(d.credentials) ? d.credentials : Object.entries(d.credentials || {}).map(([k, v]) => ({ name: k, ...v })))) {
    console.log(`  CRED ${c.name} required=${c.required}`);
  }
}
