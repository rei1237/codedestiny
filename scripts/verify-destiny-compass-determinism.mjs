// 운명의 나침반 하우스 — Layer 2 결정론 + 계산 경로 무침해 검증.
// node에 TS 트랜스파일러가 없어, 이 레포의 다른 verify 스크립트(verify-love-compat-determinism)처럼
// 소스 텍스트 단언으로 결정론 관련 속성(난수·시각 미사용, 시드 기반, 읽기전용 소비)을 정적으로 증명한다.
//
//   node scripts/verify-destiny-compass-determinism.mjs

import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), "utf8");
const stripComments = (s) => s.replace(/\/\/[^\n]*/g, "").replace(/\/\*[\s\S]*?\*\//g, "");

const failures = [];
const check = (cond, msg) => {
  if (!cond) failures.push(msg);
};

const BASE = "app/destiny-compass/_engine";
const orchestrator = read(`${BASE}/directionScore.ts`);
const sajuA = read(`${BASE}/adapters/sajuAdapter.ts`);
const ziweiA = read(`${BASE}/adapters/ziweiAdapter.ts`);
const sukuyoA = read(`${BASE}/adapters/sukuyoAdapter.ts`);
const tarotA = read(`${BASE}/adapters/tarotAdapter.ts`);
const vedicA = read(`${BASE}/adapters/vedicAdapter.ts`);
const constants = read(`${BASE}/constants.ts`);

// ── 1) 순수성(결정론): Math.random·Date 미사용 ──
for (const [name, src] of [
  ["directionScore", orchestrator],
  ["sajuAdapter", sajuA],
  ["ziweiAdapter", ziweiA],
  ["sukuyoAdapter", sukuyoA],
  ["tarotAdapter", tarotA],
  ["vedicAdapter", vedicA],
  ["constants", constants],
]) {
  const code = stripComments(src);
  check(!/Math\.random/.test(code), `${name}: Math.random 금지(결정론)`);
  check(!/\bDate\.now\b|new\s+Date\b/.test(code), `${name}: Date 사용 금지 — 시간 의존은 input.dateSeed만`);
}

// ── 2) 시드 결정론 + 순수 시그니처 ──
check(
  /export async function computeDirectionField\(\s*input: CompassInput\s*\)/.test(orchestrator),
  "computeDirectionField는 (input: CompassInput)만 받아야 한다(외부 상태 없음)",
);
check(
  /function buildSeed[\s\S]{0,700}input\.dateSeed/.test(orchestrator),
  "buildSeed는 input.dateSeed를 결정론 시드에 포함해야 한다",
);

// ── 3) 읽기 전용 소비(계산 경로 import만) ──
check(
  /import\s*\{\s*resolveAnimalTwelveResult\s*\}\s*from\s*"@\/app\/saju\/animal-destiny\/lib\/sajuAdapter"/.test(sajuA),
  "sajuAdapter는 resolveAnimalTwelveResult를 읽기 전용 import 해야 한다",
);
check(/import\s*\{\s*calculateZiweiChart\s*\}/.test(ziweiA), "ziweiAdapter는 calculateZiweiChart를 import 해야 한다");
check(/import\s*\{\s*calcSukuyoForServer\s*\}/.test(sukuyoA), "sukuyoAdapter는 calcSukuyoForServer를 읽기 전용 import 해야 한다");
check(/input\.dateSeed/.test(tarotA), "tarotAdapter는 input.dateSeed를 시드에 포함해야 한다(일 단위 결정론)");
check(/zellerWeekday\(/.test(vedicA), "vedicAdapter는 Zeller 합동식(순수 산술)으로 요일을 계산해야 한다(Date 미사용)");

// ── 4) 사주 계산 경로 무침해: 어댑터는 timezone을 사주에 주입하지 않고, 내부 계산 함수를 직접 건드리지 않는다 ──
check(!/timezone/.test(stripComments(sajuA)), "sajuAdapter는 timezone을 다루면 안 된다(하드 제약 2 · 사주 경로 무주입)");
check(/timezone:\s*"Asia\/Seoul"/.test(ziweiA), "ziweiAdapter의 timezone은 자미 입력 필드에만 설정돼야 한다");
check(
  !/normalizeSaju|calculateLocalResult|computeNatalFromInput/.test(sajuA) &&
    !/normalizeSaju|calculateLocalResult|computeNatalFromInput/.test(ziweiA),
  "어댑터는 사주 내부 계산 함수(normalizeSaju/calculateLocalResult/computeNatalFromInput)를 직접 호출하지 않는다",
);

// ── 5) 매핑 커버리지: 자미 12궁 전부 + 방향 8종 ──
const palaceIds = [
  "ming", "siblings", "spouse", "children", "wealth", "health",
  "travel", "friends", "career", "property", "fortune", "parents",
];
for (const id of palaceIds) {
  check(new RegExp(`\\b${id}:`).test(constants), `ZIWEI_PALACE_DIRECTION에 ${id} 궁 매핑이 필요하다`);
}
const dirs = ["career", "venture", "study", "relationship", "love", "wealth", "health", "rest"];
for (const d of dirs) {
  check(new RegExp(`"${d}"`).test(constants), `DIRECTION_KEYS에 ${d} 방향이 필요하다`);
}

// ── 6) 십이운성 12단계 전부 그룹핑(누락 시 일부 명식이 nascent로 뭉개짐) ──
const stages = ["장생", "목욕", "관대", "건록", "제왕", "쇠", "병", "사", "묘", "절", "태", "양"];
for (const st of stages) {
  check(constants.includes(`"${st}"`), `SAJU_STAGE_GROUP에 십이운성 '${st}' 누락`);
}

if (failures.length) {
  console.error("❌ verify:destiny-compass FAIL");
  failures.forEach((f) => console.error("   - " + f));
  process.exit(1);
}
console.log("✅ verify:destiny-compass OK — Layer2 결정론(난수·시각 미사용·시드기반)/읽기전용 소비/사주 경로 무침해/매핑 커버리지 통과");
