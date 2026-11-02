// Offline regressions and source preservation; never starts a database or PG.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { spawnSync, execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import ts from 'typescript';

const baseline = 'a81ebc0f6';
const directory = 'docs/engine-audit/results/browser-delivery-20261102';
const tests = [
  'ziwei-delivery-integration.test.mjs', 'ziwei-execution-lifecycle.test.mjs',
  'ziwei-execution-selection.test.mjs', 'ziwei-preparation-pinning.test.mjs',
  'ziwei-isolated-db-runner.test.mjs', 'calendar-authority-regression.test.mjs',
  'calendar-authority-expansion.test.mjs', 'paid-report-storage.behavior.test.js',
  'saju-paid-delivery.behavior.test.js', 'ziwei-paid-resume.behavior.test.js',
].map(file => `__tests__/ui/${file}`);
const sources = ['app/ziwei-ai/ZiweiAiClient.tsx', 'tools/oracle/delivery-integration/harness.mjs',
  ...fs.readdirSync('tools/oracle/browser-delivery').filter(file => /\.(mjs|tsx)$/.test(file)).map(file => `tools/oracle/browser-delivery/${file}`)];
const commands = [
  ['targeted-regressions', ['--test', ...tests]],
  ['targeted-lint', ['node_modules/eslint/bin/eslint.js', '--quiet', ...sources]],
  ['payment-freeze', ['scripts/verify-payment-freeze.mjs']],
  ['payment-choice-parity', ['scripts/verify-payment-choice-parity.mjs', '--self-test']],
  ['doc-freshness', ['scripts/verify-doc-freshness.mjs']],
  ['fast-plan-only', ['scripts/check-changed.mjs', '--profile=fast', '--skip-build', '--plan']],
];
const results = [];
for (const [name, args] of commands) {
  const result = spawnSync(process.execPath, ['--require', './scripts/lib/mock-network-guard.cjs', ...args], {
    encoding: 'utf8', windowsHide: true, maxBuffer: 8 * 1024 * 1024,
    env: { ...process.env, LLM_DRY_RUN: 'true', WORKERS_AI_ENABLED: 'false', NEXT_TELEMETRY_DISABLED: '1', WRANGLER_SEND_METRICS: 'false' },
  });
  results.push({ name, args, status: result.status, stdout: result.stdout, stderr: result.stderr });
  console.log(`${name}: ${result.status}`);
}
// Check changed TypeScript and its import graph, without executing any imports.
const config = ts.readConfigFile('tsconfig.json', ts.sys.readFile);
assert.equal(config.error, undefined);
const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, process.cwd());
const program = ts.createProgram([...sources.filter(file => file.endsWith('.tsx')), 'next-env.d.ts'],
  { ...parsed.options, incremental: false, noEmit: true });
const diagnostics = [...parsed.errors, ...ts.getPreEmitDiagnostics(program)];
results.push({ name: 'changed-typescript-import-graph', status: diagnostics.length ? 1 : 0,
  stdout: ts.formatDiagnosticsWithColorAndContext(diagnostics, {
    getCanonicalFileName: file => file, getCurrentDirectory: () => process.cwd(), getNewLine: () => '\n',
  }) });
console.log(`changed-typescript-import-graph: ${diagnostics.length} diagnostics`);

const hash = text => createHash('sha256').update(text.replaceAll('\r\n', '\n')).digest('hex');
const oldProof = JSON.parse(fs.readFileSync('docs/engine-audit/results/local-db-20261102/source-proof.json', 'utf8'));
const proof = { baseline, preserved: {}, approvedDisplayChange: {} };
for (const file of Object.keys(oldProof.preserved)) {
  const before = hash(execFileSync('git', ['show', `${baseline}:${file}`], { encoding: 'utf8', maxBuffer: 8 * 1024 * 1024, windowsHide: true }));
  const after = hash(fs.readFileSync(file, 'utf8'));
  if (file === 'app/ziwei-ai/ZiweiAiClient.tsx') proof.approvedDisplayChange = { file, before, after };
  else { assert.equal(after, before, `Protected source changed: ${file}`); proof.preserved[file] = after; }
}
proof.verifiedSources = Object.fromEntries([...sources, ...tests].map(file => [file, hash(fs.readFileSync(file, 'utf8'))]));
fs.writeFileSync(`${directory}/verification.json`, JSON.stringify({ baseline, results }, null, 2) + '\n');
fs.writeFileSync(`${directory}/source-proof.json`, JSON.stringify(proof, null, 2) + '\n');
assert.ok(results.every(row => row.status === 0), 'Inspect verification.json for failing checks');
console.log(`Protected sources unchanged: ${Object.keys(proof.preserved).length}`);
