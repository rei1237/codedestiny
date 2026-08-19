#!/usr/bin/env node
/**
 * 자미두수 "핵심 성향 Context" 배선 가드(정적, LLM 실호출 없음).
 *
 * 실제 Gemini 응답이 "사전식 별 정의 나열"에서 "성향 통합 서술"로 바뀌었는지는 실호출 없이는
 * 확인할 수 없다(CLAUDE.md 절대 규칙 1). 이 스크립트는 그 대신, 프롬프트를 만드는 코드가
 * 실제로 그렇게 지시하고 있는지를 확인한다:
 *  - 성향 Context 지침(worker/lib/ziwei-personality-context.js)에 필수 원칙 문구가 들어있는지
 *  - 반복 신호 탐지(별 태그가 2곳 이상에서 겹치면 우선순위를 높이라는 지시)가 실제로 동작하는지
 *  - 자미두수 4개 표면(초기 상담·자유질문·팩폭 전략소·essence 섹션 규칙)이 이 지침을 정확히
 *    끌어다 쓰는지, 그리고 팩폭 전략소에서는 다른 3개 술수(사주 등)로 새지 않는지
 *  - 자유질문 프롬프트의 "참조 기류" 요약이 지침 머리말이 아니라 실제 명반 사실을 계속 가리키는지
 *    (2026-08-19, personality context를 domainDataLines 맨 앞에 뒀다가 발견해 뒤로 옮긴 회귀)
 *  - 결과 화면(app/ziwei-ai/ZiweiAiClient.tsx)이 새 섹션을 최우선 노출 순서로 렌더하는지
 *
 * 사용: node scripts/verify-ziwei-personality-context.mjs
 */
import { readFileSync } from "node:fs";
import { buildZiweiPersonalityContextLines } from "../worker/lib/ziwei-personality-context.js";
import { buildZiweiAIPromptWithDomain } from "../worker/lib/ziwei-ai-prompt.js";
import { __ziweiAiTestUtils } from "../worker/routes/ziwei-ai.js";
import { NEO_INITIAL_SECTIONS, buildNeoInitialSectionPrompt } from "../worker/lib/neo-operation-room-prompt.js";

const failures = [];
const ok = (cond, msg) => { if (!cond) failures.push(msg); };

function palace(name, earthlyBranch, mainStars = [], assistantStars = [], maleficStars = [], transformations = []) {
  return { name, earthlyBranch, mainStars, assistantStars, maleficStars, transformations };
}

// 명궁·신궁·삼방사정(관록궁·재백궁·천이궁)·사화궁(부부궁)에 걸쳐 "분석적" 태그(천기/태음)가
// 반복되도록 일부러 겹쳐 짠 명반 — 반복 신호 탐지가 실제로 켜지는지 보는 용도.
const MOCK_CHART = {
  palaces: [
    palace("명궁", "인", ["천기"], ["문창"]),
    palace("형제궁", "묘"),
    palace("부부궁", "진", ["태음"], [], [], ["화기:태음"]),
    palace("자녀궁", "사"),
    palace("재백궁", "오", ["무곡"]),
    palace("질액궁", "미"),
    palace("천이궁", "신", ["태음"], ["문곡"]),
    palace("노복궁", "유"),
    palace("관록궁", "술", ["자미"], [], ["경양"]),
    palace("전택궁", "해"),
    palace("복덕궁", "자", ["천동"]),
    palace("부모궁", "축"),
  ],
  bodyPalace: "천이궁",
  fourTransformations: { huaLu: "염정", huaQuan: "파군", huaKe: "무곡", huaJi: "태음" },
  sanFangSiZheng: {
    byPalace: { "명궁": { self: "명궁", palaceNames: ["명궁", "관록궁", "재백궁", "천이궁"] } },
  },
};

// 어떤 태그도 두 곳 이상에서 겹치지 않는 명반 — 반복 신호가 "억지로" 켜지지 않는지 보는 대조군.
const MOCK_CHART_NO_OVERLAP = {
  palaces: [
    palace("명궁", "인", ["천부"]),
    palace("형제궁", "묘"),
    palace("부부궁", "진"),
    palace("자녀궁", "사"),
    palace("재백궁", "오"),
    palace("질액궁", "미"),
    palace("천이궁", "신"),
    palace("노복궁", "유"),
    palace("관록궁", "술"),
    palace("전택궁", "해"),
    palace("복덕궁", "자"),
    palace("부모궁", "축"),
  ],
  bodyPalace: "천이궁",
  fourTransformations: {},
  sanFangSiZheng: { byPalace: { "명궁": { self: "명궁", palaceNames: ["명궁", "관록궁", "재백궁", "천이궁"] } } },
};

