// Offline checks. The full Next/Chrome scenarios run separately in verify.mjs.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { spawnSync, execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import ts from 'typescript';

const baseline = '4d0fdf8a8';
const directory = 'docs/engine-audit/results/next-enabled-delivery-20261102';
fs.mkdirSync(directory, { recursive: true });
const tests = [
  'ziwei-next-enabled-selection.test.mjs', 'ziwei-next-mock-boundary.test.mjs', 'ziwei-delivery-integration.test.mjs',
  'ziwei-execution-lifecycle.test.mjs', 'ziwei-execution-selection.test.mjs',
  'ziwei-preparation-pinning.test.mjs', 'ziwei-isolated-db-runner.test.mjs',
  'calendar-authority-regression.test.mjs', 'calendar-authority-expansion.test.mjs',
  'paid-report-storage.behavior.test.js', 'saju-paid-delivery.behavior.test.js',
  'ziwei-paid-resume.behavior.test.js',
  'ziwei-result-disclosure.test.mjs',
  'yeongnyangi-result-focus.test.mjs',
].map(file => `__tests__/ui/${file}`);
const sources = ['worker/routes/ziwei-ai.js', 'tools/oracle/browser-delivery/serve.mjs',
  'app/ziwei-ai/ZiweiAiClient.tsx', 'components/fortune/PaidResultImageGuide.tsx',
  'lib/i18n/result-reference-copy.ts', 'lib/pdf/with-open-result-references.ts',
  'lib/pdf/normalize-capture-colors.ts', 'lib/pdf/export-result-pdf.ts',
  'components/fortune/ResultReference.tsx', 'components/fortune/AnalysisBasisPanel.tsx',
  'app/vedic-ai/VedicAiClient.tsx', 'app/astrology-ai/result/AstrologyAiResultClient.tsx',
  'app/sukuyo-compatibility-ai/SukuyoCompatibilityAiClient.tsx', 'app/new-year-ai-consultation/NewYearAiClient.tsx',
  'app/destiny-compass/_components/EvidenceCard.tsx', 'app/fusion-fortune/ExpertEvidence.tsx',
  'app/fortune/[period]/page.tsx', 'app/fortune/[period]/[sign]/SignFortuneView.tsx',
  'js/core/paid-editorial-report.mjs', 'scripts/verify-paid-editorial-report.mjs',
  ...fs.readdirSync('tools/oracle/next-delivery').filter(file => /\.[cm]js$/.test(file)).map(file => `tools/oracle/next-delivery/${file}`)];
const commands = [
  ['targeted-regressions', ['--test', ...tests]],
  ['targeted-lint', ['node_modules/eslint/bin/eslint.js', '--quiet', ...sources, ...tests.slice(0, 2), ...tests.slice(-2)]],
  ['previous-component-fixture-build', ['--input-type=module', '-e',
    "import assert from 'node:assert/strict'; import {startBrowserFixture} from './tools/oracle/browser-delivery/serve.mjs'; const s=await startBrowserFixture(); try { assert.ok(s.bundleInputs.includes('app/ziwei-ai/ZiweiAiClient.tsx')); const r=await fetch(s.origin+'/api/__unmapped'); assert.equal(r.status,501); console.log('Original component fixture builds; unmapped API denied'); } finally { await new Promise(resolve=>s.http.close(resolve)); }"]],
  ['payment-freeze', ['scripts/verify-payment-freeze.mjs']],
  ['payment-choice-parity', ['scripts/verify-payment-choice-parity.mjs', '--self-test']],
  ['payment-concurrency-guards', ['scripts/verify-payment-concurrency-guards.mjs']],
  ['paid-resume-wiring', ['scripts/verify-paid-resume-wiring.mjs']],
  ['no-nested-retry', ['scripts/verify-no-nested-retry.mjs']],
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
fs.writeFileSync(`${directory}/verification.json`, JSON.stringify({ baseline, results }, null, 2) + '\n');
const hash = text => createHash('sha256').update(text.replaceAll('\r\n', '\n')).digest('hex');
const oldProof = JSON.parse(fs.readFileSync('docs/engine-audit/results/local-db-20261102/source-proof.json', 'utf8'));
const proof = { baseline, preserved: {}, intentionalChanges: {}, verifiedSources: {} };
for (const file of [...Object.keys(oldProof.preserved), 'next.config.mjs', 'next-env.d.ts', 'tsconfig.json',
  'app/layout.js', 'app/providers/UserSessionProvider.tsx', 'app/providers/UnlockProvider.tsx', 'app/_lib/auth-store.ts',
  'app/_lib/billing-client.ts', 'app/ziwei-ai/page.tsx', 'app/ziwei-ai/ZiweiAiRouteClient.tsx']) {
  const oldSource = execFileSync('git', ['show', `${baseline}:${file}`], { encoding: 'utf8', maxBuffer: 8 * 1024 * 1024, windowsHide: true });
  const newSource = fs.readFileSync(file, 'utf8');
  const before = hash(oldSource), after = hash(newSource);
  if (file === 'worker/routes/ziwei-ai.js') {
    const withoutOrderHelper = source => source.replace(/async function createOrReusePaymentPayload\([\s\S]*?(?=async function verifyPaymentForStart)/, '<reviewed-order-race-fix>\n');
    assert.equal(hash(withoutOrderHelper(oldSource)), hash(withoutOrderHelper(newSource)), 'Route changed outside approved order reuse helper');
    assert.notEqual(before, after);
    proof.intentionalChanges[file] = { before, after, scope: 'createOrReusePaymentPayload only; duplicate insert reads validated winner without write retry' };
    continue;
  }
  if (file === 'app/ziwei-ai/ZiweiAiClient.tsx') {
    const declarations = source => {
      const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
      const found = {};
      const visit = node => {
        if (ts.isFunctionDeclaration(node) && node.name) found[node.name.text] = node.getText(ast);
        ts.forEachChild(node, visit);
      };
      visit(ast); return found;
    };
    const oldFunctions = declarations(oldSource), newFunctions = declarations(newSource);
    const preserved = Object.keys(oldFunctions).filter(name => !['ZiweiAiPage', 'handlePdfDownload', 'splitAssistantSections'].includes(name));
    for (const name of preserved) assert.equal(hash(newFunctions[name]), hash(oldFunctions[name]), `Client behavior changed: ${name}`);
    proof.intentionalChanges[file] = { before, after, preservedFunctions: preserved, scope: 'customer reading first, optional chart/tools, PDF disclosure; stored content unchanged' };
    continue;
  }
  assert.equal(after, before, `Protected source changed: ${file}`);
  proof.preserved[file] = after;
}
proof.verifiedSources = Object.fromEntries([...sources, ...tests].map(file => [file, hash(fs.readFileSync(file, 'utf8'))]));
fs.writeFileSync(`${directory}/source-proof.json`, JSON.stringify(proof, null, 2) + '\n');
assert.ok(results.every(row => row.status === 0), 'Inspect verification.json');
console.log(`Protected sources unchanged: ${Object.keys(proof.preserved).length}`);
