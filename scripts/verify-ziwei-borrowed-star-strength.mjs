#!/usr/bin/env node
/**
 * 꿀꿀 셸(js/saju-engine.js) 자미 별 강약이 정본(lib/ziwei-star-strength.js)과 같은지,
 * 특히 차성(借星)을 깎거나 뒤집지 않는지 검사한다.
 *
 * ── 이력 ───────────────────────────────────────────────────────────────────
 * 2026-08-29: 차성 밝기를 별이 실제로 앉은 대궁이 아니라 **빈 궁의 지지**로 재고 있었다
 *   (원성 묘 78건 중 31건이 화면에 함). 대궁으로 고치면서 "원성 힘의 70%" 규칙을 함께 넣었다.
 * 2026-10-01 (S4): 셸 강약을 정본 7등급 표의 사본(ZW_STAR_STRENGTH)으로 바꿨다. 옛 점수 모델·
 *   차성 ×0.7·화기 강등은 원전에 없는 규칙이라 걷어 냈고, 이 가드도 새 계약으로 다시 정의했다.
 *   차성은 빈 궁이 아니라 대궁에 실제로 앉아 있으므로 **앉은 자리 등급을 그대로** 읽는다.
 *
 * 지키는 것:
 *   ① 셸 사본 ZW_STAR_STRENGTH 의 별 목록이 정본 등급 별 목록과 같고, 240칸(20성 × 12지지)이
 *      정본 starStrength 와 전부 같다('' = 구조상 앉지 못하는 지지).
 *   ② zwOppositeZhi 가 맞은편 궁을 가리킨다.
 *   ③ 차성 등급 = 대궁(앉은 자리)의 정본 등급 그대로 — 빈 궁 지지로 재지도, 깎지도 않는다.
 *   ④ 강약을 매기지 않는 별은 '' 다 — 평 같은 기본값을 지어내지 않는다.
 *   ⑤ 실제 명반에서 공궁의 borrowedMain 이 대궁 main 과 같은 별 집합이다(③의 대궁 가정).
 *   ⑥ 실제 명반의 palaceStarData 모든 행(주성·보좌·살성, 차성·화기 포함)이 정본 등급이고,
 *      symbol 이 그 등급의 한자 한 글자(廟旺得利平不陷)다. 화기가 붙어도 등급을 내리지 않는다.
 *
 * 🔴 검사 대상은 손으로 열거하지 않는다 — 별 목록은 정본(ZIWEI_RATED_STAR_META)과 셸 표에서 가져오고,
 *    명반에서 차성·화기 행을 하나도 못 보면 통과가 아니라 **실패**한다(fail-closed).
 *
 * 실행: npm run verify:ziwei-borrowed-strength
 */
import { createRequire } from "node:module";

import { ZIWEI_RATED_STAR_META, starStrength } from "../lib/ziwei-star-strength.js";

const require = createRequire(import.meta.url);
const harness = require("../scripts/lib/ziwei-engine-harness.cjs");

const ZHI = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];
const NOT_RATED = ["좌보", "우필", "녹존", "천괴", "천월", "천마", "지공", "지겁"];

// 공궁이 실제로 나오는 명반만 골랐다(공궁 0인 명반은 차성 행이 없어 이 가드가 볼 것이 없다).
const CASES = [
  { label: "1985-03-12 07:10 (solar, male)", gender: "M", year: 1985, month: 3, day: 12, hour: 7, minute: 10 },
  { label: "1985-11-03 03:20 (solar, female)", gender: "F", year: 1985, month: 11, day: 3, hour: 3, minute: 20 },
  { label: "1991-02-20 08:30 (solar, male)", gender: "M", year: 1991, month: 2, day: 20, hour: 8, minute: 30 },
  { label: "1991-09-02 11:45 (solar, female)", gender: "F", year: 1991, month: 9, day: 2, hour: 11, minute: 45 },
  { label: "1978-07-21 22:15 (solar, female)", gender: "F", year: 1978, month: 7, day: 21, hour: 22, minute: 15 },
  { label: "2001-02-27 19:45 (solar, male)", gender: "M", year: 2001, month: 2, day: 27, hour: 19, minute: 45 },
];

const failures = [];
let checks = 0;

function ok(label, condition, detail = "") {
  checks += 1;
  if (!condition) failures.push(`${label}${detail ? `\n      ${detail}` : ""}`);
}

