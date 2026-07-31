// 계산 근거(analysis basis) 계약이 다섯 기능에서 실제로 지켜지는지 확인한다.
//
// 텍스트 검사만 하는 다른 가드와 달리 여기서는 어댑터를 진짜로 돌린다.
// 근거 패널은 "화면에 보이는 값 = 프롬프트가 인용해야 할 값"이라는 약속 위에 서 있어서,
// 스키마가 조용히 어긋나면 본문이 화면에 없는 수치를 말하기 시작한다.

import { existsSync } from "node:fs";
import { readFileSync } from "node:fs";
import { collectBasisLabels, collectBasisShapeIssues } from "../worker/lib/analysis-basis-contract.js";
import { REASONING_SECTION_KEYS } from "../worker/lib/fortune-reasoning-contract.js";

const LABEL = "[verify:analysis-basis-contract]";
let checks = 0;

function assert(condition, message) {
  checks += 1;
  if (!condition) throw new Error(`${LABEL} ${message}`);
}

function read(path) {
  return readFileSync(path, "utf8");
}

function assertBasis(name, payload, { minGroups = 2, minStages = 2 } = {}) {
  const issues = collectBasisShapeIssues(payload);
  assert(!issues.length, `${name}: 계약 위반 → ${issues.join(", ")}`);
  assert(payload.groups.length >= minGroups, `${name}: groups가 ${minGroups}개 미만 (${payload.groups.length})`);
  assert(payload.stages.length >= minStages, `${name}: stages가 ${minStages}개 미만 (${payload.stages.length})`);

  // 단계가 아무 묶음도 못 가리키면 대기 화면이 텅 빈 채로 돌아간다 — 이 계약의 핵심 실패 모드.
  const covered = new Set(payload.stages.flatMap((stage) => stage.groupKeys));
  assert(covered.size > 0, `${name}: 어떤 stage도 group을 가리키지 않음 (대기 화면이 비게 된다)`);
  for (const stage of payload.stages) {
    assert(stage.groupKeys.length > 0, `${name}: stage '${stage.key}'가 가리키는 group이 없음`);
  }

  const labels = collectBasisLabels(payload);
  assert(labels.length >= 4, `${name}: 인용 가능한 항목명이 ${labels.length}개뿐 (근거 규칙이 무의미해진다)`);
  return payload;
}

// ── 1. 자미두수 ───────────────────────────────────────
{
  const { __ziweiAiTestUtils } = await import("../worker/routes/ziwei-ai.js");
  const { calculateZiweiAiChart } = await import("../worker/lib/ziwei-ai-chart.js");
  const { buildZiweiAnalysisBasis, buildFirstPrompt, normalizeConsultationInput } = __ziweiAiTestUtils;
  assert(typeof buildZiweiAnalysisBasis === "function", "ziwei: buildZiweiAnalysisBasis 미노출");

  const normalized = normalizeConsultationInput({
    gender: "female",
    birthDate: "1993-07-21",
    birthTime: "09:30",
    calendarType: "solar",
    topic: "전체 명반 해석",
    focusArea: "overall",
  });
  assert(normalized.ok, `ziwei: 샘플 입력 정규화 실패 (${normalized.message || ""})`);

  const chart = calculateZiweiAiChart(normalized.input, { year: 2026 });
  const basis = assertBasis("ziwei", buildZiweiAnalysisBasis(chart, normalized.input.birthInfo));

  // 근거 값은 명반에서 그대로 와야 한다. 명궁이 비면 어댑터가 잘못된 필드를 읽고 있다는 뜻.
  const core = basis.groups.find((group) => group.key === "core");
  assert(core?.items.some((item) => item.label === "명궁" && item.value), "ziwei: 명궁 근거가 비어 있음");
  assert(basis.groups.find((group) => group.key === "palaces")?.items.length >= 8, "ziwei: 12궁 강약 항목이 너무 적음");

  // 프롬프트가 근거 규칙과 근거 중심 섹션을 실제로 싣고 있는가.
  const prompt = buildFirstPrompt(normalized.input, chart);
  assert(prompt.includes("[근거 고정 규칙]"), "ziwei: 프롬프트에 근거 고정 규칙이 없음");
  assert(prompt.includes("[분야별 분석 규칙]"), "ziwei: 프롬프트에 분야별 분석 규칙이 없음");
  for (const key of REASONING_SECTION_KEYS) {
    assert(prompt.includes(key), `ziwei: 프롬프트 sections에 ${key} 누락`);
  }
}

