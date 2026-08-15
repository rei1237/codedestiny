// 유료 AI 상담이 "결제는 됐는데 결과가 없다"로 끝나지 않는다는 것을 mock으로 증명한다.
//
// 라이브에서 다섯 기능을 일일이 생성해 보기는 어렵다. 대신 LLM이 실제로 뱉을 수 있는 나쁜 출력을
// 후처리 파이프라인에 직접 먹여, 렌더 가능한 텍스트가 남아 있는 한 결과가 버려지지 않는지 확인한다.
// 모듈 모킹이나 DB 스텁 없이 순수 함수만 호출하므로, 라우트 내부 구조가 조금 바뀌어도 잘 깨지지 않는다.
//
// 함께 세 가지 예산도 단언한다. 이 셋이 어긋나면 위 계약이 물리적으로 성립할 수 없기 때문이다.
//   1) 분량 여유 = 요구 상한 − 요구 하한
//   2) 토큰 여유 = 토큰 상한이 담을 수 있는 글자수 − 요구 상한
//   3) 동기 라우트의 LLM 타임아웃 ≤ 엣지가 요청을 끊기 전 한계

import { readFileSync } from "node:fs";
import { hasRenderableLlmText } from "../worker/lib/llm-result-delivery.js";
import { extractReadableTextFromJsonLike } from "../lib/llm-text.js";
import {
  MIN_BUDGET_HEADROOM_CHARS,
  charsAllowedByTokens,
  tokenHeadroomChars,
  tokensRequiredForChars,
} from "../worker/lib/llm-budget.js";
import { EDGE_RESPONSE_DEADLINE_MS, SYNC_LLM_TIMEOUT_CEILING_MS } from "../worker/lib/sync-llm-timeout.js";

const LABEL = "[verify:llm-generation-resilience]";
// degrade 관문이 쓰는 값과 같아야 한다(각 라우트의 hasRenderableLlmText(..., { minChars: 400 })).
const DELIVERY_MIN_CHARS = 400;
let checks = 0;

function assert(condition, message) {
  checks += 1;
  if (!condition) throw new Error(`${LABEL} ${message}`);
}

function read(path) {
  return readFileSync(path, "utf8");
}

// ── mock LLM 출력 8종 ─────────────────────────────────
// 실제 상담문처럼 보이는 한국어 본문. 길이는 목표 분량이 아니라 "관문을 넘는지"만 보면 되므로 압축한다.
function paragraph(seed, repeat = 12) {
  return Array.from({ length: repeat }, (_, index) =>
    `${seed} 이 흐름은 명식의 ${index + 1}번째 축에서 드러나며, 지금 무엇을 먼저 살펴야 하는지 알려 줍니다. `
    + "단정하지 말고 경향으로 읽되, 오늘 할 수 있는 선택부터 정리해 두시면 좋습니다.").join("");
}

function buildSectionsObject(keys) {
  return Object.fromEntries(keys.map((key, index) => [key, {
    title: `섹션 ${index + 1}`,
    body: paragraph(`${key} 해석.`),
  }]));
}

/**
 * @param {string[]} sectionKeys 그 기능이 실제로 요구하는 섹션 키
 * @returns {{name: string, text: string, deliverable: boolean}[]}
 */
function buildMockOutputs(sectionKeys) {
  const full = JSON.stringify({
    meta: { name: "홍길동", scores: { overall: 72 } },
    scores: { dharma: 18, artha: 17, kama: 18, moksha: 17, overall: 70 },
    sections: buildSectionsObject(sectionKeys),
  }, null, 2);

  const shortSections = JSON.stringify({
    meta: { name: "홍길동", scores: { overall: 72 } },
    scores: { dharma: 18, artha: 17, kama: 18, moksha: 17, overall: 70 },
    sections: Object.fromEntries(sectionKeys.map((key, index) => [key, {
      title: `섹션 ${index + 1}`,
      // 관문(400자)은 넘지만 각 섹션 최소 분량에는 한참 못 미치는 길이.
      body: paragraph(`${key} 짧은 해석.`, 1),
    }])),
  }, null, 2);

  const missingReasoning = JSON.stringify({
    meta: { name: "홍길동", scores: { overall: 72 } },
    scores: { dharma: 18, artha: 17, kama: 18, moksha: 17, overall: 70 },
    // 직전 작업에서 더한 근거 섹션이 통째로 빠진 경우 — 옛 프롬프트로 캐시된 응답이 오면 이렇게 된다.
    sections: buildSectionsObject(sectionKeys.filter((key) => ![
      "structure_core", "influence_factors", "evidence_basis", "domain_matrix", "action_plan",
    ].includes(key))),
  }, null, 2);

  return [
    { name: "정상 JSON", text: full, deliverable: true },
    // 실제 1순위 실패 모드: 토큰 상한에 걸려 문자열 한복판에서 끊긴 응답.
    { name: "문자열 중간에서 잘린 JSON", text: full.slice(0, Math.floor(full.length * 0.62)), deliverable: true },
    { name: "닫는 괄호가 빠진 JSON", text: full.slice(0, full.length - 3), deliverable: true },
    { name: "근거 섹션 누락 JSON", text: missingReasoning, deliverable: true },
    { name: "모든 섹션이 최소 분량 미달", text: shortSections, deliverable: true },
    { name: "상한 초과 분량", text: JSON.stringify({ sections: buildSectionsObject(sectionKeys.slice(0, 3)) }).replace(/}$/, "") + `,"extra":"${paragraph("과잉.", 400)}"}`, deliverable: true },
    { name: "JSON 대신 마크다운 산문", text: `## 상담문\n\n${paragraph("서두.")}\n\n${paragraph("본론.")}`, deliverable: true },
    { name: "공백만", text: "   \n\t  \n ", deliverable: false },
    { name: "빈 문자열", text: "", deliverable: false },
  ];
}

/**
 * 핵심 계약: 렌더 가능한 텍스트가 남아 있으면 반드시 전달되고, 아무것도 없을 때만 실패한다.
 * 실패해야 환불 경로가 돈다 — 빈 결과를 "전달"해 버리면 조용히 과금된다.
 */
function assertDeliveryContract(feature, mocks) {
  for (const mock of mocks) {
    const renderable = hasRenderableLlmText(mock.text, { minChars: DELIVERY_MIN_CHARS });
    assert(
      renderable === mock.deliverable,
      `${feature}: "${mock.name}" 전달 판정이 어긋남 (기대 ${mock.deliverable ? "전달" : "실패"}, 실제 ${renderable ? "전달" : "실패"})`,
    );
  }
}

/** 잘린 JSON에서 사람이 읽을 문장이 실제로 복구되는지 — degrade가 "빈 화면"이 되지 않도록. */
function assertTruncationRecovery(feature, truncatedText) {
  const recovered = extractReadableTextFromJsonLike(truncatedText);
  assert(
    recovered && recovered.replace(/\s+/g, "").length >= DELIVERY_MIN_CHARS,
    `${feature}: 잘린 JSON에서 읽을 수 있는 문장이 복구되지 않음 (degrade 결과가 비게 된다)`,
  );
}

/** 검증 함수가 나쁜 입력에 대해 던지지 않고 "문제 목록"으로 답하는지 — 던지면 호출부가 결과를 잃는다. */
function assertNeverThrows(feature, label, run) {
  checks += 1;
  try {
    run();
  } catch (error) {
    throw new Error(`${LABEL} ${feature}: ${label}에서 예외가 났다 — 호출부가 결과를 버리게 된다 (${error?.message || error})`);
  }
}

