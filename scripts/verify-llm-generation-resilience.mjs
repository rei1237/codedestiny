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
import { SYNC_LLM_TIMEOUT_CEILING_MS } from "../worker/lib/sync-llm-timeout.js";

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
  assertBudget(feature, {
    minChars: 10000,
    maxChars: 20000,
    maxOutputTokens: 33000,
    tokenConstantName: "INITIAL_MAX_OUTPUT_TOKENS",
    sourcePath: "worker/routes/vedic-ai.js",
  });
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
  assertBudget(feature, {
    minChars: ASTROLOGY_AI_MIN_RESULT_CHARS,
    maxChars: ASTROLOGY_AI_MAX_RESULT_CHARS,
    maxOutputTokens: 33000,
    tokenConstantName: "ASTROLOGY_AI_MAX_OUTPUT_TOKENS",
    sourcePath: "worker/routes/astrology-ai.js",
  });
}

// ── 4. 숙요 궁합 ──────────────────────────────────────
{
  const feature = "sukuyo";
  const { __sukuyoCompatibilityAiTestUtils } = await import("../worker/routes/sukuyo-compatibility-ai.js");
  const {
    normalizeInput, calculateSukuyo, normalizeStructuredSukuyoCompatibilityText,
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
  const calculation = calculateSukuyo(input);

  const mocks = buildMockOutputs(SUKUYO_SECTION_SPECS.map((spec) => spec.key));
  assertDeliveryContract(feature, mocks);
  assertTruncationRecovery(feature, mocks[1].text);

  // 숙요만 정규화가 실패 시 throw한다(호출부가 hasRenderableLlmText로 받아 degrade한다).
  // 여기서는 "던지더라도 그 입력이 전달 가능하면 호출부 폴백이 살아 있는지"를 함께 본다.
  for (const mock of mocks) {
    let threw = false;
    try {
      normalizeStructuredSukuyoCompatibilityText(mock.text, input, calculation);
    } catch {
      threw = true;
    }
    checks += 1;
    if (threw && mock.deliverable) {
      const route = read("worker/routes/sukuyo-compatibility-ai.js");
      assert(
        route.includes("hasRenderableLlmText(rawContent, { minChars: 400 })"),
        `${feature}: "${mock.name}"에서 정규화가 던지는데 호출부 degrade 폴백이 없다`,
      );
    }
  }
  assertBudget(feature, {
    minChars: SUKUYO_COMPATIBILITY_TARGET_MIN_CHARS,
    maxChars: SUKUYO_COMPATIBILITY_TARGET_MAX_CHARS,
    maxOutputTokens: 32000,
    tokenConstantName: "SUKUYO_COMPAT_AI_MAX_OUTPUT_TOKENS",
    sourcePath: "worker/routes/sukuyo-compatibility-ai.js",
  });
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
  // 사주는 자유 텍스트라 요구 상한이 없다. 토큰 예산만 최소 분량 기준으로 확인한다.
  checks += 1;
  assert(charsAllowedByTokens(20000) >= 10000, `${feature}: 토큰 상한이 상담 최소 분량도 못 담는다`);
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
  ["sukuyo", "worker/routes/sukuyo-compatibility-ai.js", "compatibilityTimeoutMs"],
  ["astrology", "worker/routes/astrology-ai.js", "timeoutMs"],
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

console.log(`${LABEL} ok (${checks} checks)`);
