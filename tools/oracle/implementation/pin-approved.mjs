// Capture the graph for the two explicitly approved CRs, without executing service code.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { buildAdapter, REPO } from '../service-runner.mjs';
const legacy = JSON.parse(fs.readFileSync(path.join(REPO, 'tools/oracle/service-source-pins.json')));
const approved = new Set(['lib/korean-calendar/authority.js', 'lib/korean-calendar/authority-data.generated.js', 'lib/korean-calendar/policy.js', 'lib/korean-calendar/core.js', 'lib/korean-calendar/ganji.js', 'lib/korean-calendar/natal.js', 'lib/korean-calendar/index.js', 'lib/ziwei-birth-clock.js', 'app/saju/animal-destiny/lib/sajuAdapter.ts', 'app/saju/animal-destiny/engine/localSajuCalculator.ts', 'worker/lib/guardian-fortune/adapters/ziwei.js', 'worker/lib/ziwei-ai-chart.js']);
const domains = {};
for (const domain of ['saju', 'ziwei']) {
  const b = await buildAdapter(domain);
  for (const [file, hash] of Object.entries(b.sources)) if (legacy.domains[domain][file] !== hash) assert.ok(approved.has(file), `UNAPPROVED_SOURCE_CHANGE: ${file}`);
  for (const file of Object.keys(legacy.domains[domain])) assert.ok(file in b.sources, `REMOVED_SOURCE: ${file}`);
  domains[domain] = b.sources;
}
fs.writeFileSync(path.join(REPO, 'tools/oracle/implementation/service-source-pins.json'), JSON.stringify({ approval: 'User approved CR-001/002, defaults OFF, no Swiss or push', baselineCommit: 'c21a64c26f9aa9b0a9650f1ef2670a31f711087a', domains }, null, 2) + '\n');
console.log('Approved graph pinned; original Phase 1/2 pins preserved.');
