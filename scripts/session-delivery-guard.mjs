#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const argv = process.argv.slice(2);
const mode = argv.find((value) => value === 'start' || value === 'close');
const valueOf = (name) => {
  const prefix = `--${name}=`;
  return argv.find((value) => value.startsWith(prefix))?.slice(prefix.length) || '';
};

function run(command, args, options = {}) {
  return execFileSync(command, args, {
    cwd: process.cwd(),
    encoding: 'utf8',
    windowsHide: true,
    stdio: ['ignore', 'pipe', 'pipe'],
    ...options,
  }).trim();
}

function git(...args) {
  return run('git', args);
}

function fail(message) {
  console.error(`[session:${mode || 'guard'}] FAIL: ${message}`);
  process.exit(1);
}

function pass(message) {
  console.log(`PASS ${message}`);
}

function normalizedHandoff(input) {
  const rel = input.replace(/\\/g, '/').replace(/^\.\//, '');
  if (!/^docs\/handoff\/[A-Za-z0-9._/-]+\.md$/.test(rel) || rel.includes('..')) {
    fail('--handoff는 docs/handoff 아래의 추적 가능한 .md 경로여야 합니다.');
  }
  return rel;
}

function verifyHandoff(rel) {
  const absolute = path.resolve(process.cwd(), rel);
  const root = path.resolve(process.cwd(), 'docs/handoff');
  if (!absolute.startsWith(`${root}${path.sep}`) || !fs.existsSync(absolute)) {
    fail(`인수인계 문서를 찾을 수 없습니다: ${rel}`);
  }
  const text = fs.readFileSync(absolute, 'utf8');
  const header = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!header) fail(`${rel}에 프론트매터가 없습니다.`);
  const field = (name) => header[1].match(new RegExp(`^${name}:\\s*(.+)$`, 'm'))?.[1]?.replace(/^["']|["']$/g, '').trim() || '';
  if (!['active', 'blocked', 'done'].includes(field('status'))) fail(`${rel}의 status가 규약과 다릅니다.`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(field('updated'))) fail(`${rel}의 updated가 YYYY-MM-DD가 아닙니다.`);
  if (!field('next')) fail(`${rel}의 next가 비어 있습니다.`);
  git('cat-file', '-e', `HEAD:${rel}`);
  pass(`인수인계 계약: ${rel}`);
}

function assertRepositoryState() {
  const branch = git('branch', '--show-current');
  if (!branch || ['main', 'master', 'staging'].includes(branch)) {
    fail('main/master/staging 직접 작업은 허용하지 않습니다. 격리 브랜치를 사용하세요.');
  }
  const commonDir = path.resolve(process.cwd(), git('rev-parse', '--git-common-dir'));
  const gitDir = path.resolve(process.cwd(), git('rev-parse', '--git-dir'));
  if (commonDir === gitDir) fail('공유 기본 체크아웃이 아니라 linked worktree에서 실행하세요.');
  if (git('status', '--porcelain', '--untracked-files=all')) fail('워크트리가 clean하지 않습니다.');
  pass(`격리 worktree + clean 브랜치: ${branch}`);
  return branch;
}

function start() {
  const handoff = normalizedHandoff(valueOf('handoff'));
  assertRepositoryState();
  run('git', ['fetch', 'origin', 'main']);
  const head = git('rev-parse', 'HEAD');
  const main = git('rev-parse', 'origin/main');
  if (head !== main) fail(`새 세션은 최신 origin/main에서 시작해야 합니다 (HEAD=${head.slice(0, 12)}, main=${main.slice(0, 12)}).`);
  try {
    git('cat-file', '-e', `origin/main:${handoff}`);
  } catch {
    fail(`인수인계 문서가 merge된 origin/main에 없습니다: ${handoff}`);
  }
  verifyHandoff(handoff);
  console.log(`[session:start] PASS: merge된 ${main.slice(0, 12)} 위에서 작업을 시작할 수 있습니다.`);
}

function close() {
  const handoff = normalizedHandoff(valueOf('handoff'));
  const pr = valueOf('pr');
  if (!/^\d+$/.test(pr)) fail('--pr=<번호>가 필요합니다. 완료 세션은 PR 없이 닫을 수 없습니다.');
  const branch = assertRepositoryState();
  verifyHandoff(handoff);
  const handoffChanges = git('diff', '--name-only', 'origin/main...HEAD', '--', handoff).split(/\r?\n/).filter(Boolean);
  if (!handoffChanges.includes(handoff)) fail(`이번 PR이 인수인계 문서를 변경하지 않았습니다: ${handoff}`);
  pass('인수인계 문서가 현재 PR에 포함됨');
  const upstream = git('rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{u}');
  const [behind, ahead] = git('rev-list', '--left-right', '--count', `${upstream}...HEAD`).split(/\s+/).map(Number);
  if (behind !== 0 || ahead !== 0) fail(`원격과 동기화되지 않았습니다 (${upstream}: behind ${behind}, ahead ${ahead}).`);
  const prData = JSON.parse(run('gh', ['pr', 'view', pr, '--json', 'baseRefName,headRefName,headRefOid,isDraft,state,url']));
  if (prData.baseRefName !== 'main') fail(`PR #${pr}의 base가 main이 아닙니다.`);
  if (prData.headRefName !== branch || prData.headRefOid !== git('rev-parse', 'HEAD')) fail(`PR #${pr}의 head가 현재 브랜치/SHA와 다릅니다.`);
  if (prData.isDraft || prData.state !== 'OPEN') fail(`PR #${pr}은 Ready 상태의 열린 PR이어야 합니다.`);
  console.log(`[session:close] PASS: ${prData.url}`);
  console.log('다음 세션은 이 PR이 merge되면 최신 origin/main에서 시작하세요. staging 확인은 선택입니다(npm run verify:staging).');
}

if (!mode || argv.includes('--help')) {
  console.log('Usage: node scripts/session-delivery-guard.mjs <start|close> --handoff=docs/handoff/<topic>.md [--pr=N]');
  process.exit(mode ? 0 : 1);
}

try {
  if (mode === 'start') start();
  else close();
} catch (error) {
  fail(error.stderr?.trim() || error.message);
}
