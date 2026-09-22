// 이용권 원가 계획의 Workers AI 공급자 시도당 입력 상한 정본.
// 실제 토큰 수를 생성 전에 돌려주는 API가 없으므로 환경값으로 올릴 수 없는 보수적 상한을 쓴다.
export const WORKERS_AI_INPUT_TOKEN_HARD_LIMIT = 50_000;

// 채팅 역할·구분자 등 모델 내부 템플릿은 content 바이트 수에 나타나지 않는다.
// 현재 입력은 system/user 최대 2개지만 모델별 포맷 차이를 흡수하도록 512토큰을 예약한다.
export const WORKERS_AI_CHAT_TEMPLATE_TOKEN_RESERVE = 512;
export const WORKERS_AI_DEFAULT_OUTPUT_TOKEN_RESERVE = 4_096;

// Cloudflare 공식 모델 페이지의 컨텍스트 창. 알 수 없는 env 오버라이드는 공통 50k 비용 상한만 적용한다.
const WORKERS_AI_CONTEXT_WINDOWS = Object.freeze({
  "@cf/zai-org/glm-4.7-flash": 131_072,
  "@cf/meta/llama-3.3-70b-instruct-fp8-fast": 24_000,
});

function inputLimitError(message, details = {}) {
  const error = new Error(message);
  error.code = "WORKERS_AI_INPUT_TOKEN_LIMIT_EXCEEDED";
  Object.assign(error, details);
  return error;
}

function utf8ByteLength(value) {
  const text = String(value || "");
  if (typeof TextEncoder === "function") return new TextEncoder().encode(text).byteLength;
  if (typeof Buffer !== "undefined") return Buffer.byteLength(text, "utf8");
  throw inputLimitError("Workers AI input token upper bound is unavailable.");
}

/**
 * BPE 토큰은 비어 있지 않은 바이트 조각이므로 UTF-8 바이트 수는 실제 content 토큰 수의 상계다.
 * 여기에 채팅 템플릿 예약분을 더해 정확한 tokenizer 없이도 과소 집계하지 않는다.
 */
export function workersAiInputTokenUpperBound(messages = []) {
  const contentBytes = (Array.isArray(messages) ? messages : []).reduce(
    (total, message) => total + utf8ByteLength(message?.content),
    0,
  );
  return contentBytes + WORKERS_AI_CHAT_TEMPLATE_TOKEN_RESERVE;
}

export function workersAiInputTokenLimitForModel(model, maxOutputTokens) {
  const contextWindow = WORKERS_AI_CONTEXT_WINDOWS[String(model || "").trim()];
  if (!contextWindow) return WORKERS_AI_INPUT_TOKEN_HARD_LIMIT;
  const outputReserve = Number.isFinite(Number(maxOutputTokens)) && Number(maxOutputTokens) > 0
    ? Math.floor(Number(maxOutputTokens))
    : WORKERS_AI_DEFAULT_OUTPUT_TOKEN_RESERVE;
  return Math.min(
    WORKERS_AI_INPUT_TOKEN_HARD_LIMIT,
    Math.max(0, contextWindow - outputReserve - WORKERS_AI_CHAT_TEMPLATE_TOKEN_RESERVE),
  );
}

/**
 * @param {{
 *   model?: string,
 *   messages?: Array<{ role?: string, content?: unknown }>,
 *   maxOutputTokens?: number,
 * }} [options]
 */
export function assertWorkersAiInputTokenLimit({ model = "", messages = [], maxOutputTokens } = {}) {
  const inputTokenUpperBound = workersAiInputTokenUpperBound(messages);
  const inputTokenLimit = workersAiInputTokenLimitForModel(model, maxOutputTokens);
  if (inputTokenUpperBound > inputTokenLimit) {
    throw inputLimitError(
      `Workers AI input token limit exceeded for ${String(model || "unknown model")} (${inputTokenUpperBound} > ${inputTokenLimit}).`,
      { model, inputTokenUpperBound, inputTokenLimit },
    );
  }
  return inputTokenUpperBound;
}
