// Workers AI 공급자 시도당 입력 원가 상한. 환경값으로 올릴 수 없게 고정한다.
export const WORKERS_AI_INPUT_TOKEN_HARD_LIMIT = 50_000;

// Cloudflare는 모델 공통 countTokens API를 제공하지 않는다. UTF-8 토큰은 적어도 1바이트를
// 소비하므로 직렬화된 메시지 바이트 수는 토큰 수의 보수적 상한이다. 모델의 채팅 템플릿이
// 덧붙이는 특수 토큰도 과소평가하지 않도록 고정 여유를 더한다.
export const WORKERS_AI_CHAT_TEMPLATE_TOKEN_RESERVE = 1_024;

function inputLimitError(message, details = {}) {
  const error = new Error(message);
  error.code = "LLM_INPUT_TOKEN_LIMIT_EXCEEDED";
  Object.assign(error, details);
  return error;
}

export function workersAiInputTokenUpperBound(messages = []) {
  const serialized = JSON.stringify(Array.isArray(messages) ? messages : []);
  return new TextEncoder().encode(serialized).byteLength + WORKERS_AI_CHAT_TEMPLATE_TOKEN_RESERVE;
}

export function assertWorkersAiInputTokenLimit(
  messages,
  limit = WORKERS_AI_INPUT_TOKEN_HARD_LIMIT,
) {
  const inputTokensUpperBound = workersAiInputTokenUpperBound(messages);
  if (inputTokensUpperBound > limit) {
    throw inputLimitError(
      `Workers AI input token limit exceeded (${inputTokensUpperBound} > ${limit}).`,
      { inputTokensUpperBound, inputTokenLimit: limit },
    );
  }
  return inputTokensUpperBound;
}