// ── 1b. 사주 (명식 → 근거, 실제 계산) ──────────────────
{
  const { buildSajuAIPrompt } = await import("../worker/lib/saju-ai-prompt.js");
  const built = buildSajuAIPrompt({
    question: "올해 이직해도 될까요?",
    sajuResult: {
      pillars: { y: { ganji: "癸酉" }, m: { ganji: "己未" }, d: { ganji: "丙子" }, h: { ganji: "壬辰" } },
      natal: { counts: { wood: 1, fire: 2, earth: 2, metal: 1, water: 2 }, dominant: "화" },
      profile: { gender: "female", birthDate: "1993-07-21", birthTime: "09:30" },
    },
  });
  const basis = assertBasis("saju", built.analysisBasis);
  const pillars = basis.groups.find((group) => group.key === "pillars");
  assert(pillars?.items.length === 4, `saju: 네 기둥이 아니라 ${pillars?.items.length ?? 0}개`);
  assert(pillars.items.some((item) => item.value.includes("丙子")), "saju: 일주가 근거에 실리지 않음");
  // 오행 가중치가 없으면 "목 0 · 화 0 …"이 뜨던 표시 결함 — 값이 있을 때만 나와야 한다.
  const elements = basis.groups.find((group) => group.key === "elements");
  assert(elements.items.some((item) => item.label === "오행 분포" && !/목 0 · 화 0/.test(item.value)), "saju: 오행 분포가 전부 0으로 표시됨");
  assert(built.generatedPrompt.includes("[근거 고정 규칙]"), "saju: 프롬프트에 근거 고정 규칙이 없음");
  assert(built.generatedPrompt.includes("해석 근거"), "saju: 프롬프트 답변 형식에 해석 근거가 없음");
  assert(built.generatedPrompt.includes("분야별 분석"), "saju: 프롬프트 답변 형식에 분야별 분석이 없음");
}

// 오행 가중치가 빠진 명식에서는 해당 항목을 아예 빼야 한다(계산 실패처럼 보이는 줄 방지).
{
  const { buildSajuAIPrompt } = await import("../worker/lib/saju-ai-prompt.js");
  const built = buildSajuAIPrompt({
    question: "올해 이직해도 될까요?",
    sajuResult: { pillars: { y: { ganji: "癸酉" }, m: { ganji: "己未" }, d: { ganji: "丙子" }, h: { ganji: "壬辰" } } },
  });
  const elements = built.analysisBasis.groups.find((group) => group.key === "elements");
  assert(!elements.items.some((item) => item.label === "오행 분포"), "saju: 가중치가 없는데도 오행 분포 항목이 남음");
}