// ── 1. 자미두수 ───────────────────────────────────────
{
  const feature = "ziwei";
  const { __ziweiAiTestUtils } = await import("../worker/routes/ziwei-ai.js");
  const { enforceZiweiChartFacts, countStructuredConsultationBodyChars, MIN_INITIAL_CONSULTATION_BODY_CHARS, MAX_INITIAL_CONSULTATION_BODY_CHARS } = __ziweiAiTestUtils;
  const mocks = buildMockOutputs([
    "reading_guide", "structure_core", "influence_factors", "evidence_basis", "essence",
    "flow", "triad_axis", "twelve_palaces", "career", "wealth", "relationship",
    "dayun_now", "timing_strategy", "caution", "domain_matrix", "core_answer", "action_plan", "prescription",
  ]);
  assertDeliveryContract(feature, mocks);
  assertTruncationRecovery(feature, mocks[1].text);

  const chart = { lifePalace: "명궁", bodyPalace: "부부궁", palaces: [], fourTransformations: {} };
  for (const mock of mocks) {
    assertNeverThrows(feature, `enforceZiweiChartFacts("${mock.name}")`, () => enforceZiweiChartFacts(mock.text, chart));
    assertNeverThrows(feature, `countStructuredConsultationBodyChars("${mock.name}")`, () => countStructuredConsultationBodyChars(mock.text));
  }
  assertBudget(feature, {
    minChars: MIN_INITIAL_CONSULTATION_BODY_CHARS,
    maxChars: MAX_INITIAL_CONSULTATION_BODY_CHARS,
    maxOutputTokens: 48000,
    tokenConstantName: "INITIAL_CONSULTATION_MAX_OUTPUT_TOKENS",
    sourcePath: "worker/routes/ziwei-ai.js",
  });
}

// ── 2. 베다 ───────────────────────────────────────────
{
  const feature = "vedic";
  const { __vedicAiTestUtils } = await import("../worker/routes/vedic-ai.js");
  const { validateConsultationQuality, sanitizeAssistantText } = __vedicAiTestUtils;
  const mocks = buildMockOutputs([
    "karma_origin", "dharma_artha", "relationship_soul", "dasha_upaya",
    "structure_core", "influence_factors", "evidence_basis", "domain_matrix", "action_plan",
  ]);
  assertDeliveryContract(feature, mocks);
  assertTruncationRecovery(feature, mocks[1].text);

  for (const mock of mocks) {
    assertNeverThrows(feature, `validateConsultationQuality("${mock.name}")`, () => {
      const quality = validateConsultationQuality(sanitizeAssistantText(mock.text), {
        minTotalChars: 10000,
        maxTotalChars: 20000,
        requireStructured: true,
      });
      // 품질 판정은 불합격이어도 좋다. 던지지만 않으면 호출부가 degrade로 넘긴다.
      assert(typeof quality?.ok === "boolean", `${feature}: 품질 판정이 boolean ok를 돌려주지 않음`);
    });
  }
  // 베다도 이제 그룹을 나눠 병렬 생성한다 — 예산 단위는 "상담 전체"가 아니라 "그룹 하나"다.
  const { VEDIC_SECTION_GROUPS, VEDIC_GROUP_MAX_OUTPUT_TOKENS, MIN_INITIAL_READING_CHARS } = __vedicAiTestUtils;
  assert(Array.isArray(VEDIC_SECTION_GROUPS) && VEDIC_SECTION_GROUPS.length > 0, `${feature}: 그룹 정의가 없다`);
  for (const group of VEDIC_SECTION_GROUPS) {
    assertBudget(`${feature}:${group.key}`, {
      minChars: group.minChars,
      maxChars: group.maxChars,
      maxOutputTokens: VEDIC_GROUP_MAX_OUTPUT_TOKENS,
      tokenConstantName: "VEDIC_GROUP_MAX_OUTPUT_TOKENS",
      sourcePath: "worker/routes/vedic-ai.js",
    });
  }
  // 🔴 분량 판정은 읽기 섹션 4개의 body 만 센다. 근거 흐름 그룹은 합계에 들어가지 않으므로
  //    요구 하한은 읽기 그룹만으로 채워져야 한다 — 근거 그룹을 세면 하한이 조용히 헐거워진다.
  const readingMinTotal = VEDIC_SECTION_GROUPS
    .filter((group) => group.sectionKeys.length > 0)
    .reduce((sum, group) => sum + group.minChars, 0);
  checks += 1;
  assert(
    readingMinTotal >= MIN_INITIAL_READING_CHARS,
    `${feature}: 읽기 그룹 minChars 합 ${readingMinTotal} < 배달 하한 ${MIN_INITIAL_READING_CHARS}`,
  );
}

// ── 3. 점성술 ─────────────────────────────────────────
{
  const feature = "astrology";
  const { __astrologyAiTestUtils } = await import("../worker/routes/astrology-ai.js");
  const { getConsultationQualityIssues, sanitizeConsultationText, ASTROLOGY_AI_MIN_RESULT_CHARS, ASTROLOGY_AI_MAX_RESULT_CHARS } = __astrologyAiTestUtils;
  // 점성술은 자유 텍스트라 JSON 픽스처가 그대로 "산문"으로 취급된다.
  const mocks = buildMockOutputs(["summary", "core", "structure_core", "evidence_basis", "action_plan"]);
  assertDeliveryContract(feature, mocks);

  for (const mock of mocks) {
    assertNeverThrows(feature, `getConsultationQualityIssues("${mock.name}")`, () => {
      const issues = getConsultationQualityIssues(sanitizeConsultationText(mock.text), {
        minLength: ASTROLOGY_AI_MIN_RESULT_CHARS,
        maxLength: ASTROLOGY_AI_MAX_RESULT_CHARS,
        requireExpertParts: true,
      });
      assert(Array.isArray(issues), `${feature}: 품질 이슈가 배열이 아님`);
    });
  }
  // 점성술은 첫 상담을 섹션으로 나눠 쓴다 — 예산 단위가 "상담 전체"가 아니라 "섹션 하나"다.
  // 그래서 전체 분량이 아니라 각 섹션의 목표 대비 토큰 여유를 본다.
  // (섹션 합이 전체 게이트와 맞는지는 verify:astrology-sectioned 가 따로 단언한다.)
  const { ASTROLOGY_SECTIONS } = __astrologyAiTestUtils;
  assert(Array.isArray(ASTROLOGY_SECTIONS) && ASTROLOGY_SECTIONS.length > 0, `${feature}: 섹션 정의가 없다`);
  for (const section of ASTROLOGY_SECTIONS) {
    assertBudget(`${feature}:${section.key}`, {
      minChars: section.minChars,
      maxChars: section.maxChars,
      maxOutputTokens: 9600,
      tokenConstantName: "ASTROLOGY_AI_SECTION_MAX_OUTPUT_TOKENS",
      sourcePath: "worker/routes/astrology-ai.js",
    });
  }
  // 섹션 합이 전체 요구 분량을 덮는지 — 섹션을 줄이다 전체 하한이 깨지는 회귀를 막는다.
  const sectionMinTotal = ASTROLOGY_SECTIONS.reduce((sum, section) => sum + section.minChars, 0);
  const sectionMaxTotal = ASTROLOGY_SECTIONS.reduce((sum, section) => sum + section.maxChars, 0);
  assert(sectionMinTotal >= ASTROLOGY_AI_MIN_RESULT_CHARS, `${feature}: 섹션 minChars 합 ${sectionMinTotal} < 전체 하한 ${ASTROLOGY_AI_MIN_RESULT_CHARS}`);
  assert(sectionMaxTotal <= ASTROLOGY_AI_MAX_RESULT_CHARS, `${feature}: 섹션 maxChars 합 ${sectionMaxTotal} > 전체 상한 ${ASTROLOGY_AI_MAX_RESULT_CHARS}`);
}

