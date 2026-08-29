#!/usr/bin/env node
/**
 * `docs/handoff/` 에서 정리 후보를 **찾아서 보여주기만** 한다. 아무것도 지우지 않는다.
 *
 * 왜 지우지 않는가 — CLAUDE.md 절대 규칙 6(사용자 요청 없이 삭제 금지)과 원칙 9(삭제는 3면 grep).
 * 인수인계 문서는 "다음 세션이 그것만 읽고 시작하는" 물건이라, 자동 삭제가 한 번만 틀려도
 * 복구 비용이 절약분보다 크다. 판정은 기계가 하고 삭제는 사람이 한다.
 *
 * 실행: npm run docs:stale  [--days 14]
 *
 * 후보 조건 (둘 다 만족):
 *   ① 규약 문서(CLAUDE.md·AGENTS.md)와 `docs/**` 의 다른 어떤 마크다운에서도 참조되지 않는다.
 *      🔴 단, `docs/handoff/**` 끼리의 참조는 세지 않는다(REFERRER_EXCLUDE_PREFIX). 인수인계 문서는
 *      선행·후속을 서로 링크하는 것이 관례라, 그 링크를 참조로 인정하면 **묶음 전체가 서로를 붙들어**
 *      영구 보존된다 — 2026-08-29 실측으로 그렇게 살아남던 문서가 12개였다. 살아 있는 포인터는
 *      규약 문서나 `docs/` 의 다른 문서(예: `docs/CURRENT_DEV_BASELINE.md`)가 가리키는 것뿐이다.
 *      참조 판정은 `scripts/lib/doc-refs.mjs` — `verify:doc-freshness` 와 **같은 로직**을 쓴다.
 *      (다른 판정을 쓰면 "가드는 통과하는데 정리 후보로 뜨는" 문서가 생긴다.)
 *   ② 마지막 커밋이 N일(기본 14) 이상 지났다. 커밋 이력이 없으면(미추적) 후보에서 뺀다 —
 *      방금 쓴 문서를 지우자고 권하지 않기 위해서다.
 */

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { extractRefsFromLine } from './lib/doc-refs.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TARGET_DIR = 'docs/handoff';
const EXTRA_SOURCES = ['CLAUDE.md', 'AGENTS.md'];
/** 참조 '출처'에서 제외할 접두사 — 후보끼리 서로를 붙들어 영구 보존되는 것을 막는다(헤더 ① 참조). */
const REFERRER_EXCLUDE_PREFIX = `${TARGET_DIR}/`;

function parseDays(argv) {
  const index = argv.indexOf('--days');
  if (index === -1) return 14;
  const value = Number(argv[index + 1]);
  if (!Number.isFinite(value) || value < 0) {
    console.error('[docs:stale] --days 값이 숫자가 아닙니다.');
    process.exit(1);
  }
  return value;
}

function walkMarkdown(relDir) {
  const out = [];
  const absDir = path.join(repoRoot, relDir);
  if (!fs.existsSync(absDir)) return out;
  for (const entry of fs.readdirSync(absDir, { withFileTypes: true })) {
    const rel = `${relDir}/${entry.name}`;
    if (entry.isDirectory()) out.push(...walkMarkdown(rel));
    else if (entry.name.endsWith('.md')) out.push(rel);
  }
  return out;
}

/** 마지막 커밋 시각(ISO). 커밋 이력이 없으면 null. */
function lastCommitIso(relPath) {
  try {
    const out = execFileSync('git', ['log', '-1', '--format=%cI', '--', relPath], {
      cwd: repoRoot,
      encoding: 'utf8',
    }).trim();
    return out || null;
  } catch {
    return null;
  }
}

const maxAgeDays = parseDays(process.argv.slice(2));
const allDocs = walkMarkdown('docs');
const candidates = walkMarkdown(TARGET_DIR);

if (candidates.length === 0) {
  console.log(`[docs:stale] ${TARGET_DIR}/ 에 마크다운이 없습니다.`);
  process.exit(0);
}

// 참조 색인: 후보 자신을 제외한 모든 문서에서 뽑은 레포 경로 참조.
const referencedBy = new Map();
for (const source of [...EXTRA_SOURCES, ...allDocs]) {
  if (source.startsWith(REFERRER_EXCLUDE_PREFIX)) continue;
  const abs = path.join(repoRoot, source);
  if (!fs.existsSync(abs)) continue;
  for (const line of fs.readFileSync(abs, 'utf8').split(/\r?\n/)) {
    for (const ref of extractRefsFromLine(line)) {
      if (ref === source) continue;
      if (!referencedBy.has(ref)) referencedBy.set(ref, new Set());
      referencedBy.get(ref).add(source);
    }
  }
}

const nowMs = Date.now();
const stale = [];
const kept = [];

for (const doc of candidates) {
  const holders = referencedBy.get(doc);
  const iso = lastCommitIso(doc);
  const ageDays = iso ? Math.floor((nowMs - Date.parse(iso)) / 86400000) : null;

  if (holders && holders.size > 0) {
    kept.push({ doc, reason: `참조됨 (${[...holders].join(', ')})` });
  } else if (ageDays === null) {
    kept.push({ doc, reason: '커밋 이력 없음 (미추적/신규)' });
  } else if (ageDays < maxAgeDays) {
    kept.push({ doc, reason: `${ageDays}일 전 커밋 (기준 ${maxAgeDays}일 미만)` });
  } else {
    stale.push({ doc, ageDays, iso });
  }
}

stale.sort((a, b) => b.ageDays - a.ageDays);

console.log(
  `[docs:stale] ${TARGET_DIR}/ ${candidates.length}개 중 정리 후보 ${stale.length}개 ` +
    `(미참조 + 마지막 커밋 ${maxAgeDays}일 경과)`
);

if (stale.length > 0) {
  console.log('');
  for (const item of stale) {
    console.log(`  ${item.doc}  —  ${item.ageDays}일 전 (${item.iso.slice(0, 10)})`);
  }
  console.log('');
  console.log('  이 스크립트는 아무것도 지우지 않습니다. 내용을 확인한 뒤 직접 실행하세요:');
  console.log(`    git rm ${stale.map((item) => item.doc).join(' ')}`);
  console.log('    npm run verify:doc-freshness   # 삭제로 끊어진 링크가 없는지');
}

console.log('');
console.log(`[docs:stale] 후보에서 제외 ${kept.length}개`);
for (const item of kept) {
  console.log(`  ${item.doc}  —  ${item.reason}`);
}
