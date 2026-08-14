#!/usr/bin/env node
/**
 * astrology-ai 섹션 분할 생성의 실행 가드.
 *
 * 왜 소스 단언이 아니라 실제 실행인가 — 이 전환의 핵심 주장은 "expand 전면 재생성이
 * 사라진다" 인데, 그건 코드에 문자열이 있는지로는 확인되지 않는다. 실제로 돌려서
 * 호출 횟수와 각 호출에 들어간 프롬프트를 봐야 한다.
 *
 * globalThis.fetch 를 Gemini 응답 모양의 스텁으로 갈아끼우므로 네트워크·과금이 없다.
 * (llm-cache 는 Mongo 를 못 잡아 경고만 남기고 우회한다 — 설계상 캐시 실패는 생성을 막지 않는다.)
 *
 * 실행: node --experimental-strip-types --no-warnings scripts/verify-astrology-sectioned-generation.mjs
 */

import { readFileSync } from "node:fs";

const failures = [];
function assert(condition, message) {
  if (!condition) failures.push(message);
}

const {
  __astrologyAiTestUtils: {
    ASTROLOGY_SECTIONS,
    buildSectionPrompt,
    generateSectionedConsultation,
    getConsultationQualityIssues,
    ASTROLOGY_AI_MIN_RESULT_CHARS,
    ASTROLOGY_AI_MAX_RESULT_CHARS,
  },
} = await import("../worker/routes/astrology-ai.js");

// ── 섹션 정의가 전체 품질 게이트와 산술적으로 맞는지 ────────────────────────────
const minTotal = ASTROLOGY_SECTIONS.reduce((sum, s) => sum + s.minChars, 0);
const maxTotal = ASTROLOGY_SECTIONS.reduce((sum, s) => sum + s.maxChars, 0);
assert(minTotal >= ASTROLOGY_AI_MIN_RESULT_CHARS, `섹션 minChars 합 ${minTotal} < 전체 하한 ${ASTROLOGY_AI_MIN_RESULT_CHARS}`);
assert(maxTotal <= ASTROLOGY_AI_MAX_RESULT_CHARS, `섹션 maxChars 합 ${maxTotal} > 전체 상한 ${ASTROLOGY_AI_MAX_RESULT_CHARS}`);
// 섹션 목표는 모델이 한 번에 채우는 크기여야 한다. 이게 커지면 expand 고리가 되돌아온다.
for (const section of ASTROLOGY_SECTIONS) {
  assert(section.maxChars <= 5000, `섹션 ${section.key} 목표 상한 ${section.maxChars} 가 한 번에 쓰기엔 크다`);
}

// ── 목 데이터 ────────────────────────────────────────────────────────────────
const chart = {
  planets: [
    { name: "Sun", sign: "Leo", house: 10, element: "fire", mode: "fixed" },
    { name: "Moon", sign: "Pisces", house: 5, element: "water", mode: "mutable" },
    { name: "Mercury", sign: "Virgo", house: 11, element: "earth", mode: "mutable" },
    { name: "Venus", sign: "Cancer", house: 9, element: "water", mode: "cardinal" },
    { name: "Mars", sign: "Aries", house: 6, element: "fire", mode: "cardinal" },
    { name: "Jupiter", sign: "Taurus", house: 7, element: "earth", mode: "fixed" },
    { name: "Saturn", sign: "Aquarius", house: 4, element: "air", mode: "fixed" },
  ],
  houses: Array.from({ length: 12 }, (_, i) => ({ house: i + 1, sign: "Leo" })),
  aspects: [
    { from: "Sun", to: "Moon", type: "trine", orb: 2.1 },
    { from: "Mars", to: "Saturn", type: "square", orb: 3.4 },
  ],
  ascendant: { sign: "Scorpio", degree: 12.5 },
  elementBalance: { fire: 2, earth: 2, water: 2, air: 1 },
};
const input = {
  birthInfo: {
    name: "테스트",
    gender: "female",
    birthDate: "1994-08-15",
    birthTime: "07:20",
    birthTimeUnknown: false,
    birthPlace: { city: "서울", country: "대한민국" },
  },
  topic: "career",
  userQuestion: "지금 이직을 해도 될까요?",
};

// 섹션별로 품질 게이트가 요구하는 키워드를 심는다(전문가 파트 6종 커버).
const SECTION_KEYWORDS = {
  opening_core: "상승궁과 태양, 그리고 달의 축",
  personal_growth: "수성의 판단 습관과 금성의 애정 방식, 화성의 추진력, 그리고 목성과 토성의 과제",
  evidence_domains: "주요 각도와 원소 균형, 모드의 분포",
  timing_action: "하우스와 트랜짓이 만드는 시기감, 지금 실천할 루틴과 2주 점검",
  relationship_patterns: "관계에서 반복되는 자리와 그때 맡게 되는 역할",
  yearly_outlook: "앞으로 네 분기에 걸쳐 열리고 조여드는 흐름",
};

