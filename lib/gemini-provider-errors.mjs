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
