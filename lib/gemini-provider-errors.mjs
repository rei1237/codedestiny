// Gemini HTTP 오류 중 "재시도해도 계정 조치 전까지 계속 거절되는" 장애를 구분하는 정본.
// 2026-10-17 사고: 월 지출 한도 429가 일반 rate limit 429와 같은 일시 오류로 처리돼
// 영냥이 장 6회가 모두 같은 거절을 받았고, 운영자 알림에도 원인이 남지 않았다.
// llm-client.ts 는 Jest 에서 목으로 대체되므로(jest.config.cjs) 판정은 이 순수 모듈에 둔다.

export const GEMINI_OUTAGE_CODES = Object.freeze(["GEMINI_SPEND_CAP", "GEMINI_BILLING_DISABLED"]);

/** 상태코드와 공급자 메시지로 오류 코드를 붙인다. 해당 없으면 빈 문자열. */
export function classifyGeminiHttpError(status, message = "") {
  const code = Number(status) || 0;
  const text = String(message || "");
  if (code === 429 && /spend(?:ing)?\s+cap/i.test(text)) return "GEMINI_SPEND_CAP";
  if (code === 403 && /billing/i.test(text)) return "GEMINI_BILLING_DISABLED";
  // 분당 rate limit 은 기존대로 일시 오류다. 코드만 붙여 로그에서 구분한다.
  if (code === 429) return "GEMINI_RATE_LIMITED";
  return "";
}

/** 계정 조치가 필요한 장애 코드면 그 코드를, 아니면 빈 문자열을 돌려준다. */
export function geminiOutageCode(error) {
  for (const value of [error?.providerCode, error?.code]) {
    const code = String(value || "");
    if (GEMINI_OUTAGE_CODES.includes(code)) return code;
  }
  return "";
}

// 🔴 Gemini 가 생성을 시작하지 않아 과금하지 않은 실패 — 유료 시도를 돌려줄 근거다(상한은 호출부가 둔다).
//    토큰 계수 장애·429·5xx, 은퇴 모델(404), 그리고 countTokens 의 지역 거절(400 FAILED_PRECONDITION).
//    2026-10-30: 운영 워커가 홍콩(Gemini 미지원 지역)에 배치돼 countTokens 가 지역 거절을 냈고,
//    네오 작전실은 생성 한 번 없이 챕터 시도를 다 쓰고 결제를 자동 환불했다.
//    시간 초과는 넣지 않는다. 기다리기를 멈췄을 뿐 공급자는 이미 생성해 과금했을 수 있다.
const UNBILLED_RETRYABLE_CODES = new Set(["LLM_INPUT_TOKEN_COUNT_UNAVAILABLE", "GEMINI_RATE_LIMITED", "GEMINI_UNAVAILABLE"]);
export function isUnbilledGeminiFailure(response) {
  if (response?.providerCode === "GEMINI_MODEL_UNAVAILABLE") return true;
  if (response?.error === "LLM_INPUT_TOKEN_COUNT_UNAVAILABLE" && response?.providerCode === "GEMINI_PRECONDITION_FAILED") return true;
  return response?.retryable !== false && [response?.error, response?.providerCode].some(code => UNBILLED_RETRYABLE_CODES.has(code));
}

// Provider errors can echo the prompt or credentials. Persist only known labels;
// never copy their free-form message, URL, details metadata or request body.
const PROVIDER_STATUSES = new Set(["INVALID_ARGUMENT", "FAILED_PRECONDITION", "PERMISSION_DENIED", "UNAUTHENTICATED", "RESOURCE_EXHAUSTED", "NOT_FOUND", "DEADLINE_EXCEEDED", "INTERNAL", "UNAVAILABLE", "UNKNOWN"]);
const PROVIDER_REASONS = new Set(["API_KEY_INVALID", "API_KEY_SERVICE_BLOCKED", "API_KEY_HTTP_REFERRER_BLOCKED", "API_KEY_IP_ADDRESS_BLOCKED", "API_KEY_ANDROID_APP_BLOCKED", "API_KEY_IOS_APP_BLOCKED", "SERVICE_DISABLED", "BILLING_DISABLED", "RATE_LIMIT_EXCEEDED", "RESOURCE_EXHAUSTED"]);
const PROVIDER_CODES = new Set([...GEMINI_OUTAGE_CODES, "GEMINI_RATE_LIMITED", "GEMINI_API_KEY_INVALID", "GEMINI_INVALID_REQUEST", "GEMINI_PRECONDITION_FAILED", "GEMINI_ACCESS_DENIED", "GEMINI_MODEL_UNAVAILABLE", "GEMINI_UNAVAILABLE", "GEMINI_CONFIGURATION_UNAVAILABLE"]);

export function safeGeminiFailure(error = {}, payload = {}) {
  const raw = payload?.error || {};
  const number = Number(error?.status || raw.code || 0);
  const status = number >= 400 && number <= 599 ? number : null;
  const providerStatus = [error?.providerStatus, raw.status].find(value => PROVIDER_STATUSES.has(value)) || "";
  const providerReason = [error?.providerReason, ...(Array.isArray(raw.details) ? raw.details.map(row => row?.reason) : [])]
    .find(value => PROVIDER_REASONS.has(value)) || "";
  let providerCode = [error?.providerCode, error?.code].find(value => PROVIDER_CODES.has(value))
    || classifyGeminiHttpError(status, raw.message || error?.message) || "";
  if (!providerCode && providerReason === "API_KEY_INVALID") providerCode = "GEMINI_API_KEY_INVALID";
  if (!providerCode && (providerReason === "BILLING_DISABLED" || providerStatus === "FAILED_PRECONDITION")) providerCode = "GEMINI_PRECONDITION_FAILED";
  if (!providerCode && status === 400) providerCode = "GEMINI_INVALID_REQUEST";
  if (!providerCode && [401, 403].includes(status)) providerCode = "GEMINI_ACCESS_DENIED";
  if (!providerCode && status === 404) providerCode = "GEMINI_MODEL_UNAVAILABLE";
  if (!providerCode && status >= 500) providerCode = "GEMINI_UNAVAILABLE";
  const terminal = [400, 401, 403, 404].includes(status) || GEMINI_OUTAGE_CODES.includes(providerCode)
    || providerCode === "GEMINI_CONFIGURATION_UNAVAILABLE" || error?.code === "LLM_INPUT_TOKEN_LIMIT_EXCEEDED";
  return {
    status,
    ...(["WORKERS_AI_INPUT_TOKEN_LIMIT_EXCEEDED", "WORKERS_AI_UNAVAILABLE", "LLM_GENERATION_TIMEOUT", "LLM_ATTEMPT_LIMIT"].includes(error?.fallbackCode) ? { fallbackCode: error.fallbackCode } : {}),
    ...(providerCode ? { providerCode } : {}),
    ...(providerStatus ? { providerStatus } : {}),
    ...(providerReason ? { providerReason } : {}),
    retryable: terminal ? false : error?.retryable !== false,
    message: `${providerCode || "GEMINI_REQUEST_FAILED"}${status ? ` (${status})` : ""}.`,
  };
}
