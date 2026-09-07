const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync, mkdtempSync, writeFileSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join } = require('node:path');
const { spawnSync } = require('node:child_process');
const scripts = JSON.parse(readFileSync('package.json', 'utf8')).scripts;
const load = () => import('../../scripts/lib/verification-plan.mjs');
const input = (files, complete = true) => ({ files, complete, baseSha: 'a'.repeat(40), headSha: 'b'.repeat(40), errors: complete ? [] : ['Missing base'] });

for (const [name, files, tier, builds] of [
  ['documentation', ['docs/context/payment-gating.md'], 'fast', [false, false]],
  ['presentation CSS', ['styles/site.css'], 'fast', [false, false]],
  ['UI', ['app/components/Button.tsx'], 'standard', [true, false]],
  ['Worker only', ['worker/routes/ziwei-ai.js'], 'critical', [false, true]],
  ['payment', ['lib/payment/portone.ts'], 'critical', [true, true]],
  ['unknown', ['new-unclassified.xyz'], 'critical', [true, true]],
  ['shared', ['lib/shared.ts'], 'critical', [true, true]],
  ['test only', ['__tests__/worker/example.test.js'], 'critical', [true, false]],
  ['mirror', ['public/js/core/pass-verdict.js'], 'critical', [true, true]],
  ['mixed', ['docs/a.md', 'worker/routes/payments.js'], 'critical', [true, true]],
]) {
  test(name + ' selects expected risk and independent build targets', async () => {
    const { createVerificationPlan } = await load();
    const plan = createVerificationPlan(input(files), { scripts });
    assert.equal(plan.tier, tier);
    assert.deepEqual([plan.buildTargets.frontend, plan.buildTargets.worker], builds);
    if (name === 'test only') assert.ok(plan.steps.some((step) => step.name === 'test:jest'));
  });
}

test('fast cannot reduce critical contract; each expensive step runs once', async () => {
  const { createVerificationPlan, criticalSteps } = await load();
  for (const profile of ['fast', 'ui', 'worker', 'payment', 'all']) {
    const plan = createVerificationPlan(input(['worker/routes/payments.js']), { scripts, profile });
    for (const step of criticalSteps(scripts)) assert.ok(plan.steps.some((candidate) => JSON.stringify(candidate) === JSON.stringify(step)));
    for (const name of ['typecheck', 'smoke:core', 'build:worker', 'build:cf']) assert.equal(plan.steps.filter((step) => step.name === name).length, 1);
  }
});

test('missing base and empty diff select full checks', async () => {
  const { createVerificationPlan } = await load();
  for (const changes of [input(['docs/a.md'], false), input([])]) {
    const plan = createVerificationPlan(changes, { scripts });
    assert.equal(plan.failClosed, true);
    assert.equal(plan.tier, 'critical');
    assert.deepEqual(plan.buildTargets, { frontend: true, worker: true });
  }
});

test('rename includes source and destination; deletion stays in risk input', async () => {
  const { parseNameStatus, createVerificationPlan } = await load();
  const files = parseNameStatus('R100\0worker/routes/payments.js\0docs/retired.md\0D\0app/hooks/usePaidResume.ts\0');
  assert.deepEqual(files, ['app/hooks/usePaidResume.ts', 'docs/retired.md', 'worker/routes/payments.js']);
  assert.equal(createVerificationPlan(input(files), { scripts }).tier, 'critical');
  assert.throws(() => parseNameStatus('R100\0old.js\0'), /destination/);
});

test('unsupported critical syntax blocks instead of dropping a guard', async () => {
  const { criticalSteps } = await load();
  assert.throws(() => criticalSteps({ 'check:critical': 'node unknown.js' }), /Unsupported/);
});

test('skip-build preserves critical Worker contract and static guards', async () => {
  const { createVerificationPlan } = await load();
  const plan = createVerificationPlan(input(['worker/routes/payments.js']), { scripts, skipBuild: true });
  assert.ok(plan.steps.some((step) => step.name === 'build:worker'));
  assert.ok(plan.steps.some((step) => step.name === 'test:node'));
  assert.ok(!plan.steps.some((step) => step.name === 'build:cf'));
});