// ── 4. 숙요 궁합 ──────────────────────────────────────
{
  const feature = "sukuyo";
  const { __sukuyoCompatibilityAiTestUtils } = await import("../worker/routes/sukuyo-compatibility-ai.js");
  const {
    normalizeInput, calculateSukuyo, extractSectionBody,
    SUKUYO_SECTION_SPECS, SUKUYO_COMPATIBILITY_TARGET_MIN_CHARS, SUKUYO_COMPATIBILITY_TARGET_MAX_CHARS,
  } = __sukuyoCompatibilityAiTestUtils;

  const input = normalizeInput({
    consultationType: "compatibility",
    personA: { name: "나", gender: "female", birthDate: "1993-07-21", calendarType: "solar" },
    personB: { name: "상대", gender: "male", birthDate: "1990-03-08", calendarType: "solar" },
    relationshipType: "연인",
    topic: "전체 궁합",
    question: "이 관계를 오래 이어가려면 무엇을 조심해야 할까요?",
  });
  assert(input.ok, `${feature}: 샘플 입력 정규화 실패`);
  calculateSukuyo(input); // 계산 경로가 살아 있는지만 확인(그룹 생성은 계산값을 그대로 받는다)

  const mocks = buildMockOutputs(SUKUYO_SECTION_SPECS.map((spec) => spec.key));
  assertDeliveryContract(feature, mocks);
  assertTruncationRecovery(feature, mocks[1].text);

  // 숙요는 그룹 병렬이라 LLM 응답에서 장 본문을 뽑아내는 지점이 계약의 관문이다.
  // 🔴 절대 던지면 안 된다 — 던지면 결제된 장이 통째로 사라진다.
  for (const mock of mocks) {
    assertNeverThrows(feature, `extractSectionBody("${mock.name}")`, () => {
      const body = extractSectionBody(mock.text);
      assert(typeof body === "string", `${feature}: extractSectionBody가 문자열을 돌려주지 않음`);
      if (mock.deliverable) {
        assert(body.length >= 240, `${feature}: "${mock.name}"에서 렌더 가능한 본문이 버려졌다 (${body.length}자)`);
      } else {
        assert(body.length === 0, `${feature}: "${mock.name}"에서 빈 응답이 본문으로 통과했다 — 조용한 과금`);
      }
    });
  }

  // 장 단위 응답({"body": "..."})도 같은 계약을 지켜야 한다.
  assertNeverThrows(feature, "extractSectionBody(장 단위 JSON)", () => {
    const sectionJson = JSON.stringify({ body: paragraph("한 장짜리 본문.") });
    const body = extractSectionBody(sectionJson);
    assert(body.length >= 240 && !body.includes('"body"'), `${feature}: 장 단위 JSON에서 본문을 뽑지 못했다`);
    const truncated = extractSectionBody(sectionJson.slice(0, Math.floor(sectionJson.length * 0.6)));
    assert(truncated.length >= 240, `${feature}: 잘린 장 응답에서 본문이 사라졌다 — 결제된 장이 빈 화면이 된다`);
  });

  // 문서 전체 예산: 한 요청 안에서 그룹별로 나눠 담긴다.
  checks += 1;
  assert(
    SUKUYO_COMPATIBILITY_TARGET_MAX_CHARS - SUKUYO_COMPATIBILITY_TARGET_MIN_CHARS >= MIN_BUDGET_HEADROOM_CHARS,
    `${feature}: 문서 분량 여유가 부족하다 (상한 ${SUKUYO_COMPATIBILITY_TARGET_MAX_CHARS}, 하한 ${SUKUYO_COMPATIBILITY_TARGET_MIN_CHARS})`,
  );

  // 실제 LLM 호출 단위는 "섹션 그룹"이다. 토큰 예산은 그 단위로 재야 의미가 있다.
  assertBudget(feature, {
    minChars: Math.max(...SUKUYO_SECTION_SPECS.map((spec) => spec.minChars)),
    maxChars: 6000, // SUKUYO_SECTION_BODY_MAX_CHARS
    maxOutputTokens: 12000, // SUKUYO_SECTION_CAP_TOKENS
    tokenConstantName: "SUKUYO_SECTION_CAP_TOKENS",
    sourcePath: "worker/routes/sukuyo-compatibility-ai.js",
  });

  // 숙요 generating 신선도 창이 엣지보다 길면, 잘린 좀비 세션이 그동안 재시도를 202로 막는다.
  // 이 라우트는 동기 생성이라 엣지 컷(100s)을 넘겨 살아남을 수 없으므로 그보다 오래된 generating 은
  // 진행 중일 수 없다. 창을 늘리면 환급까지 끝난 사용자가 그동안 재생성도 못 하는 상태로 갇힌다.
  const sukuyoFreshWindow = read("worker/routes/sukuyo-compatibility-ai.js")
    .match(/const SUKUYO_COMPAT_AI_GENERATING_FRESH_MS = ([^;]+);/);
  checks += 1;
  assert(
    sukuyoFreshWindow && /EDGE_RESPONSE_DEADLINE_MS \+ 20000/.test(sukuyoFreshWindow[1]),
    `${feature}: SUKUYO_COMPAT_AI_GENERATING_FRESH_MS가 엣지 기준 창(EDGE_RESPONSE_DEADLINE_MS + 20000)이 아니다`,
  );
}

// ── 5. 사주 ───────────────────────────────────────────
{
  const feature = "saju";
  const { validateSajuAIResultText } = await import("../worker/routes/fortune.js");
  const mocks = buildMockOutputs(["intro", "structure_core", "evidence_basis", "domain_matrix", "action_plan"]);
  assertDeliveryContract(feature, mocks);

  for (const mock of mocks) {
    assertNeverThrows(feature, `validateSajuAIResultText("${mock.name}")`, () => {
      const result = validateSajuAIResultText(mock.text, null, { domain: "life_direction" });
      assert(typeof result?.ok === "boolean", `${feature}: 검증 결과가 boolean ok를 돌려주지 않음`);
    });
  }
  // 🔴 예전에는 `charsAllowedByTokens(20000) >= 10000` 이었다. 20000 은 하네스에만 있던 숫자라
  // 라우트를 한 줄도 읽지 않았고, 실제 값이 10,000 으로 내려간 뒤에도 계속 초록불이었다.
  // 사주도 이제 그룹을 나눠 병렬 생성하므로 예산 단위는 "상담 전체"가 아니라 "그룹 하나"다.
  const { SAJU_AI_SECTION_GROUPS, SAJU_AI_SECTION_MAX_OUTPUT_TOKENS, SAJU_AI_MIN_RESULT_CHARS } =
    await import("../worker/lib/saju-ai-prompt.js");
  assert(Array.isArray(SAJU_AI_SECTION_GROUPS) && SAJU_AI_SECTION_GROUPS.length > 0, `${feature}: 섹션 그룹 정의가 없다`);
  for (const group of SAJU_AI_SECTION_GROUPS) {
    assertBudget(`${feature}:${group.key}`, {
      minChars: group.minChars,
      maxChars: group.maxChars,
      maxOutputTokens: SAJU_AI_SECTION_MAX_OUTPUT_TOKENS,
      tokenConstantName: "SAJU_AI_SECTION_MAX_OUTPUT_TOKENS",
      sourcePath: "worker/lib/saju-ai-prompt.js",
    });
  }
  // 그룹 합이 배달 하한을 덮는지 — 그룹을 줄이다 하한이 깨지는 회귀를 막는다.
  const sectionMinTotal = SAJU_AI_SECTION_GROUPS.reduce((sum, group) => sum + group.minChars, 0);
  checks += 1;
  assert(
    sectionMinTotal >= SAJU_AI_MIN_RESULT_CHARS,
    `${feature}: 그룹 minChars 합 ${sectionMinTotal} < 배달 하한 ${SAJU_AI_MIN_RESULT_CHARS}`,
  );
  // 웨이브2는 웨이브1보다 짧은 예산에서 도는데도 그룹 하한은 채워야 한다.
  const sajuRouteSource = read("worker/routes/fortune.js");
  const repairTokens = Number((sajuRouteSource.match(/const SAJU_AI_SECTION_REPAIR_MAX_OUTPUT_TOKENS = (\d+);/) || [])[1]);
  const widestMin = Math.max(...SAJU_AI_SECTION_GROUPS.map((group) => group.minChars));
  checks += 1;
  assert(
    Number.isFinite(repairTokens) && charsAllowedByTokens(repairTokens) >= widestMin,
    `${feature}: 웨이브2 토큰 상한(${repairTokens})이 가장 큰 그룹 하한 ${widestMin}자를 못 담는다`,
  );
}

