#!/usr/bin/env node
/**
 * 인수인계 문서 규약 가드 — `docs/handoff/**.md` 의 프론트매터가 템플릿 계약을 지키는지 본다.
 *
 * 왜 필요한가 (2026-08-29 실측):
 *   인수인계 문서는 "다음 세션이 그것만 읽고 시작하는" 물건인데, 상태가 본문에만 있으면
 *   그 상태를 알기 위해 문서를 통째로 읽어야 한다 — 규약이 줄이려던 비용을 규약이 만든다.
 *   54개 중 29개가 302개 세션을 통틀어 한 번도 다시 읽히지 않았고, 표본 감사에서 "완료 회고"가
 *   평균 55%인 반면 "현재 상태 + 다음 작업"은 8% 였다. 그래서 `status`·`updated`·`next`
 *   세 줄만은 **기계가 강제**한다. 세 줄이면 문서를 열지 않고도 이어받을지 말지 정해진다.
 *
 * 무엇을 강제하는가 (정본: docs/handoff/_TEMPLATE.md):
 *   ① 파일이 `---` 프론트매터로 시작한다
 *   ② `status` 가 active | blocked | done 중 하나다
 *   ③ `updated` 가 YYYY-MM-DD 다 (템플릿 자신만 자리표시자 `YYYY-MM-DD` 허용)
 *   ④ `next` 가 비어 있지 않은 한 줄이다
 *
 * fail-closed (CLAUDE.md 코딩 원칙 10):
 *   대상 목록을 손으로 열거하지 않고 디렉터리에서 전수 발견한다. **한 개도 못 찾으면 실패**한다 —
 *   경로가 바뀌었는데 초록불이 뜨는 것이 가드가 죽는 가장 흔한 방식이다. 정본 템플릿이 없어도
 *   실패한다(그것이 이 계약의 근거 문서다).
 *
 * 실행: npm run verify:handoff-contract [--self-test]
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TARGET_DIR = 'docs/handoff';
const TEMPLATE = `${TARGET_DIR}/_TEMPLATE.md`;
const ALLOWED_STATUS = ['active', 'blocked', 'done'];

/**
 * 한 문서의 프론트매터를 검사해 위반 문자열 배열을 돌려준다. 순수 함수라 --self-test 가
 * 파일을 건드리지 않고 음성 사례를 돌릴 수 있다(임시 되돌림에 git checkout 을 쓰지 않는다).
 */
