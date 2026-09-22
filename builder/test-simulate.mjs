// Deep dry-run of every workflow JSON we ship. Proves the simulator handles
// real generated graphs (loops, branches, expressions) without side effects.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { simulate } from './simulate.mjs';
import { validate } from './validate.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIR = path.join(__dirname, '..', 'automation', 'workflows');

const files = fs.readdirSync(DIR).filter((f) => f.endsWith('.json')).sort();
if (!files.length) { console.log('no workflow files found'); process.exit(1); }

let pass = 0;
let total = 0;

for (const f of files) {
  const wf = JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8'));
  total++;

  const report = validate(wf);
  const trigger = (report.stats?.triggers || [])[0]?.type || '';
  const isWebhook = trigger.includes('webhook');
  const triggerInput = isWebhook
    ? { body: { chatId: '972528110356@c.us', phone: '0501234567', name: 'Test', message: 'shalom' }, headers: {}, query: {} }
    : { timestamp: new Date().toISOString() };

  let sim;
  try {
    sim = simulate(wf, { triggerInput, maxSteps: 40 });
  } catch (e) {
    console.log(`FAIL ${f.padEnd(28)} simulator threw: ${e.message}`);
    continue;
  }

  const ok = report.ok && sim.ok;
  if (ok) pass++;

  console.log(`${ok ? 'PASS' : 'FAIL'} ${f.padEnd(28)} nodes=${String(report.stats?.nodes ?? '?').padStart(2)} `
    + `validate=${report.ok ? 'ok' : report.errors.length + 'err'} `
    + `sim=${sim.ok ? 'ok' : sim.errors.length + 'err'} `
    + `steps=${sim.executedSteps} stubs=${sim.stubbed.length} `
    + `creds=${report.needsCredentials.join(',') || 'none'} `
    + `canActivate=${report.stats?.canActivate}`);

  for (const e of report.errors) console.log(`       validate: ${e}`);
  for (const w of report.warnings) console.log(`       warn: ${w}`);
  for (const e of sim.errors) console.log(`       sim: ${e}`);
  for (const s of sim.stubbed) console.log(`       stub: ${s.node} -> ${s.target} :: ${s.wouldDo}`);
  console.log(`       flow: ${sim.trace.map((t) => `${t.node}${t.stub ? '*' : ''}`).join(' -> ')}`);
  console.log('');
}

console.log(`${pass}/${total} workflows pass validate + dry-run`);
process.exit(pass === total ? 0 : 1);
