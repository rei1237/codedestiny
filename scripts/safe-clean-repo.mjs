#!/usr/bin/env node
// Only explicitly reviewed, unchanged, untracked temporary files may be removed.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const PROTECTED = /^(?:\.git|\.env[^/]*|\.wrangler|\.cloudflare|\.deploy-state|\.claude|\.codex[^/]*|\.delivery-worktrees|\.worktrees|\.integration|node_modules|backups|calibration|key|app|apps|public|worker|config|i18n|marketing|store-assets|artifacts)(?:\/|$)/i;
const SECRET = /(?:^|\/)(?:[^/]*\.(?:pem|key|p12|jks|keystore)|\.env[^/]*|[^/]*(?:credential|secret)[^/]*)$/i;
const FINAL = /(?:^|\/)(?:[^/]*(?:final|delivery|receipt|handoff|preserved|backup|signature|release|verification|state)[^/]*)/i;
const CACHE = /^(?:\.next|\.cache|build-cache|coverage|playwright-report|test-results|tmp|\.tmp)\//;
const TEMP = /(?:\.log|\.err|\.tsbuildinfo|\.tmp)$/i;
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const gitFiles = root => execFileSync('git', ['ls-files', '-z'], { cwd: root, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 }).split('\0').filter(Boolean);

export function checkedPath(root, relative) {
  if (typeof relative !== 'string' || !relative || relative.includes('\\') || relative.includes(':') || relative.includes('\0') || path.isAbsolute(relative)) throw new Error('Invalid relative path');
  const parts = relative.split('/');
  if (parts.some(p => !p || p === '.' || p === '..')) throw new Error('Path traversal rejected');
  if (PROTECTED.test(relative) || SECRET.test(relative) || FINAL.test(relative)) throw new Error('Protected path: ' + relative);
  const base = fs.realpathSync(root);
  let current = base;
  for (const part of parts) {
    current = path.join(current, part);
    if (fs.lstatSync(current).isSymbolicLink()) throw new Error('Symlink/junction rejected: ' + relative);
    const resolved = fs.realpathSync(current);
    if (!resolved.startsWith(base + path.sep)) throw new Error('Outside workspace: ' + relative);
  }
  if (!fs.lstatSync(current).isFile()) throw new Error('Only individual files are supported');
  if (!CACHE.test(relative) && !TEMP.test(relative) && !/(?:^|\/)(?:\.DS_Store|Thumbs\.db)$/.test(relative)) throw new Error('Not a reproducible temporary file: ' + relative);
  return current;
}

export function createPlan(root, selected) {
  root = fs.realpathSync(root);
  const tracked = new Set(gitFiles(root));
  const files = selected ?? fs.readdirSync(root).filter(name => TEMP.test(name) && !fs.lstatSync(path.join(root, name)).isSymbolicLink());
  const candidates = [], skipped = [];
  for (const relative of [...new Set(files)].sort()) {
    try {
      if (tracked.has(relative)) throw new Error('Tracked file requires a separate reviewed code change');
      const absolute = checkedPath(root, relative), stat = fs.statSync(absolute);
      candidates.push({ path: relative, bytes: stat.size, mtimeMs: stat.mtimeMs, sha256: hash(absolute), reason: 'reproducible temporary file; review ownership before apply' });
    } catch (error) { skipped.push({ path: relative, reason: error.message }); }
  }
  return { version: 1, root, candidates, skipped };
}

export function applyPlan(root, plan) {
  root = fs.realpathSync(root);
  if (plan.version !== 1 || plan.root !== root || !Array.isArray(plan.candidates)) throw new Error('Plan does not belong to this workspace');
  const tracked = new Set(gitFiles(root));
  const seen = new Set();
  const validate = item => {
    if (!item || seen.has(item.path)) throw new Error('Invalid or duplicate candidate');
    if (tracked.has(item.path)) throw new Error('File is now tracked: ' + item.path);
    const absolute = checkedPath(root, item.path), stat = fs.statSync(absolute);
    if (stat.size !== item.bytes || stat.mtimeMs !== item.mtimeMs || hash(absolute) !== item.sha256) throw new Error('File changed after review: ' + item.path);
    return absolute;
  };
  // Preflight every item before the first unlink. No recursive delete or force.
  for (const item of plan.candidates) { validate(item); seen.add(item.path); }
  seen.clear();
  const deleted = [];
  for (const item of plan.candidates) {
    fs.unlinkSync(validate(item));
    seen.add(item.path);
    deleted.push(item.path);
  }
  return { deleted, bytes: plan.candidates.reduce((sum, item) => sum + item.bytes, 0) };
}

function main() {
  const args = process.argv.slice(2);
  const value = flag => { const i = args.indexOf(flag); return i < 0 ? undefined : args[i + 1]; };
  if (args.includes('--apply')) {
    const file = value('--manifest');
    if (!file) throw new Error('--apply requires --manifest <reviewed-plan.json>');
    console.log(JSON.stringify(applyPlan(process.cwd(), JSON.parse(fs.readFileSync(file, 'utf8'))), null, 2));
  } else {
    const selected = value('--select');
    console.log(JSON.stringify(createPlan(process.cwd(), selected ? JSON.parse(fs.readFileSync(selected, 'utf8')) : undefined), null, 2));
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try { main(); } catch (error) { console.error('[safe-clean-repo] ' + error.message); process.exitCode = 1; }
}
