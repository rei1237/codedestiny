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
