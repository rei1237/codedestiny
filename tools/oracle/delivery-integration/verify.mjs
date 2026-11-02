// Local, offline checks only. No DB startup, deployment, package installation or PG.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { spawnSync, execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const baseline = 'e830856fc6b40515626c127bead965f482c13c15';
const directory = 'docs/engine-audit/results/delivery-integration-20261102';
const record = process.argv.includes('--record');
const tests = [
  'ziwei-delivery-integration.test.mjs', 'ziwei-execution-lifecycle.test.mjs',
  'ziwei-execution-selection.test.mjs', 'ziwei-preparation-pinning.test.mjs',
  'ziwei-isolated-db-runner.test.mjs', 'calendar-authority-regression.test.mjs',
  'calendar-authority-expansion.test.mjs', 'paid-report-storage.behavior.test.js',
  'saju-paid-delivery.behavior.test.js', 'ziwei-paid-resume.behavior.test.js',
].map(file => `__tests__/ui/${file}`);
const commands = [
  ['targeted-regressions', ['--test', ...tests]],
  ['targeted-lint', ['node_modules/eslint/bin/eslint.js', '--quiet',
    'tools/oracle/delivery-integration/harness.mjs', 'tools/oracle/delivery-integration/verify.mjs',
    'worker/routes/ziwei-ai.js', '__tests__/ui/ziwei-delivery-integration.test.mjs', '__tests__/ui/ziwei-execution-lifecycle.test.mjs']],
  ['payment-freeze', ['scripts/verify-payment-freeze.mjs']],
  ['payment-choice-parity', ['scripts/verify-payment-choice-parity.mjs', '--self-test']],
  ['doc-freshness', ['scripts/verify-doc-freshness.mjs']],
  ['fast-plan-only', ['scripts/check-changed.mjs', '--profile=fast', '--skip-build', '--plan']],
];
const results = [];
for (const [name, args] of commands) {
  const output = spawnSync(process.execPath, ['--require', './scripts/lib/mock-network-guard.cjs', ...args], {
    encoding: 'utf8', windowsHide: true, maxBuffer: 8 * 1024 * 1024,
    env: { ...process.env, LLM_DRY_RUN: 'true', WORKERS_AI_ENABLED: 'false', NEXT_TELEMETRY_DISABLED: '1', WRANGLER_SEND_METRICS: 'false' },
  });
  results.push({ name, args, status: output.status, stdout: output.stdout, stderr: output.stderr });
  console.log(`${name}: ${output.status}`);
}
const hash = text => createHash('sha256').update(text.replaceAll('\r\n', '\n')).digest('hex');
const oldProof = JSON.parse(fs.readFileSync('docs/engine-audit/results/local-db-20261102/source-proof.json', 'utf8'));
const proof = { baseline, preserved: {}, approvedRouteChange: {} };
for (const file of Object.keys(oldProof.preserved)) {
  const old = hash(execFileSync('git', ['show', `${baseline}:${file}`], { encoding: 'utf8', maxBuffer: 8 * 1024 * 1024, windowsHide: true }));
  const current = hash(fs.readFileSync(file, 'utf8'));
  if (file === 'worker/routes/ziwei-ai.js') proof.approvedRouteChange = { file, before: old, after: current };
  else { assert.equal(current, old, `Protected file changed: ${file}`); proof.preserved[file] = current; }
}
proof.verifiedSources = Object.fromEntries([
  ...tests, 'tools/oracle/delivery-integration/harness.mjs', 'tools/oracle/delivery-integration/verify.mjs',
  'worker/routes/ziwei-ai.js', 'app/ziwei-ai/ZiweiAiClient.tsx', 'lib/fortune/analysis-basis.ts',
  'worker/lib/analysis-basis-contract.js', 'worker/lib/fortune-glossary.js', 'worker/lib/ziwei-hanja.js',
  'worker/lib/result-storage.js', 'scripts/lib/mock-network-guard.cjs',
].map(file => [file, hash(fs.readFileSync(file, 'utf8'))]));
if (record) {
  fs.mkdirSync(directory, { recursive: true });
  fs.writeFileSync(`${directory}/verification.json`, JSON.stringify({ baseline, scope: 'in-memory PG/LLM/DB mocks; no deployment', results }, null, 2) + '\n');
  fs.writeFileSync(`${directory}/source-proof.json`, JSON.stringify(proof, null, 2) + '\n');
}
assert.ok(results.every(row => row.status === 0), 'At least one local check failed; inspect the recorded output');
console.log(`Protected sources unchanged: ${Object.keys(proof.preserved).length}`);
