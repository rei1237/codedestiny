// 사주 엔진이 만드는 "사유(reason)" 문장의 조사·중복 가드
//
// 이 문장들은 화면에도 나오고 LLM 프롬프트에도 그대로 실린다. 템플릿 리터럴에 조사를 박아 두면
// 앞 낱말의 받침에 따라 조용히 어긋난다 — 실제로 이런 것들이 배포돼 있었다:
//   - "무이 천간에 투출하여"   (받침 없는 천간에 "이")
//   - "정재으로 월령의 중심 후보" (받침 없는 십성에 "으로")
//   - "화, 화가 균형을 잡는다"  (억부 용신 오행이 중복)
//   - "종왕격은 종하는 기운 목를 따라야 한다"
// 게다가 lib/famous-saju/celebrity-saju-service.ts 가 이 문장들을 정규식으로 되받아 다듬으므로,
// 조사가 틀어지면 다듬기까지 빗나가 원문이 그대로 노출된다.
//
// 검사 방식: 엔진을 실제 사주 표본으로 돌려 사유 문장을 모으고
//   (1) 억부 용신 오행에 중복이 없는지
//   (2) 문장에 "받침 ↔ 조사" 가 어긋난 조합이 없는지
// 를 단언한다. 표본이 템플릿을 못 밟으면(=검사 대상 0) 통과가 아니라 실패다.

import { loadTsModule } from "./lib/load-ts-module.mjs";

const { calculateLocalSaju } = loadTsModule("app/saju/animal-destiny/engine/localSajuCalculator.ts");

let failures = 0;
function fail(message) {
  failures++;
  console.error(`  ✗ ${message}`);
}

// ── 조사 규칙 ───────────────────────────────────────────────────────────────
const STEMS = ["갑", "을", "병", "정", "무", "기", "경", "신", "임", "계"];
const TEN_GODS = ["비견", "겁재", "식신", "상관", "편재", "정재", "편관", "정관", "편인", "정인"];
const ELEMENTS = ["목", "화", "토", "금", "수"];

function hasFinalConsonant(value) {
  const code = value.charCodeAt(value.length - 1) - 0xac00;
  return code >= 0 && code <= 11171 && code % 28 !== 0;
}

// 낱말마다 "이 조합이 나오면 틀린 것" 하나씩. 서술격 조사 "…이다" 는 받침이 없어도 맞으므로 뺀다.
const BAD_COMBOS = [];
for (const word of [...STEMS, ...TEN_GODS, ...ELEMENTS]) {
  const wrong = hasFinalConsonant(word)
    ? [`${word}가`, `${word}를`, `${word}로`]
    : [`${word}이(?!다)`, `${word}을`, `${word}으로`];
  for (const pattern of wrong) BAD_COMBOS.push({ word, pattern: new RegExp(pattern) });
}

// ── 표본 ────────────────────────────────────────────────────────────────────
// 결정적 의사난수 — 같은 표본을 항상 검사한다(실패가 재현되지 않으면 가드가 아니다).
function makeSamples(count) {
  let seed = 20260904;
  const next = (max) => {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    return seed % max;
  };
  const samples = [];
  for (let i = 0; i < count; i++) {
    samples.push({
      hasTime: true,
      calendarType: "solar",
      timezone: "Asia/Seoul",
      year: 1940 + next(80),
      month: 1 + next(12),
      day: 1 + next(28),
      hour: next(24),
      minute: next(60),
      gender: i % 2 === 0 ? "male" : "female",
    });
  }
  return samples;
}

// 사유 문자열은 natalAnalysis 아래 여러 깊이에 흩어져 있다(후보별 reason, requiredExplanation 등).
// 키 이름으로 훑어야 구조가 조금 바뀌어도 검사 대상이 사라지지 않는다.
const REASON_KEYS = new Set(["reason", "judgmentReason", "whyThisElement"]);

