const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const yaml = require('js-yaml');

test('preflight preserves every CI lane and selects builds/tests by risk', async () => {
  const { ciPreflightPlan } = await import('../../scripts/lib/ci-preflight-plan.mjs');
  const { resolveTier } = await import('../../scripts/resolve-ci-tier.mjs');
  const workflow = yaml.load(fs.readFileSync('.github/workflows/pr-ci.yml', 'utf8'));
  for (const [file, build, full] of [
    ['components/Card.tsx', true, false], ['styles/site.css', false, false],
    ['docs/guide.md', false, false], ['worker/routes/example.js', true, true],
    ['app/hooks/useCoinGate.ts', true, true], ['app/api/example/route.ts', true, false],
    ['.github/workflows/cloudflare-pages-deploy.yml', true, true],
  ]) {
    const plan = ciPreflightPlan(workflow, resolveTier([file]));
    assert.equal(plan.includes('npm run build:cf'), build, file);
    assert.equal(plan.includes('npm run test:jest'), full, file);
    assert.equal(plan.filter(command => command === 'npm run test:node').length, 1, file);
    assert.ok(plan.includes('npm run verify:public-mirror-fresh'), file);
    assert.ok(plan.includes('npm run verify:sitemap-drift'), file);
    if (build) assert.ok(plan.includes('npm run verify:indexable-prose-depth'), file);
  }
});

test('new unsupported CI commands, conditions and environments block preflight', async () => {
  const { ciPreflightPlan } = await import('../../scripts/lib/ci-preflight-plan.mjs');
  for (const extra of [{ run: 'echo \"::notice::skip\"\nnpm run deploy:production' }, { run: 'curl https://example.com' }, { run: 'npm run deploy:production' }, { run: 'node scripts/deploy-worker.mjs' }, { run: 'npm run verify:payment-freeze -- --update' }, { run: 'npm test', if: 'false' }, { run: 'npm test', env: { SECRET: 'value' } }]) {
    const workflow = yaml.load(fs.readFileSync('.github/workflows/pr-ci.yml', 'utf8'));
    workflow.jobs.guards.steps.push(extra);
    assert.throws(() => ciPreflightPlan(workflow, 'critical'), /Unsupported/);
  }
});

test('PR creation cannot switch to an unverified branch or repository', async () => {
  const { validatedPrArguments } = await import('../../scripts/lib/ci-preflight-plan.mjs');
  for (const flag of ['--head=other', '--base', '--repo=other/repo', '-Hother', '-Bmain', '-Rother/repo']) assert.throws(() => validatedPrArguments([flag], 'codex/test'), /must match preflight/);
  assert.deepEqual(validatedPrArguments(['--title', 'Verified change'], 'codex/test'), ['pr', 'create', '--base', 'main', '--head', 'codex/test', '--title', 'Verified change']);
});
