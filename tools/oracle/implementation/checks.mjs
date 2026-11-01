// Durable results for explicitly selected, Swiss-free checks. Never invokes the full test/build gate.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { REPO } from '../service-runner.mjs';
const checks = [
  ['typecheck', ['node_modules/typescript/bin/tsc', '--noEmit']],
  ['golden', ['--test', '__tests__/ui/calendar-authority-regression.test.mjs']],
  ['approved-public-paths', ['--test', '--test-name-pattern=101 officially|flags default|immutable', 'tools/oracle/implementation/regression.test.mjs']],
  ['official-evidence', ['tools/oracle/implementation/verify-evidence.mjs']],
  ['authority-data-freshness', ['tools/oracle/implementation/build-authorities.mjs', '--check']],
  ['golden-freshness', ['tools/oracle/implementation/build-golden.mjs', '--check']],
  ['classic-table-freshness', ['scripts/build-korean-calendar-table.mjs', '--check']],
  ['mirror-freshness', ['scripts/verify-public-mirror-fresh.mjs']],
  ['targeted-lint', ['node_modules/eslint/bin/eslint.js', '--quiet', 'app/saju/animal-destiny/engine/localSajuCalculator.ts', 'app/saju/animal-destiny/lib/sajuAdapter.ts', 'lib/korean-calendar/core.js', 'lib/korean-calendar/ganji.js', 'lib/korean-calendar/natal.js', 'lib/korean-calendar/policy.js', 'lib/korean-calendar/authority.js', 'lib/ziwei-birth-clock.js', 'worker/lib/ziwei-ai-chart.js', 'worker/lib/guardian-fortune/adapters/ziwei.js']],
];
const output = path.join(REPO, 'docs/engine-audit/results/implementation-20261101/verification.json');
const results = [];
for (const [name, args] of checks) {
  const start = Date.now();
  const result = spawnSync(process.execPath, args, { cwd: REPO, windowsHide: true, encoding: 'utf8', maxBuffer: 4 * 1024 * 1024, env: { ...process.env, TZ: 'UTC' } });
  results.push({ name, command: ['node', ...args].join(' '), status: result.status, error: result.error?.message, milliseconds: Date.now() - start, stdout: result.stdout, stderr: result.stderr });
  fs.writeFileSync(output, JSON.stringify({ results }, null, 2) + '\n');
  console.log(JSON.stringify({ check: name, status: result.status, milliseconds: Date.now() - start }));
  if (result.status !== 0) console.log((result.stderr || result.stdout || result.error?.message || '').slice(-6000));
}
if (results.some(r => r.status !== 0)) process.exitCode = 1;
