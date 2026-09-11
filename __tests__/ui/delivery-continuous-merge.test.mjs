import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { batchVerificationArgs } from '../../scripts/delivery-verify-batch.mjs';
import { shouldDeployStaging } from '../../scripts/staging-release-current.mjs';
import { cachebustForcePushArgs, hasUnresolvedConflicts, rebaseWithCachebustDriver, selectRequiredChecks, summarizeAdmission, upstreamCompatible } from '../../scripts/delivery-admit.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

const sha = 'a'.repeat(40), newer = 'b'.repeat(40);
test('upstream file overlap gates admission; rewritten history always blocks', () => {
  assert.equal(upstreamCompatible({ ancestor: false, upstreamFiles: [], files: ['a.ts'] }), false);
  assert.equal(upstreamCompatible({ ancestor: true, upstreamFiles: [], files: ['a.ts'] }), true);
  assert.equal(upstreamCompatible({ ancestor: true, upstreamFiles: ['b.ts'], files: ['a.ts'] }), true);
  assert.equal(upstreamCompatible({ ancestor: true, upstreamFiles: ['a.ts'], files: ['a.ts'] }), false);
});
test('latest-main containment is informational; conflicts and upstream file overlap still block', () => {
  const admit = readFileSync(new URL('../../scripts/delivery-admit.mjs', import.meta.url), 'utf8');
  // 로컬 preflight 는 폐기됐다(2026-09-12). 파일 겹침은 영수증이 아니라 admit 이 직접 계산한다.
  assert.doesNotMatch(admit, /scripts\/ci-preflight/);
  assert.doesNotMatch(admit, /"--is-ancestor", base, "HEAD"/);
  assert.match(admit, /git\(\["merge-base", upstream, "HEAD"\]/);
  assert.match(admit, /upstreamCompatible\(\{ ancestor: true, upstreamFiles, files \}\)/);
  assert.match(admit, /append\(findings, overlap\.ok, "main 파일 겹침 없음"/);
  assert.match(admit, /append\(findings, true, "최신 main 반영\(정보\)"/);
});
test('without ruleset required checks, admission requires every reported PR check incl. the CI required aggregate (fail-closed)', () => {
  const checks = [{ name: 'paid-flow-gates', bucket: 'fail' }, { name: 'optional', bucket: 'skipping' }, { name: 'CI required', bucket: 'pass' }];
  assert.deepEqual(selectRequiredChecks(checks, true).map((check) => check.name), ['paid-flow-gates', 'CI required']);
  assert.equal(selectRequiredChecks([{ name: 'lint' }], true).length, 0);
  assert.equal(selectRequiredChecks([{ name: 'lint' }], false).length, 1);
});
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
  for (const label of ['필수 PR CI', '후보와 PR head 일치', 'GitHub 병합 가능', 'main 파일 겹침 없음']) assert.ok(source.includes(label));
  assert.match(source, /merge-tree", "--write-tree/);
  assert.match(source, /활성 워크트리 중첩 검사/);
  assert.doesNotMatch(source, /inspectWorktree\(/);
  assert.equal(summarizeAdmission([{ok:true}, {ok:false}]).ok, false);
});
/**
 * 실제 git 저장소를 만들어 merge driver 를 등록하고, origin/main 이 캐시버스트 파일을 다시 찍은
 * 상황(=GitHub 가 CONFLICTING 으로 보고하는 상황)을 재현한다. 문자열 검사로는 "드라이버가 실제로
 * 도는지"를 증명할 수 없어서 verify-cachebust-merge-driver.mjs 와 같은 실행 검사 방식을 쓴다.
 */
function cachebustScratchRepo({ featureExtra = '', mainExtra = '' } = {}) {
  const work = mkdtempSync(join(tmpdir(), 'cd-admit-recovery-'));
  const run = (args, cwd = work) => spawnSync('git', args, { cwd, encoding: 'utf8', windowsHide: true });
  run(['init', '-q', '-b', 'main']);
  run(['config', 'user.email', 'guard@example.com']);
  run(['config', 'user.name', 'guard']);
  for (const rel of ['scripts/git/cachebust-merge-driver.mjs', 'scripts/lib/cachebust-pattern.mjs']) {
    mkdirSync(dirname(join(work, rel)), { recursive: true });
    cpSync(resolve(repoRoot, rel), join(work, rel));
  }
  writeFileSync(join(work, '.gitattributes'), 'shell.html merge=cachebust\n');
  // 복구 경로가 쓰는 등록 스크립트를 그대로 재사용한다.
  const setup = spawnSync(process.execPath, [resolve(repoRoot, 'scripts/setup-git-merge-drivers.mjs')], { cwd: work, encoding: 'utf8', windowsHide: true });
  assert.equal(setup.status, 0, setup.stderr);
  const build = (seed) => `<script src="/js/a.js?v=build-${seed}a1"></script>\n<script src="/js/b.js?v=build-${seed}b2"></script>\n<script src="/HwatuFortune.js?v=h${seed}c3"></script>\n<script src="/AnalysisEngine.js?v=h${seed}d4"></script>\n<nav>메뉴</nav>\n`;
  writeFileSync(join(work, 'shell.html'), build('aaaaaaaaaa'));
  run(['add', '-A']);
  run(['commit', '-qm', 'base']);
  const base = run(['rev-parse', 'HEAD']).stdout.trim();
  run(['checkout', '-q', '-b', 'feature']);
  writeFileSync(join(work, 'shell.html'), build('bbbbbbbbbb') + featureExtra);
  run(['commit', '-qam', 'feature']);
  const head = run(['rev-parse', 'HEAD']).stdout.trim();
  run(['checkout', '-q', 'main']);
  run(['reset', '-q', '--hard', base]);
  writeFileSync(join(work, 'shell.html'), build('cccccccccc') + mainExtra);
  run(['commit', '-qam', 'main rehash']);
  run(['update-ref', 'refs/remotes/origin/main', run(['rev-parse', 'HEAD']).stdout.trim()]);
  return { work, head, run };
}
const dropScratch = (work) => { try { rmSync(work, { recursive: true, force: true }); } catch { /* 임시 디렉터리 정리 실패는 결과에 영향이 없다 */ } };

test('cachebust-only CONFLICTING: 일회용 worktree 리베이스가 충돌 없이 복구된다', async () => {
  const { work, head, run } = cachebustScratchRepo();
  const worktreePath = join(work, '.admit-recovery-test-clean');
  try {
    const result = await rebaseWithCachebustDriver({ root: work, headOid: head, worktreePath, timeout: 120_000 });
    assert.equal(result.ok, true, JSON.stringify(result));
    const merged = run(['show', `${result.sha}:shell.html`]).stdout;
    assert.doesNotMatch(merged, /<<<<<<</);
    assert.match(merged, /\/js\/a\.js\?v=build-[0-9a-f]{6,}"/);
    assert.match(merged, /\/HwatuFortune\.js\?v=h[0-9a-f]{6,}"/);
    assert.equal(new Set([...merged.matchAll(/\?v=(?:build-|h)([0-9a-f]{6,})/g)].map((m) => m[1])).size, 4);
    assert.equal(run(['merge-base', '--is-ancestor', 'refs/remotes/origin/main', result.sha]).status, 0);
    assert.equal(existsSync(worktreePath), false);
  } finally { dropScratch(work); }
});

test('진짜 내용 충돌은 자동 복구가 삼키지 않는다: 리베이스를 취소하고 차단한다', async () => {
  const { work, head, run } = cachebustScratchRepo({ featureExtra: '<p>기능 브랜치 문단</p>\n', mainExtra: '<p>메인 브랜치 문단</p>\n' });
  const worktreePath = join(work, '.admit-recovery-test-conflict');
  try {
    const result = await rebaseWithCachebustDriver({ root: work, headOid: head, worktreePath, timeout: 120_000 });
    assert.equal(result.ok, false, JSON.stringify(result));
    assert.equal(result.reason, 'conflict');
    assert.equal(existsSync(worktreePath), false);
    // 후보 커밋과 main 은 그대로다. 충돌 마커가 커밋되거나 head 가 옮겨지지 않는다.
    assert.match(run(['show', `${head}:shell.html`]).stdout, /기능 브랜치 문단/);
    assert.doesNotMatch(run(['show', `${head}:shell.html`]).stdout, /<<<<<<</);
    assert.equal(run(['rev-parse', 'HEAD']).stdout.trim(), run(['rev-parse', 'main']).stdout.trim());
  } finally { dropScratch(work); }
});

test('복구 push 는 PR head 브랜치 하나에만, 항상 --force-with-lease 로 나간다', () => {
  const [expectedOid, newSha] = ['a'.repeat(40), 'b'.repeat(40)];
  assert.deepEqual(cachebustForcePushArgs({ branch: 'feat/x', expectedOid, newSha }), ['push', `--force-with-lease=refs/heads/feat/x:${expectedOid}`, 'origin', `${newSha}:refs/heads/feat/x`]);
  assert.ok(cachebustForcePushArgs({ branch: 'feat/x', expectedOid, newSha }).every((arg) => !/(^|[/:])main($|[/:])/.test(arg)));
  for (const branch of ['main', 'refs/heads/main', 'HEAD', '', '--force', '..evil', 'feat/../main']) assert.throws(() => cachebustForcePushArgs({ branch, expectedOid, newSha }));
  for (const bad of [{ expectedOid: 'abc', newSha }, { expectedOid, newSha: 'HEAD' }]) assert.throws(() => cachebustForcePushArgs({ branch: 'feat/x', ...bad }));
  const source = readFileSync(new URL('../../scripts/delivery-admit.mjs', import.meta.url), 'utf8');
  assert.equal((source.match(/"push"/g) || []).length, 1, 'push 인자는 cachebustForcePushArgs 한 곳에서만 만든다');
  assert.match(source, /git\(cachebustForcePushArgs\(/);
});

test('자동 복구는 CONFLICTING 에서만 열리고 실패하면 원래 판정으로 되돌아간다', () => {
  const source = readFileSync(new URL('../../scripts/delivery-admit.mjs', import.meta.url), 'utf8');
  assert.match(source, /allowRecovery && metadata\.mergeable === "CONFLICTING" && !metadata\.isDraft && metadata\.baseRefName === "main" && localHeadMatched/);
  assert.match(source, /if \(recovery\.ok && recovery\.metadata\) effective =/);
  assert.match(source, /catch \(error\)[\s\S]{0,200}원래 판정 유지/);
  assert.match(source, /"rebase", "--abort"/);
  assert.equal(hasUnresolvedConflicts('UU shell.html'), true);
  assert.equal(hasUnresolvedConflicts('M  a.js\nAA shell.html'), true);
  assert.equal(hasUnresolvedConflicts(' M shell.html\n?? tmp.txt'), false);
  assert.equal(hasUnresolvedConflicts(''), false);
  // merge driver 등록은 복구 경로의 첫 동작이고, 실패하면 복구를 중단한다(원래 판정 유지).
  assert.match(source, /setup-git-merge-drivers\.mjs/);
  assert.match(source, /merge driver 등록에 실패해 복구를 중단했습니다/);
});

test('staging yields before deployment and never cancels an active transaction', () => {
  const workflow = readFileSync(new URL('../../.github/workflows/cloudflare-pages-deploy.yml', import.meta.url), 'utf8');
  assert.match(workflow, /cancel-in-progress: false/);
  const staging = workflow.slice(workflow.indexOf('\n  staging:'));
  assert.ok(staging.indexOf('staging-release-current.mjs') < staging.indexOf('npm run deploy:staging'));
  assert.match(staging, /if: steps.staging_current.outputs.current == 'true'/);
  assert.doesNotMatch(workflow.slice(0, workflow.indexOf('\n  staging:')), /staging-release-current.mjs/);
});