// ── 1) 성향 Context 지침 자체 ──────────────────────────────────────────
const baseLines = buildZiweiPersonalityContextLines(MOCK_CHART);
const baseText = baseLines.join("\n");

const REQUIRED_PRINCIPLES = [
  "천동은 온화합니다",           // 사전식 별 정의 나열의 반례가 예시로 박혀 있어야 함(금지 대상 자체를 명시)
  "겉으로 드러나는 인상과 실제 내면",
  "장점과 그림자를 함께",
  "화났을 때의 행동 패턴",
  "상처받는 지점",
  "사고방식",
  "일하는 방식",
  "돈을 대하는 심리",
  "연애에서 중요하게 여기는 것",
  "반복되는 패턴을 우선",
  "~한 성향이 나타날 수 있습니다",
];
for (const phrase of REQUIRED_PRINCIPLES) {
  ok(baseText.includes(phrase), `성향 Context에 필수 지침 문구 누락: "${phrase}"`);
}
ok(!/이 사람은 반드시|무조건 이렇게 행동|100% /.test(baseText), "성향 Context에 단정형 지시가 섞여 있음");

// ── 2) 반복 신호 탐지가 실제로 동작하는지 ──────────────────────────────
ok(baseText.includes("반복 확인됨"), "겹치는 명반인데 반복 신호가 감지되지 않음");
ok(/분석적:.*(명궁|신궁|삼방사정)/.test(baseText), "명궁·신궁·삼방사정에 걸친 분석적 성향 반복이 감지되지 않음");

const noOverlapText = buildZiweiPersonalityContextLines(MOCK_CHART_NO_OVERLAP).join("\n");
ok(!noOverlapText.includes("반복 확인됨"), "겹치지 않는 명반인데도 반복 신호가 나옴(오탐)");

// ── 3) summarizeZiwei 형태(shenGong / sanFangSiZheng.lifePalace)도 동일하게 동작 ──
const summarizedShapeText = buildZiweiPersonalityContextLines({
  palaces: MOCK_CHART.palaces,
  shenGong: MOCK_CHART.bodyPalace,
  sanFangSiZheng: { lifePalace: MOCK_CHART.sanFangSiZheng.byPalace["명궁"] },
}).join("\n");
ok(summarizedShapeText.includes("반복 확인됨"), "네오 작전실이 쓰는 summarizeZiwei 형태(shenGong/lifePalace)에서 반복 신호가 감지되지 않음");

