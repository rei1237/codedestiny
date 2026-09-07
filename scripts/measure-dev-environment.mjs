#!/usr/bin/env node
// Inventory is read-only by default. Command measurements require explicit opt-in.
import { readdir, lstat, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve, relative, dirname, sep } from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { performance } from 'node:perf_hooks';
import { fileURLToPath } from 'node:url';

const options = Object.fromEntries(process.argv.slice(2).map(arg => {
  const at = arg.indexOf('=');
  return at < 0 ? [arg, true] : [arg.slice(0, at), arg.slice(at + 1)];
}));
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const allowed = new Set(['lint', 'typecheck', 'test', 'build', 'dev']);
const commands = options['--commands'] ? String(options['--commands']).split(',') : [];
if (commands.some(command => !allowed.has(command))) throw new Error('Supported commands: lint,typecheck,test,build,dev');
const timeoutMs = Number(options['--timeout-ms'] || 300000);
if (!Number.isFinite(timeoutMs) || timeoutMs < 1000 || timeoutMs > 1800000) throw new Error('timeout-ms must be 1000..1800000');
const git = args => {
  const result = spawnSync('git', args, { cwd: root, encoding: 'utf8', windowsHide: true });
  if (result.status !== 0) throw new Error('Git metadata unavailable');
  return result.stdout.trim();
};
const artifact = /(?:^|\/)(?:dist|build|coverage|playwright-report|\.next|\.wrangler|\.tmp|logs|screenshots|generated|backups?|archive)(?:\/|$)|\.(?:log|map)$/i;
const category = rel => /(?:^|\/)node_modules(?:\/|$)/.test(rel) ? 'dependencies' : /(?:^|\/)(?:\.claude\/worktrees|\.codex-worktrees)(?:\/|$)/.test(rel) ? 'worktrees' : artifact.test(rel) ? 'generatedCandidates' : 'project';
const inventory = { files: 0, bytes: 0, skippedLinks: 0, unreadableEntries: 0, categories: {}, tracked: { files: 0, bytes: 0, jsTsFiles: 0, generatedCandidates: [] } };
async function walk(directory) {
  let entries;
  try { entries = await readdir(directory, { withFileTypes: true }); } catch { inventory.unreadableEntries++; return; }
  for (const entry of entries) {
    const absolute = resolve(directory, entry.name);
    if (entry.isSymbolicLink()) { inventory.skippedLinks++; continue; }
    if (entry.isDirectory()) { await walk(absolute); continue; }
    if (!entry.isFile()) continue;
    let stat;
    try { stat = await lstat(absolute); } catch { inventory.unreadableEntries++; continue; }
    const rel = relative(root, absolute).split(sep).join('/');
    const bucket = inventory.categories[category(rel)] ||= { files: 0, bytes: 0 };
    inventory.files++; inventory.bytes += stat.size; bucket.files++; bucket.bytes += stat.size;
  }
}
await walk(root);
for (const rel of git(['ls-files', '-z']).split('\0').filter(Boolean)) {
  inventory.tracked.files++;
  if (/\.[cm]?[jt]sx?$/.test(rel)) inventory.tracked.jsTsFiles++;
  try { inventory.tracked.bytes += (await lstat(resolve(root, rel))).size; } catch { /* deleted tracked file */ }
  if (artifact.test(rel)) inventory.tracked.generatedCandidates.push(rel);
}
const report = {
  schemaVersion: 1, measuredAt: new Date().toISOString(), label: String(options['--label'] || 'working-tree'),
  sha: git(['rev-parse', 'HEAD']), dirty: Boolean(git(['status', '--porcelain', '--untracked-files=no'])),
  runtime: { node: process.version, platform: process.platform, arch: process.arch },
  inventory, measurements: [],
  notes: ['Byte counts are file lengths, not allocated disk usage. Links/junctions are not followed.', 'First run is cache-state-unknown (cold candidate); shared caches are never cleared.', 'Raw command logs and environment values are never persisted.'],
};
const guard = resolve(root, 'scripts/lib/mock-network-guard.cjs').replaceAll('\\', '/');
const commandTemp = resolve(root, '.cache/profiler-tmp');
if (commands.length) await mkdir(commandTemp, { recursive: true });
async function measure(command, iteration) {
  const started = performance.now();
  return await new Promise(resolveResult => {
    const child = spawn(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', command], {
      cwd: root, shell: process.platform === 'win32', windowsHide: true,
      env: { ...process.env, TEMP: commandTemp, TMP: commandTemp, TMPDIR: commandTemp, NODE_OPTIONS: `${process.env.NODE_OPTIONS || ''} --require "${guard}"`.trim(), LLM_DRY_RUN: 'true', WORKERS_AI_ENABLED: 'false', CI: '1' },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let bytes = 0;
    let timedOut = false;
    const failureKinds = new Set();
    const consume = chunk => {
      bytes += chunk.length;
      const text = String(chunk);
      for (const marker of ['MOCK_NETWORK_BLOCKED', 'EPERM', 'ENOMEM', 'MODULE_NOT_FOUND', 'ERR_MODULE_NOT_FOUND']) {
        if (text.includes(marker)) failureKinds.add(marker);
      }
      if (/error TS[0-9]+/.test(text)) failureKinds.add('TYPESCRIPT_ERROR');
      if (/FAIL |AssertionError/.test(text)) failureKinds.add('TEST_FAILURE');
    };
    // Consume output to avoid pipe backpressure without retaining secrets.
    child.stdout.on('data', consume);
    child.stderr.on('data', consume);
    const timer = setTimeout(() => {
      timedOut = true;
      if (process.platform === 'win32') spawnSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore' });
      else child.kill('SIGTERM');
    }, timeoutMs);
    child.on('error', () => { clearTimeout(timer); resolveResult({ command, iteration, cache: iteration === 0 ? 'unknown-cold-candidate' : 'warm', durationMs: Math.round(performance.now() - started), exitCode: null, error: 'spawn_failed' }); });
    child.on('close', (code, signal) => {
      clearTimeout(timer);
      resolveResult({ command, iteration, cache: iteration === 0 ? 'unknown-cold-candidate' : 'warm', durationMs: Math.round(performance.now() - started), exitCode: code, signal, timedOut, outputBytes: bytes, failureKinds: [...failureKinds], error: timedOut ? 'timeout' : code === 0 ? null : 'command_failed_logs_not_retained' });
    });
  });
}
for (const command of commands) {
  if (['build', 'dev'].includes(command) && !options['--isolated']) {
    report.measurements.push({ command, skipped: 'Requires --isolated in a disposable worktree; may write generated tracked files.' }); continue;
  }
  if (command === 'dev') {
    report.measurements.push({ command, skipped: 'Long-running server: readiness and first HTTP response require a separate isolated mock browser measurement.' }); continue;
  }
  if (!existsSync(guard)) throw new Error('Network guard must exist before command measurements');
  let failures = 0;
  for (let iteration = 0; iteration < 4; iteration++) {
    const result = await measure(command, iteration);
    report.measurements.push(result);
    process.stderr.write(`${command} ${iteration + 1}/4: ${result.durationMs}ms exit=${result.exitCode}\n`);
    failures = result.exitCode === 0 ? 0 : failures + 1;
    if (failures >= 2) break;
  }
}
const json = JSON.stringify(report, null, 2) + '\n';
if (options['--output']) {
  const output = resolve(root, String(options['--output']));
  if (!output.startsWith(root + sep)) throw new Error('Output must be inside this worktree');
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, json);
} else process.stdout.write(json);