/** 정본이 말하는 그 자리의 등급. 매기지 않는 별·앉지 못하는 자리는 '' (셸 표기와 같은 축). */
function canonicalGrade(star, branchIndex) {
  const r = starStrength(star, branchIndex);
  return r.status === "rated" ? r.rawKo : "";
}
function canonicalGlyph(star, branchIndex) {
  const r = starStrength(star, branchIndex);
  return r.status === "rated" ? r.rawHanja[0] : "";
}

harness.loadEngine();

const { ZW_STAR_STRENGTH, zwComputeStarStrength, zwOppositeZhi } = globalThis;
for (const [name, value] of Object.entries({ ZW_STAR_STRENGTH, zwComputeStarStrength, zwOppositeZhi })) {
  if (value === undefined) {
    console.error(`[verify:ziwei-borrowed-strength] 엔진에서 ${name} 를 찾지 못했다 — 이름이 바뀌었는지 확인할 것.`);
    process.exit(1);
  }
}

// ── ① 셸 사본 = 정본 ───────────────────────────────────────────────────────
const RATED = ZIWEI_RATED_STAR_META.map((s) => s.name);
const SHELL_STARS = Object.keys(ZW_STAR_STRENGTH || {});
if (RATED.length === 0 || SHELL_STARS.length === 0) {
  console.error("[verify:ziwei-borrowed-strength] 정본 또는 셸 강약표가 비었다 — 검사 대상 0건이므로 실패로 둔다.");
  process.exit(1);
}
ok(
  "셸 강약표의 별 목록이 정본 등급 별 목록과 같다",
  JSON.stringify([...SHELL_STARS].sort()) === JSON.stringify([...RATED].sort()),
  `셸에만 ${JSON.stringify(SHELL_STARS.filter((s) => !RATED.includes(s)))} · 정본에만 ${JSON.stringify(RATED.filter((s) => !SHELL_STARS.includes(s)))}`,
);
const cellMismatches = [];
let cells = 0;
for (const star of RATED) {
  const row = ZW_STAR_STRENGTH[star] || [];
  for (let b = 0; b < 12; b += 1) {
    cells += 1;
    if (row[b] !== canonicalGrade(star, b)) cellMismatches.push(`${star}·${ZHI[b]}: 셸 '${row[b]}' / 정본 '${canonicalGrade(star, b)}'`);
  }
}
ok(
  `셸 강약표 ${cells}칸이 정본 starStrength 와 같다`,
  cells === RATED.length * 12 && cellMismatches.length === 0,
  cellMismatches.slice(0, 5).join("\n      ") + (cellMismatches.length > 5 ? `\n      ... 외 ${cellMismatches.length - 5}건` : ""),
);

// ── ② 대궁 지지 헬퍼 ──────────────────────────────────────────────────────
for (let i = 0; i < 12; i += 1) {
  ok(
    `zwOppositeZhi(${ZHI[i]}) 가 맞은편 궁을 가리킨다`,
    zwOppositeZhi(ZHI[i]) === ZHI[(i + 6) % 12],
    `expected ${ZHI[(i + 6) % 12]}, actual ${zwOppositeZhi(ZHI[i])}`,
  );
}

// ── ③④ 별 × 지지 전수 스윕 ────────────────────────────────────────────────
const sweepMismatches = [];
for (const star of RATED) {
  for (let i = 0; i < 12; i += 1) {
    const seat = (i + 6) % 12;
    const own = zwComputeStarStrength(star, ZHI[i], false);
    const borrowed = zwComputeStarStrength(star, ZHI[i], true);
    if (own !== canonicalGrade(star, i)) sweepMismatches.push(`${star}·${ZHI[i]} 원성: '${own}' / 정본 '${canonicalGrade(star, i)}'`);
    if (borrowed !== canonicalGrade(star, seat)) {
      sweepMismatches.push(`${star}·빈궁 ${ZHI[i]}(앉은 자리 ${ZHI[seat]}) 차성: '${borrowed}' / 정본 '${canonicalGrade(star, seat)}'`);
    }
  }
}
ok(
  "원성은 그 자리, 차성은 대궁(앉은 자리)의 정본 등급 그대로다 — 깎지도 빈 궁 지지로 재지도 않는다",
  sweepMismatches.length === 0,
  sweepMismatches.slice(0, 5).join("\n      ") + (sweepMismatches.length > 5 ? `\n      ... 외 ${sweepMismatches.length - 5}건` : ""),
);
for (const star of NOT_RATED) {
  const seen = ZHI.flatMap((z) => [zwComputeStarStrength(star, z, false), zwComputeStarStrength(star, z, true)]).filter(Boolean);
  ok(`강약을 매기지 않는 ${star} 는 어느 자리에서도 '' 다`, seen.length === 0, `actual ${JSON.stringify([...new Set(seen)])}`);
}

