#!/usr/bin/env node
/**
 * 운명의 섬 별 설명 정합 가드 — 워커가 내려주는 별 이름마다 설명이 실제로 있는지 본다.
 *
 *   node scripts/verify-island-star-copy.mjs [--report]
 *
 * 🔴 LLM 실호출 없음. 워커의 별 카탈로그를 import 해서 읽고 정적 파일을 파싱할 뿐이다.
 *
 * ── 왜 필요한가 ─────────────────────────────────────────────────────────────
 * 섬 상세(destiny-island.html)와 유료 리포트(worker/lib/island/report-star-data.js)는
 * 별 이름을 **키로** 설명을 찾는다. 소비 코드가 전부 `.filter(Boolean)` / `?.` 라
 * 키가 없으면 **에러 없이 그 별의 설명 줄만 조용히 사라진다.** 화면도 콘솔도 조용하다.
 *
 * 실제로 오래 그런 상태였다(2026-08-27 실측):
 *   · destiny-island.html 은 `록존` 을 키로 갖고 있었는데 워커는 `녹존` 을 보낸다
 *   · 같은 파일이 `청양` 을 갖고 있었는데 워커는 `경양` 을 보낸다
 *   · PR #1163 이 워커에 `천마` 를 추가하자 섬과 리포트 양쪽에 설명이 없어졌다
 *
 * ── 어떻게 fail-closed 인가 (CLAUDE.md 원칙 10) ─────────────────────────────
 * 검사 대상 별 목록을 손으로 적지 않는다. 워커 카탈로그를 **실행해서** 가져오고,
 * 거기 있는 별 중 설명이 없는 것이 하나라도 있으면 실패한다.
 * 그래서 워커에 별을 추가하면 이 가드가 즉시 빨간불이 된다.
 *
 * 🔴 잉여 키는 허용한다. destiny-island.html 의 보좌성 맵에는 살성(경양·타라·화성·영성)
 * 설명도 함께 들어 있는데, 그건 오래된 배치일 뿐 화면을 깨지 않는다. 요청받지 않은
 * 삭제는 하지 않는다(CLAUDE.md 절대 규칙 6).
 *
 * ── 음성 테스트 (2026-08-27 실측, 6종 전부 빨간불 확인) ─────────────────────
 *   섬 맵의 `녹존` 을 `록존` 으로 되돌림          → ① 섬 보좌성 설명 누락
 *   섬 맵의 `경양` 을 `청양` 으로 되돌림          → ① 섬 살성 설명 누락
 *   섬 맵에서 `천마` 제거                         → ① 섬 보좌성 설명 누락
 *   서버 ASSIST_FACET 에서 `천마` 제거            → ② 리포트 보좌성 설명 누락
 *   미러(public/)만 낡은 키로 되돌림              → ③ 미러 키 불일치
 *   워커 카탈로그에 없던 별 추가                  → ① 즉시 실패(가드를 안 고쳐도 따라온다)
 * 복원은 메모리 버퍼로만 했다(git checkout 금지).
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { __ziweiAiChartTestUtils } from "../worker/lib/ziwei-ai-chart.js";
import { ASSIST_FACET, MALEFIC_FACET } from "../worker/lib/island/report-star-data.js";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const REPORT = process.argv.includes("--report");
const failures = [];
let checks = 0;

const ok = (label, condition, detail = "") => {
  checks += 1;
  if (!condition) failures.push(`${label}${detail ? `\n      ${detail}` : ""}`);
  else if (REPORT) console.log(`  ok  ${label}`);
};

const read = (rel) => readFileSync(join(REPO_ROOT, rel), "utf8");

// ── 별 이름 정본 — 워커 카탈로그를 실행해서 가져온다 ───────────────────────
// 🔴 이 목록을 여기에 베껴 적으면 가드가 아니다. 워커가 별을 추가하면 그대로 따라와야 한다.
const { ASSISTANT_STARS, MALEFIC_STARS } = __ziweiAiChartTestUtils;

ok(
  "워커 카탈로그를 실제로 읽었다",
  Array.isArray(ASSISTANT_STARS) && ASSISTANT_STARS.length >= 8 && Array.isArray(MALEFIC_STARS) && MALEFIC_STARS.length >= 6,
  `보좌성 ${ASSISTANT_STARS?.length}개 · 살성 ${MALEFIC_STARS?.length}개`,
);

/**
 * `var NAME={"키":"값",...};` 한 줄에서 키 집합을 뽑는다.
 * 섬 파일은 이 맵들을 각각 한 줄짜리 객체 리터럴로 들고 있다.
 */
