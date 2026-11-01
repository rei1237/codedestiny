// CR-006 offline verification: source pins first, no full route/payment/Swiss imports.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync, execFileSync } from 'node:child_process';
import ts from 'typescript';

const directory = 'docs/engine-audit/results/preparation-pinning-20261101';
const output = path.join(directory, process.argv[2] || 'verification.json');
assert.equal(path.resolve(path.dirname(output)), path.resolve(directory));
assert.ok(!fs.existsSync(output), 'OUTPUT_EXISTS');
const sha = text => createHash('sha256').update(text.replaceAll('\r\n', '\n')).digest('hex');
const sources = {}, baseline = 'b69790198a9c94988a2f7c0c93604ef603bdc376';
const pins = JSON.parse(fs.readFileSync('tools/oracle/expansion/service-source-pins.json'));
for (const files of Object.values(pins.domains)) for (const [file, digest] of Object.entries(files)) {
  assert.equal(sha(fs.readFileSync(file, 'utf8')), digest, file); sources[file] = digest;
}
const helper = 'worker/lib/ziwei-calculation-preparation.js';
const runtime = [helper, 'worker/lib/models.js', 'worker/routes/ziwei-ai.js', 'app/ziwei-ai/ZiweiAiClient.tsx'];
for (const file of runtime) sources[file] = sha(fs.readFileSync(file, 'utf8'));
const text = fs.readFileSync(helper, 'utf8');
const ast = ts.createSourceFile(helper, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
assert.deepEqual(ast.statements.filter(ts.isImportDeclaration).map(n => n.moduleSpecifier.text), ['node:crypto', './ziwei-execution-adapter.js']);
assert.ok(!/\b(?:import\s*\(|require\s*\(|WebAssembly|fetch\s*\(|updateOne\s*\(|deleteOne\s*\()/.test(text));
for (const file of ['worker/lib/ziwei-execution-adapter.js', 'app/saju/animal-destiny/lib/sajuAdapter.ts', 'app/saju/love-simulation/_engine/normalizeSaju.ts', 'app/hooks/usePaidResume.ts', 'package.json', 'package-lock.json', 'config/payment-freeze.json']) {
  const current = fs.readFileSync(file, 'utf8');
  assert.equal(current.replaceAll('\r\n', '\n'), execFileSync('git', ['show', `${baseline}:${file}`], { encoding: 'utf8', maxBuffer: 4e6 }).replaceAll('\r\n', '\n'), file);
  sources[file] = sha(current);
}
const functionText = (source, name) => {
  const ast = ts.createSourceFile('route.js', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  const node = ast.statements.find(n => ts.isFunctionDeclaration(n) && n.name?.text === name);
  assert.ok(node, name); return node.getText(ast).replaceAll('\r\n', '\n');
};
const route = fs.readFileSync(runtime[2], 'utf8');
const oldRoute = execFileSync('git', ['show', `${baseline}:${runtime[2]}`], { encoding: 'utf8', maxBuffer: 2e6 });
for (const name of ['normalizeConsultationInput', 'createAccessToken', 'verifyAccessToken', 'resolveStartAccess', 'handleResult', 'applyUsageOnce', 'createOrReusePaymentPayload', 'verifyPaymentForStart', 'saveZiweiDelivery']) assert.equal(functionText(route, name), functionText(oldRoute, name), name);
for (const name of ['handleEnsureAccess', 'handleBasis', 'handleStart']) assert.ok(!/calendarAuthorityV2\s*:/.test(functionText(route, name)), 'No production opt-in');
fs.mkdirSync(directory, { recursive: true });
const checks = [
  ['preparation-and-execution', ['--test', '__tests__/ui/ziwei-preparation-pinning.test.mjs', '__tests__/ui/ziwei-execution-selection.test.mjs', '__tests__/ui/ziwei-execution-lifecycle.test.mjs']],
  ['original-and-expanded-golden', ['--test', '__tests__/ui/calendar-authority-regression.test.mjs', '__tests__/ui/calendar-authority-expansion.test.mjs']],
  ['paid-storage-mocks', ['--test', '__tests__/ui/paid-report-storage.behavior.test.js', '__tests__/ui/saju-paid-delivery.behavior.test.js', '__tests__/ui/ziwei-paid-resume.behavior.test.js']],
  ['typecheck', ['node_modules/typescript/bin/tsc', '--noEmit']],
  ['targeted-lint', ['node_modules/eslint/bin/eslint.js', '--quiet', ...runtime]],
  ...['payment-freeze', 'paid-gate-ui-regression', 'payment-choice-parity', 'checkout-pass-card', 'paid-feature-billing-policy', 'ai-prompt-billing-policy'].map(name => [name, [`scripts/verify-${name}.mjs`]]),
];
const results = [];
for (const [name, args] of checks) {
  const start = Date.now();
  const r = spawnSync(process.execPath, ['--require', './scripts/lib/mock-network-guard.cjs', ...args], { encoding: 'utf8', windowsHide: true, maxBuffer: 4e6, env: { ...process.env, TZ: 'UTC' } });
  results.push({ name, args, status: r.status, milliseconds: Date.now() - start, stdout: r.stdout, stderr: r.stderr, error: r.error?.message });
  fs.writeFileSync(output, JSON.stringify({ baseline, sources, results, productionIO: false,
    blocked: ['full route imports/Swiss', 'full check:fast/CI/build', 'verify:billing-pass-policy imports billing -> fortune', 'verify:portone-single-payment imports full payments graph', 'real Mongo/PG/LLM calls'],
  }, null, 2) + '\n');
  console.log(JSON.stringify({ name, status: r.status }));
  if (r.status !== 0) { console.log((r.stderr || r.stdout || '').slice(-4000)); process.exitCode = 1; }
}
