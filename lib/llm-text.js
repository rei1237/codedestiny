// LLM 응답 필드를 화면에 안전하게 뿌리기 위한 공용 텍스트 유틸.
// String(value)가 객체/배열에서 "[object Object]"를 만들어 그대로 노출되는 사고를 막는다.
// (이미 DB에 저장된 "[object Object]" 오염 문자열도 렌더 시점에 제거한다.)

const OBJECT_TOKEN = "[object Object]";
const TEXT_KEYS = ["description", "text", "content", "summary", "reading", "body", "value"];

/**
 * LLM이 반환한 임의 값(문자열/숫자/배열/중첩 객체)을 읽을 수 있는 문자열로 평탄화한다.
 * @param {unknown} value
 * @param {number} [depth]
 * @returns {string}
 */
export function toDisplayText(value, depth = 0) {
  if (value == null) return "";
  if (typeof value === "string") return scrubObjectToken(value);
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (depth >= 3) return "";
  if (Array.isArray(value)) {
    return value.map((item) => toDisplayText(item, depth + 1).trim()).filter(Boolean).join("\n");
  }
  if (typeof value === "object") {
    const record = /** @type {Record<string, unknown>} */ (value);
    const title = typeof record.title === "string" ? scrubObjectToken(record.title).trim() : "";
    for (const key of TEXT_KEYS) {
      const bodyText = toDisplayText(record[key], depth + 1).trim();
      if (bodyText) return title && title !== bodyText ? `${title} — ${bodyText}` : bodyText;
    }
    const joined = Object.values(record)
      .map((item) => toDisplayText(item, depth + 1).trim())
      .filter(Boolean)
      .join("\n");
    return title && joined && joined !== title ? `${title} — ${joined}` : joined || title;
  }
  return "";
}

/** 저장 단계에서 이미 오염된 "[object Object]" 토큰을 제거한다. */
function scrubObjectToken(text) {
  if (!text.includes(OBJECT_TOKEN)) return text;
  return text.split(OBJECT_TOKEN).join("").replace(/[ \t]{2,}/g, " ");
}

/**
 * 한국어 문장이 온전히 끝났는지에 대한 간이 휴리스틱.
 * 종결부호(다./요!/…), 닫는 따옴표/괄호로 끝나면 true.
 * @param {string} text
 * @returns {boolean}
 */
export function endsWithSentence(text) {
  const trimmed = String(text || "").trim();
  if (!trimmed) return false;
  return /(?:[.!?…]|[다요죠까네라자])[\s"'”’)\]]*$/.test(trimmed);
}

/**
 * 구조화 파싱에 실패한 원문이 사실상 JSON(잘린 JSON 포함)인지 판별한다.
 * true면 원문을 그대로 프로즈로 렌더링하지 말 것 (중괄호/키 노출).
 * @param {string} text
 * @returns {boolean}
 */
export function looksLikeRawJson(text) {
  const trimmed = String(text || "").trim();
  return trimmed.startsWith("{") || trimmed.startsWith("[") || trimmed.startsWith("```json");
}

/**
 * 파싱에 실패한(잘린) JSON 원문에서 사람이 읽을 수 있는 한국어 문장 값만 추출해
 * 프로즈로 복원한다. 키 이름/짧은 토큰은 버린다. 복원 실패 시 빈 문자열.
 * @param {string} text
 * @returns {string}
 */
export function extractReadableTextFromJsonLike(text) {
  const raw = String(text || "");
  const values = [];
  const pattern = /"((?:[^"\\]|\\.)*)"/g;
  let match;
  while ((match = pattern.exec(raw))) {
    pushReadableValue(values, match[1]);
  }
  // MAX_TOKENS 잘림은 대개 문자열 중간에서 끊긴다 — 닫는 따옴표 없는 꼬리도 복원.
  const tail = raw.match(/"((?:[^"\\]|\\.)*)$/);
  if (tail) pushReadableValue(values, tail[1]);
  return values.join("\n\n");
}

function pushReadableValue(values, rawValue) {
  const value = String(rawValue || "")
    .replace(/\\n/g, "\n")
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, "\\")
    .trim();
  if (value.length >= 12 && /[가-힣]/.test(value)) values.push(value);
}
