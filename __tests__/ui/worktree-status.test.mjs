import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, symlink, rm, rmdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { dependencyStatus, inspectWorktree, overlappingFiles, parseWorktrees } from '../../scripts/worktree-status.mjs';

async function fixture(t) {
  const base = await mkdtemp(join(tmpdir(), 'cd-worktree-status-'));
  t.after(async () => {
    assert.ok(resolve(base).startsWith(resolve(tmpdir()) + sep));
    assert.ok(base.includes('cd-worktree-status-'));
    await rm(base, { recursive: true, force: true });
  });
  return base;
}
const git = (root, args) => execFileSync('git', ['-C', root, ...args], { encoding: 'utf8', windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });

test('porcelain records preserve spaces, detached branch and Unicode paths', () => {
  const records = parseWorktrees('worktree C:/dev/my repo\0HEAD abc\0branch refs/heads/feature/a\0\0worktree C:/dev/한국어\0HEAD def\0detached\0\0');
  assert.deepEqual(records, [{ path: 'C:/dev/my repo', sha: 'abc', branch: 'feature/a' }, { path: 'C:/dev/한국어', sha: 'def', branch: '(detached)' }]);
  assert.deepEqual(overlappingFiles(['a', 'b'], ['c', 'b', 'b']), ['b']);
});

test('linked install compares lockfiles, including mismatch and missing lock', async t => {
  const base = await fixture(t);
  const own = join(base, 'worktree');
  const install = join(base, 'install');
  await mkdir(own);
  await mkdir(join(install, 'node_modules'), { recursive: true });
  await writeFile(join(own, 'package-lock.json'), '{}');
  await writeFile(join(install, 'package-lock.json'), '{}');
  await symlink(join(install, 'node_modules'), join(own, 'node_modules'), process.platform === 'win32' ? 'junction' : 'dir');
  assert.equal((await dependencyStatus(own)).state, 'linked-compatible');
  await writeFile(join(install, 'package-lock.json'), '{"different":true}');
  assert.equal((await dependencyStatus(own)).compatible, false);
  await rm(join(install, 'package-lock.json'));
  assert.equal((await dependencyStatus(own)).state, 'linked-lock-mismatch');
});

test('direct install is allowed and absent dependencies are explicit', async t => {
  const base = await fixture(t);
  assert.equal((await dependencyStatus(base)).state, 'missing');
  await mkdir(join(base, 'node_modules'));
  const result = await dependencyStatus(base);
  assert.equal(result.state, 'local');
  assert.equal(result.compatible, true);
});

test('read-only inspection finds staged overlaps, ignores ignored files, and reports isolation', async t => {
  const base = await fixture(t);
  const root = join(base, 'repo');
  const other = join(base, 'isolated');
  await mkdir(root);
  git(root, ['init']);
  await writeFile(join(root, '.gitignore'), 'node_modules/\nignored.txt\n');
  await writeFile(join(root, 'shared.txt'), 'original');
  git(root, ['add', '.']);
  git(root, ['-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.invalid', 'commit', '-m', 'fixture']);
  git(root, ['update-ref', 'refs/remotes/origin/main', 'HEAD']);
  git(root, ['worktree', 'add', '-b', 'other', other]);
  await mkdir(join(root, 'node_modules'));
  await mkdir(join(other, 'node_modules'));
  await writeFile(join(root, 'shared.txt'), 'root change');
  git(root, ['add', 'shared.txt']);
  await writeFile(join(other, 'shared.txt'), 'other change');
  for (const directory of [root, other]) {
    await writeFile(join(directory, 'new.txt'), 'untracked');
    await writeFile(join(directory, 'ignored.txt'), 'ignored');
  }
  const before = git(root, ['status', '--porcelain']);
  const report = await inspectWorktree(root, { untracked: false });
  assert.equal(report.isolation.isolated, false);
  assert.equal(report.dependencies.compatible, true);
  assert.deepEqual(report.overlaps[0].files, ['shared.txt']);
  assert.deepEqual(report.activeOverlaps[0].files, ['shared.txt']);
  assert.equal(report.cachebustMergeDriverConfigured, false);
  const isolated = await inspectWorktree(other);
  assert.equal(isolated.isolation.isolated, true);
  assert.deepEqual(isolated.overlaps[0].files, ['new.txt', 'shared.txt']);
  assert.equal(git(root, ['status', '--porcelain']), before);
  const cli = fileURLToPath(new URL('../../scripts/worktree-status.mjs', import.meta.url));
  assert.throws(() => execFileSync(process.execPath, [cli, '--json', '--strict'], { cwd: other, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }), error => {
    assert.equal(error.status, 1);
    assert.equal(JSON.parse(error.stdout).collisions.length, 2);
    return true;
  });
  git(root, ['-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.invalid', 'commit', '-m', 'root committed change']);
  git(other, ['add', 'shared.txt']);
  git(other, ['-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.invalid', 'commit', '-m', 'other committed change']);
  const committed = await inspectWorktree(root, { untracked: false });
  assert.deepEqual(committed.overlaps[0].files, ['shared.txt']);
  assert.equal(committed.activeOverlaps.length, 0);
  assert.deepEqual(committed.uncertainWorktrees, []);
  const observer = join(base, 'observer');
  git(root, ['worktree', 'add', '-b', 'observer', observer, 'origin/main']);
  await mkdir(join(observer, 'node_modules'));
  const globalOnly = await inspectWorktree(observer);
  assert.equal(globalOnly.overlaps.length, 0);
  assert.equal(globalOnly.collisions.length, 2);
  git(root, ['update-ref', '-d', 'refs/remotes/origin/main']);
  const uncertain = await inspectWorktree(root);
  assert.equal(uncertain.uncertainWorktrees.length, 3);
  await rm(join(root, 'new.txt'));
  await rm(join(other, 'new.txt'));
  assert.throws(() => execFileSync(process.execPath, [cli, '--json', '--strict'], { cwd: observer, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }), error => {
    const unknown = JSON.parse(error.stdout);
    assert.equal(error.status, 1);
    assert.equal(unknown.collisions.length, 0);
    assert.equal(unknown.uncertainWorktrees.length, 3);
    return true;
  });
  await rmdir(join(other, 'node_modules'));
  await symlink(join(root, 'node_modules'), join(other, 'node_modules'), process.platform === 'win32' ? 'junction' : 'dir');
  await writeFile(join(root, 'package-lock.json'), '{}');
  await writeFile(join(other, 'package-lock.json'), '{"mismatch":true}');
  assert.throws(() => execFileSync(process.execPath, [fileURLToPath(new URL('../../scripts/worktree-status.mjs', import.meta.url)), '--json'], { cwd: other, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }), error => {
    assert.equal(error.status, 1);
    assert.equal(JSON.parse(error.stdout).dependencies.state, 'linked-lock-mismatch');
    return true;
  });
});
