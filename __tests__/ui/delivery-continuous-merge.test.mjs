import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { batchVerificationArgs } from '../../scripts/delivery-verify-batch.mjs';
import { shouldDeployStaging } from '../../scripts/staging-release-current.mjs';
import { summarizeAdmission } from '../../scripts/delivery-admit.mjs';

const sha = 'a'.repeat(40), newer = 'b'.repeat(40);
test('batch completion requires explicit SHA and both staging layers', () => {
  assert.deepEqual(batchVerificationArgs([`--sha=${sha}`]), ['scripts/verify-deployed-sha.mjs', `--sha=${sha}`, '--origin=https://staging.code-destiny.com']);
  for (const args of [[], ['--sha=abcdef0'], [`--sha=${sha}`, '--skip-worker']]) assert.throws(() => batchVerificationArgs(args));
});
test('only latest staging commit deploys; missing remote fails closed', () => {
  assert.equal(shouldDeployStaging(sha, `${sha}\trefs/heads/main`), true);
  assert.equal(shouldDeployStaging(sha, `${newer}\trefs/heads/main`), false);
  assert.throws(() => shouldDeployStaging(sha, ''));
});
test('admission has no staging dependency and retains all blocking findings', () => {
  const source = readFileSync(new URL('../../scripts/delivery-admit.mjs', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /readProductionShas|직전 main 스테이징 도달/);
  for (const label of ['필수 PR CI', '후보와 PR head 일치', 'GitHub 병합 가능', '최신 tree/main 로컬 preflight']) assert.ok(source.includes(label));
  assert.match(source, /append\(findings, true, "활성 워크트리 파일 충돌"/);
  assert.equal(summarizeAdmission([{ok:true}, {ok:false}]).ok, false);
});
test('staging yields before deployment and never cancels an active transaction', () => {
  const workflow = readFileSync(new URL('../../.github/workflows/cloudflare-pages-deploy.yml', import.meta.url), 'utf8');
  assert.match(workflow, /cancel-in-progress: false/);
  const staging = workflow.slice(workflow.indexOf('\n  staging:'));
  assert.ok(staging.indexOf('staging-release-current.mjs') < staging.indexOf('npm run deploy:staging'));
  assert.match(staging, /if: steps.staging_current.outputs.current == 'true'/);
  assert.doesNotMatch(workflow.slice(0, workflow.indexOf('\n  staging:')), /staging-release-current.mjs/);
});
