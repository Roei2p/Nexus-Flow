// Runs INSIDE the n8n container.
// Scans every node description n8n actually ships and emits:
//   /tmp/catalog-index.json  - compact, safe to paste into an LLM prompt
//   /tmp/catalog-full.json   - full params + displayOptions, used for validation
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';

const require = createRequire(import.meta.url);
const ROOT = '/usr/local/lib/node_modules/n8n/node_modules/.pnpm'
  + '/n8n-nodes-base@file++++home+runner+_work+n8n+n8n+packages+nodes-base'
  + '/node_modules/n8n-nodes-base/dist/nodes';

function walk(dir, out = []) {
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.name.endsWith('.node.js')) out.push(p);
  }
  return out;
}

const files = walk(ROOT);
const byType = new Map(); // type -> Map(version -> description)

for (const f of files) {
  let d = null;
  try {
    const m = require(f);
    const cls = Object.values(m).find((v) => typeof v === 'function');
    if (!cls) continue;
    try { d = new cls().description; } catch { d = cls.description; }
  } catch { continue; }
  if (!d || !d.name || !Array.isArray(d.properties) || d.properties.length === 0) continue;

  const versions = Array.isArray(d.version) ? d.version : [d.version ?? 1];
  const type = `n8n-nodes-base.${d.name}`;
  if (!byType.has(type)) byType.set(type, new Map());
  // versioned wrappers declare many versions but no properties; real ones declare one
  const v = versions[versions.length - 1];
  byType.get(type).set(String(v), { d, file: path.relative(ROOT, f) });
}

const slimProp = (x) => ({
  n: x.name,
  d: x.displayName,
  t: x.type,
  req: x.required === true,
  def: (typeof x.default === 'string' || typeof x.default === 'number' || typeof x.default === 'boolean')
    ? x.default : undefined,
  do: x.displayOptions || undefined,
  opts: (Array.isArray(x.options) && x.options.length && x.options.length <= 40)
    ? x.options.map((o) => (o.value !== undefined ? o.value : o.name))
    : undefined,
});

const index = [];
const full = [];

for (const [type, vers] of byType) {
  const versions = [...vers.keys()].sort((a, b) => parseFloat(a) - parseFloat(b));
  const latest = versions[versions.length - 1];
  const { d } = vers.get(latest);
  const credList = Array.isArray(d.credentials)
    ? d.credentials.map((c) => ({ name: c.name, required: c.required !== false }))
    : Object.entries(d.credentials || {}).map(([k, v]) => ({ name: k, required: v.required !== false }));

  index.push({
    type,
    displayName: d.displayName,
    version: latest,
    credentials: credList.map((c) => c.name),
    params: d.properties.map((p) => p.name).filter((v, i, a) => a.indexOf(v) === i),
  });

  full.push({
    type,
    displayName: d.displayName,
    version: latest,
    availableVersions: versions,
    credentials: credList,
    properties: d.properties.map(slimProp),
  });
}

index.sort((a, b) => a.type.localeCompare(b.type));
full.sort((a, b) => a.type.localeCompare(b.type));

fs.writeFileSync('/tmp/catalog-index.json', JSON.stringify(index, null, 1));
fs.writeFileSync('/tmp/catalog-full.json', JSON.stringify(full));
console.log(`scanned ${files.length} files -> ${index.length} node types`);
console.log(`index ${(fs.statSync('/tmp/catalog-index.json').size / 1024).toFixed(0)} KB, full ${(fs.statSync('/tmp/catalog-full.json').size / 1024).toFixed(0)} KB`);
