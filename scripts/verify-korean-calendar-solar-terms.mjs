#!/usr/bin/env node
/**
 * 절기 천체력 동등성 가드 — "천체력은 그대로고 타임존만 고쳤다" 를 기계로 만든 문장.
 *
 *   node scripts/verify-korean-calendar-solar-terms.mjs [--report]
 *
 * 🔴 LLM 실호출 없음.
 *
 * ── 왜 필요한가 ─────────────────────────────────────────────────────────────
 * 코어를 도입하면 절기가 KST 로 바뀐다. 그때 "절기 시각 자체가 달라진 것"과 "민용일 판정만
 * 달라진 것"을 반드시 갈라야 한다. 전자는 버그고 후자는 이번 작업의 목적이다.
 *
 * 이 가드는 astronomy-engine 이 낸 절기 **순간**과 lunar-javascript 가 낸 절기 순간을
 * (그쪽은 CST 벽시계이므로 UTC 로 되돌려서) 직접 비교한다. 둘이 분 단위로 같으면,
 * 이후 절기 관련 회귀는 전부 민용일 문제로 좁혀진다.
 *
 * 마이그레이션 PR 의 판정 규칙이 여기서 나온다:
 *   · 픽스처의 절기 **시각**이 2분 넘게 움직였다 → 🔴 그 PR 의 버그
 *   · 절기 **민용일**만 하루 움직였다 → 원래 틀렸던 것(타임존)
 */
import { Solar } from "lunar-javascript";

import { solarTermInstants } from "../lib/korean-calendar/ephemeris.js";
import { TABLE_META } from "../lib/korean-calendar/core.js";
import { TERM_NAME_HANJA } from "../lib/korean-calendar/labels.js";

const REPORT = process.argv.includes("--report");
const failures = [];
let checks = 0;
const ok = (label, condition, detail = "") => {
  checks += 1;
  if (!condition) failures.push(`${label}${detail ? `\n      ${detail}` : ""}`);
  else if (REPORT) console.log(`  ok  ${label}`);
};

const MIN_YEAR = TABLE_META.supportedMinYear;
const MAX_YEAR = TABLE_META.supportedMaxYear;
const CST_OFFSET_MS = 8 * 3600 * 1000;

/**
 * lunar-javascript 의 절기표를 시각순 24개로 돌려준다.
 *
 * 🔴 **이름으로 짝짓지 않는다.** lunar-javascript 는 간체자(`惊蛰`,`清明`)를 쓰고 동지만
 * `DONG_ZHI` 라는 로마자 키로 낸다(워커 `worker/routes/kasi.js` 에 별칭 맵이 있던 이유가 그것이다 —
 * 그 맵은 절기 소비자가 코어로 옮겨가면서 지웠다).
 * 이름으로 맞추면 7개가 조용히 빠져 비교 건수가 4,824 → 3,417 로 줄었다.
 * 두 표 모두 소한부터 동지까지 시각순 24개이므로 **순서로** 짝짓는다.
 *
 * 그쪽 시각은 CST 벽시계이므로 같은 축에서 비교하려고 UTC 순간으로 되돌린다.
 */
function lunarJsTermInstants(year) {
  const table = Solar.fromYmd(year, 6, 1).getLunar().getJieQiTable();
  return Object.values(table)
    .filter((solar) => solar.getYear() === year)
    .map((solar) => Date.UTC(solar.getYear(), solar.getMonth() - 1, solar.getDay(), solar.getHour(), solar.getMinute(), solar.getSecond()) - CST_OFFSET_MS)
    .sort((a, b) => a - b);
}

let compared = 0;
let sumAbs = 0;
let maxAbs = 0;
let maxLabel = "";
const overTolerance = [];

for (let year = MIN_YEAR; year <= MAX_YEAR; year += 1) {
  const mine = solarTermInstants(year);
  const theirs = lunarJsTermInstants(year);
  if (theirs.length !== 24) { overTolerance.push(`${year} lj 절기가 ${theirs.length}개`); continue; }
  for (const term of mine) {
    const other = theirs[term.index];
    const label = `${year} ${TERM_NAME_HANJA[term.index]}`;
    const deltaMinutes = Math.abs(term.ms - other) / 60000;
    compared += 1;
    sumAbs += deltaMinutes;
    if (deltaMinutes > maxAbs) { maxAbs = deltaMinutes; maxLabel = label; }
    if (deltaMinutes > 2) overTolerance.push(`${label} Δ=${deltaMinutes.toFixed(2)}분`);
  }
}

const mean = compared ? sumAbs / compared : Infinity;

// 🔴 실측(2026-08-27, astronomy-engine 2.1.19 vs lunar-javascript 1.7.7):
// 4,623건 · 평균 0.21분 · 최대 1.04분 · 2분 초과 0건.
ok("① 비교 건수가 하한을 넘는다(공회전이 아니다)", compared >= 4600, `compared=${compared}`);
ok("② 평균 오차가 0.5분 이하다", mean <= 0.5, `mean=${mean.toFixed(3)}분`);
ok("③ 최대 오차가 2분 이하다", maxAbs <= 2, `max=${maxAbs.toFixed(2)}분 (${maxLabel})`);
ok("④ 2분을 넘는 절기가 하나도 없다", overTolerance.length === 0, overTolerance.slice(0, 10).join("\n      "));

if (failures.length) {
  console.error(`[verify:korean-calendar-solar-terms] 실패 ${failures.length}건 / 검사 ${checks}건`);
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}
console.log(
  `[verify:korean-calendar-solar-terms] 통과 — ${compared}건 비교 · 평균 ${mean.toFixed(3)}분 · 최대 ${maxAbs.toFixed(2)}분 (${maxLabel}) · 2분 초과 0건`,
);
