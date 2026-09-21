const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta";

// 이용권 원가 계획의 공급자 시도당 입력 상한 정본. 환경값으로 올릴 수 없게 고정한다.
export const GEMINI_INPUT_TOKEN_HARD_LIMIT = 50_000;
export const GEMINI_INPUT_TOKEN_COUNT_TIMEOUT_MS = 5_000;

function inputLimitError(code, message, details = {}) {
  const error = new Error(message);
  error.code = code;
  Object.assign(error, details);
  return error;
}

export function isGeminiInputTokenLimitError(error) {
  return /^LLM_INPUT_TOKEN_(?:COUNT_UNAVAILABLE|LIMIT_EXCEEDED)$/.test(String(error?.code || ""));
}

/**
 * Gemini의 비과금 countTokens 응답으로 실제 생성 전 입력 상한을 검증한다.
 * 계산 실패를 휴리스틱으로 통과시키면 원가 상한이 다시 추정치가 되므로 fail-closed다.
 */
export async function assertGeminiInputTokenLimit({
  apiKey = "",
  model = "",
  generateContentRequest = {},
  fetchImpl = globalThis.fetch,
  limit = GEMINI_INPUT_TOKEN_HARD_LIMIT,
  timeoutMs = GEMINI_INPUT_TOKEN_COUNT_TIMEOUT_MS,
} = {}) {
  const cleanKey = String(apiKey || "").trim();
  const cleanModel = String(model || "").trim().replace(/^models\//, "");
  if (!cleanKey || !cleanModel || typeof fetchImpl !== "function") {
    throw inputLimitError(
      "LLM_INPUT_TOKEN_COUNT_UNAVAILABLE",
      "Gemini input token count configuration is unavailable.",
    );
  }

  const controller = typeof AbortController === "function" ? new AbortController() : null;
  const boundedTimeoutMs = Math.max(1, Math.min(
    GEMINI_INPUT_TOKEN_COUNT_TIMEOUT_MS,
    Number(timeoutMs) || GEMINI_INPUT_TOKEN_COUNT_TIMEOUT_MS,
  ));
  const timeoutId = controller ? setTimeout(() => controller.abort(), boundedTimeoutMs) : null;

  try {
    const endpoint = new URL(`${GEMINI_API_BASE}/models/${encodeURIComponent(cleanModel)}:countTokens`);
    endpoint.searchParams.set("key", cleanKey);
    const response = await fetchImpl(endpoint.toString(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        generateContentRequest: {
          ...(generateContentRequest && typeof generateContentRequest === "object" ? generateContentRequest : {}),
          model: `models/${cleanModel}`,
        },
      }),
      signal: controller ? controller.signal : undefined,
    });
    const payload = await response.json().catch(() => ({}));
    const totalTokens = Number(payload?.totalTokens);
    if (!response.ok || !Number.isFinite(totalTokens) || totalTokens <= 0) {
      throw inputLimitError(
        "LLM_INPUT_TOKEN_COUNT_UNAVAILABLE",
        `Gemini input token count failed (${Number(response.status) || 0}).`,
        { status: Number(response.status) || 0 },
      );
    }
    if (totalTokens > limit) {
      throw inputLimitError(
        "LLM_INPUT_TOKEN_LIMIT_EXCEEDED",
        `Gemini input token limit exceeded (${totalTokens} > ${limit}).`,
        { inputTokens: totalTokens, inputTokenLimit: limit },
      );
    }
    return totalTokens;
  } catch (error) {
    if (isGeminiInputTokenLimitError(error)) throw error;
    const timedOut = controller?.signal?.aborted === true;
    throw inputLimitError(
      "LLM_INPUT_TOKEN_COUNT_UNAVAILABLE",
      timedOut
        ? `Gemini input token count timed out after ${boundedTimeoutMs}ms.`
        : "Gemini input token count request failed.",
    );
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}
