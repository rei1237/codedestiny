// JS 소스에서 함수 본문을 중괄호 균형으로 잘라 내는 공용 스캐너.
//
// 왜 공용으로 뺐나 (2026-08-01): verify-pass-recovery-path.mjs 와 verify-payment-choice-parity.mjs 가
// 글자 그대로 같은 사본을 각자 들고 있었고, **둘 다 정규식 리터럴을 처리하지 못했다.**
// js/destiny-profile.js 의 esc() 안에 있는 `/[&<>"']/g` 를 만나면 스캐너가 그 안의 따옴표를 보고
// 문자열 모드로 들어가 버리고, 그때부터 뒤따르는 `//` 주석이 문자열 내용으로 취급된다.
// 그 결과 **주석에 홑따옴표를 몇 개 썼는지에 따라** 함수 슬라이스가 엉뚱한 곳에서 끝났다 —
// 한국어 주석 한 줄을 고쳤을 뿐인데 CI 가 "시작 마커 없음"으로 빨개진 원인이 이것이다.
//
// 사본을 없애고 정규식 리터럴을 실제로 건너뛴다. 두 가드는 이 모듈을 import 한다.
import assert from "node:assert/strict";

// 이 문자 바로 뒤의 `/` 는 나눗셈이 아니라 정규식 리터럴의 시작이다.
// (값이 끝난 자리 — 식별자·숫자·`)`·`]` 뒤 — 는 나눗셈이므로 목록에 없다.)
const REGEX_MAY_START_AFTER = new Set([
  "", "(", ",", "=", ":", "[", "!", "&", "|", "?", "{", "}", ";", "+", "-", "*", "%", "<", ">", "~", "^",
]);

export function regexMayStartAfter(previousSignificantChar) {
  return REGEX_MAY_START_AFTER.has(previousSignificantChar);
}

// source[start] 가 정규식 리터럴의 여는 `/` 라고 볼 때, 닫는 `/` 의 인덱스를 돌려준다.
// 문자 클래스 `[...]` 안의 `/` 는 종료로 보지 않는다. 줄바꿈을 만나면 정규식이 아니라고
// 판단해 -1 을 돌려주고, 호출부는 그 `/` 를 나눗셈으로 되돌린다.
export function readRegexLiteralEnd(source, start) {
  let inClass = false;
  for (let i = start + 1; i < source.length; i += 1) {
    const ch = source[i];
    if (ch === "\\") { i += 1; continue; }
    if (ch === "\n") return -1;
    if (inClass) { if (ch === "]") inClass = false; continue; }
    if (ch === "[") { inClass = true; continue; }
    if (ch === "/") return i;
  }
  return -1;
}

const isSpace = (ch) => ch === " " || ch === "\t" || ch === "\n" || ch === "\r";

// 시작 마커부터 중괄호가 균형을 이루는 지점까지를 함수 본문으로 잘라 낸다.
// 이름 grep 대신 본문을 실제로 열어 보기 위한 도구다(CLAUDE.md 원칙6).
export function sliceFunction(source, startMarker, label) {
  const start = source.indexOf(startMarker);
  assert.ok(start >= 0, `${label}: 시작 마커 없음 (${startMarker.trim()})`);
  let depth = 0;
  let inLine = false;
  let inBlock = false;
  let quote = "";
  let previous = "";
  for (let i = start; i < source.length; i += 1) {
    const ch = source[i];
    const next = source[i + 1];
    if (inLine) { if (ch === "\n") inLine = false; continue; }
    if (inBlock) { if (ch === "*" && next === "/") { inBlock = false; i += 1; } continue; }
    if (quote) {
      if (ch === "\\") { i += 1; continue; }
      if (ch === quote) { quote = ""; previous = ")"; }
      continue;
    }
    if (ch === "/" && next === "/") { inLine = true; i += 1; continue; }
    if (ch === "/" && next === "*") { inBlock = true; i += 1; continue; }
    if (ch === "/" && regexMayStartAfter(previous)) {
      const end = readRegexLiteralEnd(source, i);
      if (end >= 0) { i = end; previous = ")"; continue; }
    }
    if (ch === "'" || ch === '"' || ch === "`") { quote = ch; continue; }
    if (ch === "{") depth += 1;
    else if (ch === "}") { depth -= 1; if (depth === 0) return source.slice(start, i + 1); }
    if (!isSpace(ch)) previous = ch;
  }
  throw new Error(`${label}: 중괄호 불균형`);
}

// 주석은 계약이 아니다 — "지우지 않는다"고 적어 둔 주석이 금지 패턴 검사에 걸려 통과/실패가 뒤집히면
// 가드가 무의미해진다. 검사 대상 본문에서 주석을 걷어내고 코드만 본다.
export function stripComments(source) {
  let out = "";
  let inLine = false;
  let inBlock = false;
  let quote = "";
  let previous = "";
  for (let i = 0; i < source.length; i += 1) {
    const ch = source[i];
    const next = source[i + 1];
    if (inLine) { if (ch === "\n") { inLine = false; out += ch; } continue; }
    if (inBlock) { if (ch === "*" && next === "/") { inBlock = false; i += 1; } continue; }
    if (quote) {
      out += ch;
      if (ch === "\\") { out += next === undefined ? "" : next; i += 1; continue; }
      if (ch === quote) { quote = ""; previous = ")"; }
      continue;
    }
    if (ch === "/" && next === "/") { inLine = true; i += 1; continue; }
    if (ch === "/" && next === "*") { inBlock = true; i += 1; continue; }
    if (ch === "/" && regexMayStartAfter(previous)) {
      const end = readRegexLiteralEnd(source, i);
      if (end >= 0) { out += source.slice(i, end + 1); i = end; previous = ")"; continue; }
    }
    if (ch === "'" || ch === '"' || ch === "`") { quote = ch; out += ch; continue; }
    out += ch;
    if (!isSpace(ch)) previous = ch;
  }
  return out;
}
