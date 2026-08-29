#!/usr/bin/env node
/**
 * 자미두수 차성(借星) 밝기가 "원성이 가진 힘의 70%" 로 나오는지 검사한다.
 *
 * 🔴 왜 이 가드가 따로 필요한가 — 기존 자미 가드 둘은 차성을 **명시적으로 건너뛴다**
 *    (scripts/verify-ziwei-brightness-constraints.cjs 와 scripts/verify-ziwei-star-parity.mjs
 *     둘 다 `if (row.borrowed) continue;`). 그래서 아래 결함이 초록불 아래에서 살아남았다.
 *
 * 결함 (실측 2026-08-29, 수정 전 js/saju-engine.js):
 *   차성 밝기를 **별이 실제로 앉아 있는 대궁이 아니라 빈 궁의 지지**로 재고 있었다.
 *   대궁은 지지 거리가 항상 6(최대 충)이라 zwComputeBrightnessScore 의 거리항이 최소가 되고
 *   고전표도 충 방향에서 대체로 반대 등급이라(태양 午=묘 / 子=함) 등급이 통째로 뒤집혔다.
 *   14주성 × 12궁 = 168조합 교차표: 원성 묘 78건 중 31건이 화면에 함(X), 원성 함 40건 중
 *   15건이 오히려 득(O). 즉 표시값과 실제 힘 사이에 상관이 거의 없었다.
 *   그 위에 등급을 한 칸 더 내리는 down 맵({'평':'함'})이 겹쳐 평범한 별까지 함으로 떨어졌다.
 *
 * 지키는 것:
 *   ① 차성 등급 = quantize(clamp(대궁 자리 밝기점수) × ZW_BORROWED_STAR_RATIO)
 *      — 빈 궁 지지로 되돌아가면 그 자리에서 실패한다.
 *   ② 차성이 원성보다 강해지는 조합이 없다(70%가 힘을 키울 수는 없다).
 *   ③ 원성이 묘(廟)인데 차성이 함(陷)으로 표시되는 조합이 없다 — 이번 결함의 재현 조건.
 *   ④ 실제 명반에서 공궁의 borrowedMain 이 **대궁의 main 과 같은 별 집합**이다.
 *      ①의 대궁 가정이 이 불변식 위에 서 있으므로 함께 못 박는다.
 *   ⑤ 실제 명반의 palaceStarData 차성 행이 대궁의 원성 행보다 강하지 않다.
 *      (엔진이 만든 두 값을 같은 명반 안에서 비교하므로 ctxOverride 유무에 영향받지 않는다)
 *
 * 🔴 검사 대상은 손으로 열거하지 않는다 — 별 목록은 엔진의 ZW_STAR_PROFILE 에서 전수로 가져오고,
 *    하나도 못 찾으면 통과가 아니라 **실패**한다(fail-closed).
 *
 * 실행: npm run verify:ziwei-borrowed-strength
 */
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const harness = require("../scripts/lib/ziwei-engine-harness.cjs");

const ZHI = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];

// 공궁이 실제로 나오는 명반만 골랐다(공궁 0인 명반은 차성 행이 없어 이 가드가 볼 것이 없다).
// 1991-02-20 M / 1991-09-02 F 는 verify-ziwei-brightness-constraints.cjs 의 케이스 A·B 와 같다.
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

harness.loadEngine();

const {
  ZW_STAR_PROFILE,
  ZW_BORROWED_STAR_RATIO,
  zwComputeStarStrength,
  zwComputeBrightnessScore,
  zwNumericToStrength,
  zwStrengthToNumeric,
  zwOppositeZhi,
} = globalThis;

for (const [name, fn] of Object.entries({
  ZW_STAR_PROFILE,
  ZW_BORROWED_STAR_RATIO,
  zwComputeStarStrength,
  zwComputeBrightnessScore,
  zwNumericToStrength,
  zwStrengthToNumeric,
  zwOppositeZhi,
})) {
  if (fn === undefined) {
    console.error(`[verify:ziwei-borrowed-strength] 엔진에서 ${name} 를 찾지 못했다 — 이름이 바뀌었는지 확인할 것.`);
    process.exit(1);
  }
}

// ── ① 비율 상수 ────────────────────────────────────────────────────────────
ok(
  "차성 비율 상수가 0.7 이다 (사용자 기준: 원성 힘의 70%)",
  ZW_BORROWED_STAR_RATIO === 0.7,
  `actual ${ZW_BORROWED_STAR_RATIO}`,
);

// ── ② 대궁 지지 헬퍼 ──────────────────────────────────────────────────────
for (let i = 0; i < 12; i += 1) {
  ok(
    `zwOppositeZhi(${ZHI[i]}) 가 맞은편 궁을 가리킨다`,
    zwOppositeZhi(ZHI[i]) === ZHI[(i + 6) % 12],
    `expected ${ZHI[(i + 6) % 12]}, actual ${zwOppositeZhi(ZHI[i])}`,
  );
}

// ── ③ 별 × 지지 전수 스윕 ─────────────────────────────────────────────────
// 🔴 손 목록이 아니라 엔진의 별 프로필에서 전수로 가져온다. 별이 늘면 자동으로 검사 대상이 된다.
const STARS = Object.keys(ZW_STAR_PROFILE || {});
if (STARS.length === 0) {
  console.error("[verify:ziwei-borrowed-strength] ZW_STAR_PROFILE 이 비었다 — 검사 대상 0건이므로 실패로 둔다.");
  process.exit(1);
}

const clamp = (v) => Math.max(0, Math.min(4, v));
let sweep = 0;
let strongerThanOrigin = 0;
let myoToHam = 0;
const gradeTally = {};
const formulaMismatches = [];

