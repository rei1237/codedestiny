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
// 심층 근거 모듈 — 스코어링 경로 밖이지만 결정론·읽기전용 요구는 동일하다.
const sajuNatalEvidence = read(`${BASE}/evidence/sajuNatalEvidence.ts`);
const collectDeep = read(`${BASE}/evidence/collectDeepEvidence.ts`);

// ── 1) 순수성(결정론): Math.random·Date 미사용 ──
for (const [name, src] of [
  ["directionScore", orchestrator],
  ["sajuAdapter", sajuA],
  ["ziweiAdapter", ziweiA],
  ["sukuyoAdapter", sukuyoA],
  ["tarotAdapter", tarotA],
  ["vedicAdapter", vedicA],
  ["constants", constants],
  ["sajuNatalEvidence", sajuNatalEvidence],
  ["collectDeepEvidence", collectDeep],
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

// ── 7) evidence[0] 고정: 대표 근거를 앞에 끼워 넣지 않는다 ──
// MapResult가 인덱스 0을 직접 읽는다 — 운명 도감 수집(`tarot:${term.split("(")[0]}`)과
// 체계별 근거 라벨. 새 근거를 배열 앞에 넣으면 오류 없이 조용히 어긋난다.
for (const [name, src, headId, headTerm] of [
  ["sajuAdapter", sajuA, "saju.stage", "`십이운성 ${stage}`"],
  ["ziweiAdapter", ziweiA, "ziwei.ming", "명궁 ${mainStars.length"],
  ["sukuyoAdapter", sukuyoA, "sukuyo.mansion", "${res.mansion.split(\"(\")[0]}수(${res.mansionCh}宿)"],
  ["tarotAdapter", tarotA, "tarot.card", "`${card.ko}(정위)`"],
  ["vedicAdapter", vedicA, "vedic.vara", "`${vara.ko}`"],
]) {
  const code = stripComments(src);
  const firstId = code.match(/id:\s*"([a-z]+\.[A-Za-z]+)"/);
  check(
    firstId?.[1] === headId,
    `${name}: 첫 evidence의 id가 "${headId}"가 아니다(실제 "${firstId?.[1] || "없음"}") — 새 근거는 배열 뒤로만 append`,
  );
  check(code.includes(headTerm), `${name}: evidence[0]의 term 표현이 바뀌었다 — 도감 수집·근거 라벨이 깨진다`);
}

// ── 8) 심층 근거 모듈은 field를 수정하지 않는다(읽기 전용 소비) ──
check(
  !/field\.raw\s*\[[^\]]+\]\s*=/.test(stripComments(collectDeep)) && !/field\.\w+\s*=[^=]/.test(stripComments(collectDeep)),
  "collectDeepEvidence는 field를 수정하면 안 된다(읽기 전용)",
);
check(
  /computeNatalFromInput/.test(sajuNatalEvidence),
  "sajuNatalEvidence는 computeNatalFromInput을 읽기 전용으로 import 해야 한다(어댑터가 아니라 여기서만 허용)",
);
// 이 경로는 luckRows를 주지 않아 엔진이 대운을 'not_supplied'로 돌려준다 — 없는 것을 근거로 만들지 않는다.
check(
  !/daewoon/i.test(stripComments(sajuNatalEvidence)),
  "sajuNatalEvidence는 대운을 근거로 뽑으면 안 된다(이 경로에서는 산출되지 않는다)",
);

// ── 9) 무료 /narrate 근거는 체계당 1개만 ──
// 라우트가 근거를 8개로 자르므로(worker/routes/destiny-compass.js), 심층용 항목까지 밀어 넣으면
// 앞쪽 사주만 남고 나머지 체계 근거가 조용히 사라진다.
const narration = read("app/destiny-compass/_stage/narration.ts");
check(
  /evidence\?\.\[0\]/.test(narration),
  "collectEvidence는 체계당 evidence[0]만 담아야 한다 — 전체를 평탄화하면 /narrate 근거가 사주로 쏠린다",
);

if (failures.length) {
  console.error("❌ verify:destiny-compass FAIL");
  failures.forEach((f) => console.error("   - " + f));
  process.exit(1);
}
console.log("✅ verify:destiny-compass OK — Layer2 결정론(난수·시각 미사용·시드기반)/읽기전용 소비/사주 경로 무침해/매핑 커버리지 통과");