// ── ⑤⑥ 실제 명반 ─────────────────────────────────────────────────────────
let borrowedRows = 0;
let hwagiRows = 0;
let chartRows = 0;
let emptyPalaces = 0;

const cleanStarName = (raw) =>
  String(raw || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\(차성\)/g, " ")
    .replace(/화록|화권|화과|화기/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")[0];

for (const c of CASES) {
  const zw = harness.calcChart(c);
  for (let i = 0; i < 12; i += 1) {
    const cell = zw.stars[i];
    const oppIdx = (i + 6) % 12;
    if (cell && !(cell.main && cell.main.length) && cell.borrowedMain && cell.borrowedMain.length) {
      emptyPalaces += 1;
      // ⑤ 차성의 출처가 대궁이라는 불변식. ③의 대궁 가정이 여기 위에 서 있다.
      const borrowedNames = cell.borrowedMain.map(cleanStarName).filter(Boolean);
      const oppNames = ((zw.stars[oppIdx] || {}).main || []).map(cleanStarName).filter(Boolean);
      ok(
        `${c.label} · ${zw.palacesByIndex[i]}(${ZHI[i]}) 의 차성이 대궁 ${zw.palacesByIndex[oppIdx]}(${ZHI[oppIdx]}) 에서 온다`,
        JSON.stringify(borrowedNames) === JSON.stringify(oppNames),
        `borrowed ${JSON.stringify(borrowedNames)} vs 대궁 main ${JSON.stringify(oppNames)}`,
      );
    }

    // ⑥ 화면·프롬프트가 읽는 행 그대로 정본과 맞춘다.
    const palace = zw.palaceStarData[i] || {};
    const branch = ZHI.indexOf(palace.branch);
    for (const row of [...(palace.stars || []), ...(palace.auxStars || []), ...(palace.badStars || [])]) {
      if (!row || !row.name) continue;
      chartRows += 1;
      if (row.borrowed) borrowedRows += 1;
      if (row.sihua === "화기") hwagiRows += 1;
      const seat = row.borrowed ? (branch + 6) % 12 : branch;
      const expected = branch < 0 ? "(지지 없음)" : canonicalGrade(row.name, seat);
      const glyph = branch < 0 ? "(지지 없음)" : canonicalGlyph(row.name, seat);
      ok(
        `${c.label} · ${zw.palacesByIndex[i]}(${palace.branch}) ${row.name}${row.borrowed ? "(차성)" : ""}${row.sihua ? ` ${row.sihua}` : ""} 이 정본 등급·글자다`,
        row.strength === expected && row.symbol === glyph,
        `strength '${row.strength}' symbol '${row.symbol}' / 정본 '${expected}' '${glyph}'`,
      );
    }
  }
}

ok(
  "명반 케이스에서 차성 행·화기 행을 실제로 봤다 (fail-closed)",
  emptyPalaces > 0 && borrowedRows > 0 && hwagiRows > 0,
  `공궁 ${emptyPalaces}곳 · 차성 행 ${borrowedRows}건 · 화기 행 ${hwagiRows}건 — 0이면 케이스가 낡은 것이다`,
);

// ── 보고 ──────────────────────────────────────────────────────────────────
if (failures.length) {
  console.error(`[verify:ziwei-borrowed-strength] ${failures.length}/${checks} FAILED`);
  for (const f of failures) console.error(`  ✗ ${f}`);
  process.exit(1);
}
console.log(
  `[verify:ziwei-borrowed-strength] ok — 검사 ${checks}건 · 셸 표 ${cells}칸 = 정본 · ` +
    `명반 ${CASES.length}건 행 ${chartRows}개(공궁 ${emptyPalaces}곳 · 차성 ${borrowedRows} · 화기 ${hwagiRows})`,
);
