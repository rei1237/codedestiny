// LLM 이 뱉은 JSON 텍스트의 "되살릴 수 있는 손상"만 고친다. 의존성 없음 —
// worker 라우트뿐 아니라 plain node 검증 스크립트(scripts/verify-*.mjs)도 프롬프트 모듈을
// 거쳐 이 파일을 로드하므로, 여기에 .ts 나 LLM 클라이언트를 끌어오지 않는다.

/**
 * JSON 문자열 리터럴 안에 들어온 raw 제어문자를 이스케이프해 되살린다.
 *
 * 🔴 실측(2026-08-01, 자미두수 6그룹 병렬 라이브 호출): `responseMimeType: "application/json"`
 * 을 줘도 gemini-2.5-flash 는 긴 한국어 상담문에서 문단을 나누며 **문자열 안에 raw 개행을
 * 그대로** 넣는다. 그러면 JSON.parse 가 `Bad control character in string literal` 로 죽고,
 * 토큰은 정상 생성됐는데도 그 그룹이 통째로 0자로 집계된다. 6그룹 중 2그룹이 이렇게 날아가
 * 합계가 목표의 66%에 머물렀다. 파싱은 값을 버리는 자리라, 되살릴 수 있으면 되살리는 편이 낫다.
 */
export function escapeRawControlCharsInJsonStrings(value) {
  let output = "";
  let inString = false;
  let escaped = false;
  for (const char of String(value ?? "")) {
    if (escaped) {
      output += char;
      escaped = false;
      continue;
    }
    if (char === "\\" && inString) {
      output += char;
      escaped = true;
      continue;
    }
    if (char === '"') {
      inString = !inString;
      output += char;
      continue;
    }
    if (inString && char.charCodeAt(0) < 32) {
      if (char === "\n") output += "\\n";
      else if (char === "\r") output += "\\r";
      else if (char === "\t") output += "\\t";
      else output += `\\u${char.charCodeAt(0).toString(16).padStart(4, "0")}`;
      continue;
    }
    output += char;
  }
  return output;
}
