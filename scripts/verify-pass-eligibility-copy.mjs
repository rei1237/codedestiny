/**
 * 이용권 커버 배지 문구 정합성 가드 (lib/payment/pass-eligibility.ts).
 *
 * 실행: npm run verify:pass-eligibility-copy
 *
 * 왜 있는가 — PR #1644 가 이 파일을 들여오면서 일본어 문구에 한글이 섞인 채
 * (`利用권対象外`) CI 를 그대로 통과해 스테이징까지 나갔다. 그때 이 파일을 열어 보는
 * 테스트·검증기가 0건이었다. 로케일이 늘 때마다 같은 오염이 다시 통과한다.
 *
 * 지키는 것
 *   ① 두 문구 테이블의 키 집합이 RUNTIME_LOCALES 정규화 집합과 정확히 일치
 *   ② 각 로케일 항목이 필수 필드를 다 갖추고, 빈 문자열이 아님
 *   ③ ko 이외 로케일의 문구에 한글이 없음
 *   ④ 사용자에게 보이는 문구가 "한도 없음"을 뜻하는 표현을 쓰지 않음
 *      (verify:pass-tier-policy ④ 와 같은 축 — 이 파일은 그 가드가 안 보는 곳이다)
 *
 * fail-closed 설계: 파일이 없거나 테이블을 파싱하지 못하면 "검사 대상이 없어서 통과"가
 * 아니라 실패다. 로케일 개수를 여기 적지 않고 소스(lib/i18n/locale-normalize.js)에서 읽는다.
 */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { RUNTIME_LOCALES } from "../lib/i18n/locale-normalize.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const TARGET = "lib/payment/pass-eligibility.ts";

const failures = [];
const check = (label, ok, detail = "") => {
  if (ok) return;
  failures.push(detail ? `${label} — ${detail}` : label);
};

const die = (message) => {
  console.error(`\n❌ verify:pass-eligibility-copy 실패\n   - ${message}\n`);
  process.exit(1);
};

const targetPath = path.join(ROOT, TARGET);
if (!existsSync(targetPath)) {
  die(`${TARGET} 가 없다. 파일을 옮겼다면 이 가드의 TARGET 도 함께 옮긴다.`);
}
const src = readFileSync(targetPath, "utf8");

/* ── 파싱 ─────────────────────────────────────────────────────────────────
   .ts 라 import 할 수 없다(이 레포 Jest/Node 에는 TS 로더가 없다). 중괄호 균형으로
   선언 본문을 잘라내고 최상위 항목만 읽는다. 정규식이 리팩터링에 빗나가면 조용히
   통과하는 게 이 종류 가드의 전형적인 사고라 모든 실패 지점에서 즉시 죽는다. */

function sliceDeclaration(name) {
  // 🔴 이름 경계를 요구한다. `indexOf` 만 쓰면 PASS_ELIGIBILITY_COPY 를 지우고
  //    PASS_ELIGIBILITY_COPY_V2 를 둔 리팩터링이 접두사로 걸려 조용히 통과한다.
  const declared = new RegExp(`\\bconst ${name}(?![A-Za-z0-9_$])`).exec(src);
  if (!declared) return null;
  const decl = declared.index;
  const assign = src.indexOf("= {", decl);
  if (assign < 0) return null;
  const open = src.indexOf("{", assign);
  let depth = 0;
  for (let i = open; i < src.length; i += 1) {
    if (src[i] === "{") depth += 1;
    else if (src[i] === "}") {
      depth -= 1;
      if (depth === 0) return src.slice(open + 1, i);
    }
  }
  return null;
}

/** 최상위 `키: 값` 을 Map<로케일, 값 소스> 로. 파싱이 어긋나면 null 을 돌려 실패시킨다. */
function parseTopLevelEntries(body) {
  const entries = new Map();
  let i = 0;
  while (i < body.length) {
    while (i < body.length && /[\s,]/.test(body[i])) i += 1;
    if (i >= body.length) break;

    let key;
    if (body[i] === '"' || body[i] === "'") {
      const quote = body[i];
      const end = body.indexOf(quote, i + 1);
      if (end < 0) return null;
      key = body.slice(i + 1, end);
      i = end + 1;
    } else {
      const match = /^[A-Za-z0-9_$-]+/.exec(body.slice(i));
      if (!match) return null;
      key = match[0];
      i += match[0].length;
    }

    while (i < body.length && /\s/.test(body[i])) i += 1;
    if (body[i] !== ":") return null;
    i += 1;

    const start = i;
    let depth = 0;
    let quote = null;
    for (; i < body.length; i += 1) {
      const ch = body[i];
      if (quote) {
        if (ch === "\\") i += 1;
        else if (ch === quote) quote = null;
        continue;
      }
      if (ch === '"' || ch === "'" || ch === "`") quote = ch;
      else if (ch === "{" || ch === "(" || ch === "[") depth += 1;
      else if (ch === "}" || ch === ")" || ch === "]") depth -= 1;
      else if (ch === "," && depth === 0) break;
    }
    if (quote || depth !== 0) return null;
    if (entries.has(key)) return null;
    entries.set(key, body.slice(start, i));
  }
  return entries;
}

