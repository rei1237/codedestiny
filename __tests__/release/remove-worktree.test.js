const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const { existsSync, mkdtempSync, mkdirSync, realpathSync, rmSync, symlinkSync, writeFileSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join } = require('node:path');

const load = () => import('../../scripts/remove-worktree.mjs');

function git(cwd, ...args) {
  const result = spawnSync('git', ['-c', 'user.name=test', '-c', 'user.email=test@example.invalid', ...args], { cwd, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  return result.stdout.trim();
}

/** 주 체크아웃, origin/main, wt/x 워크트리, 공유 설치본 정션을 갖춘 저장소. */
function fixture(t) {
  const dir = realpathSync(mkdtempSync(join(tmpdir(), 'cd-remove-worktree-')));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const repo = join(dir, 'repo');
  const target = join(dir, 'wt');
  const shared = join(dir, 'shared-modules');
  mkdirSync(repo);
  mkdirSync(shared);
  writeFileSync(join(shared, 'sentinel'), 'keep');
  git(repo, 'init', '-q', '-b', 'main');
  writeFileSync(join(repo, '.gitignore'), 'node_modules\ndeep/\n');
  git(repo, 'add', '.gitignore');
  git(repo, 'commit', '-q', '-m', 'init');
  git(repo, 'update-ref', 'refs/remotes/origin/main', 'HEAD');
  git(repo, 'worktree', 'add', '-q', '-b', 'wt/x', target);
  symlinkSync(shared, join(target, 'node_modules'), 'junction');
  return { repo, target, shared };
}

test('지운 뒤 폴더·등록·브랜치가 남지 않고 공유 설치본은 그대로다', async (t) => {
  const { removeWorktree } = await load();
  const { repo, target, shared } = fixture(t);
  const result = removeWorktree({ repo, target });
  assert.equal(existsSync(target), false);
  assert.equal(existsSync(join(shared, 'sentinel')), true);
  assert.equal(git(repo, 'worktree', 'list', '--porcelain').includes('wt/x'), false);
  assert.equal(result.branchDeleted, true);
  assert.equal(git(repo, 'branch', '--list', 'wt/x'), '');
});

test('경로 한도를 넘는 파일이 있어도 폴더가 남지 않는다', async (t) => {
  const { removeWorktree } = await load();
  const { repo, target, shared } = fixture(t);
  const deep = join(target, 'deep', ...Array.from({ length: 30 }, () => 'long-directory-name'));
  mkdirSync(deep, { recursive: true });
  writeFileSync(join(deep, 'file.txt'), 'x');
  removeWorktree({ repo, target });
  assert.equal(existsSync(target), false);
  assert.equal(existsSync(join(shared, 'sentinel')), true);
});

test('미커밋이나 origin/main 에 없는 커밋은 거부하고 아무것도 지우지 않는다', async (t) => {
  const { removeWorktree } = await load();
  const { repo, target } = fixture(t);
  writeFileSync(join(target, 'draft.txt'), 'work');
  assert.throws(() => removeWorktree({ repo, target }), /미커밋/);
  assert.equal(existsSync(join(target, 'node_modules')), true);
  git(target, 'add', 'draft.txt');
  git(target, 'commit', '-q', '-m', 'draft');
  assert.throws(() => removeWorktree({ repo, target }), /없는 커밋 1개/);
  assert.equal(existsSync(join(target, 'draft.txt')), true);
});

test('--force 는 확인을 넘지만 병합 안 된 브랜치는 남긴다', async (t) => {
  const { removeWorktree } = await load();
  const { repo, target } = fixture(t);
  writeFileSync(join(target, 'draft.txt'), 'work');
  git(target, 'add', 'draft.txt');
  git(target, 'commit', '-q', '-m', 'draft');
  const result = removeWorktree({ repo, target, force: true });
  assert.equal(existsSync(target), false);
  assert.equal(result.branchDeleted, false);
  assert.match(git(repo, 'branch', '--list', 'wt/x'), /wt\/x/);
});

test('주 체크아웃과 등록되지 않은 경로는 거부한다', async (t) => {
  const { removeWorktree } = await load();
  const { repo, target } = fixture(t);
  assert.throws(() => removeWorktree({ repo, target: repo, force: true }), /주 체크아웃/);
  assert.throws(() => removeWorktree({ repo, target: `${target}-other`, force: true }), /등록된 워크트리가 아니다/);
  assert.equal(existsSync(repo), true);
});
