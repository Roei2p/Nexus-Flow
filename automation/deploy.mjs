// Deploy every JSON under ./workflows to n8n (create or update) and activate it.
// Usage:  node automation/deploy.mjs
import { n8n, listWorkflowFiles, loadWorkflow } from './lib.mjs';

const files = listWorkflowFiles();
if (!files.length) {
  console.error('No workflow JSON files found in automation/workflows/');
  process.exit(1);
}

const existing = await n8n('/api/v1/workflows?limit=200');
const byName = new Map((existing.data || []).map((w) => [w.name, w.id]));

console.log(`n8n holds ${existing.data.length} workflow(s); deploying ${files.length}\n`);

let failed = 0;

for (const file of files) {
  const { wf } = loadWorkflow(file);
  const knownId = byName.get(wf.name);
  let id = knownId;
  let action;

  try {
    if (knownId) {
      await n8n(`/api/v1/workflows/${knownId}`, { method: 'PUT', body: wf });
      action = 'updated';
    } else {
      const created = await n8n('/api/v1/workflows', { method: 'POST', body: wf });
      id = created.id;
      action = 'created';
    }
    await n8n(`/api/v1/workflows/${id}/activate`, { method: 'POST' });
    console.log(`  OK   ${file.padEnd(26)} -> ${wf.name.padEnd(26)} [${action}] id=${id} active=true`);
  } catch (e) {
    failed++;
    console.log(`  FAIL ${file.padEnd(26)} -> ${e.message}`);
    if (e.body) console.log(`       ${JSON.stringify(e.body).slice(0, 400)}`);
  }
}

const after = await n8n('/api/v1/workflows?limit=200');
console.log(`\n${after.data.length} workflow(s) in n8n:`);
for (const w of after.data) console.log(`  ${w.active ? '●' : '○'} ${w.name.padEnd(26)} ${w.id}`);

process.exit(failed ? 1 : 0);
