// Offline checks. The full Next/Chrome scenarios run separately in verify.mjs.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { spawnSync, execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const baseline = '50c697d8d';
const directory = 'docs/engine-audit/results/next-delivery-20261102';
const tests = [
  'ziwei-next-mock-boundary.test.mjs', 'ziwei-delivery-integration.test.mjs',
  'ziwei-execution-lifecycle.test.mjs', 'ziwei-execution-selection.test.mjs',
  'ziwei-preparation-pinning.test.mjs', 'ziwei-isolated-db-runner.test.mjs',
  'calendar-authority-regression.test.mjs', 'calendar-authority-expansion.test.mjs',
  'paid-report-storage.behavior.test.js', 'saju-paid-delivery.behavior.test.js',
  'ziwei-paid-resume.behavior.test.js',
].map(file => `__tests__/ui/${file}`);
const sources = ['tools/oracle/browser-delivery/serve.mjs',
  ...fs.readdirSync('tools/oracle/next-delivery').filter(file => /\.[cm]js$/.test(file)).map(file => `tools/oracle/next-delivery/${file}`)];
const commands = [
  ['targeted-regressions', ['--test', ...tests]],
  ['targeted-lint', ['node_modules/eslint/bin/eslint.js', '--quiet', ...sources, tests[0]]],
  ['previous-component-fixture-build', ['--input-type=module', '-e',
    "import assert from 'node:assert/strict'; import {startBrowserFixture} from './tools/oracle/browser-delivery/serve.mjs'; const s=await startBrowserFixture(); try { assert.ok(s.bundleInputs.includes('app/ziwei-ai/ZiweiAiClient.tsx')); const r=await fetch(s.origin+'/api/__unmapped'); assert.equal(r.status,501); console.log('Original component fixture builds; unmapped API denied'); } finally { await new Promise(resolve=>s.http.close(resolve)); }"]],
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
const hash = text => createHash('sha256').update(text.replaceAll('\r\n', '\n')).digest('hex');
const oldProof = JSON.parse(fs.readFileSync('docs/engine-audit/results/local-db-20261102/source-proof.json', 'utf8'));
const proof = { baseline, preserved: {}, verifiedSources: {} };
for (const file of [...Object.keys(oldProof.preserved), 'next.config.mjs', 'next-env.d.ts', 'tsconfig.json',
  'app/layout.js', 'app/providers/UserSessionProvider.tsx', 'app/providers/UnlockProvider.tsx', 'app/_lib/auth-store.ts',
  'app/_lib/billing-client.ts', 'app/ziwei-ai/page.tsx', 'app/ziwei-ai/ZiweiAiRouteClient.tsx']) {
  const before = hash(execFileSync('git', ['show', `${baseline}:${file}`], { encoding: 'utf8', maxBuffer: 8 * 1024 * 1024, windowsHide: true }));
  const after = hash(fs.readFileSync(file, 'utf8'));
  assert.equal(after, before, `Protected source changed: ${file}`);
  proof.preserved[file] = after;
}
proof.verifiedSources = Object.fromEntries([...sources, ...tests].map(file => [file, hash(fs.readFileSync(file, 'utf8'))]));
fs.writeFileSync(`${directory}/verification.json`, JSON.stringify({ baseline, results }, null, 2) + '\n');
fs.writeFileSync(`${directory}/source-proof.json`, JSON.stringify(proof, null, 2) + '\n');
assert.ok(results.every(row => row.status === 0), 'Inspect verification.json');
console.log(`Protected sources unchanged: ${Object.keys(proof.preserved).length}`);
