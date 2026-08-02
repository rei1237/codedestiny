// 오늘의 운세 코어 사본 동기화 가드.
//
// 정본 알고리즘·문구 풀은 lib/lock-screen-daily-fortune.ts(Android 잠금화면)에 있고,
// js/daily-fortune-core.js 는 정적 셸(클래식 <script>)에서 쓰기 위한 사본이다.
// 사본이 필요한 이유는 daily-fortune-core.js 헤더 주석에 적혀 있다.
//
// 이 가드가 없으면 한쪽 문구만 고쳐도 아무도 모른 채 잠금화면과 홈이 다른 말을 하게 된다.
// 홈 허브가 쓰는 3종(사주·숙요·베다)의 문구 풀과 일진 계산 상수만 본다 —
// 자미두수·점성술은 사본에 없으므로(홈 미노출) 검사 대상이 아니다.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { sliceFunction, stripComments } from "./lib/js-source-slice.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");

const TS_PATH = "lib/lock-screen-daily-fortune.ts";
const JS_PATH = "js/daily-fortune-core.js";

// 선언의 `=` 뒤 첫 `[` 또는 `{` 부터 균형이 맞는 지점까지를 잘라 낸다.
// 문자열·주석·정규식 리터럴은 js-source-slice 와 같은 규칙으로 건너뛴다.
//
// 이름을 indexOf 로 찾으면 안 된다 — `DAILY_FORTUNE_SYSTEMS` 안에 `STEMS` 가 들어 있어
// 엉뚱한 선언을 잡는다. `=` 뒤부터 스캔하는 것도 필수다(TS 의 `readonly string[]` 타입
// 표기에 있는 `[]` 를 리터럴 시작으로 오인해 빈 배열이 잘려 나온다).
function sliceLiteral(source, name, label) {
  const decl = new RegExp(`(?:^|[^\\w$])(?:const|let|var)\\s+${name}\\b[^=\\n]*=`, "m");
  const found = decl.exec(source);
  assert.ok(found, `${label}: 선언 없음 (${name})`);
  let start = -1;
  for (let i = found.index + found[0].length; i < source.length; i += 1) {
    const ch = source[i];
    if (ch === "[" || ch === "{") { start = i; break; }
    if (ch === ";") break;
    if (ch !== " " && ch !== "\t" && ch !== "\r" && ch !== "\n") break;
  }
  assert.ok(start >= 0, `${label}: ${name} 뒤에 리터럴이 없음`);
  const open = source[start];
  const close = open === "[" ? "]" : "}";
  let depth = 0;
  let quote = "";
  for (let i = start; i < source.length; i += 1) {
    const ch = source[i];
    if (quote) {
      if (ch === "\\") { i += 1; continue; }
      if (ch === quote) quote = "";
      continue;
    }
    if (ch === "'" || ch === '"' || ch === "`") { quote = ch; continue; }
    if (ch === open) depth += 1;
    else if (ch === close) {
      depth -= 1;
      if (depth === 0) return source.slice(start, i + 1);
    }
  }
  throw new Error(`${label}: ${name} 리터럴 괄호 불균형`);
}

// 주석을 먼저 걷어낸 뒤 문자열 리터럴만 순서대로 뽑는다("이 문구는 지우지 말 것" 같은
// 주석이 비교 대상에 섞이면 가드가 무의미해진다).
function literalStrings(block) {
  const src = stripComments(block);
  const out = [];
  let quote = "";
  let buf = "";
  for (let i = 0; i < src.length; i += 1) {
    const ch = src[i];
    if (quote) {
      if (ch === "\\") { buf += src[i + 1] ?? ""; i += 1; continue; }
      if (ch === quote) { out.push(buf); buf = ""; quote = ""; continue; }
      buf += ch;
      continue;
    }
    if (ch === "'" || ch === '"' || ch === "`") { quote = ch; buf = ""; }
  }
  return out;
}

function numbersIn(block) {
  return (stripComments(block).match(/\d+(?:\.\d+)?/g) || []).join(",");
}

const ts = readFileSync(path.join(root, TS_PATH), "utf8");
const js = readFileSync(path.join(root, JS_PATH), "utf8");

// 문구 풀·상수 배열 — 이름과 내용이 양쪽에서 글자 그대로 같아야 한다.
const SHARED_LITERALS = [
  "STEMS",
  "BRANCHES",
  "STEM_ELEMENT",
  "ELEMENT_ORDER",
  "ELEMENT_MOOD",
  "SAJU_RELATION_ADVICE",
  "SAJU_GENERIC",
  "VARA_RULER",
  "VARA_THEME",
  "VEDIC_DAILY",
  "SUKUYO_MANSION",
  "SUKUYO_DAILY",
];

const failures = [];

for (const name of SHARED_LITERALS) {
  const tsStrings = literalStrings(sliceLiteral(ts, name, TS_PATH));
  const jsStrings = literalStrings(sliceLiteral(js, name, JS_PATH));
  if (tsStrings.length !== jsStrings.length) {
    failures.push(`${name}: 항목 수 불일치 (${TS_PATH} ${tsStrings.length} vs ${JS_PATH} ${jsStrings.length})`);
    continue;
  }
  for (let i = 0; i < tsStrings.length; i += 1) {
    if (tsStrings[i] !== jsStrings[i]) {
      failures.push(`${name}[${i}] 문구 불일치\n    ${TS_PATH}: ${tsStrings[i]}\n    ${JS_PATH}: ${jsStrings[i]}`);
    }
  }
}

// 일진 계산의 마법 상수(365.25 / 30.6001 / 4716 / 1524.5)가 어긋나면 두 화면의 갑자가 갈라진다.
const tsJulian = sliceFunction(ts, "function julianDay(", TS_PATH);
const jsJulian = sliceFunction(js, "function julianDay(", JS_PATH);
if (numbersIn(tsJulian) !== numbersIn(jsJulian)) {
  failures.push(`julianDay(): 상수 불일치\n    ${TS_PATH}: ${numbersIn(tsJulian)}\n    ${JS_PATH}: ${numbersIn(jsJulian)}`);
}

// 갑자 인덱스 보정치(+49 %60)와 FNV-1a 시드도 같아야 한다.
for (const [label, pattern] of [
  ["갑자 오프셋", /\+\s*49\)\s*%\s*60/],
  ["FNV offset basis", /2166136261/],
  ["FNV prime", /16777619/],
  ["27수 주기", /%\s*27/],
]) {
  if (!pattern.test(ts) || !pattern.test(js)) {
    failures.push(`${label}: 양쪽에 존재해야 함 (${pattern})`);
  }
}

// 사본은 홈 첫 화면에서 돈다 — 예외가 새면 히어로 아래가 백지가 된다.
assert.ok(/catch\s*\(_\)\s*\{/.test(js), `${JS_PATH}: get() 의 폴백 catch 가 없다`);
assert.ok(/global\.CDDailyFortune\s*=/.test(js), `${JS_PATH}: window.CDDailyFortune 전역 등록이 없다`);

if (failures.length) {
  console.error(`✗ 오늘의 운세 코어 사본이 정본과 어긋났다 (${failures.length}건)`);
  console.error(`  정본: ${TS_PATH}\n  사본: ${JS_PATH}\n  → 문구를 고쳤다면 두 파일을 함께 고칠 것.\n`);
  for (const f of failures) console.error(`  · ${f}`);
  process.exit(1);
}

console.log(`✓ 오늘의 운세 코어 동기화 확인 — 문구 풀 ${SHARED_LITERALS.length}종 + 일진 상수 일치`);