for (const star of STARS) {
  for (let i = 0; i < 12; i += 1) {
    const emptyZhi = ZHI[i];
    const seatZhi = ZHI[(i + 6) % 12];
    const seatScore = zwComputeBrightnessScore(star, seatZhi);
    if (seatScore == null) continue;
    sweep += 1;

    const borrowed = zwComputeStarStrength(star, emptyZhi, true);
    const origin = zwComputeStarStrength(star, seatZhi, false);
    const expected = zwNumericToStrength(clamp(seatScore) * ZW_BORROWED_STAR_RATIO);

    if (borrowed !== expected) {
      formulaMismatches.push(`${star}·빈궁 ${emptyZhi}(실자리 ${seatZhi}): expected ${expected}, actual ${borrowed}`);
    }
    if (zwStrengthToNumeric(borrowed) > zwStrengthToNumeric(origin)) {
      strongerThanOrigin += 1;
    }
    if (origin === "묘" && borrowed === "함") {
      myoToHam += 1;
    }
    gradeTally[borrowed] = (gradeTally[borrowed] || 0) + 1;
  }
}

ok(
  "전수 스윕 대상이 존재한다 (fail-closed)",
  sweep > 0,
  `대상 ${sweep}건 — 0이면 가드가 아무것도 안 본 것이다`,
);
ok(
  "차성 밝기 = quantize(clamp(대궁 자리 점수) × 0.7) — 빈 궁 지지로 재지 않는다",
  formulaMismatches.length === 0,
  formulaMismatches.slice(0, 5).join("\n      ") +
    (formulaMismatches.length > 5 ? `\n      ... 외 ${formulaMismatches.length - 5}건` : ""),
);
ok(
  "차성이 원성보다 강해지는 조합이 없다",
  strongerThanOrigin === 0,
  `${strongerThanOrigin}/${sweep}건 위반`,
);
ok(
  "원성이 묘(廟)인데 차성이 함(陷)으로 표시되는 조합이 없다",
  myoToHam === 0,
  `${myoToHam}건 — 이 결함의 재현 조건이다`,
);

// ── ④⑤ 실제 명반 ─────────────────────────────────────────────────────────
let borrowedRows = 0;
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
    if (!cell || (cell.main && cell.main.length)) continue;
    if (!cell.borrowedMain || !cell.borrowedMain.length) continue;
    emptyPalaces += 1;

    const oppIdx = (i + 6) % 12;
    // ④ 차성의 출처가 대궁이라는 불변식. ③의 대궁 가정이 여기 위에 서 있다.
    const borrowedNames = cell.borrowedMain.map(cleanStarName).filter(Boolean);
    const oppNames = ((zw.stars[oppIdx] || {}).main || []).map(cleanStarName).filter(Boolean);
    ok(
      `${c.label} · ${zw.palacesByIndex[i]}(${ZHI[i]}) 의 차성이 대궁 ${zw.palacesByIndex[oppIdx]}(${ZHI[oppIdx]}) 에서 온다`,
      JSON.stringify(borrowedNames) === JSON.stringify(oppNames),
      `borrowed ${JSON.stringify(borrowedNames)} vs 대궁 main ${JSON.stringify(oppNames)}`,
    );

    // ⑤ 화면에 나란히 보이는 두 값을 같은 명반 안에서 비교한다.
    const originRows = new Map(
      ((zw.palaceStarData[oppIdx] || {}).stars || []).map((s) => [s.name, s.strength]),
    );
    for (const row of (zw.palaceStarData[i] || {}).stars || []) {
      if (!row.borrowed) continue;
      borrowedRows += 1;
      const origin = originRows.get(row.name);
      ok(
        `${c.label} · ${zw.palacesByIndex[i]} 차성 ${row.name} 이 대궁 원성보다 강하지 않다`,
        origin !== undefined && zwStrengthToNumeric(row.strength) <= zwStrengthToNumeric(origin),
        `차성 ${row.strength} vs 원성 ${origin === undefined ? "(대궁 행 없음)" : origin}`,
      );
      ok(
        `${c.label} · ${zw.palacesByIndex[i]} 차성 ${row.name} 이 원성 묘인데 함으로 떨어지지 않는다`,
        !(origin === "묘" && row.strength === "함"),
        `차성 ${row.strength} vs 원성 ${origin}`,
      );
    }
  }
}

ok(
  "명반 케이스에서 차성 행을 실제로 봤다 (fail-closed)",
  emptyPalaces > 0 && borrowedRows > 0,
  `공궁 ${emptyPalaces}곳 · 차성 행 ${borrowedRows}건 — 0이면 케이스가 낡은 것이다`,
);

// ── 보고 ──────────────────────────────────────────────────────────────────
const tally = ["묘", "득", "리", "평", "함"].map((k) => `${k}:${gradeTally[k] || 0}`).join(" ");
if (failures.length) {
  console.error(`[verify:ziwei-borrowed-strength] ${failures.length}/${checks} FAILED`);
  for (const f of failures) console.error(`  ✗ ${f}`);
  console.error(`  차성 등급 분포(스윕 ${sweep}건): ${tally}`);
  process.exit(1);
}
console.log(
  `[verify:ziwei-borrowed-strength] ok — 검사 ${checks}건 · 스윕 ${sweep}조합(별 ${STARS.length}개) · ` +
    `명반 ${CASES.length}건에서 공궁 ${emptyPalaces}곳 · 차성 행 ${borrowedRows}건`,
);
console.log(`  차성 등급 분포: ${tally}`);