// 새 섹션을 더하고 여기에 키워드를 안 넣으면 mockSectionText 가 "undefined" 를 본문에 심는다.
// 조립 결과가 품질 게이트를 통과해 버려 실패가 아니라 '통과'로 보이므로, 누락을 여기서 막는다.
for (const section of ASTROLOGY_SECTIONS) {
  assert(SECTION_KEYWORDS[section.key], `섹션 ${section.key} 의 목 키워드가 없다 — SECTION_KEYWORDS 에 추가하라`);
}

/**
 * 같은 문장 반복 판정(34자 이상 동일 문장 3회)에 걸리지 않게 만든다.
 * 🔴 문장마다 section.key 를 넣어야 한다 — 섹션 간에 같은 인덱스 문장이 겹치면
 *    4개 섹션을 조립했을 때 3회를 넘겨 REPEATED_SENTENCE 가 뜬다.
 */
function mockSectionText(section, targetChars) {
  const parts = [`${SECTION_KEYWORDS[section.key]}을 중심으로 상담을 이어갑니다.`];
  let i = 0;
  while (parts.join(" ").replace(/\s+/g, "").length < targetChars) {
    parts.push(`${section.label} 관점에서 ${i + 1}번째로 살펴볼 지점은 선택의 기준이 어디서 흔들리는지입니다. ${section.key} 흐름은 ${1990 + i}년대식 습관처럼 반복되며, 실제 장면에서는 ${i + 3}가지 신호로 먼저 나타납니다.`);
    i += 1;
  }
  return parts.join("\n\n");
}

// ── fetch 스텁 ───────────────────────────────────────────────────────────────
const realFetch = globalThis.fetch;
let calls = [];

function installStub(textForSection) {
  calls = [];
  globalThis.fetch = async (_url, options) => {
    const body = JSON.parse(options.body);
    const prompt = body.contents[0].parts.map((p) => p.text || "").join("");
    const marker = prompt.match(/\[이번에 쓸 부분\]\s*(.+)/);
    const label = marker ? marker[1].trim() : "";
    const section = ASTROLOGY_SECTIONS.find((s) => s.label === label);
    calls.push({
      sectionKey: section?.key || "(unknown)",
      prompt,
      maxOutputTokens: body.generationConfig?.maxOutputTokens,
      isRepair: prompt.includes("[보강 요청]"),
    });
    const text = textForSection(section, calls.length);
    return new Response(JSON.stringify({
      candidates: [{ content: { parts: [{ text }] }, finishReason: "STOP" }],
      usageMetadata: { promptTokenCount: 3000, candidatesTokenCount: Math.ceil(text.length / 2) },
    }), { status: 200, headers: { "Content-Type": "application/json" } });
  };
}

const env = { GEMINIF_API_KEY: "test-key", ASTROLOGY_AI_TIMEOUT_MS: "20000" };
const options = {
  minLength: ASTROLOGY_AI_MIN_RESULT_CHARS,
  maxLength: ASTROLOGY_AI_MAX_RESULT_CHARS,
  requireExpertParts: true,
};

// ── 케이스 A: 모든 섹션이 목표를 채우는 정상 경로 ─────────────────────────────
installStub((section) => mockSectionText(section, section.minChars + 200));
const okResult = await generateSectionedConsultation(env, input, chart, options);

assert(calls.length === ASTROLOGY_SECTIONS.length, `A: 정상 경로는 섹션 수(${ASTROLOGY_SECTIONS.length})만큼만 호출해야 하는데 ${calls.length}회`);
assert(calls.every((c) => !c.isRepair), "A: 정상 경로에서 보강 호출이 발생했다");
assert(!okResult.quality.degraded, "A: 정상 경로가 degraded 로 떨어졌다");
assert(okResult.quality.charCount >= ASTROLOGY_AI_MIN_RESULT_CHARS, `A: 조립 결과 ${okResult.quality.charCount}자가 하한 미달`);
assert(okResult.quality.charCount <= ASTROLOGY_AI_MAX_RESULT_CHARS, `A: 조립 결과 ${okResult.quality.charCount}자가 상한 초과`);
assert(getConsultationQualityIssues(okResult.content, { ...options, requireExpertParts: true }).length === 0, "A: 조립 결과가 품질 게이트를 통과하지 못했다");

