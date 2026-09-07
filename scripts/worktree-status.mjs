#!/usr/bin/env node
// Read-only preflight: never checkout, stash, merge, install or edit Git configuration.
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { lstat, readFile, realpath } from 'node:fs/promises';
import { resolve, dirname, join } from 'node:path';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
const execute = promisify(execFile);
async function git(root, args, optional = false) {
  try {
    const { stdout } = await execute('git', ['-c', `safe.directory=${root}`, '-C', root, ...args], { encoding: 'utf8', windowsHide: true, timeout: 15000, maxBuffer: 4 * 1024 * 1024, env: { ...process.env, GIT_OPTIONAL_LOCKS: '0' } });
    return stdout;
  } catch {
    if (optional) return null;
    throw new Error(`Git inspection failed: ${args[0]}`);
  }
}
export function parseWorktrees(output) {
  const records = [];
  let current;
  for (const field of output.split('\0')) {
    if (field.startsWith('worktree ')) { current = { path: field.slice(9) }; records.push(current); }
    else if (current && field.startsWith('branch ')) current.branch = field.slice(7).replace(/^refs\/heads\//, '');
    else if (current && field.startsWith('HEAD ')) current.sha = field.slice(5);
    else if (current && field === 'detached') current.branch = '(detached)';
  }
  return records;
}
export function overlappingFiles(current, other) {
  const owned = new Set(current);
  return [...new Set(other.filter(file => owned.has(file)))].sort();
}
const normalized = value => process.platform === 'win32' ? resolve(value).toLowerCase() : resolve(value);
async function lockHash(root) {
  try { return createHash('sha256').update(await readFile(join(root, 'package-lock.json'))).digest('hex'); }
  catch { return null; }
}
export async function dependencyStatus(root) {
  const modulePath = join(root, 'node_modules');
  let stat;
  try { stat = await lstat(modulePath); } catch { return { state: 'missing', linked: false, compatible: false }; }
  let target;
  try { target = await realpath(modulePath); } catch { return { state: 'unreadable-link', linked: stat.isSymbolicLink(), compatible: false }; }
  const linked = stat.isSymbolicLink() || normalized(target) !== normalized(modulePath);
  if (!linked) return { state: 'local', linked: false, path: target, compatible: true, note: 'Local install; installed dependency freshness is not inferred.' };
  const [worktreeLockHash, installLockHash] = await Promise.all([lockHash(root), lockHash(dirname(target))]);
  const compatible = Boolean(worktreeLockHash && installLockHash && worktreeLockHash === installLockHash);
  return { state: compatible ? 'linked-compatible' : 'linked-lock-mismatch', linked: true, path: target, installRoot: dirname(target), worktreeLockHash, installLockHash, compatible, note: 'Compares current worktree and install-root lockfiles; does not certify when node_modules was installed.' };
}
async function touchedFiles(root, untracked) {
  const requests = [
    git(root, ['diff', '--no-ext-diff', '--no-textconv', '--name-only', '-z', '--']),
    git(root, ['diff', '--no-ext-diff', '--no-textconv', '--cached', '--name-only', '-z', '--']),
  ];
  if (untracked) requests.push(git(root, ['ls-files', '--others', '--exclude-standard', '-z']));
  const working = (await Promise.all(requests)).flatMap(value => value.split('\0').filter(Boolean));
  const base = await git(root, ['rev-parse', '--verify', '--quiet', 'origin/main'], true);
  const committed = base ? await git(root, ['diff', '--no-ext-diff', '--no-textconv', '--name-only', '-z', 'origin/main...HEAD', '--'], true) : null;
  return { files: [...new Set([...working, ...(committed || '').split('\0').filter(Boolean)])].sort(), uncertainty: committed === null ? 'origin/main range unavailable; committed changes unknown' : null };
}
export async function inspectWorktree(cwd, { untracked = true } = {}) {
  const root = (await git(cwd, ['rev-parse', '--show-toplevel'])).trim();
  const [sha, branch, gitDir, commonDir, worktreeList, driver, dependencies] = await Promise.all([
    git(root, ['rev-parse', 'HEAD']), git(root, ['symbolic-ref', '--short', '-q', 'HEAD'], true),
    git(root, ['rev-parse', '--absolute-git-dir']), git(root, ['rev-parse', '--path-format=absolute', '--git-common-dir']),
    git(root, ['worktree', 'list', '--porcelain', '-z']), git(root, ['config', '--get', 'merge.cachebust.driver'], true),
    dependencyStatus(root),
  ]);
  const entries = await Promise.all(parseWorktrees(worktreeList).map(async item => {
    try { return { ...item, ...(await touchedFiles(item.path, untracked)) }; }
    catch { return { ...item, files: [], error: 'unavailable', uncertainty: 'working and committed changes unknown' }; }
  }));
  const current = entries.find(item => normalized(item.path) === normalized(root));
  if (!current) throw new Error('Current worktree missing from Git worktree listing');
  const owners = new Map();
  for (const item of entries) for (const file of item.files) {
    if (!owners.has(file)) owners.set(file, []);
    owners.get(file).push({ path: item.path, branch: item.branch });
  }
  const collisions = [...owners.entries()].filter(([, items]) => items.length > 1)
    .map(([file, items]) => ({ file, owners: items })).sort((a, b) => b.owners.length - a.owners.length || a.file.localeCompare(b.file));
  const overlaps = entries.filter(item => normalized(item.path) !== normalized(root)).map(item => {
    const files = overlappingFiles(current.files, item.files);
    return { path: item.path, branch: item.branch, overlapCount: files.length, files: files.slice(0, 20) };
  }).filter(item => item.overlapCount > 0);
  return {
    root, sha: sha.trim(), branch: branch?.trim() || '(detached)',
    isolation: { isolated: normalized(gitDir.trim()) !== normalized(commonDir.trim()), gitDir: gitDir.trim(), commonDir: commonDir.trim() },
    dependencies, cachebustMergeDriverConfigured: Boolean(driver?.trim()), changedFileCount: current.files.length,
    includesUntracked: untracked, includesCommitted: true, committedBase: 'origin/main', otherWorktreesInspected: entries.length - 1,
    overlaps, collisions, worktrees: entries,
    unavailableWorktrees: entries.filter(item => item.error), uncertainWorktrees: entries.filter(item => item.uncertainty).map(({ path, uncertainty }) => ({ path, uncertainty })),
    note: 'Includes uncommitted paths and origin/main...HEAD changes across all worktrees. Read-only snapshot; overlap requires coordination, not automatic merging.',
  };
}
async function main() {
  const args = new Set(process.argv.slice(2));
  if ([...args].some(arg => !['--json', '--untracked', '--strict'].includes(arg))) throw new Error('Usage: node scripts/worktree-status.mjs [--json] [--untracked] [--strict]');
  const report = await inspectWorktree(process.cwd(), { untracked: true });
  if (args.has('--json')) console.log(JSON.stringify(report, null, 2));
  else {
    console.log(`[worktree] ${report.branch} @ ${report.sha.slice(0, 12)} | isolated=${report.isolation.isolated}`);
    console.log(`[dependencies] ${report.dependencies.state}${report.dependencies.path ? `: ${report.dependencies.path}` : ''}`);
    console.log(`[cachebust] configured=${report.cachebustMergeDriverConfigured}`);
    console.log(`[overlap] ${report.overlaps.length} worktrees | ${report.changedFileCount} current changed paths`);
    let remaining = 20;
    for (const item of report.overlaps) {
      if (!remaining) break;
      const shown = item.files.slice(0, remaining);
      console.log(`  ${item.branch || item.path}: ${shown.join(', ')}${item.overlapCount > shown.length ? ` (+${item.overlapCount - shown.length})` : ''}`);
      remaining -= shown.length;
    }
    console.log(`[global collisions] ${report.collisions.length} paths across all worktrees`);
    for (const item of report.collisions.slice(0, 20)) console.log(`  ${item.file}: ${item.owners.slice(0, 3).map(owner => owner.branch || owner.path).join(', ') + (item.owners.length > 3 ? ` (+${item.owners.length - 3})` : '')}`);
    if (report.uncertainWorktrees.length) console.log(`[uncertain] ${report.uncertainWorktrees.length} worktrees have unknown committed/working changes`);
    if (report.unavailableWorktrees.length) console.log(`[inspection] ${report.unavailableWorktrees.length} worktrees unavailable`);
  }
  if (!report.dependencies.compatible || (args.has('--strict') && (report.collisions.length || report.uncertainWorktrees.length))) process.exitCode = 1;
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main().catch(error => { console.error(error.message); process.exitCode = 1; });
