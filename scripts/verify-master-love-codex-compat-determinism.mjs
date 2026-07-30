#!/usr/bin/env node
/**
 * 마스터 인연의 서 · 궁합 (MASTER_LOVE_CODEX_COMPAT) 결정론 가드.
 *
 * 확인 항목
 *  1. 어댑터 순수성 — Math.random / Date.now / new Date 미사용
 *  2. 같은 (본인, 상대) 입력이면 signature 와 전체 JSON 이 항상 동일
 *  3. 인자 순서가 바뀌면(A↔B) 결과가 달라져야 한다 — 방향성 있는 판정임을 보증
 *  4. 엔진(life-book-ai-saju / ziwei-ai-chart)을 수정하지 않고 import 로만 소비
 *  5. 축 점수가 한쪽으로 쏠리지 않을 것 — 초기 구현이 friction 85 로 쏠려
 *     교차검증(17장)이 모든 짝에게 같은 말을 하던 실측 사고를 가드로 고정한다
 *
 *   node scripts/verify-master-love-codex-compat-determinism.mjs
 */

import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const read = (relPath) => fs.readFileSync(path.join(ROOT, relPath), "utf8");

const failures = [];
const check = (condition, message) => {
  if (!condition) failures.push(message);
};

const ADAPTER = "worker/lib/master-love-codex-compat.js";

