// Runs INSIDE the n8n container.
// Scans every node description n8n actually ships and emits:
//   /tmp/catalog-index.json  - compact, safe to paste into an LLM prompt
//   /tmp/catalog-full.json   - full params + displayOptions, used for validation
//
// Since n8n 2.x many nodes are VersionedNodeType: the wrapper keeps
// name/displayName but declares NO properties, while the per-version
// implementation classes (reachable via the instance's nodeVersions map) own
// the real properties. Skipping those wrappers silently dropped httpRequest,
// emailSend, googleSheets and ~50 others from the catalog, which made
// validate.mjs report "unknown node type" / wrong parameter options.
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

/** Resolve one entry of a nodeVersions map to its description object. */
function describeVersion(raw) {
  try {
    const obj = typeof raw === 'function' ? new raw() : raw;
    return (obj && obj.description) || obj || null;
  } catch { return null; }
}

/**
 * Merge a VersionedNodeType wrapper with its implementation classes.
 * Returns { d, available } or null when the node is not versioned / unusable.
 */
function mergeVersioned(base, cls) {
  let inst = null;
  try { inst = new cls(); } catch { return null; }
  const nv = inst && inst.nodeVersions;
  if (!nv || typeof nv !== 'object') return null;

  const keys = Object.keys(nv);
  if (!keys.length) return null;

  const sorted = keys.slice().sort((a, b) => parseFloat(a) - parseFloat(b));
  // Prefer the version n8n itself declares as the default.
  const chosenKey = (base.defaultVersion !== undefined && nv[base.defaultVersion] !== undefined)
    ? String(base.defaultVersion)
    : sorted[sorted.length - 1];

  const chosen = describeVersion(nv[chosenKey]);
  if (!chosen || !Array.isArray(chosen.properties)) return null;

  // Union of every declared version so nearestVersion() can pick correctly.
  const available = [];
  for (const k of sorted) {
    const idesc = describeVersion(nv[k]);
    const v = idesc && idesc.version;
    if (Array.isArray(v)) v.forEach((x) => available.push(String(x)));
    else if (v !== undefined && v !== null) available.push(String(v));
    else available.push(k);
  }

  return {
    d: {
      ...base,
      version: chosen.version !== undefined ? chosen.version : (base.defaultVersion ?? chosenKey),
      properties: chosen.properties,
      credentials: chosen.credentials ?? base.credentials,
      displayOptions: chosen.displayOptions,
      defaults: chosen.defaults,
    },
    available: [...new Set(available)].sort((a, b) => parseFloat(a) - parseFloat(b)),
  };
}

const files = walk(ROOT);
const byType = new Map(); // type -> Map(version -> description)

let mergedCount = 0;
let emptyProps = 0;

for (const f of files) {
  let cls = null;
  try {
    const m = require(f);
    cls = Object.values(m).find((v) => typeof v === 'function');
    if (!cls) continue;
  } catch { continue; }

  let d = null;
  try { d = new cls().description; } catch { d = cls.description; }
  // Implementation files (HttpRequestV3...) carry no name - the wrapper owns it.
  if (!d || !d.name) continue;

  let available = null;
  const hasProps = Array.isArray(d.properties) && d.properties.length > 0;
  if (!hasProps) {
    const merged = mergeVersioned(d, cls);
    if (merged) { d = merged.d; available = merged.available; mergedCount++; }
    else if (!Array.isArray(d.properties)) d = { ...d, properties: [] };
  }
  if (!Array.isArray(d.properties)) continue;
  if (d.properties.length === 0) emptyProps++;

  const type = `n8n-nodes-base.${d.name}`;
  if (!byType.has(type)) byType.set(type, new Map());
  const vers = byType.get(type);

  if (available) {
    // Register under every version the node declares.
    for (const v of available) {
      if (!vers.has(v)) vers.set(v, { d, file: path.relative(ROOT, f) });
    }
  } else {
    // versioned wrappers declare many versions but no properties; real ones declare one
    const versions = Array.isArray(d.version) ? d.version : [d.version ?? 1];
    const v = versions[versions.length - 1];
    vers.set(String(v), { d, file: path.relative(ROOT, f) });
  }
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
console.log(`versioned wrappers merged: ${mergedCount}, nodes with no parameters: ${emptyProps}`);
console.log(`index ${(fs.statSync('/tmp/catalog-index.json').size / 1024).toFixed(0)} KB, full ${(fs.statSync('/tmp/catalog-full.json').size / 1024).toFixed(0)} KB`);

// Spot-check the nodes the shipped workflows actually use.
for (const t of ['n8n-nodes-base.httpRequest', 'n8n-nodes-base.googleSheets',
  'n8n-nodes-base.whatsApp', 'n8n-nodes-base.emailSend', 'n8n-nodes-base.noOp']) {
  const hit = index.find((n) => n.type === t);
  console.log(`  ${t}: ${hit ? 'OK v' + hit.version + ' params=' + hit.params.length : 'MISSING'}`);
}
