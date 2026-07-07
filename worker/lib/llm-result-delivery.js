// 결제된 LLM 결과를 "절대 버리지 않는다"는 결정을 한 곳에 모은다 (경량 보장 계약).
// 품질 게이트가 실패해도, 사용자에게 보여줄 실질 텍스트가 있는 후보면 degrade로라도 전달하고
// (commit/과금 유지), 후보조차 비어 있을 때만 환불+재시도 신호를 준다.
// 각 유료 LLM 라우트의 "생성 실패 종단 처리"가 이 판정을 공유한다.

import { extractReadableTextFromJsonLike, looksLikeRawJson, toDisplayText } from "../../lib/llm-text.js";

/**
 * 후보 값(문자열/배열/중첩 결과 객체/잘린 JSON)이 사용자에게 보여줄 실질 텍스트를 가졌는지 판정한다.
 * toDisplayText로 평탄화한 뒤(잘린 JSON이면 사람이 읽을 문장만 복구) 공백 제외 길이로 판단.
 * @param {unknown} value
 * @param {{ minChars?: number }} [options]
 * @returns {boolean}
 */
export function hasRenderableLlmText(value, options = {}) {
  const { minChars = 40 } = options;
  let text = toDisplayText(value);
  if (!text && typeof value === "string") text = value;
  if (looksLikeRawJson(text)) {
    const recovered = extractReadableTextFromJsonLike(text);
    if (recovered) text = recovered;
  }
  return text.replace(/\s+/g, "").length >= minChars;
}