test('git collector includes staged renames, deleted paths, untracked files and missing-base errors', async () => {
  const { collectChanges } = await load();
  const dir = mkdtempSync(join(tmpdir(), 'cd-plan-'));
  const git = (...args) => {
    const result = spawnSync('git', args, { cwd: dir, encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
  };
  try {
    git('init');
    writeFileSync(join(dir, 'before.js'), 'export const x = 1;\n');
    git('add', '.');
    git('-c', 'user.email=test@invalid', '-c', 'user.name=test', 'commit', '-m', 'fixture');
    git('mv', 'before.js', 'after.js');
    writeFileSync(join(dir, 'untracked.js'), 'new');
    const changes = collectChanges({ root: dir, base: 'HEAD' });
    assert.equal(changes.complete, true);
    assert.deepEqual(changes.files, ['after.js', 'before.js', 'untracked.js']);
    assert.equal(collectChanges({ root: dir, base: 'missing-base' }).complete, false);
    git('reset', '--hard', 'HEAD');
    rmSync(join(dir, 'before.js'));
    assert.ok(collectChanges({ root: dir, base: 'HEAD' }).files.includes('before.js'));
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('all expands CI guards and deduplicates static tests and critical checks', async () => {
  const { createVerificationPlan, expandCiGuards, ciGuardSteps } = await load();
  const workflow = { jobs: { guards: { steps: [
    { uses: 'actions/checkout@v4' }, { run: 'npm ci' },
    { run: 'npm run test:node\nnpm run verify:sitemap-drift\nnode scripts/i18n-check.mjs' },
    { run: 'npm run verify:public-mirror-fresh' },
  ] }, critical: { steps: [{ run: 'npm test' }] } } };
  const plan = expandCiGuards(createVerificationPlan(input(['styles/site.css']), { scripts, profile: 'all' }), workflow, scripts);
  assert.equal(plan.steps.filter((step) => step.name === 'test:node').length, 1);
  assert.equal(plan.steps.filter((step) => step.name === 'verify:sitemap-drift').length, 1);
  assert.ok(plan.steps.some((step) => step.kind === 'node' && step.file === 'scripts/i18n-check.mjs'));
  assert.ok(!plan.steps.some((step) => step.kind === 'ci-static-guards'));
  assert.ok(plan.steps.findIndex((step) => step.name === 'verify:public-mirror-fresh') < plan.steps.findIndex((step) => step.name === 'test:node'));
  assert.equal(plan.steps.filter((step) => step.name === 'verify:public-mirror-fresh').length, 1);
  for (const step of [{ run: 'echo ignored' }, { run: 'npm run test:node', if: 'false' }, { run: 'npm run missing-check' }]) {
    assert.throws(() => ciGuardSteps({ jobs: { guards: { steps: [step] } } }, scripts), /Unsupported/);
  }
  assert.throws(() => ciGuardSteps({ jobs: { guards: { steps: [{ run: 'npm ci' }] } } }, scripts), /no checks/);
});

test('smoke is omitted only when both full suites provably contain every target', async () => {
  const { fullSuitesCoverSmoke, createVerificationPlan } = await load();
  const jestConfig = { roots: ['<rootDir>/__tests__'], testPathIgnorePatterns: ['/__tests__/ui/'] };
  assert.equal(fullSuitesCoverSmoke(scripts, jestConfig), true);
  assert.equal(fullSuitesCoverSmoke({ ...scripts, 'test:jest': 'node scripts/run-mock-tests.mjs jest', 'test:node': 'node scripts/run-mock-tests.mjs node' }, jestConfig), true);
  const plan = createVerificationPlan(input(['worker/routes/payments.js']), { scripts, jestConfig });
  assert.ok(!plan.steps.some((step) => step.name === 'smoke:core'));
  assert.ok(plan.steps.some((step) => step.name === 'test:jest'));
  assert.ok(plan.steps.some((step) => step.name === 'test:node'));
  assert.equal(fullSuitesCoverSmoke(scripts, { ...jestConfig, testPathIgnorePatterns: ['/__tests__/worker/'] }), false);
  assert.equal(fullSuitesCoverSmoke({ ...scripts, 'test:node': 'node --test other/*.js' }, jestConfig), false);
  assert.equal(fullSuitesCoverSmoke(scripts, undefined), false);
});

test('generic app deletion and rename escalate after reading real git statuses', async () => {
  const { collectChanges, createVerificationPlan } = await load();
  const { mkdirSync } = require('node:fs');
  const dir = mkdtempSync(join(tmpdir(), 'cd-plan-removal-'));
  const git = (...args) => {
    const result = spawnSync('git', args, { cwd: dir, encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
  };
  try {
    git('init');
    mkdirSync(join(dir, 'app'));
    writeFileSync(join(dir, 'app/card.js'), 'export const card = 1;\n');
    git('add', '.');
    git('-c', 'user.email=test@invalid', '-c', 'user.name=test', 'commit', '-m', 'fixture');
    git('mv', 'app/card.js', 'app/panel.js');
    const renamed = collectChanges({ root: dir, base: 'HEAD' });
    assert.equal(renamed.hasDeletionOrRename, true);
    assert.deepEqual(renamed.deletedOrRenamedFiles, ['app/card.js', 'app/panel.js']);
    for (const changes of [renamed]) {
      const plan = createVerificationPlan(changes, { scripts });
      assert.equal(plan.tier, 'critical');
      assert.ok(plan.steps.some((step) => step.name === 'test:jest'));
      assert.deepEqual(plan.buildTargets, { frontend: true, worker: true });
    }
    git('reset', '--hard', 'HEAD');
    rmSync(join(dir, 'app/card.js'));
    const removed = collectChanges({ root: dir, base: 'HEAD' });
    assert.equal(removed.hasDeletionOrRename, true);
    assert.equal(createVerificationPlan(removed, { scripts }).tier, 'critical');
    git('add', '.');
    git('-c', 'user.email=test@invalid', '-c', 'user.name=test', 'commit', '-m', 'remove');
    assert.equal(createVerificationPlan(collectChanges({ root: dir, base: 'HEAD^', working: false }), { scripts }).tier, 'critical');
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('all includes critical static checks, preserves flags, and excludes CI setup', async () => {
  const { createVerificationPlan, expandCiGuards } = await load();
  const workflow = { jobs: {
    guards: { steps: [{ run: 'npm run test:node' }] },
    critical: { steps: [
      { name: 'Setup Node', uses: 'actions/setup-node@v4' },
      { name: 'Install', if: "needs.classify.outputs.runs_critical == 'true'", run: 'npm ci' },
      { name: 'Notice', if: "needs.classify.outputs.runs_critical != 'true'", run: 'echo skipped' },
      { name: 'Tests', if: "needs.classify.outputs.runs_critical == 'true'", run: 'npm test' },
      { name: 'Static deployment contracts', if: "needs.classify.outputs.runs_critical == 'true'", env: { GITHUB_TOKEN: '${{ github.token }}' }, run: '# fixture-only checks\nnpm run verify:deploy-safe\nnpm run verify:deployed-sha -- --self-test\nnode scripts/apply-staging-noindex.mjs --self-test' },
    ] },
  } };
  const initial = createVerificationPlan(input(['styles/site.css']), { scripts, profile: 'all' });
  const plan = expandCiGuards(initial, workflow, scripts);
  assert.equal(plan.steps.filter((step) => step.name === 'test:node').length, 1);
  assert.equal(plan.steps.filter((step) => step.name === 'test:jest').length, 1);
  assert.ok(plan.steps.some((step) => step.name === 'verify:deployed-sha' && step.args[0] === '--self-test'));
  assert.ok(plan.steps.some((step) => step.file === 'scripts/apply-staging-noindex.mjs' && step.args[0] === '--self-test'));
  assert.equal(plan.ciExcludedSteps.length, 3);
  for (const run of ['npm run verify:deployed-sha', 'node scripts/apply-staging-noindex.mjs', 'npm run deploy:production']) {
    const unsafe = structuredClone(workflow);
    unsafe.jobs.critical.steps = [{ run }];
    assert.throws(() => expandCiGuards(initial, unsafe, scripts), /requires|Unsupported/);
  }
  const missing = structuredClone(workflow);
  delete missing.jobs.critical;
  assert.throws(() => expandCiGuards(initial, missing, scripts), /Missing CI critical/);
});