function collectReasons(node, key, bucket = []) {
  if (typeof node === "string") {
    if (REASON_KEYS.has(key) && node) bucket.push(node);
    return bucket;
  }
  if (Array.isArray(node)) {
    for (const item of node) collectReasons(item, key, bucket);
    return bucket;
  }
  if (node && typeof node === "object") {
    for (const [childKey, value] of Object.entries(node)) collectReasons(value, childKey, bucket);
  }
  return bucket;
}

const samples = makeSamples(200);
const seenTemplates = { 투출: 0, 중심후보: 0, 균형: 0, 종격: 0, 조후: 0, 통관: 0 };
const reported = new Set();
let checkedStrings = 0;

for (const sample of samples) {
  const analysis = calculateLocalSaju(sample).natalAnalysis || {};
  const label = `${sample.year}-${sample.month}-${sample.day} ${sample.hour}시`;

  // (1) 억부 용신 오행 중복 — 중화 분기에서 조후 용신과 식상 용신이 같은 오행일 때 터졌다.
  const eokbu = (analysis.yongshinAnalysis || {}).eokbuYongshin;
  if (Array.isArray(eokbu) && new Set(eokbu).size !== eokbu.length) {
    fail(`${label}: eokbuYongshin 에 중복 오행 — [${eokbu.join(", ")}]`);
  }

  for (const reason of collectReasons([analysis.gyeokgukAnalysis, analysis.yongshinAnalysis], null)) {
    checkedStrings++;
    if (reason.includes("천간에 투출하여")) seenTemplates.투출++;
    if (reason.includes("월령의 중심 후보")) seenTemplates.중심후보++;
    if (reason.includes("균형을 잡는다")) seenTemplates.균형++;
    if (reason.includes("종하는 기운")) seenTemplates.종격++;
    if (reason.includes("조후가 급해")) seenTemplates.조후++;
    if (reason.includes("통관한다")) seenTemplates.통관++;

    // (2) 억부 문장 안의 오행 목록 중복 — 필드가 아니라 사용자가 읽는 문장에서 직접 본다.
    const balance = reason.match(/구조라 (.+?)(?:이|가) 균형을 잡는다/);
    if (balance) {
      const items = balance[1].split(", ");
      if (new Set(items).size !== items.length) fail(`${label}: 억부 사유에 중복 오행 — "${reason}"`);
    }

    // (3) 받침 ↔ 조사
    for (const { word, pattern } of BAD_COMBOS) {
      if (!pattern.test(reason)) continue;
      const key = `${word}|${pattern.source}`;
      if (reported.has(key)) continue;
      reported.add(key);
      fail(`${label}: 조사 불일치 (${word}) — "${reason}"`);
    }
  }
}

// (4) fail-closed — 표본이 템플릿을 못 밟으면 위 검사는 아무것도 안 본 것이다.
console.log(`표본 ${samples.length}건 · 사유 문장 ${checkedStrings}건 · 조사 조합 ${BAD_COMBOS.length}종 검사`);
console.log(`템플릿 적중: ${Object.entries(seenTemplates).map(([key, count]) => `${key}=${count}`).join(" · ")}`);
for (const [name, count] of Object.entries(seenTemplates)) {
  if (count === 0) fail(`템플릿 "${name}" 을 밟은 표본이 없다 — 표본을 늘리거나 템플릿 변경을 반영할 것`);
}
if (checkedStrings < 200) fail(`사유 문장이 ${checkedStrings}건뿐 — 엔진 반환 구조가 바뀌었을 수 있다`);

if (failures > 0) {
  console.error(`\n실패 ${failures}건 — 사주 사유 문장의 조사·중복 규칙이 깨졌다.`);
  console.error("조사는 리터럴로 박지 말고 엔진의 subjectParticle/objectParticle/instrumentParticle 을 쓸 것.");
  process.exit(1);
}
console.log("통과 — 사유 문장의 조사와 오행 중복이 모두 정상이다.");