// ── 1. 어댑터 순수성 ─────────────────────────────────────────────────────────
const adapter = read(ADAPTER);
// 주석의 단어는 오탐이므로 코드만 본다.
const adapterCode = adapter.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
check(!/Math\.random/.test(adapterCode), `${ADAPTER}: Math.random 을 쓰면 같은 입력이 다른 결과를 냅니다`);
check(!/Date\.now|new Date\s*\(/.test(adapterCode), `${ADAPTER}: Date 를 쓰면 날짜가 바뀔 때 결과가 달라집니다`);
check(
  /export function buildMasterLoveCodexCompatibility\(\{\s*selfSaju,\s*selfZiwei,\s*partnerSaju,\s*partnerZiwei\s*\}/.test(adapter),
  `${ADAPTER}: 진입점은 4개 차트만 받아야 합니다(다른 입력이 섞이면 결정론이 깨집니다)`,
);

// ── 4. 엔진은 읽기 전용으로만 소비 ───────────────────────────────────────────
// 주석(JSDoc @param)에 엔진 함수명이 적혀 있으므로 코드 본문만 본다 — 이름 grep 은 오탐한다.
check(
  !/calculateLifeBookAiSaju|calculateZiweiAiChart/.test(adapterCode),
  `${ADAPTER}: 어댑터가 엔진을 직접 호출하면 안 됩니다 — 계산 결과만 주입받는 read-only 래퍼여야 합니다`,
);
check(
  /from "\.\/island\/island-weights\.js"/.test(adapter),
  `${ADAPTER}: 결정론 서명은 운명의 섬 정본(island-weights)의 hashSignature 를 재사용해야 합니다`,
);
for (const engine of ["worker/lib/life-book-ai-saju.js", "worker/lib/ziwei-ai-chart.js"]) {
  const source = read(engine);
  check(
    !source.includes("master-love-codex"),
    `${engine}: 엔진에 궁합 로직을 넣지 마세요(어댑터 래퍼를 통해서만 소비합니다)`,
  );
}

// ── 2·3·5. 실계산 ────────────────────────────────────────────────────────────
const { calculateLifeBookAiSaju } = await import("../worker/lib/life-book-ai-saju.js");
const { calculateZiweiAiChart } = await import("../worker/lib/ziwei-ai-chart.js");
const { buildMasterLoveCodexCompatibility, serializeCompatibility } =
  await import("../worker/lib/master-love-codex-compat.js");

const FIXTURES = [
  { gender: "female", birthDate: "1993-05-14", birthTime: "07:20" },
  { gender: "male", birthDate: "1990-11-02", birthTime: "21:40" },
  { gender: "female", birthDate: "1988-02-29", birthTime: "12:00" },
  { gender: "male", birthDate: "1996-08-08", birthTime: "03:10" },
  { gender: "female", birthDate: "1985-12-25", birthTime: "18:45" },
  { gender: "male", birthDate: "2000-01-15", birthTime: "09:30" },
  { gender: "female", birthDate: "1979-07-04", birthTime: "23:50" },
  { gender: "male", birthDate: "1994-10-19", birthTime: "05:05" },
  { gender: "female", birthDate: "1982-03-21", birthTime: "14:15" },
  { gender: "male", birthDate: "1998-06-30", birthTime: "11:00" },
];

const charts = FIXTURES.map((person) => {
  const birthInfo = { ...person, birthTimeUnknown: false, calendarType: "solar", isLeapMonth: false };
  return {
    saju: calculateLifeBookAiSaju(birthInfo),
    ziwei: calculateZiweiAiChart({ birthInfo }, { year: 2026 }),
  };
});

const build = (a, b) => buildMasterLoveCodexCompatibility({
  selfSaju: charts[a].saju, selfZiwei: charts[a].ziwei,
  partnerSaju: charts[b].saju, partnerZiwei: charts[b].ziwei,
});

// 2) 재현성
{
  const first = build(0, 1);
  const second = build(0, 1);
  check(first.signature === second.signature, "같은 입력인데 signature 가 달라집니다");
  check(serializeCompatibility(first) === serializeCompatibility(second), "같은 입력인데 전체 판정 JSON 이 달라집니다");
  check(Boolean(first.signature), "signature 가 비어 있습니다");
}

// 3) 방향성 — A→B 와 B→A 는 다른 리딩이다(상담자가 누구인지가 결론을 바꾼다)
{
  const ab = build(0, 1);
  const ba = build(1, 0);
  check(ab.signature !== ba.signature, "본인·상대를 뒤집었는데 결과가 같습니다(방향성 있는 판정이어야 합니다)");
}

// 5) 축 분포 — 전 쌍의 각 축 중앙값이 35~65 안에 들어야 판별력이 있다
{
  const AXES = {
    attraction: [], stability: [], communication: [], endurance: [],
    resonance: [], friction: [], growth: [],
  };
  let pairs = 0;
  let divergenceCount = 0;
  let themeCount = 0;
  for (let i = 0; i < charts.length; i += 1) {
    for (let j = 0; j < charts.length; j += 1) {
      if (i === j) continue;
      pairs += 1;
      const result = build(i, j);
      for (const key of ["attraction", "stability", "communication", "endurance"]) {
        AXES[key].push(result.saju.axisScores[key]);
      }
      for (const key of ["resonance", "friction", "growth"]) {
        AXES[key].push(result.ziwei.axisScores[key]);
      }
      divergenceCount += result.cross.divergence.length;
      themeCount += result.cross.convergence.length + result.cross.divergence.length;

      for (const [scope, scores] of [["saju", result.saju.axisScores], ["ziwei", result.ziwei.axisScores]]) {
        for (const [key, value] of Object.entries(scores)) {
          check(
            Number.isInteger(value) && value >= 0 && value <= 100,
            `${scope}.${key} 가 0~100 정수가 아닙니다 (${value})`,
          );
        }
      }
    }
  }

  const median = (values) => {
    const sorted = [...values].sort((a, b) => a - b);
    return sorted[Math.floor(sorted.length / 2)];
  };
  for (const [key, values] of Object.entries(AXES)) {
    const mid = median(values);
    check(
      mid >= 35 && mid <= 65,
      `축 '${key}' 의 중앙값이 ${mid} 입니다 — 한쪽으로 쏠려 교차검증이 모든 짝에게 같은 말을 하게 됩니다(35~65 유지)`,
    );
    const spread = Math.max(...values) - Math.min(...values);
    check(spread >= 20, `축 '${key}' 의 분포 폭이 ${spread} 뿐입니다 — 짝마다 달라지지 않으면 근거로 쓸 수 없습니다`);
  }

  // 두 체계가 늘 같은 말만 하면 17장(합치점·차이점)이 쓸 내용이 없다.
  check(divergenceCount > 0, "전 쌍에서 divergence 가 한 건도 없습니다 — 교차검증 장이 빈손이 됩니다");
  check(
    divergenceCount < themeCount * 0.6,
    `divergence 가 전체 주제의 ${Math.round((divergenceCount / themeCount) * 100)}% 입니다 — 두 체계가 늘 엇갈리면 축 계산이 잘못된 것입니다`,
  );
  console.log(`[compat-determinism] ${pairs}쌍 · divergence ${divergenceCount}/${themeCount}`);
}

if (failures.length) {
  console.error("[verify-master-love-codex-compat-determinism] FAILED");
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}
console.log("[verify-master-love-codex-compat-determinism] OK");
