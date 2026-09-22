// Debug helper: list the most recent n8n executions.
import { n8n } from '../automation/lib.mjs';

const d = await n8n('/api/v1/executions?limit=20');
const rows = d.data ?? [];
console.log('error executions:', rows.length);
for (const e of rows) console.log([e.id, e.status, e.workflowId, e.startedAt].join(' | '));