/** 항목 안의 사용자 노출 문자열(따옴표·템플릿). 템플릿의 `${...}` 자리는 비운다. */
function extractStrings(chunk) {
  const found = [];
  const pattern = /"((?:[^"\\]|\\.)*)"|`((?:[^`\\]|\\.)*)`/g;
  let match = pattern.exec(chunk);
  while (match) {
    const raw = match[1] ?? match[2];
    found.push(raw.replace(/\$\{[^}]*\}/g, ""));
    match = pattern.exec(chunk);
  }
  return found;
}

const TABLES = [
  { name: "PASS_TIER_LABELS", fields: ["standard", "premium", "vvip", "family"] },
  { name: "PASS_ELIGIBILITY_COPY", fields: ["notCovered", "exhausted", "included"] },
];

const parsed = TABLES.map((table) => {
  const body = sliceDeclaration(table.name);
  if (body == null) die(`${TARGET} 에서 ${table.name} 선언을 잘라내지 못했다.`);
  const entries = parseTopLevelEntries(body);
  if (entries == null || entries.size === 0) {
    die(`${table.name} 의 최상위 항목을 읽지 못했다(파싱 실패이지 "대상 없음"이 아니다).`);
  }
  return { ...table, entries };
});

/* ── ① 키 집합 ─────────────────────────────────────────────────────────── */

const expected = RUNTIME_LOCALES.map((locale) => String(locale).toLowerCase());
if (expected.length === 0) die("RUNTIME_LOCALES 가 비었다.");

for (const table of parsed) {
  const actual = [...table.entries.keys()];
  const missing = expected.filter((locale) => !actual.includes(locale));
  const extra = actual.filter((locale) => !expected.includes(locale));
  check(`${table.name} 누락 로케일`, missing.length === 0, missing.join(", "));
  check(`${table.name} 미지원 로케일`, extra.length === 0, extra.join(", "));
}

/* ── ② 필수 필드와 빈 문구 ─────────────────────────────────────────────── */

for (const table of parsed) {
  for (const [locale, chunk] of table.entries) {
    for (const field of table.fields) {
      check(
        `${table.name}.${locale} 필드 누락`,
        new RegExp(`\\b${field}\\s*:`).test(chunk),
        field,
      );
    }
    const strings = extractStrings(chunk);
    check(`${table.name}.${locale} 문구 없음`, strings.length > 0);
    check(
      `${table.name}.${locale} 빈 문구`,
      strings.every((text) => text.trim().length > 0),
    );
  }
}

/* ── ③ 로케일 오염 ─────────────────────────────────────────────────────────
   ko 밖에서 한글이 나오면 저작 실수다. PR #1644 의 `利用권` 이 정확히 이 형태였다. */

const HANGUL = /[가-힣]/;
for (const table of parsed) {
  for (const [locale, chunk] of table.entries) {
    if (locale === "ko") continue;
    const polluted = extractStrings(chunk).filter((text) => HANGUL.test(text));
    check(
      `${table.name}.${locale} 한글 혼입`,
      polluted.length === 0,
      polluted.join(" / "),
    );
  }
}

/* ── ④ "한도 없음" 오인 문구 ───────────────────────────────────────────────
   이용권은 건당 가격 상한과 기간 한도가 둘 다 있다. 아래 표현은 그 둘이 없는 것처럼
   읽혀 결제 후 분쟁이 된다(docs/handoff/pass-tier-service-card-badges.md). */

const FORBIDDEN = ["무제한", "월 누적", "횟수 제한 없음", "마음껏", "unlimited"];
for (const table of parsed) {
  for (const [locale, chunk] of table.entries) {
    const text = extractStrings(chunk).join(" ").toLowerCase();
    const hits = FORBIDDEN.filter((word) => text.includes(word.toLowerCase()));
    check(`${table.name}.${locale} 금지 표현`, hits.length === 0, hits.join(", "));
  }
}

/* ── 결과 ─────────────────────────────────────────────────────────────── */

if (failures.length > 0) {
  console.error(`\n❌ verify:pass-eligibility-copy 실패 (${failures.length}건)`);
  for (const failure of failures) console.error(`   - ${failure}`);
  console.error(`\n   정본: ${TARGET} · 로케일 목록: lib/i18n/locale-normalize.js\n`);
  process.exit(1);
}

console.log(
  `✅ verify:pass-eligibility-copy — ${parsed.length}개 문구 테이블 × ${expected.length}로케일 검증 통과`,
);
