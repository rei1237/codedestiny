// 유료 LLM 상담의 "생성이 실패하지 않으려면 예산이 얼마나 남아 있어야 하는가"를 한곳에 모은다.
//
// 각 라우트는 (1) 요구 분량(MIN~MAX자) (2) maxOutputTokens (3) LLM 타임아웃 세 가지를 따로 들고 있는데,
// 셋이 서로 어긋나면 결과가 잘리거나 엣지에 끊겨 결제까지 마친 사용자가 아무것도 못 받는다.
// 여기 상수와 계산식을 verify-llm-generation-resilience 하네스가 그대로 읽어 단언한다.

/**
 * 한국어 1자가 소비하는 토큰 수의 보수적 상한.
 * 실제로는 1~1.5 사이에서 문장마다 달라지므로, 예산 계산은 늘 최악값으로 잡는다.
 */
export const TOKENS_PER_KOREAN_CHAR = 1.5;

/**
 * 요구 분량 상한을 채우고도 남아 있어야 하는 글자수.
 * 토크나이저 비율 오차와 JSON 키·제목 같은 본문 외 출력을 흡수하는 완충이다.
 */
export const MIN_BUDGET_HEADROOM_CHARS = 1500;

/**
 * 주어진 토큰 상한이 실제로 몇 글자를 담을 수 있는지.
 * @param {number} maxOutputTokens
 * @returns {number}
 */
export function charsAllowedByTokens(maxOutputTokens) {
  return Math.floor((Number(maxOutputTokens) || 0) / TOKENS_PER_KOREAN_CHAR);
}

/**
 * 요구 분량 상한을 채우려면 최소 몇 토큰이 필요한지 — 완충 포함.
 * 새 기능의 maxOutputTokens를 정할 때 이 값 이상으로 잡는다.
 * @param {number} maxChars
 * @returns {number}
 */
export function tokensRequiredForChars(maxChars) {
  return Math.ceil(((Number(maxChars) || 0) + MIN_BUDGET_HEADROOM_CHARS) * TOKENS_PER_KOREAN_CHAR);
}

/**
 * 토큰 상한이 요구 분량 상한 대비 남겨 두는 여유(글자 단위). 음수면 상시 잘린다.
 * @param {number} maxOutputTokens
 * @param {number} maxChars
 * @returns {number}
 */
export function tokenHeadroomChars(maxOutputTokens, maxChars) {
  return charsAllowedByTokens(maxOutputTokens) - (Number(maxChars) || 0);
}
