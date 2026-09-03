import { buildGuardianFortunePrompt } from "./guardian-fortune-prompt.js";
import {
  buildFallbackGuardianFortuneResult,
  parseGuardianFortuneLLMResponse,
  validateAndNormalizeGuardianFortuneResult,
} from "./guardian-fortune-result.js";

const MOCK_SCENARIOS = Object.freeze([
  "normal",
  "yeoni",
  "neo",
  "love",
  "money_work",
  "decision",
  "markdown_json",
  "prefixed_json",
  "trailing_comma",
  "missing_fields",
  "too_short",
  "too_long",
  "forbidden_content",
  "invalid_json",
  "failure",
]);

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function applyMockScenario(result, scenario) {
  const next = clone(result);
  if (scenario === "missing_fields") {
    delete next.topicAdvice;
    delete next.cautionPattern;
    delete next.premiumCta;
  }
  if (scenario === "too_short") {
    next.innerState = "조금 천천히 확인해보세요.";
    next.coreReading = "오늘은 순서를 정리하는 날이에요.";
    next.topicAdvice = "작게 확인하세요.";
    next.cautionPattern = "성급한 결론.";
    next.luckyAction = "한 가지를 적어보세요.";
  }
  if (scenario === "too_long") {
    // 🔴 sanitizeGuardianFortuneResult 가 필드마다 1,200자로 자르므로 한 필드에 몰아 넣으면
    // 아무리 늘려도 상한을 넘지 못한다. 상한(3,600자)을 확실히 넘기려면 필드를 나눠야 한다.
    const repeated = " 이 흐름은 한 번에 결론을 내리기보다 오늘 확인 가능한 작은 장면을 통해 다음 순서를 정리할 때 더 안정적으로 읽힙니다.";
    for (const field of ["coreReading", "topicAdvice", "innerState", "cautionPattern", "luckyAction"]) {
      next[field] += repeated.repeat(10);
    }
  }
  if (scenario === "forbidden_content") {
    next.coreReading = "무조건 투자하면 오른다. 반드시 지금 결제해야만 해결된다.";
  }
  return next;
}

/**
 * Local-only fake provider. It intentionally has no fetch/provider import so
 * Stage 7 can exercise the full contract without a billable side effect.
 */
export async function mockGuardianFortuneLLM({ input = {}, context = {}, scenario = "normal" } = {}) {
  if (scenario === "failure") {
    const error = new Error("mock provider failure");
    error.code = "MOCK_LLM_FAILURE";
    throw error;
  }
  if (scenario === "invalid_json") return "결과를 만들지 못했습니다.";

  const base = buildFallbackGuardianFortuneResult({ input, context, reason: "mock" });
  const effectiveScenario = scenario === "yeoni" || scenario === "neo" ? "normal" : scenario;
  const result = applyMockScenario(base, effectiveScenario);
  const serialized = JSON.stringify(result);
  if (scenario === "markdown_json") return `\n\`\`\`json\n${serialized}\n\`\`\``;
  if (scenario === "prefixed_json") return `아래는 mock 결과입니다.\n${serialized}\n읽어주셔서 고마워요.`;
  if (scenario === "trailing_comma") return serialized.replace(/}(\s*)$/, ",}$1");
  return serialized;
}

export async function generateGuardianFortuneWithMockLLM({ input = {}, context = {}, scenario = "normal" } = {}) {
  const prompt = buildGuardianFortunePrompt({ input, context });
  let rawResponse;
  try {
    rawResponse = await mockGuardianFortuneLLM({ input, context, scenario });
  } catch {
    return {
      result: buildFallbackGuardianFortuneResult({ input, context, reason: "mock_provider_failure" }),
      prompt,
      usedFallback: true,
      errorCode: "MOCK_LLM_FAILURE",
    };
  }

  const parsed = parseGuardianFortuneLLMResponse(rawResponse);
  if (!parsed.ok) {
    return {
      result: buildFallbackGuardianFortuneResult({ input, context, reason: parsed.errorCode }),
      prompt,
      usedFallback: true,
      errorCode: parsed.errorCode,
    };
  }

  const validated = validateAndNormalizeGuardianFortuneResult({ parsed: parsed.value, input, context });
  if (!validated.ok) {
    return {
      result: buildFallbackGuardianFortuneResult({ input, context, reason: validated.errorCode }),
      prompt,
      usedFallback: true,
      errorCode: validated.errorCode,
      issues: validated.issues,
    };
  }

  return {
    result: validated.value,
    prompt,
    usedFallback: false,
    issues: validated.issues,
  };
}

export { MOCK_SCENARIOS };