function extractMapKeys(source, mapName) {
  const hit = new RegExp(`var ${mapName}\\s*=\\s*\\{([\\s\\S]*?)\\};`).exec(source);
  if (!hit) return null;
  const keys = new Set();
  for (const m of hit[1].matchAll(/"([^"]+)"\s*:/g)) keys.add(m[1]);
  return keys;
}

// ── ① 섬 상세 화면(destiny-island.html) ─────────────────────────────────────
{
  const source = read("destiny-island.html");
  const assist = extractMapKeys(source, "ASSIST_MEANING");
  const malefic = extractMapKeys(source, "MALEFIC_MEANING");

  ok("① destiny-island.html 에서 ASSIST_MEANING 을 찾았다", Boolean(assist), "맵 이름이나 형태가 바뀌었다");
  ok("① destiny-island.html 에서 MALEFIC_MEANING 을 찾았다", Boolean(malefic), "맵 이름이나 형태가 바뀌었다");

  if (assist) {
    const missing = ASSISTANT_STARS.filter((star) => !assist.has(star));
    ok("① 섬 보좌성 설명이 워커 카탈로그를 전부 덮는다", missing.length === 0, `설명 없는 별=${JSON.stringify(missing)}`);
  }
  if (malefic) {
    const missing = MALEFIC_STARS.filter((star) => !malefic.has(star));
    ok("① 섬 살성 설명이 워커 카탈로그를 전부 덮는다", missing.length === 0, `설명 없는 별=${JSON.stringify(missing)}`);
  }
}

// ── ② 유료 리포트 정본(worker/lib/island/report-star-data.js) ───────────────
// 소비처 worker/lib/island/island-report.js 가 ASSIST_FACET[star] / MALEFIC_FACET[star]?.cause 로
// 읽고 filter(Boolean) 하므로, 키가 없으면 그 별만 근거 문장에서 빠진다.
{
  const missingAssist = ASSISTANT_STARS.filter((star) => !ASSIST_FACET[star]);
  const missingMalefic = MALEFIC_STARS.filter((star) => !MALEFIC_FACET[star]?.cause || !MALEFIC_FACET[star]?.care);
  ok("② 리포트 ASSIST_FACET 이 워커 카탈로그를 전부 덮는다", missingAssist.length === 0, `설명 없는 별=${JSON.stringify(missingAssist)}`);
  ok("② 리포트 MALEFIC_FACET 이 cause·care 를 전부 갖는다", missingMalefic.length === 0, `불완전한 별=${JSON.stringify(missingMalefic)}`);
}

// ── ③ sync:public 미러가 같은 키를 갖는다 ───────────────────────────────────
// destiny-island.html 은 캐시버스트 해시가 붙지 않는 단순 바이트 미러다. 어긋나면
// 사용자가 보는 쪽(public/)만 낡은 설명을 쓴다.
{
  const mirror = read("public/destiny-island.html");
  const assist = extractMapKeys(mirror, "ASSIST_MEANING");
  const malefic = extractMapKeys(mirror, "MALEFIC_MEANING");
  ok("③ 미러에서도 두 맵을 찾았다", Boolean(assist) && Boolean(malefic));
  if (assist) {
    const missing = ASSISTANT_STARS.filter((star) => !assist.has(star));
    ok("③ 미러 보좌성 설명이 워커 카탈로그를 전부 덮는다", missing.length === 0, `설명 없는 별=${JSON.stringify(missing)} — npm run sync:public 을 돌렸는지 확인할 것`);
  }
  if (malefic) {
    const missing = MALEFIC_STARS.filter((star) => !malefic.has(star));
    ok("③ 미러 살성 설명이 워커 카탈로그를 전부 덮는다", missing.length === 0, `설명 없는 별=${JSON.stringify(missing)} — npm run sync:public 을 돌렸는지 확인할 것`);
  }
}

if (failures.length) {
  console.error(`[verify:island-star-copy] 실패 ${failures.length}건 / 검사 ${checks}건`);
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}
console.log(
  `[verify:island-star-copy] 통과 — 검사 ${checks}건 · 보좌성 ${ASSISTANT_STARS.length}개 · 살성 ${MALEFIC_STARS.length}개`,
);
