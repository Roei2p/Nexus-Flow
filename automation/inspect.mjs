// One-off: dump the shape of the existing workflow so new definitions
// match the node typeVersions actually installed in this n8n instance.
import { n8n } from './lib.mjs';

const list = await n8n('/api/v1/workflows?limit=50');
console.log(`workflows: ${list.data.length}`);

for (const w of list.data) {
  const full = await n8n(`/api/v1/workflows/${w.id}`);
  console.log(`\n=== ${full.name} (${full.id}) active=${full.active} ===`);
  for (const n of full.nodes) {
    console.log(`  node: ${n.name}`);
    console.log(`        type=${n.type} typeVersion=${n.typeVersion}`);
    console.log(`        params=${JSON.stringify(n.parameters)}`);
  }
  console.log(`  connections=${JSON.stringify(full.connections)}`);
}
