#!/usr/bin/env node
/**
 * 한국 음양력 표 신선도·구조 가드.
 *
 *   node scripts/verify-korean-calendar-table-fresh.mjs [--report]
 *
 * 🔴 LLM 실호출 없음.
 *
 * 하는 일 넷:
 *   ① 생성기를 메모리에서 다시 돌려 커밋된 표와 **바이트 비교**한다.
 *      표를 손으로 고쳐 가드를 침묵시키는 길을 막는다(verify:sitemap-drift 와 같은 방식).
 *   ② 표의 구조를 단언한다 — 블록 수·달 수·절기 수·지문 일치. 대상이 0이면 통과하는 가드는
 *      가드가 아니므로 전부 하한이 아니라 **정확한 값**으로 건다.
 *   ③ 외부 근거 앵커. 알려진 한국 설날·윤달·1997-02-10 을 코어가 재현하는지 본다.
 *      🔴 이 값들은 코어 안에 없다. 여기 가드에만 있다 — 그게 하드코딩을 없앤 목적이다.
 *   ④ 🔴 런타임 모듈이 astronomy-engine 을 import 하지 않는지. 이게 깨지면 116KB 천문
 *      라이브러리가 정적 셸·앱 클라이언트 번들로 끌려 들어온다.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { buildTable, renderOutputs } from "./build-korean-calendar-table.mjs";
import { lunarToSolar, solarToLunar, TABLE_FINGERPRINT, TABLE_META, MIDNIGHT_RISKS } from "../lib/korean-calendar/core.js";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const REPORT = process.argv.includes("--report");
const failures = [];
let checks = 0;
const ok = (label, condition, detail = "") => {
  checks += 1;
  if (!condition) failures.push(`${label}${detail ? `\n      ${detail}` : ""}`);
  else if (REPORT) console.log(`  ok  ${label}`);
};

const read = (rel) => {
  try { return readFileSync(join(REPO_ROOT, rel), "utf8"); } catch { return null; }
};

// ── ① 표가 생성기 재실행과 일치한다 ────────────────────────────────────────
const rebuilt = buildTable();
const outputs = renderOutputs(rebuilt);
for (const [rel, expected] of Object.entries(outputs)) {
  const current = read(rel);
  ok(`① ${rel} 이 존재한다`, current !== null);
  if (current !== null) {
    ok(`① ${rel} 이 생성기 재실행과 바이트 단위로 같다`, current === expected, "node scripts/build-korean-calendar-table.mjs 를 돌리고 결과를 같은 커밋에 담을 것");
  }
}

// ── ② 구조 ─────────────────────────────────────────────────────────────────
// 🔴 실측값(2026-08-27, astronomy-engine 2.1.19). 하한이 아니라 정확한 값으로 건다.
const EXPECTED = Object.freeze({
  blockCount: 202,
  monthCount: 2499,
  termCount: 4872,
  midnightRiskCount: 51, // 절기 34 + 삭 17
  firstBlockYear: 1900,
  lastBlockYear: 2101,
  supportedMinYear: 1900,
  supportedMaxYear: 2100,
});
for (const [key, expected] of Object.entries(EXPECTED)) {
  ok(`② TABLE_META.${key} = ${expected}`, (TABLE_META[key] ?? MIDNIGHT_RISKS.length) === expected || (key === "midnightRiskCount" && MIDNIGHT_RISKS.length === expected), `실제=${key === "midnightRiskCount" ? MIDNIGHT_RISKS.length : TABLE_META[key]}`);
}
ok("② 커밋된 표의 지문이 재생성 지문과 같다", TABLE_FINGERPRINT === rebuilt.fingerprint, `commit=${TABLE_FINGERPRINT} rebuilt=${rebuilt.fingerprint}`);

// 🔴 정적 셸용 클래식 스크립트판은 셸이 실제로 그 표를 읽는 PR 에서 만든다. 그때 이 자리에
// "두 산출 파일의 지문이 같다" 검사를 더한다 — 세 엔진이 같은 숫자를 보는 근거가 그것이다.
ok("② TABLE_META.timezone 이 Asia/Seoul 이다", TABLE_META.timezone === "Asia/Seoul", String(TABLE_META.timezone));
ok("② TABLE_META.utcOffsetMinutes 가 540 이다", TABLE_META.utcOffsetMinutes === 540, String(TABLE_META.utcOffsetMinutes));

// ── ③ 외부 근거 앵커 ───────────────────────────────────────────────────────
// 🔴 이 값들은 코어에 없다. 코어는 규칙만으로 이 답을 내야 한다.
const fmt = (v) => (v ? `${v.lunarYear}/${v.isLeapMonth ? "윤" : ""}${v.lunarMonth}/${v.lunarDay}` : "null");
const ymd = (v) => (v ? `${v.year}-${String(v.month).padStart(2, "0")}-${String(v.day).padStart(2, "0")}` : "null");

// 이 서비스가 오래 하루짜리 하드코딩(KASI_LOCAL_PATCH_SEED)으로 덮고 있던 바로 그 날짜.
ok("③ 1997-02-10 = 음력 1997/1/3 (KASI 값, 로직으로)", fmt(solarToLunar(1997, 2, 10)) === "1997/1/3", fmt(solarToLunar(1997, 2, 10)));

// 한국 설날(음력 1월 1일). 중국은 1997 을 2/7 로 본다 — 그 차이가 이 코어의 존재 이유다.
const NEW_YEARS = {
  1988: "1988-02-18", 1995: "1995-01-31", 1997: "1997-02-08", 1999: "1999-02-16",
  2001: "2001-01-24", 2020: "2020-01-25", 2021: "2021-02-12", 2023: "2023-01-22",
  2024: "2024-02-10", 2025: "2025-01-29", 2026: "2026-02-17", 2034: "2034-02-19",
};
const badNewYears = Object.entries(NEW_YEARS).filter(([year, expected]) => ymd(lunarToSolar(Number(year), 1, 1, false)) !== expected);
ok(`③ 한국 설날 ${Object.keys(NEW_YEARS).length}건이 전부 맞는다`, badNewYears.length === 0, badNewYears.map(([y, e]) => `${y} 기대=${e} 실제=${ymd(lunarToSolar(Number(y), 1, 1, false))}`).join("\n      "));

// 윤달 배치. 2033 윤11월은 역법에서 가장 유명한 난케이스다.
const LEAP_ANCHORS = [
  [1984, 10, "1984-11-23"], [1995, 8, "1995-09-25"], [2001, 4, "2001-05-23"],
  [2020, 4, "2020-05-23"], [2023, 2, "2023-03-22"], [2025, 6, "2025-07-25"], [2033, 11, "2033-12-22"],
];
const badLeaps = LEAP_ANCHORS.filter(([y, m, expected]) => ymd(lunarToSolar(y, m, 1, true)) !== expected);
ok(`③ 윤달 앵커 ${LEAP_ANCHORS.length}건이 전부 맞는다`, badLeaps.length === 0, badLeaps.map(([y, m, e]) => `${y} 윤${m}월 기대=${e} 실제=${ymd(lunarToSolar(y, m, 1, true))}`).join("\n      "));

// 범위 양끝이 살아 있어야 한다. 블록을 1900..2100 으로 끊으면 2100년 말이 조용히 null 이 된다.
ok("③ 지원 범위 양끝이 null 이 아니다", Boolean(solarToLunar(1900, 1, 1)) && Boolean(solarToLunar(2100, 12, 31)), `${fmt(solarToLunar(1900, 1, 1))} / ${fmt(solarToLunar(2100, 12, 31))}`);
ok("③ 지원 범위 밖은 null 이다", solarToLunar(1899, 12, 31) === null && solarToLunar(2101, 1, 1) === null);

// ── ④ 런타임이 천문 라이브러리를 끌고 들어오지 않는다 ──────────────────────
// 🔴 ephemeris.js 는 빌드타임 전용이다. index.js 에서 닿으면 116KB 가 번들에 실린다.
{
  const seen = new Set();
  const offenders = [];
  const walk = (rel) => {
    if (seen.has(rel)) return;
    seen.add(rel);
    const source = read(rel);
    if (source === null) return;
    for (const m of source.matchAll(/from\s+"([^"]+)"/g)) {
      const spec = m[1];
      if (spec === "astronomy-engine") { offenders.push(rel); continue; }
      if (!spec.startsWith(".")) continue;
      walk(join(dirname(rel), spec).replace(/\\/g, "/"));
    }
  };
  walk("lib/korean-calendar/index.js");
  ok("④ 런타임 import 그래프에 astronomy-engine 이 없다", offenders.length === 0, `발견=${JSON.stringify(offenders)}`);
  ok("④ 그래프를 실제로 훑었다", seen.size >= 5, `방문=${seen.size}개`);
  ok("④ ephemeris.js 는 런타임 그래프 밖이다", !seen.has("lib/korean-calendar/ephemeris.js"), [...seen].join(", "));
}

if (failures.length) {
  console.error(`[verify:korean-calendar-table-fresh] 실패 ${failures.length}건 / 검사 ${checks}건`);
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}
console.log(
  `[verify:korean-calendar-table-fresh] 통과 — 검사 ${checks}건 · 블록 ${TABLE_META.blockCount} · 달 ${TABLE_META.monthCount} · 절기 ${TABLE_META.termCount} · ${TABLE_FINGERPRINT}`,
);