// ── 6. 운명의 지도 심층 리포트 ─────────────────────────
// 9섹션을 두 웨이브로 나눠 동기 생성한다. 섹션 하나가 규칙을 어겨도 결제된 결과를 버리지 않는지,
// 검증기가 던지지 않는지, 섹션 예산이 토큰 상한 안에 들어오는지를 본다.
{
  const feature = "destiny-compass-report";
  const {
    COMPASS_SECTIONS,
    COMPASS_SECTION_MAX_OUTPUT_TOKENS,
    validateCompassSection,
    computeSystemStars,
    splitGroundsLine,
    trimToLastSentence,
    compassFallbackMinChars,
  } = await import("../worker/lib/destiny-compass-report-contract.js");

  const spec = COMPASS_SECTIONS.find((s) => s.key === "saju_reading");
  const badInputs = [
    ["null", null], ["undefined", undefined], ["빈 문자열", ""], ["공백만", "   \n\t "],
    ["숫자", 42], ["객체", {}], ["배열", []],
    ["미계산 계 용어", `${paragraph("다샤가 바뀌는 시기라 나크샤트라가 흔들립니다.")}`],
    ["상투구", `${paragraph("조심하세요. 좋은 일이 생깁니다.")}`],
    ["모델이 만든 별점", `${paragraph("사주 흐름.")} ★★★★☆ 82% 확률`],
  ];
  for (const [name, value] of badInputs) {
    assertNeverThrows(feature, `validateCompassSection("${name}")`, () => {
      const issues = validateCompassSection(value, { spec, allowedLabels: ["오행 분포"], seenSentences: new Set() });
      assert(Array.isArray(issues), `${feature}: 검증 결과가 배열이 아니다 — 호출부가 결과를 잃는다`);
    });
  }

  // 정상 본문은 문제 없이 통과해야 한다(과잉 차단이면 유료 라우트가 상시 교정 루프에 빠진다).
  {
    const good = `${paragraph("오행 분포가 금으로 기울어 있습니다.", 40)}`;
    const issues = validateCompassSection(good, { spec, allowedLabels: ["오행 분포"], seenSentences: new Set() });
    assert(issues.length === 0, `${feature}: 정상 본문이 걸렸다 — ${issues.join(" / ")}`);
  }

  // 근거 줄 분리·잘린 문장 정리도 던지지 않는다.
  for (const [name, value] of [["정상", "본문.\n근거: saju.stage"], ["근거 없음", "본문만."], ["빈값", ""]]) {
    assertNeverThrows(feature, `splitGroundsLine("${name}")`, () => splitGroundsLine(value));
    assertNeverThrows(feature, `trimToLastSentence("${name}")`, () => trimToLastSentence(value));
  }
  assertNeverThrows(feature, "computeSystemStars(빈 팩)", () => computeSystemStars({ systems: [] }));

  // 🔴 폴백을 켠 유료 섹션은 문턱을 함께 줘야 한다(관례: 최소 분량 × 0.4).
  //    없으면 Workers AI 의 짧은 응답이 정상 결제 결과로 나간다.
  const routeSource = read("worker/routes/destiny-compass-ai.js");
  assert(
    routeSource.includes("fallbackMinChars: compassFallbackMinChars(spec)"),
    `${feature}: fallbackToWorkersAI 를 켜고 fallbackMinChars 를 주지 않았다`,
  );
  for (const section of COMPASS_SECTIONS) {
    assert(
      compassFallbackMinChars(section) > 0 && compassFallbackMinChars(section) < section.minChars,
      `${feature}: ${section.key} 의 폴백 문턱이 비정상 (${compassFallbackMinChars(section)})`,
    );
  }

  // 섹션이 죽어도 웨이브가 계속되려면 생성기가 던지지 않아야 한다.
  assert(
    routeSource.includes("절대 던지지 않는다"),
    `${feature}: generateCompassSection 의 무-throw 계약 주석이 사라졌다`,
  );

  // 예산: 가장 긴 섹션 기준.
  const widest = COMPASS_SECTIONS.reduce((a, b) => (b.maxChars > a.maxChars ? b : a));
  assertBudget(feature, {
    minChars: widest.minChars,
    maxChars: widest.maxChars,
    maxOutputTokens: COMPASS_SECTION_MAX_OUTPUT_TOKENS,
    tokenConstantName: "COMPASS_SECTION_MAX_OUTPUT_TOKENS",
    sourcePath: "worker/lib/destiny-compass-report-contract.js",
  });
}

// ── 예산 가드 ─────────────────────────────────────────
function assertBudget(feature, { minChars, maxChars, maxOutputTokens, tokenConstantName, sourcePath }) {
  const lengthHeadroom = maxChars - minChars;
  assert(
    lengthHeadroom >= MIN_BUDGET_HEADROOM_CHARS,
    `${feature}: 분량 여유가 ${lengthHeadroom}자뿐 (요구 ${MIN_BUDGET_HEADROOM_CHARS}자) — 상한 ${maxChars}, 하한 ${minChars}`,
  );

  const headroom = tokenHeadroomChars(maxOutputTokens, maxChars);
  assert(
    headroom >= MIN_BUDGET_HEADROOM_CHARS,
    `${feature}: 토큰 여유가 ${headroom}자뿐 (요구 ${MIN_BUDGET_HEADROOM_CHARS}자). `
    + `${tokenConstantName}를 ${tokensRequiredForChars(maxChars)} 이상으로 올려라 (${sourcePath})`,
  );

  // 하네스에 적은 토큰값이 실제 소스와 어긋나면 가드가 거짓 안심을 준다.
  const source = read(sourcePath);
  assert(
    source.includes(String(maxOutputTokens)),
    `${feature}: ${sourcePath}에서 ${maxOutputTokens} 토큰 설정을 찾지 못했다 — 하네스와 소스가 어긋났다`,
  );
}

// ── 동기 라우트 타임아웃 ──────────────────────────────
// 동기 생성은 엣지가 100초에 요청을 끊는다. LLM 대기가 그보다 길면 라우트가 실패를 판정하기도 전에
// 잘려 나가, 생성 실패 기록도 선차감 접근권 복원도 실행되지 못한다.
for (const [feature, path, timeoutVar] of [
  ["ziwei", "worker/routes/ziwei-ai.js", "ziweiTimeoutMs"],
  ["vedic", "worker/routes/vedic-ai.js", "vedicTimeoutMs"],
  // 숙요 궁합은 그룹 병렬이라 라우트가 기다리는 단위가 "섹션 그룹"이다.
  ["sukuyo", "worker/routes/sukuyo-compatibility-ai.js", "SUKUYO_SECTION_TIMEOUT_MS"],
  ["astrology", "worker/routes/astrology-ai.js", "timeoutMs"],
  ["destiny-compass-report", "worker/routes/destiny-compass-ai.js", "timeoutMs"],
]) {
  const source = read(path);
  // 파일 어딘가에 clamp가 있는지가 아니라, 그 라우트가 실제로 쓰는 타임아웃 변수의 할당을 감싸는지 본다.
  const assignment = new RegExp(`const\\s+${timeoutVar}\\s*=\\s*clampSyncLlmTimeoutMs\\(`);
  assert(
    assignment.test(source),
    `${feature}: ${timeoutVar} 할당이 clampSyncLlmTimeoutMs로 감싸여 있지 않다 — `
    + `엣지 ${SYNC_LLM_TIMEOUT_CEILING_MS}ms 한계를 넘기면 라우트가 실패 처리를 못 한 채 잘린다 (${path})`,
  );
}

