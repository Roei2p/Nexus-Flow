import fs from 'node:fs';
import path from 'node:path';

const NM = '/usr/local/lib/node_modules/n8n/node_modules';
console.log('exists NM:', fs.existsSync(NM));
const pnpm = path.join(NM, '.pnpm');
console.log('exists .pnpm:', fs.existsSync(pnpm));
if (fs.existsSync(pnpm)) {
  for (const e of fs.readdirSync(pnpm)) if (e.startsWith('n8n-nodes-base')) console.log('  entry:', JSON.stringify(e));
}
const base = '/usr/local/lib/node_modules/n8n/node_modules/.pnpm'
  + '/n8n-nodes-base@file++++home+runner+_work+n8n+n8n+packages+nodes-base'
  + '/node_modules/n8n-nodes-base/dist/nodes';
console.log('exists base:', fs.existsSync(base), base);
for (const t of ['WhatsApp/WhatsApp.node.js', 'EmailSend/EmailSend.node.js', 'Google/Sheet/GoogleSheets.node.js']) {
  console.log(t, '->', fs.existsSync(path.join(base, t)));
}