// ── 1c. 숙요 궁합 (두 사람 → 근거, 실제 계산) ───────────
{
  const { __sukuyoCompatibilityAiTestUtils } = await import("../worker/routes/sukuyo-compatibility-ai.js");
  const { normalizeInput, calculateSukuyo, buildSukuyoAnalysisBasis, buildSectionGroupPrompt, SUKUYO_SECTION_SPECS, SUKUYO_SECTION_GROUPS, SUKUYO_COMPATIBILITY_TARGET_MIN_CHARS, SUKUYO_COMPATIBILITY_TARGET_MAX_CHARS } = __sukuyoCompatibilityAiTestUtils;
  const input = normalizeInput({
    consultationType: "compatibility",
    personA: { name: "나", gender: "female", birthDate: "1993-07-21", calendarType: "solar" },
    personB: { name: "상대", gender: "male", birthDate: "1990-03-08", calendarType: "solar" },
    relationshipType: "연인",
    topic: "전체 궁합",
    question: "이 관계를 오래 이어가려면 무엇을 조심해야 할까요?",
  });
  assert(input.ok, `sukuyo: 샘플 입력 정규화 실패 (${(input.errors || []).join(", ")})`);
  const calculation = calculateSukuyo(input);
  const basis = assertBasis("sukuyo", buildSukuyoAnalysisBasis(input, calculation));
  assert(basis.groups.find((group) => group.key === "relation")?.items.length >= 3, "sukuyo: 방위 관계 근거가 부족함");

  // 섹션을 더할 때 최소 분량 합이 상한에 붙으면 JSON이 잘려 degraded로 떨어진다.
  const minSum = SUKUYO_SECTION_SPECS.reduce((total, spec) => total + spec.minChars, 0);
  assert(minSum === SUKUYO_COMPATIBILITY_TARGET_MIN_CHARS, "sukuyo: 최소 분량 합계가 상수와 어긋남");
  assert(
    SUKUYO_COMPATIBILITY_TARGET_MAX_CHARS - minSum >= 1500,
    `sukuyo: 최소(${minSum})와 상한(${SUKUYO_COMPATIBILITY_TARGET_MAX_CHARS}) 사이 여유가 ${SUKUYO_COMPATIBILITY_TARGET_MAX_CHARS - minSum}자뿐 — 잘림 위험`,
  );

  // 섹션 그룹(= LLM 호출 1회)이 모든 장을 빠짐없이 한 번씩만 덮어야 한다.
  // 빠지면 그 장은 영영 안 만들어지고, 겹치면 뒤엣것이 앞엣것을 덮는다.
  const groupKeys = SUKUYO_SECTION_GROUPS.flatMap((group) => group.keys);
  assert(groupKeys.length === new Set(groupKeys).size, "sukuyo: 섹션 그룹에 중복된 키가 있음");
  assert(
    groupKeys.length === SUKUYO_SECTION_SPECS.length
      && SUKUYO_SECTION_SPECS.every((spec) => groupKeys.includes(spec.key)),
    "sukuyo: 섹션 그룹이 덮지 못한 장이 있음",
  );

  // 근거·분야 규칙은 그룹 프롬프트가 이어받는다(단일 대형 프롬프트 → 그룹 병렬).
  const prompt = buildSectionGroupPrompt(input, calculation, SUKUYO_SECTION_GROUPS.find((g) => g.keys.includes("domains")));
  assert(prompt.includes("[근거 고정 규칙]"), "sukuyo: 프롬프트에 근거 고정 규칙이 없음");
  assert(prompt.includes("[분야별 분석 규칙]"), "sukuyo: 프롬프트에 분야별 분석 규칙이 없음");
  // 궁합은 개인 운세용 6분야가 아니라 관계 무대로 나뉘어야 한다.
  assert(prompt.includes("연애·결혼") && !prompt.includes("연애 → 직업 → 사업"), "sukuyo: 관계 전용 분야 목록이 적용되지 않음");
}

// ── 1d. 점성술·베다 (계산기는 WASM/env 의존이라 어댑터만 검증) ──
{
  const { __astrologyAiTestUtils } = await import("../worker/routes/astrology-ai.js");
  const basis = assertBasis("astrology", __astrologyAiTestUtils.buildAstrologyAnalysisBasis({
    zodiacType: "tropical",
    houseSystem: "placidus",
    sun: { name: "Sun", sign: "Cancer", signKo: "게자리", degree: 28.4, house: 10 },
    moon: { name: "Moon", sign: "Pisces", signKo: "물고기자리", degree: 3.1, house: 6 },
    ascendant: { sign: "Libra", signKo: "천칭자리", degree: 12.9 },
    mc: { sign: "Cancer", signKo: "게자리", degree: 15.2 },
    chartRuler: "Venus",
    planets: [
      { name: "Sun", label: "태양", sign: "Cancer", signKo: "게자리", degree: 28.4, house: 10 },
      { name: "Mercury", label: "수성", sign: "Leo", signKo: "사자자리", degree: 5.5, house: 11 },
      { name: "Venus", label: "금성", sign: "Gemini", signKo: "쌍둥이자리", degree: 19.2, house: 9 },
      { name: "Mars", label: "화성", sign: "Virgo", signKo: "처녀자리", degree: 2.7, house: 12 },
      { name: "Jupiter", label: "목성", sign: "Libra", signKo: "천칭자리", degree: 8.8, house: 1 },
      { name: "Saturn", label: "토성", sign: "Aquarius", signKo: "물병자리", degree: 24.1, house: 5 },
    ],
    elementBalance: { fire: 2, earth: 2, air: 3, water: 3 },
    modalityBalance: { cardinal: 4, fixed: 3, mutable: 3 },
    majorAspects: [
      { planetA: "태양", aspect: "trine", planetB: "달", orb: 1.2 },
      { planetA: "화성", aspect: "square", planetB: "토성", orb: 2.4 },
    ],
    transits: { majorAspectsToNatal: [{ transitPlanet: "Saturn", aspect: "opposition", natalPlanet: "Sun", orb: 0.8 }] },
  }));
  const aspects = basis.groups.find((group) => group.key === "aspects");
  assert(aspects.items.some((item) => item.tone === "positive") && aspects.items.some((item) => item.tone === "caution"), "astrology: 각도의 긍정/주의 구분이 없음");
}