// ── 7. 신년운세 · 인생의 책: 섹션/챕터 예산 ─────────────────────────────────
// 이 둘은 오랫동안 이 하네스 밖에 있었다. 예산 셋(분량 여유·토큰 여유·섹션 합계) 중 어느 것도
// 지켜지지 않아도 초록불이었다는 뜻이다.
{
  const feature = "new-year";
  const source = read("worker/routes/new-year-ai.js");
  const { __newYearAiTestUtils } = await import("../worker/routes/new-year-ai.js");
  const sections = __newYearAiTestUtils.NEW_YEAR_AI_SECTIONS;
  assert(Array.isArray(sections) && sections.length > 0, `${feature}: 섹션 정의가 없다`);

  const sectionTokens = Number((source.match(/const NEW_YEAR_AI_SECTION_MAX_OUTPUT_TOKENS = (\d+);/) || [])[1]);
  for (const section of sections) {
    assertBudget(`${feature}:${section.key}`, {
      minChars: section.minChars,
      maxChars: section.maxChars,
      maxOutputTokens: sectionTokens,
      tokenConstantName: "NEW_YEAR_AI_SECTION_MAX_OUTPUT_TOKENS",
      sourcePath: "worker/routes/new-year-ai.js",
    });
  }
  // 섹션 합이 전체 계약을 덮는지 — 섹션을 줄이다 전체 하한이 깨지는 회귀를 막는다.
  const minTotal = Number((source.match(/const NEW_YEAR_AI_MIN_TOTAL_CHARS = (\d+);/) || [])[1]);
  const maxTotal = Number((source.match(/const NEW_YEAR_AI_MAX_TOTAL_CHARS = (\d+);/) || [])[1]);
  const sectionMinTotal = sections.reduce((sum, section) => sum + section.minChars, 0);
  const sectionMaxTotal = sections.reduce((sum, section) => sum + section.maxChars, 0);
  checks += 1;
  assert(sectionMinTotal >= minTotal, `${feature}: 섹션 minChars 합 ${sectionMinTotal} < 전체 하한 ${minTotal}`);
  checks += 1;
  assert(sectionMaxTotal <= maxTotal, `${feature}: 섹션 maxChars 합 ${sectionMaxTotal} > 전체 상한 ${maxTotal}`);

  // 🔴 섹션 하한이 오르면 폴백 문턱(minChars × 0.4)도 함께 오른다. 실측 폴백 분량(~1,700자)을
  //    넘겨 버리면 폴백이 있으나 마나가 된다 — Gemini 장애 때 사용자가 받는 게 결과가 아니라 실패다.
  const widestSectionMin = Math.max(...sections.map((section) => section.minChars));
  checks += 1;
  assert(
    Math.round(widestSectionMin * 0.4) <= 1700,
    `${feature}: 가장 큰 섹션 하한 ${widestSectionMin}자의 폴백 문턱 ${Math.round(widestSectionMin * 0.4)}자가 실측 폴백 분량(~1,700자)을 넘는다`,
  );
}
{
  const feature = "life-book";
  const source = read("worker/routes/life-book-ai.js");
  const num = (name) => Number((source.match(new RegExp(`const ${name} = (\\d+);`)) || [])[1]);
  const chapterCount = num("LIFE_BOOK_EXPECTED_CHAPTER_COUNT");
  const minChapter = num("LIFE_BOOK_MIN_CHAPTER_CONTENT_CHARS");
  const minTotal = num("LIFE_BOOK_MIN_TOTAL_CONTENT_CHARS");
  const maxTotal = num("LIFE_BOOK_MAX_TOTAL_CONTENT_CHARS");
  checks += 1;
  assert(chapterCount > 0 && minChapter > 0, `${feature}: 챕터 계약 상수를 못 읽었다`);
  // 챕터 하한 합이 전체 하한을 덮어야 한다 — 안 그러면 전 챕터가 자기 하한을 채워도 전체가 미달이다.
  checks += 1;
  assert(
    chapterCount * minChapter >= minTotal,
    `${feature}: 챕터 하한 합 ${chapterCount * minChapter} < 전체 하한 ${minTotal}`,
  );
  // 챕터 하나의 토큰 상한이 챕터 상한(전체 상한 ÷ 챕터 수)을 완충까지 담는가.
  const chapterMaxChars = Math.ceil(maxTotal / chapterCount);
  const chapterTokens = Number((source.match(/chapter: Object\.freeze\(\{ minChars: LIFE_BOOK_MIN_CHAPTER_CONTENT_CHARS,[^}]*maxOutputTokens: (\d+)/) || [])[1]);
  checks += 1;
  assert(
    Number.isFinite(chapterTokens) && charsAllowedByTokens(chapterTokens) >= chapterMaxChars,
    `${feature}: 챕터 토큰 상한(${chapterTokens})이 챕터 상한 ${chapterMaxChars}자를 못 담는다`
    + ` — ${tokensRequiredForChars(chapterMaxChars)} 이상으로 올려라`,
  );
}

// ── 8. 단일 호출로 남아 있는 유료 라우트 ────────────────────────────────────
// 이건 아직 섹션 병렬이 아니다. 그래서 요구 하한을 한 호출이 실제로 채울 수 있는 크기
// (모델은 6천자 근처에서 스스로 멈춘다) 위로 올리면 분량이 느는 게 아니라 실패·재시도만 는다.
// 여기서 막는 것은 "섹션화 없이 하한만 올리는 변경"이다 — 섹션화하면 이 단언을 그때 함께 옮긴다.
// 운명 찻집 3종은 2026-08-15 에 섹션 병렬로 옮겨 아래 전용 블록이 대신 지킨다.
const SINGLE_CALL_FLOOR_CEILING = 6000;
for (const [feature, path, constantName] of [
  ["naming-prompt", "worker/routes/naming-prompt.js", "NAMING_MIN_TOTAL_CONTENT_CHARS"],
]) {
  const value = Number((read(path).match(new RegExp(`const ${constantName} = (\\d+);`)) || [])[1]);
  checks += 1;
  assert(
    Number.isFinite(value) && value <= SINGLE_CALL_FLOOR_CEILING,
    `${feature}: ${constantName} = ${value} 는 단일 호출이 채울 수 있는 한계(${SINGLE_CALL_FLOOR_CEILING}자)를 넘는다.`
    + " 분량을 늘리려면 먼저 섹션 병렬로 쪼개라(astrology-ai.js · vedic-ai.js 패턴)",
  );
}

// ── 운명의 찻집: 섹션 병렬 예산 ─────────────────────────────────────────────
// 통짜 한 호출이던 3종(타로·사주·숙요)을 그룹 병렬로 옮기면서 하한이 6천자 천장을 넘었다.
// 여기서 지키는 것은 "그룹 하나가 받는 몫이 여전히 단일 호출로 채울 수 있는가"다 — 그룹을
// 줄이거나 share 를 몰아주면 하한만 높고 채우지 못하는 예전 상태로 조용히 되돌아간다.
{
  const feature = "fortune-tea-house";
  const source = read("worker/routes/fortune-tea-house.js");
  const constant = (name) => Number((source.match(new RegExp(`const ${name} = (\\d+);`)) || [])[1]);

  const modeFloors = {
    saju: constant("SAJU_MIN_RESULT_CHARS"),
    // 5카드는 가산이 붙으므로 가장 큰 하한으로 본다.
    tarot: constant("TAROT_MIN_RESULT_CHARS") + constant("TAROT_FIVE_CARD_EXTRA_CHARS"),
    sukuyo: constant("SUKUYO_MIN_RESULT_CHARS"),
  };
  const shareBlocks = {
    saju: (source.match(/const FORTUNE_TEA_SAJU_GROUPS = Object\.freeze\(\[[\s\S]*?\n\]\);/) || [])[0],
    tarot: (source.match(/\n  tarot: Object\.freeze\(\[[\s\S]*?\n  \]\),/) || [])[0],
    sukuyo: (source.match(/\n  sukuyo: Object\.freeze\(\[[\s\S]*?\n  \]\),/) || [])[0],
  };

  for (const [mode, block] of Object.entries(shareBlocks)) {
    const shares = block ? [...block.matchAll(/share: (0?\.\d+)/g)].map((match) => Number(match[1])) : [];
    const floor = modeFloors[mode];

    checks += 1;
    assert(
      shares.length >= 2 && Number.isFinite(floor) && floor > 0,
      `${feature}:${mode}: 그룹 share 또는 모드 하한을 읽지 못했다 — 레지스트리 형태가 바뀌었으면 이 가드도 함께 옮겨라`,
    );

    checks += 1;
    const total = shares.reduce((sum, share) => sum + share, 0);
    assert(
      Math.abs(total - 1) < 0.001,
      `${feature}:${mode}: share 합계가 ${total} 다 — 1이 아니면 그룹 몫의 합이 상담 하한과 어긋난다`,
    );

    checks += 1;
    const widest = Math.round(Math.max(...shares) * floor);
    assert(
      widest <= SINGLE_CALL_FLOOR_CEILING,
      `${feature}:${mode}: 가장 큰 그룹이 ${widest}자를 요구한다 — 한 호출이 채울 수 있는 한계(${SINGLE_CALL_FLOOR_CEILING}자)를 넘으면`
      + " 분량이 느는 게 아니라 재시도만 는다. 그룹을 더 쪼개라",
    );
  }

  // 카테고리 규칙이 하한을 덮어쓰던 구조(리터럴 12벌)로 되돌아가면 상수만 고쳐도 아무 일이 없다.
  checks += 1;
  assert(
    !/\n    minChars: \d+,/.test(source),
    `${feature}: 카테고리 규칙이 minChars 를 리터럴로 다시 들고 있다 — 상수를 참조해야 한 곳에서 조절된다`,
  );

  // 🔴 clampSyncLlmTimeoutMs 는 0/음수를 받으면 상한 85s 로 되돌아간다.
  checks += 1;
  assert(
    /if \(!\(timeoutMs > 0\)\) return fail\("BUDGET_EXHAUSTED"\);/.test(source),
    `${feature}: 그룹 생성기에 남은 예산 하한 가드가 없다 — clampSyncLlmTimeoutMs(0)은 85s로 되돌아간다`,
  );

  checks += 1;
  assert(
    /timeoutMs: clampSyncLlmTimeoutMs\(timeoutMs\)/.test(source),
    `${feature}: 그룹 호출 타임아웃이 clampSyncLlmTimeoutMs로 깎이지 않는다`,
  );

  checks += 1;
  assert(
    source.includes("group_hard_deadline"),
    `${feature}: 그룹 호출에 하드 데드라인 레이스가 없다 — Workers AI 폴백이 예산을 넘긴다`,
  );

  checks += 1;
  const deadlineMatch = source.match(/const FORTUNE_TEA_LLM_DEADLINE_MS = (\d+);/);
  assert(
    deadlineMatch && Number(deadlineMatch[1]) <= SYNC_LLM_TIMEOUT_CEILING_MS + 5000,
    `${feature}: 총 LLM 예산이 엣지 한계(${SYNC_LLM_TIMEOUT_CEILING_MS}ms) 대비 과하다`,
  );

  // 그룹 생성기는 절대 throw 하지 않아야 한 그룹의 실패가 나머지를 죽이지 않는다.
  checks += 1;
  assert(
    /async function generateFortuneTeaGroup\(env, \{[\s\S]*?\n\}/.test(source)
    && /\} catch \(error\) \{\n    return fail\(/.test(source),
    `${feature}: generateFortuneTeaGroup이 실패를 값으로 돌리지 않는다`,
  );
}

// ── 연애 비책 AI: 섹션 병렬 예산 ────────────────────────────────────────────
// 이 라우트는 단일 호출이 아니라 6개 그룹을 한 요청 안에서 동시에 돌린다. 그래서 위 루프의
// `const <var> = clampSyncLlmTimeoutMs(` 형태가 아니라 그룹 예산 함수를 통해 깎는다.
{
  const feature = "love-secret-ai";
  const source = read("worker/routes/love-secret-ai.js");

  checks += 1;
  assertBudget(feature, {
    minChars: 5000,
    maxChars: 6500,
    maxOutputTokens: 12500,
    tokenConstantName: "LOVE_SECRET_AI_GROUP_MAX_OUTPUT_TOKENS",
    sourcePath: "worker/routes/love-secret-ai.js",
  });

  // 🔴 clampSyncLlmTimeoutMs는 0/음수를 받으면 상한 85s로 되돌아간다. 예산이 바닥났을 때
  //    호출을 건너뛰는 가드가 그 앞에 있어야 한다.
  checks += 1;
  assert(
    /if \(!\(timeoutMs > 0\)\) return fail\("BUDGET_EXHAUSTED"\);/.test(source),
    `${feature}: 그룹 생성기에 남은 예산 하한 가드가 없다 — clampSyncLlmTimeoutMs(0)은 85s로 되돌아간다`,
  );

  checks += 1;
  assert(
    /timeoutMs: clampSyncLlmTimeoutMs\(timeoutMs\)/.test(source),
    `${feature}: 그룹 호출 타임아웃이 clampSyncLlmTimeoutMs로 깎이지 않는다`,
  );

  // Gemini 타임아웃 뒤 Workers AI 폴백은 타임아웃이 없다. 하드 레이스가 사라지면 엣지 컷이 되돌아온다.
  checks += 1;
  assert(
    source.includes("group_hard_deadline"),
    `${feature}: 그룹 호출에 하드 데드라인 레이스가 없다 — Workers AI 폴백이 예산을 넘긴다`,
  );

  checks += 1;
  const deadlineMatch = source.match(/const LOVE_SECRET_AI_LLM_DEADLINE_MS = (\d+);/);
  assert(
    deadlineMatch && Number(deadlineMatch[1]) <= SYNC_LLM_TIMEOUT_CEILING_MS + 5000,
    `${feature}: 총 LLM 예산이 엣지 한계(${SYNC_LLM_TIMEOUT_CEILING_MS}ms) 대비 과하다`,
  );

  // 그룹 생성기는 절대 throw 하지 않아야 한 그룹의 실패가 나머지를 죽이지 않는다.
  checks += 1;
  assert(
    /async function generateLoveSecretGroup\(env, \{[\s\S]*?\n\}/.test(source)
    && /\} catch \(error\) \{[\s\S]*?return fail\("EXCEPTION"\);/.test(source),
    `${feature}: generateLoveSecretGroup이 실패를 값으로 돌리지 않는다`,
  );
}

// ── 셸 내장 상담 5종(worker/routes/fortune.js)의 LLM 예산 ─────────────────────
// 이 파일은 라우트별 타임아웃 변수 대신 요청 시작 기준 총 예산(featureAiCallTimeoutMs)으로 나눠 쓴다.
// 위 루프의 `const <var> = clampSyncLlmTimeoutMs(` 정규식과 형태가 다르므로 별도로 단언한다.
{
  const feature = "fortune-shell-consult";
  const source = read("worker/routes/fortune.js");

  checks += 1;
  assert(
    /function featureAiCallTimeoutMs\(deadlineAt, capMs, fallbackReserveMs = FEATURE_AI_FALLBACK_RESERVE_MS\) \{[\s\S]*?clampSyncLlmTimeoutMs\(/.test(source),
    `${feature}: featureAiCallTimeoutMs가 clampSyncLlmTimeoutMs로 남은 예산을 깎지 않는다 (worker/routes/fortune.js)`,
  );

  // 🔴 clampSyncLlmTimeoutMs는 0/음수를 받으면 상한 85s로 되돌아간다. 그 앞의 하한 가드가 사라지면
  //    예산이 바닥난 순간 오히려 최대치로 기다리게 되어 엣지 컷이 되돌아온다.
  checks += 1;
  assert(
    /if \(budget < FEATURE_AI_MIN_CALL_MS\) return 0;/.test(source),
    `${feature}: 남은 예산 하한 가드가 없다 — clampSyncLlmTimeoutMs(0)은 85s로 되돌아간다`,
  );

  // 고정 타임아웃으로 되돌아가면 예산이 무의미해진다.
  for (const literal of ["timeoutMs: 120000", "timeoutMs: 90000"]) {
    checks += 1;
    assert(
      !source.includes(literal),
      `${feature}: 고정 타임아웃 \`${literal}\`이 되살아났다 — 엣지 100s 예산 밖으로 나간다`,
    );
  }

  // 공용 생성기 호출부가 하나라도 deadlineAt을 빠뜨리면 그 라우트만 조용히 기본 예산으로 떨어져
  // 인증·결제에 쓴 시간이 예산에서 누락된다(컴파일로는 잡히지 않는다).
  // `await`로 시작하는 것만 호출부다(선언부 `async function runFeatureAiConsultation(env, {`는 제외).
  const consultCalls = source.match(/await runFeatureAiConsultation\(env, \{/g) || [];
  const budgetedCalls = source.match(/await runFeatureAiConsultation\(env, \{[\s\S]{0,200}?deadlineAt:/g) || [];
  checks += 1;
  assert(
    consultCalls.length > 0 && consultCalls.length === budgetedCalls.length,
    `${feature}: runFeatureAiConsultation 호출 ${consultCalls.length}건 중 ${budgetedCalls.length}건만 deadlineAt을 넘긴다`,
  );

  // 예산 + 뒤처리(결과 저장·자동 환불) 몫이 엣지 안에 들어와야 실패 처리가 실제로 실행된다.
  const budgetMs = Number((source.match(/const FEATURE_AI_LLM_BUDGET_MS = (\d+);/) || [])[1]);
  const primaryMs = Number((source.match(/const FEATURE_AI_PRIMARY_TIMEOUT_MS = (\d+);/) || [])[1]);
  const reserveMs = Number((source.match(/const FEATURE_AI_FALLBACK_RESERVE_MS = (\d+);/) || [])[1]);
  checks += 1;
  assert(
    Number.isFinite(budgetMs) && budgetMs + 20000 <= EDGE_RESPONSE_DEADLINE_MS,
    `${feature}: FEATURE_AI_LLM_BUDGET_MS(${budgetMs})에 뒤처리 20s를 더하면 엣지 ${EDGE_RESPONSE_DEADLINE_MS}ms를 넘는다`,
  );
  checks += 1;
  assert(
    Number.isFinite(primaryMs) && Number.isFinite(reserveMs) && primaryMs + reserveMs <= budgetMs,
    `${feature}: 1회 생성(${primaryMs}) + Workers AI 폴백 예약(${reserveMs})이 총 예산(${budgetMs})을 넘는다`,
  );

  // 사주 generating 신선도 창이 엣지보다 길면, 잘린 좀비 세션이 그동안 재시도를 202로 막는다.
  const staleWindow = source.match(/const SAJU_AI_PROMPT_STALE_GENERATING_MS = ([^;]+);/);
  checks += 1;
  assert(
    staleWindow && /EDGE_RESPONSE_DEADLINE_MS \+ 20000/.test(staleWindow[1]),
    `${feature}: SAJU_AI_PROMPT_STALE_GENERATING_MS가 엣지 기준 창(EDGE_RESPONSE_DEADLINE_MS + 20000)이 아니다`,
  );

  // 폴백을 켠 유료 라우트는 fallbackMinChars를 함께 줘야 짧은 스텁이 상품 결과로 나가지 않는다(CLAUDE.md).
  //
  // 🔴 예전에는 상수 이름(`fallbackMinChars: FEATURE_AI_FALLBACK_MIN_CHARS`)의 등장 횟수를 셌다.
  // 그러면 사주처럼 그룹별 문턱(minChars × 0.4)을 쓰는 경로가 규칙을 지키는데도 실패하고, 반대로
  // 상수를 주석에만 적어 둬도 통과한다. 이름이 아니라 **호출 하나하나**를 중괄호 균형으로 잘라 연다.
  // 규칙은 하나다 — 폴백을 끄거나, 분량 문턱을 주거나. 둘 다 없는 호출은 없어야 한다.
  const geminiCallSites = [];
  for (const match of source.matchAll(/callGeminiText\(env,/g)) {
    // 옵션 객체는 3번째 인자다. 인자 목록 여는 괄호부터 균형을 세어 그 안의 마지막 { } 블록을 잡는다.
    let depth = 0;
    let argsEnd = -1;
    const argsStart = source.indexOf("(", match.index);
    for (let cursor = argsStart; cursor < source.length; cursor += 1) {
      const char = source[cursor];
      if (char === "(") depth += 1;
      else if (char === ")") {
        depth -= 1;
        if (depth === 0) { argsEnd = cursor; break; }
      }
    }
    if (argsEnd > argsStart) geminiCallSites.push(source.slice(argsStart, argsEnd + 1));
  }
  checks += 1;
  assert(
    geminiCallSites.length >= 3,
    `${feature}: callGeminiText 호출부를 ${geminiCallSites.length}개밖에 못 잘랐다 — 스캐너가 소스와 어긋났다`,
  );
  for (const [index, callSite] of geminiCallSites.entries()) {
    checks += 1;
    assert(
      /fallbackToWorkersAI:\s*false/.test(callSite) || /fallbackMinChars:/.test(callSite),
      `${feature}: callGeminiText 호출 #${index + 1}에 fallbackMinChars도 fallbackToWorkersAI:false도 없다`
      + ` — Workers AI 스텁이 유료 결과로 전달된다`,
    );
  }

  // 결제 증거 재사용이 켜진 뒤로는, 환불된 차감을 걸러 내는 이 검사가 유일한 "무료 재생성" 차단선이다.
  checks += 1;
  assert(
    /kind: "refund",\s*\n\s*"metadata\.refundForPointHistoryId": String\(deducted\._id\)/.test(source),
    `${feature}: findAIPromptPaymentEvidence가 환불된 차감을 결제 증거로 인정한다 — 환불 후 무료 생성이 열린다`,
  );
}

// ── 프론트: 결정적 requestId + 결제 증거 재사용 ────────────────────────────────
// 매 클릭마다 새 requestId를 만들면 워커 consume의 멱등이 무력화돼, 생성 실패 후 재시도가 재결제가 된다.
for (const [feature, path, namespace] of [
  ["astrology", "js/saju-engine.js", "astrology-ai-prompt"],
  ["ziwei", "js/saju-engine.js", "ziwei-ai-prompt"],
  ["sukuyo", "js/saju-engine-tarot-sukuyo-quantum.js", "sukuyo-ai-prompt"],
]) {
  const source = read(path);
  checks += 1;
  assert(
    !new RegExp(`['"]${namespace}:['"]\\s*\\+\\s*(requestNonce|Date\\.now)`).test(source),
    `${feature}: requestId가 비결정적이다 — 생성 실패 후 재시도가 재결제를 부른다 (${path})`,
  );
}
{
  const vedicSource = read("vedic-astrology.html");
  checks += 1;
  assert(
    /function vedicAiCreateRequestId\(chart,question,compatibilityResult,epoch\)/.test(vedicSource)
    && !/'vedic-ai-prompt:'\+Date\.now/.test(vedicSource),
    `vedic: requestId가 비결정적이다 — 생성 실패 후 재시도가 재결제를 부른다 (vedic-astrology.html)`,
  );
  // 워커가 결제 권한 보존을 명시했을 때만 증거를 재사용해야 환불된 결제로 무료 생성이 되지 않는다.
  checks += 1;
  assert(
    /paymentRetainedForRetry===true&&item\.refundOk!==true/.test(vedicSource),
    `vedic: 결제 증거 보관 조건이 paymentRetainedForRetry 기반이 아니다`,
  );
}
{
  const sajuEngineSource = read("js/saju-engine.js");
  checks += 1;
  assert(
    /paymentRetainedForRetry === true && item\.refundOk !== true/.test(sajuEngineSource),
    `_cdAIPromptShouldRetainEvidence: 결제 증거 보관 조건이 paymentRetainedForRetry 기반이 아니다 (js/saju-engine.js)`,
  );
}

// ── LLM 호출부 전수 스캔 ────────────────────────────────────────────────────
// 위 검사들은 "열거된 기능"만 본다. 그래서 pet-saju-ai·ziwei-deep-report·neo-operation-room·
// celestial-harmony·yoga-guru·oracle 여섯 곳이 폴백 게이트 없이 몇 달을 살아 있었다.
// 여기서는 호출부를 이름으로 세지 않고 **괄호 균형으로 옵션 객체를 잘라 내부를 실제로 열어본다**
// (verify-no-nested-retry.mjs 와 같은 방식 — 이름 grep 은 주석·문자열을 오탐한다).

/** from 위치의 여는 괄호부터 짝이 맞는 닫는 괄호까지의 인덱스(포함). 못 찾으면 -1. */
function matchBalanced(source, from, open, close) {
  let depth = 0;
  for (let i = from; i < source.length; i += 1) {
    if (source[i] === open) depth += 1;
    else if (source[i] === close) {
      depth -= 1;
      if (depth === 0) return i;
    }
  }
  return -1;
}

/** callGeminiText(env, …) / callGeminiJsonWithRetry(env, …) 호출의 옵션 객체 리터럴 목록. */
function llmCallOptionLiterals(source) {
  const found = [];
  for (const match of source.matchAll(/callGemini(?:Text|JsonWithRetry)\s*\(\s*env\b/g)) {
    const open = source.indexOf("(", match.index);
    const close = matchBalanced(source, open, "(", ")");
    if (close < 0) continue;
    const args = source.slice(open + 1, close);
    const brace = args.indexOf("{");
    const line = source.slice(0, match.index).split("\n").length;
    // 옵션이 변수(스프레드 포함 객체 등)면 정적으로 판단하지 않는다 — 거짓 실패를 만들지 않는다.
    if (brace < 0) { found.push({ line, options: null }); continue; }
    const end = matchBalanced(args, brace, "{", "}");
    found.push({ line, options: end < 0 ? null : args.slice(brace, end + 1) });
  }
  return found;
}

const LLM_CALL_FILES = [
  "worker/routes/admin.js", "worker/routes/animal-totem.js", "worker/routes/astrology-ai.js",
  "worker/routes/celestial-harmony.js", "worker/routes/destiny-compass-ai.js", "worker/routes/destiny-compass.js",
  "worker/routes/dream.js", "worker/routes/fortune-tea-house.js", "worker/routes/fortune.js",
  "worker/routes/karma-destiny-ai.js", "worker/routes/life-book-ai.js", "worker/routes/love-secret-ai.js",
  "worker/routes/master-love-codex.js", "worker/routes/nakshatra-ai.js", "worker/routes/naming-prompt.js",
  "worker/routes/neo-operation-room.js", "worker/routes/new-year-ai.js", "worker/routes/oracle.js",
  "worker/routes/pet-saju-ai.js", "worker/routes/sukuyo-compatibility-ai.js", "worker/routes/vedic-ai.js",
  "worker/routes/yoga-guru.js", "worker/routes/ziwei-ai.js", "worker/routes/ziwei-deep-report.js",
  "worker/routes/ziwei-island-ai.js", "worker/lib/fusion-fortune.js", "worker/lib/palm-vision.js",
];

// 죽은 옵션: callGeminiText/callGeminiJsonWithRetry 가 읽지 않는 키. 지정하면 "설정했다"는
// 착각만 남고 동작은 기본값 그대로다(실제로 yoga-guru·oracle 의 topP 는 적용된 적이 없다).
const DEAD_LLM_OPTION_KEYS = ["topP", "modelEnvKeys", "maxAttemptsPerPair", "totalTimeoutMs"];

// 이 파일들의 LLM 호출은 결과가 그대로 사용자에게 배달되므로 폴백 게이트가 반드시 있어야 한다.
// (fallbackToWorkersAI: false 로 폴백 자체를 끈 호출은 예외 — 짧은 폴백이 애초에 생기지 않는다.)
const GATE_REQUIRED_FILES = [
  "worker/routes/pet-saju-ai.js",
  "worker/routes/ziwei-deep-report.js",
  "worker/routes/neo-operation-room.js",
  "worker/routes/celestial-harmony.js",
  "worker/routes/yoga-guru.js",
  "worker/routes/oracle.js",
];

// 게이트를 두지 않는 것이 옳은 곳. 사유 없이 등재하지 말 것 — 사유가 곧 다음 사람의 판단 근거다.
// 각 항목은 "그 사유가 코드에 아직 살아 있는지"를 앵커 문자열로 확인한다. 사유가 사라지면
// 면제도 사라져야 하므로 여기서 실패한다.
const GATE_EXEMPT = [
  [
    "worker/routes/dream.js",
    "evaluatePsychoMarkdownQuality",
    "정신분석 해몽은 5장 구조·450자 하한을 라우트가 직접 검사한다 — 게이트를 겹쳐 걸지 않는다",
  ],
  [
    "worker/routes/master-love-codex.js",
    "짧은 장이",
    "짧은 장이 사과문보다 낫다는 의도적 결정(라우트 주석). 정책 재검토 전에는 게이트를 넣지 않는다",
  ],
];

const llmCallSiteCounts = new Map();
for (const path of LLM_CALL_FILES) {
  const source = read(path);
  const calls = llmCallOptionLiterals(source);
  llmCallSiteCounts.set(path, calls.length);

  for (const call of calls) {
    if (!call.options) continue;
    for (const key of DEAD_LLM_OPTION_KEYS) {
      checks += 1;
      assert(
        !new RegExp(`(^|[{,\\s])${key}\\s*:`).test(call.options),
        `${path}:${call.line}: 죽은 옵션 \`${key}\` — callGeminiText 가 읽지 않는다. `
        + "모델 오버라이드는 `model`, 타임아웃은 `timeoutMs` 를 쓴다",
      );
    }
    if (!GATE_REQUIRED_FILES.includes(path)) continue;
    checks += 1;
    assert(
      /fallbackMinChars\s*:/.test(call.options) || /fallbackToWorkersAI\s*:\s*false/.test(call.options),
      `${path}:${call.line}: 폴백이 켜져 있는데 fallbackMinChars 가 없다 — `
      + "짧은 Workers AI 응답이 정상 결과로 사용자에게 전달된다(관례: 그 기능 최소 분량 × 0.4)",
    );
  }
}

for (const [path, anchor, reason] of GATE_EXEMPT) {
  checks += 1;
  assert(
    read(path).includes(anchor),
    `${path}: 게이트 면제 근거("${anchor}")가 사라졌다 — ${reason}`,
  );
}

// 새 LLM 호출부 트립와이어. 호출이 늘거나 줄면 실패한다 — 새로 추가한 호출이 게이트가 필요한지
// 사람이 한 번 판단하고 이 표를 갱신하게 만드는 것이 목적이다(줄 번호가 아니라 개수라 잘 안 깨진다).
const EXPECTED_LLM_CALL_SITES = {
  "worker/routes/admin.js": 1, "worker/routes/animal-totem.js": 1, "worker/routes/astrology-ai.js": 4,
  "worker/routes/celestial-harmony.js": 1, "worker/routes/destiny-compass-ai.js": 1, "worker/routes/destiny-compass.js": 1,
  // fortune.js 3건: 사주 그룹 생성(웨이브1·2가 같은 호출부를 공유) + 형제 4종 공용 풀 생성 + 그 이어쓰기 repair.
  // 사주의 전용 이어쓰기 repair 호출은 그룹 재생성으로 대체되며 사라졌다(4 → 3).
  "worker/routes/dream.js": 0, "worker/routes/fortune-tea-house.js": 2, "worker/routes/fortune.js": 3,
  "worker/routes/karma-destiny-ai.js": 5, "worker/routes/life-book-ai.js": 1, "worker/routes/love-secret-ai.js": 2,
  "worker/routes/master-love-codex.js": 2, "worker/routes/nakshatra-ai.js": 1, "worker/routes/naming-prompt.js": 1,
  "worker/routes/neo-operation-room.js": 1, "worker/routes/new-year-ai.js": 2, "worker/routes/oracle.js": 1,
  // vedic 1건: 그룹 생성 하나로 웨이브 1(전 그룹 동시)·2(분량 미달)·3(품질 미달)이 모두 지나간다.
  // 구 2건은 단일 호출 상담(callConsultationLlm)의 JSON/프로즈 두 갈래였고, 그룹 전환으로 사라졌다
  // — 이 라우트에는 후속 질문 경로가 없어 프로즈 갈래는 호출자가 0이었다.
  "worker/routes/pet-saju-ai.js": 1, "worker/routes/sukuyo-compatibility-ai.js": 4, "worker/routes/vedic-ai.js": 1,
  "worker/routes/yoga-guru.js": 1, "worker/routes/ziwei-ai.js": 3, "worker/routes/ziwei-deep-report.js": 1,
  "worker/routes/ziwei-island-ai.js": 1, "worker/lib/fusion-fortune.js": 1, "worker/lib/palm-vision.js": 2,
};
for (const [path, expected] of Object.entries(EXPECTED_LLM_CALL_SITES)) {
  const actual = llmCallSiteCounts.get(path) ?? 0;
  checks += 1;
  assert(
    actual === expected,
    `${path}: LLM 호출부가 ${expected}건 → ${actual}건으로 바뀌었다. `
    + "새 호출이면 fallbackMinChars 필요 여부를 판단한 뒤 EXPECTED_LLM_CALL_SITES 를 갱신하라",
  );
}

console.log(`${LABEL} ok (${checks} checks)`);
