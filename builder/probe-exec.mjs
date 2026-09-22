// Debug helper: dump an n8n execution's node-by-node result.
// Usage: node builder/probe-exec.mjs 116
import { n8n } from '../automation/lib.mjs';

const id = process.argv[2] || '116';
const d = await n8n(`/api/v1/executions/${id}?includeData=true`);
const j = d.data ?? d;
console.log('execution', id, 'status=', j.status, 'workflow=', j.workflowId, 'mode=', j.mode);
const rd = j.data?.resultData;
if (rd?.error) console.log('ERROR:', JSON.stringify(rd.error, null, 2).slice(0, 3000));
for (const [name, arr] of Object.entries(rd?.runData ?? {})) {
  const last = arr[arr.length - 1];
  console.log(`\n== ${name} (error=${JSON.stringify(last.error ?? null)})`);
  const item = last.data?.main?.[0]?.[0];
  if (item) console.log('   out:', JSON.stringify(item.json).slice(0, 700));
  if (last.error) console.log('   err:', JSON.stringify(last.error).slice(0, 1500));
}
