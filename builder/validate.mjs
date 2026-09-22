// Structural validation of a generated workflow against the real node catalog.
// Never throws - returns a report so the UI can render the whole process.
import { byType } from './nodes.mjs';

const TRIGGERS = [
  'n8n-nodes-base.webhook', 'n8n-nodes-base.scheduleTrigger', 'n8n-nodes-base.manualTrigger',
  'n8n-nodes-base.errorTrigger', 'n8n-nodes-base.formTrigger', 'n8n-nodes-base.cron',
];

/**
 * The model sometimes invents an HTTP-ish node type. Rather than failing the
 * whole build, rewrite it to the real httpRequest node - but only when the
 * parameters prove it really is an HTTP call, so genuine typos still error.
 */
function isHttpFallback(node, allNodes) {
  const p = node.parameters || {};
  const hasUrl = typeof p.url === 'string' && p.url.length > 0;
  const httpish = /http|fetch|request|webhook|rest|api|call/i.test(node.type || '');
  if (!hasUrl) return false;
  if (httpish) return true;
  // also accept if it would feed an http-ish neighbour downstream
  return allNodes.some((o) => /http|fetch|request/i.test(o.type || '')
    && Object.values(o.parameters || {}).some((v) => typeof v === 'string'
      && v.includes(`{{ $('${node.name}')`)));
}

/** Pick the installed version closest to what the model asked for. */
function nearestVersion(available, wanted) {
  const nums = available.map(Number);
  if (nums.includes(wanted)) return String(wanted);
  let best = nums[0];
  for (const v of nums) if (Math.abs(v - wanted) < Math.abs(best - wanted)) best = v;
  return String(best);
}

/** Marks a node rewritten by the http fallback so credential checks can skip it. */
function nodeHadFallback(node) { return node.__httpFallback === true; }