{
  const { __vedicAiTestUtils } = await import("../worker/routes/vedic-ai.js");
  const basis = assertBasis("vedic", __vedicAiTestUtils.buildVedicAnalysisBasis({
    ayanamsa: "Lahiri",
    lagna: { rashiKo: "천칭", sign: "Libra" },
    moon: { signKo: "물고기", sign: "Pisces" },
    moonNakshatra: { name: "Revati", pada: 2 },
    grahas: [
      { nameKo: "태양", nameEn: "Sun", rashiKo: "게", house: 10, dignity: "friendly sign" },
      { nameKo: "토성", nameEn: "Saturn", rashiKo: "양", house: 7, dignity: "debilitated" },
    ],
    bhavas: [{ house: 10, rashiKo: "게", grahas: ["Sun"] }, { house: 7, rashiKo: "양", grahas: ["Saturn"] }],
    vimshottariDasha: { currentMahadasha: { lord: "Mercury", end: "2029-04-11" }, currentAntardasha: { lord: "Ketu", end: "2026-11-02" } },
    rahuKetu: { rahu: { rashiKo: "황소", house: 8 }, ketu: { rashiKo: "전갈", house: 2 } },
    calculationMeta: { lagnaBhavaAvailable: true },
  }));
  assert(basis.groups.find((group) => group.key === "graha")?.items.some((item) => item.tone === "caution"), "vedic: 품위가 낮은 그라하가 주의로 표시되지 않음");
}

// ── 2. 프런트 렌더 화이트리스트 ────────────────────────
// 워커가 새 섹션을 만들어도 클라이언트 목록에 없으면 화면에 영영 안 뜬다(조용한 유실).
{
  const client = read("app/ziwei-ai/ZiweiAiClient.tsx");
  for (const key of REASONING_SECTION_KEYS) {
    assert(client.includes(`"${key}"`), `ziwei client: SECTION_ORDER에 ${key} 누락`);
    assert(new RegExp(`${key}:\\s*"`).test(client), `ziwei client: SECTION_GLYPHS에 ${key} 누락`);
  }
  assert(client.includes("AnalysisBasisLoading"), "ziwei client: 대기 화면에 AnalysisBasisLoading 미배선");
  assert(client.includes("AnalysisBasisPanel"), "ziwei client: 결과 화면에 AnalysisBasisPanel 미배선");
}

// ── 3. 공용 컴포넌트 존재 ──────────────────────────────
for (const path of [
  "lib/fortune/analysis-basis.ts",
  "components/fortune/AnalysisBasisPanel.tsx",
  "components/fortune/AnalysisBasisLoading.tsx",
  "components/fortune/GlossaryTerm.tsx",
  "worker/lib/analysis-basis-contract.js",
  "worker/lib/fortune-reasoning-contract.js",
  "worker/lib/fortune-glossary.js",
]) {
  assert(existsSync(path), `공용 파일 누락: ${path}`);
}

// 근거 조회는 실패해도 유료 흐름을 막으면 안 된다 — 이 보장이 사라지면 결제가 근거 때문에 죽는다.
{
  const helper = read("lib/fortune/analysis-basis.ts");
  assert(/catch\s*{\s*return null;\s*}/.test(helper), "fetchAnalysisBasis가 실패를 삼키지 않음(유료 흐름 차단 위험)");
}

console.log(`${LABEL} ok (${checks} checks)`);
