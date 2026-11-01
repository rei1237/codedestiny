// CR-005 permitted checks. No full route import, Swiss, production I/O or oracle install.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync, execFileSync } from 'node:child_process';
import ts from 'typescript';

const directory = 'docs/engine-audit/results/execution-selection-20261101';
const output = path.join(directory, process.argv[2] || 'verification.json');
assert.equal(path.resolve(path.dirname(output)), path.resolve(directory));
assert.ok(!fs.existsSync(output), 'OUTPUT_EXISTS');
const sha = text => createHash('sha256').update(text).digest('hex');
const pins = JSON.parse(fs.readFileSync('tools/oracle/expansion/service-source-pins.json'));
const sources = {};
for (const files of Object.values(pins.domains)) for (const [file, hash] of Object.entries(files)) {
  assert.equal(sha(fs.readFileSync(file, 'utf8').replaceAll('\r\n', '\n')), hash, file);
  sources[file] = hash;
}
const adapter = 'worker/lib/ziwei-execution-adapter.js', route = 'worker/routes/ziwei-ai.js';
const source = fs.readFileSync(adapter, 'utf8');
const ast = ts.createSourceFile(adapter, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
assert.deepEqual(ast.statements.filter(ts.isImportDeclaration).map(n => n.moduleSpecifier.text), ['./ziwei-ai-chart.js']);
assert.ok(!/\b(?:import\s*\(|require\s*\(|WebAssembly|fetch\s*\()/.test(source));
sources[adapter] = sha(source.replaceAll('\r\n', '\n'));
sources[route] = sha(fs.readFileSync(route, 'utf8').replaceAll('\r\n', '\n'));
const baseline = '91021aa3a20856f5b4cca6abd8b560ac36ef46ad';
for (const file of ['worker/lib/models.js', 'app/saju/animal-destiny/lib/sajuAdapter.ts', 'app/saju/love-simulation/_engine/normalizeSaju.ts', 'package.json', 'package-lock.json', 'config/payment-freeze.json']) {
  assert.equal(fs.readFileSync(file, 'utf8').replaceAll('\r\n', '\n'), execFileSync('git', ['show', `${baseline}:${file}`], { encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 }).replaceAll('\r\n', '\n'), file);
}
fs.mkdirSync(directory, { recursive: true });
const checks = [
  ['execution-lifecycle', ['--test', '__tests__/ui/ziwei-execution-selection.test.mjs', '__tests__/ui/ziwei-execution-lifecycle.test.mjs']],
  ['original-and-expanded-golden', ['--test', '__tests__/ui/calendar-authority-regression.test.mjs', '__tests__/ui/calendar-authority-expansion.test.mjs']],
  ['paid-storage-mocks', ['--test', '__tests__/ui/paid-report-storage.behavior.test.js', '__tests__/ui/saju-paid-delivery.behavior.test.js', '__tests__/ui/ziwei-paid-resume.behavior.test.js']],
  ['typecheck', ['node_modules/typescript/bin/tsc', '--noEmit']],
  ['targeted-lint', ['node_modules/eslint/bin/eslint.js', '--quiet', adapter, route]],
  ...['payment-freeze', 'paid-gate-ui-regression', 'payment-choice-parity', 'checkout-pass-card', 'paid-feature-billing-policy', 'ai-prompt-billing-policy'].map(name => [name, [`scripts/verify-${name}.mjs`]]),
  ['syntax-adapter', ['--check', adapter]], ['syntax-route', ['--check', route]],
];
const results = [];
for (const [name, args] of checks) {
  const started = Date.now();
  const result = spawnSync(process.execPath, ['--require', './scripts/lib/mock-network-guard.cjs', ...args], { encoding: 'utf8', windowsHide: true, maxBuffer: 4 * 1024 * 1024, env: { ...process.env, TZ: 'UTC' } });
  results.push({ name, args, status: result.status, milliseconds: Date.now() - started, stdout: result.stdout, stderr: result.stderr, error: result.error?.message });
  fs.writeFileSync(output, JSON.stringify({ baseline, sources, results, blocked: ['full route imports/Swiss', 'full check:fast/CI/build', 'verify:billing-pass-policy imports billing -> fortune', 'verify:portone-single-payment imports entire payments route; graph not approved'], productionIO: false }, null, 2) + '\n');
  console.log(JSON.stringify({ name, status: result.status }));
  if (result.status !== 0) { console.log((result.stderr || result.stdout || '').slice(-4000)); process.exitCode = 1; }
}