export function validate(wf) {
  const errors = [];
  const warnings = [];
  const needsCredentials = new Set();

  if (!wf || typeof wf !== 'object') return fail('workflow is not an object');
  if (!Array.isArray(wf.nodes)) return fail('workflow.nodes is not an array');
  if (!wf.name) errors.push('missing workflow.name');

  const nodes = wf.nodes;
  const names = new Set();
  const byName = new Map();

  nodes.forEach((n, i) => {
    const at = `nodes[${i}]`;
    if (!n.name) { errors.push(`${at}: missing name`); return; }
    if (names.has(n.name)) errors.push(`${at}: duplicate node name "${n.name}"`);
    names.add(n.name);
    byName.set(n.name, n);

    if (!n.type) { errors.push(`"${n.name}": missing type`); return; }

    let def = byType(n.type);
    if (!def) {
      if (isHttpFallback(n, nodes)) {
        warnings.push(`"${n.name}": using generic httpRequest fallback for "${n.type}"`);
        n.__httpFallback = true;
        n.type = 'n8n-nodes-base.httpRequest';
        n.typeVersion = 4.2;
        n.parameters = n.parameters && Object.keys(n.parameters).length
          ? n.parameters
          : { method: 'GET', url: 'https://example.com', options: {} };
        // n.type was just rewritten, so re-resolve def against the new type.
        // Leaving it null makes the typeVersion lookup below throw
        // "Cannot read properties of null (reading 'availableVersions')".
        def = byType(n.type);
        if (!def) {
          errors.push(`"${n.name}": httpRequest fallback unavailable - not installed in this n8n`);
          return;
        }
      } else {
        errors.push(`"${n.name}": unknown node type "${n.type}" - not installed in this n8n`);
        return;
      }
    }
    const effType = n.type;

    // ---- typeVersion --------------------------------------------------
    const wanted = Number(n.typeVersion ?? def.version);
    const actual = nearestVersion(def.availableVersions, wanted);
    if (String(n.typeVersion ?? '') !== actual) {
      warnings.push(`"${n.name}": typeVersion ${n.typeVersion} -> using ${actual}`);
      n.typeVersion = parseFloat(actual);
    }

    // ---- parameters ---------------------------------------------------
    const raw = n.parameters || {};
    // The same parameter name legitimately repeats with different displayOptions
    // - e.g. googleSheets "operation" exists once for resource=sheet and once for
    // resource=spreadsheet, httpRequest "specifyBody" once per contentType.
    // Keying by name alone silently kept only the last variant, so valid values
    // were rejected against the wrong variant's options. Keep them all.
    const known = new Map();
    for (const p of def.properties) {
      if (!known.has(p.n)) known.set(p.n, []);
      known.get(p.n).push(p);
    }
    const shownWith = (p, ctx) => {
      if (!p.do) return true;
      const show = p.do.show || {};
      const hide = p.do.hide || {};
      for (const [key, vals] of Object.entries(show)) {
        if (key === '@version') { if (!vals.some((v) => String(v) === String(n.typeVersion))) return false; continue; }
        if (!vals.some((v) => String(v) === String(ctx[key]))) return false;
      }
      for (const [key, vals] of Object.entries(hide)) {
        if (key === '@version') { if (vals.some((v) => String(v) === String(n.typeVersion))) return false; continue; }
        if (vals.some((v) => String(v) === String(ctx[key]))) return false;
      }
      return true;
    };

    // n8n treats an unset parameter as its declared default when deciding what
    // the node displays. Judging displayOptions against the raw parameters alone
    // hid required fields whose visibility hangs off a defaulted discriminator -
    // e.g. whatsApp messageType defaults to "text", which requires textBody.
    // Fill in defaults for whatever is currently visible, twice in case one
    // default unlocks another.
    const params = { ...raw };
    for (let pass = 0; pass < 2; pass++) {
      let added = false;
      for (const p of def.properties) {
        if (params[p.n] !== undefined) continue;
        const dflt = p.def;
        if (dflt === undefined || dflt === '' || dflt === null) continue;
        if (!shownWith(p, params)) continue;
        params[p.n] = dflt;
        added = true;
      }
      if (!added) break;
    }
    const shown = (p) => shownWith(p, params);

    for (const [k, v] of Object.entries(params)) {
      if (effType === 'n8n-nodes-base.httpRequest' && k === 'url') continue; // fallback has no url schema
      const variants = known.get(k);
      if (!variants) { warnings.push(`"${n.name}": param "${k}" does not exist - ignored by n8n`); continue; }

      const optionVariants = variants.filter((p) => p.t === 'options' && Array.isArray(p.opts) && p.opts.length);
      if (!optionVariants.length || typeof v !== 'string') continue;

      // Judge the value against the variant this node actually displays. When no
      // variant matches - the discriminating parameter is unset and n8n is using
      // its default - fall back to every variant rather than reject a valid value.
      const active = optionVariants.filter(shown);
      const allowed = new Set((active.length ? active : optionVariants).flatMap((p) => p.opts));
      if (!allowed.has(v)) {
        const scope = active.length ? '' : ' (no variant is shown for this node)';
        errors.push(`"${n.name}": param "${k}" = "${v}" is not a valid option (allowed: ${[...allowed].slice(0, 8).join(', ')}${scope})`);
      }
    }

    for (const p of def.properties) {
      if (!p.req || !shown(p)) continue;
      if (p.def !== undefined && p.def !== '' && p.def !== null) continue;
      if (params[p.n] === undefined || params[p.n] === '' || params[p.n] === null) {
        // a generic httpRequest fallback legitimately has no url in its schema
        if (effType === 'n8n-nodes-base.httpRequest' && p.n === 'url') continue;
        errors.push(`"${n.name}": required parameter "${p.n}" (${p.d}) is missing`);
      }
    }

    // ---- credentials ---------------------------------------------------
    // A generic httpRequest fallback legitimately carries no credential.
    if (!(effType === 'n8n-nodes-base.httpRequest' && nodeHadFallback(n))) {
      for (const c of def.credentials) {
        if (c.required) needsCredentials.add(c.name);
      }
      const declared = n.credentials || {};
      for (const c of def.credentials) {
        if (!c.required) continue;
        if (!declared[c.name] && !Object.keys(declared).some((k) => k.startsWith(c.name))) {
          needsCredentials.add(c.name);
        }
      }
    }

    if (!n.position) n.position = [0, 0];
  });

  // ---- connections ------------------------------------------------------
  const conns = wf.connections || {};
  const targets = new Set();
  const edges = [];

  for (const [from, byTypeKey] of Object.entries(conns)) {
    if (!names.has(from)) { errors.push(`connections reference unknown node "${from}"`); continue; }
    for (const [branch, groups] of Object.entries(byTypeKey || {})) {
      (groups || []).forEach((group, gi) => {
        (group || []).forEach((link) => {
          if (!link || !link.node) return;
          if (!names.has(link.node)) {
            errors.push(`"${from}" -> unknown target "${link.node}"`);
            return;
          }
          targets.add(link.node);
          edges.push({ from, to: link.node, branch, out: gi, type: link.type || 'main' });
        });
      });
    }
  }

  // ---- graph shape -------------------------------------------------------
  const entryNodes = nodes.filter((n) => n.type && TRIGGERS.includes(n.type));
  if (nodes.length > 1 && entryNodes.length === 0) {
    errors.push('no trigger node (webhook / schedule / manual) - workflow can never start');
  }
  if (entryNodes.length > 1) {
    warnings.push(`${entryNodes.length} trigger nodes - n8n allows only one active trigger`);
  }

  const reachable = new Set();
  const starts = entryNodes.map((n) => n.name);
  const walk = (name) => {
    if (reachable.has(name)) return;
    reachable.add(name);
    for (const e of edges) if (e.from === name) walk(e.to);
  };
  starts.forEach(walk);

  for (const n of nodes) {
    if (n.type && TRIGGERS.includes(n.type)) continue;
    if (!reachable.has(n.name)) warnings.push(`"${n.name}" is unreachable from the trigger`);
    if (!targets.has(n.name) && !starts.includes(n.name)) warnings.push(`"${n.name}" has nothing feeding it`);
  }

  const hasCycle = detectCycle(nodes.map((n) => n.name), edges);
  if (hasCycle) warnings.push('workflow contains a loop (valid for splitInBatches, otherwise check it)');

  if (!wf.settings || !wf.settings.executionOrder) wf.settings = { ...(wf.settings || {}), executionOrder: 'v1' };

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    needsCredentials: [...needsCredentials],
    stats: {
      nodes: nodes.length,
      edges: edges.length,
      triggers: entryNodes.map((n) => ({ name: n.name, type: n.type })),
      reachable: reachable.size,
      canActivate: errors.length === 0 && needsCredentials.size === 0,
    },
    graph: edges.map((e) => ({ ...e })),
  };

  function fail(msg) {
    return { ok: false, errors: [msg], warnings: [], needsCredentials: [], stats: null, graph: [] };
  }
}

function detectCycle(names, edges) {
  const adj = new Map(names.map((n) => [n, []]));
  for (const e of edges) if (adj.has(e.from)) adj.get(e.from).push(e.to);
  const state = new Map();
  let found = false;
  const visit = (n) => {
    if (state.get(n) === 1) { found = true; return; }
    if (state.get(n) === 2) return;
    state.set(n, 1);
    for (const t of adj.get(n) || []) visit(t);
    state.set(n, 2);
  };
  for (const n of names) if (!state.get(n)) visit(n);
  return found;
}
