/**
 * JSON-LD 를 `<script type="application/ld+json">` 안에 넣을 문자열로 바꾼다.
 *
 * `JSON.stringify` 결과를 그대로 넣으면 값 안의 `</script>` 가 스크립트를 닫고, U+2028·U+2029 는
 * 일부 파서에서 줄바꿈으로 읽힌다. `<` `>` `&` 와 두 줄 구분자를 \uXXXX 로 바꾸면 JSON 값은 그대로이고
 * HTML 파서가 스크립트 경계를 오인하지 않는다.
 */
const LINE_SEPARATORS = String.fromCharCode(0x2028, 0x2029);
const UNSAFE_JSON_LD_CHARS = new RegExp(`[<>&${LINE_SEPARATORS}]`, "g");

export function serializeJsonLd(data) {
  const json = JSON.stringify(data);
  if (json === undefined) throw new TypeError("serializeJsonLd: JSON 으로 바꿀 수 없는 값입니다.");
  return json.replace(UNSAFE_JSON_LD_CHARS, (char) => `\\u${char.charCodeAt(0).toString(16).padStart(4, "0")}`);
}

/**
 * datePublished·dateModified 에 넣을 값. 날짜만 있는 원본(`2026-08-30`)은 날짜 그대로 둔다 — toISOString() 을 거치면
 * UTC 자정, 곧 09:00 KST 라는 원본에 없는 시각이 붙는다. 시각이 있는 값은 ISO 8601(UTC)로 맞춘다.
 * 비었거나 없는 날짜(`2026-02-30` 포함)면 undefined 를 돌려줘 그 필드가 빠지게 한다.
 */
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
export function toJsonLdDate(value) {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value === "string" && DATE_ONLY.test(value.trim())) {
    const day = value.trim();
    const date = new Date(`${day}T00:00:00Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === day ? day : undefined;
  }
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}