// ── 4) 자유질문(fortune.js 공유 buildZiweiAIPromptWithDomain) ─────────
const domainResult = buildZiweiAIPromptWithDomain({
  question: "올해 재물운이 궁금합니다",
  chartResult: MOCK_CHART,
  domain: "money",
});
const domainOccurrences = (domainResult.prompt.match(/\[핵심 성향 Context/g) || []).length;
ok(domainOccurrences === 1, `자유질문 프롬프트에 성향 Context가 정확히 1회 있어야 함(실제 ${domainOccurrences}회)`);
// 회귀 가드: 성향 Context를 domainDataLines 맨 앞에 두면, "참조 기류" 요약이 실제 명반 사실 대신
// 이 지침의 머리말을 인용하게 된다(2026-08-19 발견·수정).
const referenceLineMatch = domainResult.prompt.match(/참조 기류:[^\n]*/);
if (referenceLineMatch) {
  ok(!referenceLineMatch[0].includes("핵심 성향 Context"), `"참조 기류" 요약이 성향 Context 머리말을 인용함(뒤로 옮긴 배치가 되돌아감): ${referenceLineMatch[0]}`);
}

// ── 5) 초기 상담(worker/routes/ziwei-ai.js) — essence 그룹 + 공유 헤더 ──
const { SECTION_GROUP_SPECS, buildSectionCharTargets, buildSectionGroupPrompt } = __ziweiAiTestUtils;
const essenceGroup = SECTION_GROUP_SPECS.find((group) => group.id === "essence");
ok(Boolean(essenceGroup), "essence 섹션 그룹을 찾을 수 없음");
ok(essenceGroup?.sections.includes("personality_profile"), "essence 그룹에 personality_profile 섹션이 없음");

const charTargets = buildSectionCharTargets(essenceGroup);
const targetSum = Object.values(charTargets).reduce((sum, value) => sum + value, 0);
ok(targetSum === essenceGroup.targetChars, `essence 그룹 charTargets 합(${targetSum})이 targetChars(${essenceGroup.targetChars})와 다름`);
ok((charTargets.personality_profile || 0) > 0, "personality_profile 섹션에 분량 목표가 배분되지 않음");

const mockInput = {
  birthInfo: { name: "테스트", gender: "여성", birthDate: "1990-05-12", birthTime: "10:30", calendarType: "solar" },
  topic: "종합운세",
  userQuestion: "제 성향과 올해 흐름이 궁금합니다",
};
const essencePrompt = buildSectionGroupPrompt(mockInput, MOCK_CHART, essenceGroup);
const essenceOccurrences = (essencePrompt.match(/\[핵심 성향 Context/g) || []).length;
ok(essenceOccurrences >= 1, "essence 그룹 프롬프트(공유 헤더)에 성향 Context가 삽입되지 않음");
ok(essencePrompt.includes("personality_profile은"), "essence 그룹 프롬프트에 personality_profile 섹션 작성 규칙이 없음");
ok(essencePrompt.includes("겉과 속의 차이"), "personality_profile 섹션 규칙에 겉과 속 지시가 없음");

// ── 6) 팩폭 전략소(neo-operation-room-prompt.js) — 자미두수 분기에만 ────
const innateCore = NEO_INITIAL_SECTIONS.find((section) => section.id === "innateCore");
ok(Boolean(innateCore), "네오 작전실 innateCore 챕터를 찾을 수 없음");

const ziweiCtx = { selectedMethod: "ziwei", topic: "종합", intensity: "hot", question: "제 성향이 궁금합니다", methodSummary: { method: "ziwei", ...MOCK_CHART }, birthInfo: {} };
const sajuCtx = { selectedMethod: "saju", topic: "종합", intensity: "hot", question: "제 성향이 궁금합니다", methodSummary: { method: "saju", evidenceSummary: "일간: 갑목" }, birthInfo: {} };

const ziweiNeoPrompt = buildNeoInitialSectionPrompt(innateCore, ziweiCtx);
const sajuNeoPrompt = buildNeoInitialSectionPrompt(innateCore, sajuCtx);
ok(ziweiNeoPrompt.includes("[핵심 성향 Context"), "팩폭 전략소 자미두수 분기에 성향 Context가 삽입되지 않음");
ok(!sajuNeoPrompt.includes("[핵심 성향 Context"), "팩폭 전략소 사주 분기에 자미두수 전용 성향 Context가 새어 들어감(다른 술수 오염)");

// ── 7) 결과 화면(app/ziwei-ai/ZiweiAiClient.tsx) 노출 순서 ──────────────
const clientSource = readFileSync("app/ziwei-ai/ZiweiAiClient.tsx", "utf8");
const sectionOrderMatch = clientSource.match(/const SECTION_ORDER = \[([\s\S]*?)\];/);
ok(Boolean(sectionOrderMatch), "app/ziwei-ai/ZiweiAiClient.tsx에서 SECTION_ORDER를 찾을 수 없음");
if (sectionOrderMatch) {
  const orderKeys = [...sectionOrderMatch[1].matchAll(/"([a-z_]+)"/g)].map((match) => match[1]);
  const personalityIdx = orderKeys.indexOf("personality_profile");
  const essenceIdx = orderKeys.indexOf("essence");
  ok(personalityIdx >= 0, "SECTION_ORDER에 personality_profile이 없음");
  ok(personalityIdx >= 0 && personalityIdx <= 1, `personality_profile이 최우선 노출 순서가 아님(인덱스 ${personalityIdx})`);
  ok(personalityIdx >= 0 && essenceIdx >= 0 && personalityIdx < essenceIdx, "personality_profile이 essence보다 뒤에 노출됨");
}
ok(clientSource.includes('personality_profile: "性"'), "SECTION_GLYPHS에 personality_profile 글리프가 없음");

if (failures.length) {
  console.error("[verify:ziwei-personality-context] 실패:");
  failures.forEach((failure) => console.error("  - " + failure));
  process.exit(1);
}
console.log("[verify:ziwei-personality-context] OK — 지침 문구·반복 신호 탐지·4개 표면 배선·회귀 가드 모두 확인됨");