// 전면 재생성 금지 — 어떤 프롬프트에도 앞서 생성된 본문 전체가 다시 들어가면 안 된다.
for (const call of calls) {
  assert(!call.prompt.includes("[초안]"), "A: 섹션 프롬프트에 초안 전체가 실렸다(전면 재생성 패턴)");
  assert(!call.prompt.includes("[기존 지시와 계산 근거]"), "A: 섹션 프롬프트가 expand 프롬프트 형태다");
}
// 섹션 호출의 출력 상한은 단일 호출 시절(33,000)보다 확실히 작아야 한다.
for (const call of calls) {
  assert(call.maxOutputTokens > 0 && call.maxOutputTokens <= 12000, `A: 섹션 출력 상한 ${call.maxOutputTokens} 이 너무 크다`);
}

// ── 케이스 B: 한 섹션만 분량 미달 → 그 섹션만 재생성 ──────────────────────────
const shortKey = ASTROLOGY_SECTIONS[1].key;
let served = 0;
installStub((section) => {
  served += 1;
  // 첫 웨이브에서 shortKey 섹션만 짧게 준다. 보강 호출에서는 충분히 준다.
  const short = section.key === shortKey && served <= ASTROLOGY_SECTIONS.length;
  return mockSectionText(section, short ? Math.floor(section.minChars / 3) : section.minChars + 200);
});
const repairedResult = await generateSectionedConsultation(env, input, chart, options);

const repairCalls = calls.filter((c) => c.isRepair);
assert(repairCalls.length === 1, `B: 보강 호출은 1회여야 하는데 ${repairCalls.length}회`);
assert(repairCalls[0]?.sectionKey === shortKey, `B: 모자란 섹션(${shortKey})이 아니라 ${repairCalls[0]?.sectionKey} 를 다시 썼다`);
assert(calls.length === ASTROLOGY_SECTIONS.length + 1, `B: 총 호출은 ${ASTROLOGY_SECTIONS.length + 1}회여야 하는데 ${calls.length}회 (전체 재생성 의심)`);
assert(repairedResult.quality.charCount >= ASTROLOGY_AI_MIN_RESULT_CHARS, `B: 보강 후에도 ${repairedResult.quality.charCount}자로 하한 미달`);
assert(!repairedResult.quality.degraded, "B: 보강 후에도 degraded 로 떨어졌다");

// ── 케이스 C: 전 섹션이 심하게 짧으면 degrade 로 전달(결제 결과를 버리지 않음) ──
installStub((section) => mockSectionText(section, 300));
const degradedResult = await generateSectionedConsultation(env, input, chart, options);
assert(degradedResult.quality.degraded === true, "C: 분량 미달인데 degraded 표시가 없다");
assert(degradedResult.content.length > 0, "C: 렌더 가능한 본문이 있는데 버려졌다");

globalThis.fetch = realFetch;

// ── 소스 단언: fetch 스텁으로는 안 보이는 계약 ────────────────────────────────
const route = readFileSync(new URL("../worker/routes/astrology-ai.js", import.meta.url), "utf8");
assert(
  /fallbackMinChars:\s*Math\.round\(section\.minChars \* 0\.4\)/.test(route),
  "폴백 문턱이 섹션 목표 기준(section.minChars * 0.4)이 아니다 — 전체 목표 기준이면 짧은 폴백이 통과한다",
);
assert(route.includes("generateSectionedConsultation"), "섹션 생성 함수가 없다");
// 후속 질문 경로는 단일 호출을 유지한다(짧아서 분할 이득이 없다).
assert(/buildFollowUpPrompt\(consultation, message\)/.test(route), "후속 질문 경로가 사라졌다");

// ── 결과 ─────────────────────────────────────────────────────────────────────
if (failures.length) {
  console.error("[verify:astrology-sectioned] FAIL");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log("[verify:astrology-sectioned] PASS");
console.log(`  섹션 ${ASTROLOGY_SECTIONS.length}개 · 목표 합 ${minTotal.toLocaleString("ko-KR")}~${maxTotal.toLocaleString("ko-KR")}자`);
console.log(`  A 정상: ${ASTROLOGY_SECTIONS.length}회 호출 · ${okResult.quality.charCount.toLocaleString("ko-KR")}자`);
console.log(`  B 보강: ${ASTROLOGY_SECTIONS.length + 1}회 호출(모자란 섹션만) · ${repairedResult.quality.charCount.toLocaleString("ko-KR")}자`);
console.log("  C 미달: degraded 로 전달(결과 폐기 없음)");