export function checkHandoffDoc(relPath, text) {
  const problems = [];
  const lines = text.split(/\r?\n/);

  if (lines[0] !== '---') {
    problems.push('프론트매터가 없다 — 파일 첫 줄이 `---` 여야 한다');
    return problems;
  }

  const closing = lines.indexOf('---', 1);
  if (closing === -1) {
    problems.push('프론트매터가 닫히지 않았다 — 두 번째 `---` 가 없다');
    return problems;
  }

  const block = lines.slice(1, closing);
  const value = (key) => {
    const hit = block.find((line) => line.startsWith(`${key}:`));
    return hit === undefined ? null : hit.slice(key.length + 1).trim();
  };

  const status = value('status');
  if (status === null) {
    problems.push('`status:` 가 없다');
  } else if (!ALLOWED_STATUS.includes(status)) {
    problems.push(`\`status: ${status}\` 는 허용값이 아니다 (${ALLOWED_STATUS.join(' | ')})`);
  }

  const updated = value('updated');
  if (updated === null) {
    problems.push('`updated:` 가 없다');
  } else if (!/^\d{4}-\d{2}-\d{2}$/.test(updated) && !(relPath === TEMPLATE && updated === 'YYYY-MM-DD')) {
    problems.push(`\`updated: ${updated}\` 가 YYYY-MM-DD 형식이 아니다`);
  }

  const next = value('next');
  const nextText = next === null ? '' : next.replace(/^["']|["']$/g, '').trim();
  if (next === null) {
    problems.push('`next:` 가 없다 — 이어받는 세션이 처음 할 일을 한 줄로 적는다');
  } else if (nextText === '') {
    problems.push('`next:` 가 비어 있다');
  }

  return problems;
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

function selfTest() {
  const good = '---\nstatus: active\nupdated: 2026-08-29\nnext: "다음 할 일"\n---\n\n# 제목\n';
  const cases = [
    ['정상', TEMPLATE.replace('_TEMPLATE', 'sample'), good, 0],
    ['프론트매터 없음', 'docs/handoff/x.md', '# 제목\n본문\n', 1],
    ['닫히지 않음', 'docs/handoff/x.md', '---\nstatus: active\n', 1],
    ['status 오타', 'docs/handoff/x.md', good.replace('active', 'in-progress'), 1],
    ['status 누락', 'docs/handoff/x.md', good.replace('status: active\n', ''), 1],
    ['updated 형식 위반', 'docs/handoff/x.md', good.replace('2026-08-29', '2026/08/29'), 1],
    ['updated 자리표시자는 템플릿에서만 허용', 'docs/handoff/x.md', good.replace('2026-08-29', 'YYYY-MM-DD'), 1],
    ['템플릿의 자리표시자는 통과', TEMPLATE, good.replace('2026-08-29', 'YYYY-MM-DD'), 0],
    ['next 빈 값', 'docs/handoff/x.md', good.replace('"다음 할 일"', '""'), 1],
    ['next 누락', 'docs/handoff/x.md', good.replace('next: "다음 할 일"\n', ''), 1],
    ['CRLF 도 같은 판정', 'docs/handoff/x.md', good.replace(/\n/g, '\r\n'), 0],
  ];

  let failed = 0;
  for (const [label, rel, text, expected] of cases) {
    const got = checkHandoffDoc(rel, text).length;
    const ok = expected === 0 ? got === 0 : got >= 1;
    if (!ok) {
      console.error(`  ✗ ${label} — 기대 ${expected === 0 ? '0건' : '1건 이상'}, 실제 ${got}건`);
      failed += 1;
    }
  }
  if (failed > 0) {
    console.error(`[verify:handoff-contract] SELF-TEST FAIL — ${failed}건`);
    process.exit(1);
  }
  console.log(`[verify:handoff-contract] self-test OK (${cases.length}건)`);
}

if (process.argv.includes('--self-test')) {
  selfTest();
  process.exit(0);
}

const docs = walkMarkdown(TARGET_DIR);

// fail-closed ①: 대상이 0개면 통과가 아니라 실패다.
if (docs.length === 0) {
  console.error(`[verify:handoff-contract] FAIL — ${TARGET_DIR}/ 에서 마크다운을 하나도 못 찾았다.`);
  console.error('  경로가 바뀌었거나 디렉터리가 사라졌다. 통과시키지 않는다.');
  process.exit(1);
}

// fail-closed ②: 계약의 정본인 템플릿이 없으면 실패한다.
if (!docs.includes(TEMPLATE)) {
  console.error(`[verify:handoff-contract] FAIL — 정본 템플릿 ${TEMPLATE} 이 없다.`);
  process.exit(1);
}

const violations = [];
for (const doc of docs) {
  const text = fs.readFileSync(path.join(repoRoot, doc), 'utf8');
  for (const problem of checkHandoffDoc(doc, text)) {
    violations.push({ doc, problem });
  }
}

if (violations.length > 0) {
  console.error(`[verify:handoff-contract] FAIL — ${violations.length}건`);
  for (const { doc, problem } of violations) {
    console.error(`  ${doc}  —  ${problem}`);
  }
  console.error('');
  console.error(`  규약은 ${TEMPLATE} 에 있다. 세 줄(status·updated·next)은 예외 없이 채운다.`);
  process.exit(1);
}

console.log(`[verify:handoff-contract] OK — ${docs.length}개 문서가 프론트매터 계약을 지킨다.`);
