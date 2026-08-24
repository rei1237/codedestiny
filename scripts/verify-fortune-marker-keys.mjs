#!/usr/bin/env node
/**
 * /fortune 의 마커가 가리키는 사전 키가 12개 로케일에 전부 있는지 지킨다.
 *
 * 왜 있나: 회전 문장은 `data-cd-trans` 로 템플릿을 가리키고, 변수 값이 `@키` 면 런타임이
 * 그 값도 사전에서 풀어 넣는다(lib/i18n/dictionary.ts 의 resolveVars). 키가 하나라도 없으면
 * 그 자리만 조용히 한국어로 남거나 "번역을 준비 중입니다" 가 박힌다 — 화면을 열어 보지
 * 않으면 모른다.
 *
 * 🔴 손으로 쓴 키 목록을 검사하지 않는다. **소스에서 전수 발견**한다:
 *   - lib/fortune/i18n-marker.ts 의 `fortuneVar.*` 값 전부
 *   - lib/fortune/{day-relation,build-view}.ts 가 쓰는 `fortuneTpl.*` 키 전부
 * 그리고 템플릿 문장의 `{슬롯}` 이름이 실제로 넘기는 vars 키와 맞는지도 본다.
 * 발견된 대상이 0개면 실패한다(검사 대상이 없을 때 통과하는 가드는 가드가 아니다).
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const rootDir = process.cwd();
const FILE_BY_LOCALE = {
  ko: "ko", en: "en", ja: "ja", "zh-CN": "zh-cn", "zh-TW": "zh-tw",
  vi: "vi", hi: "hi", es: "es", fr: "fr", de: "de", nl: "nl", ms: "ms",
};

const failures = [];
const read = (rel) => readFileSync(resolve(rootDir, rel), "utf8");

const dictionaries = {};
for (const [locale, base] of Object.entries(FILE_BY_LOCALE)) {
  const path = resolve(rootDir, "public", "i18n", `${base}.json`);
  if (!existsSync(path)) { failures.push(`코어 사전이 없다: public/i18n/${base}.json`); continue; }
  dictionaries[locale] = JSON.parse(read(`public/i18n/${base}.json`));
}
const valueAt = (dict, key) => key.split(".").reduce((acc, part) => (acc && typeof acc === "object" ? acc[part] : undefined), dict);

// ── 1. i18n-marker.ts 가 내보내는 변수 키 전수 ──────────────────────────────
const markerSrc = read("lib/fortune/i18n-marker.ts");
const varKeys = [...new Set([...markerSrc.matchAll(/"(fortuneVar\.[A-Za-z0-9_.]+)"/g)].map((m) => m[1]))];

// ── 2. 뷰 모델이 쓰는 템플릿 키 전수 ────────────────────────────────────────
const consumerFiles = ["lib/fortune/day-relation.ts", "lib/fortune/build-view.ts"];
const tplUsage = new Map(); // key → Set(vars 이름)

/**
 * `vars: {` 부터 짝이 맞는 `}` 까지를 **중괄호 균형으로** 잘라낸다.
 * 정규식 하나로 끊으면 `${...}` 나 중첩 객체에서 먼저 나오는 `}` 에 걸려 잘려,
 * 실제로 넘기는 변수를 못 본 채 "채워지지 않는 슬롯" 오탐이 난다.
 */
function varsBlockAfter(src, from) {
  const open = src.indexOf("{", from);
  if (open < 0) return "";
  let depth = 0;
  for (let i = open; i < src.length; i += 1) {
    const ch = src[i];
    if (ch === "{") depth += 1;
    else if (ch === "}") {
      depth -= 1;
      if (depth === 0) return src.slice(open + 1, i);
    }
  }
  return "";
}

/**
 * 깊이 1 의 속성 이름만 모은다 — 중첩 객체 안의 이름은 변수가 아니다.
 * `name: value` 와 축약형 `name,` 둘 다 본다(축약형을 놓치면 없는 누락을 만든다).
 */
function topLevelNames(block) {
  const names = [];
  let depth = 0;
  let lineStart = 0;
  for (let i = 0; i <= block.length; i += 1) {
    const ch = block[i];
    if (ch === "{" || ch === "(" || ch === "[") depth += 1;
    else if (ch === "}" || ch === ")" || ch === "]") depth -= 1;
    if (ch === "," && depth === 0) { lineStart = i + 1; continue; }
    if (ch === ":" && depth === 0) {
      const m = block.slice(lineStart, i).match(/([A-Za-z0-9_]+)\s*$/);
      if (m) names.push(m[1]);
      // 값 부분은 건너뛴다 — 다음 깊이 0 쉼표까지
      let j = i + 1;
      let d = 0;
      for (; j < block.length; j += 1) {
        const c = block[j];
        if (c === "{" || c === "(" || c === "[") d += 1;
        else if (c === "}" || c === ")" || c === "]") d -= 1;
        else if (c === "," && d === 0) break;
      }
      i = j;
      lineStart = i + 1;
    }
  }
  // 축약형(`termText,`) 은 위 루프가 `:` 를 못 봐서 빠진다. 깊이 0 조각을 다시 훑는다.
  let depth2 = 0;
  let start = 0;
  for (let i = 0; i <= block.length; i += 1) {
    const ch = block[i];
    if (ch === "{" || ch === "(" || ch === "[") depth2 += 1;
    else if (ch === "}" || ch === ")" || ch === "]") depth2 -= 1;
    if ((ch === "," && depth2 === 0) || i === block.length) {
      const piece = block.slice(start, i).trim();
      if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(piece)) names.push(piece);
      start = i + 1;
    }
  }
  return names;
}

for (const rel of consumerFiles) {
  const src = read(rel);
  for (const m of src.matchAll(/key:\s*"(fortuneTpl\.[A-Za-z0-9_.]+)"/g)) {
    const key = m[1];
    const cur = tplUsage.get(key) || new Set();
    const varsAt = src.indexOf("vars:", m.index);
    // 같은 객체 리터럴 안의 vars 만 본다 — 다음 `key:` 를 넘어가면 다른 마커다.
    const nextKeyAt = src.indexOf('key: "fortuneTpl.', m.index + 1);
    if (varsAt > 0 && (nextKeyAt < 0 || varsAt < nextKeyAt)) {
      topLevelNames(varsBlockAfter(src, varsAt)).forEach((n) => cur.add(n));
    }
    tplUsage.set(key, cur);
  }
}

if (!varKeys.length) failures.push("i18n-marker.ts 에서 fortuneVar.* 키를 하나도 못 찾았다 — 정규식이나 파일이 바뀌었다");
if (!tplUsage.size) failures.push("day-relation/build-view 에서 fortuneTpl.* 키를 하나도 못 찾았다 — 마커 배선이 사라졌다");

// ── 3. 모든 키가 12개 로케일에 있는가 ───────────────────────────────────────
for (const key of [...varKeys, ...tplUsage.keys()]) {
  const missing = Object.keys(dictionaries).filter((l) => typeof valueAt(dictionaries[l], key) !== "string");
  if (missing.length) failures.push(`${key}: 사전에 없음 → ${missing.join(", ")}`);
}

// ── 4. 템플릿의 슬롯과 넘기는 vars 가 맞는가 ────────────────────────────────
// 슬롯이 남으면 화면에 빈칸이 생기고, 안 쓰는 vars 는 배선이 어긋났다는 신호다.
for (const [key, passed] of tplUsage) {
  for (const locale of Object.keys(dictionaries)) {
    const value = valueAt(dictionaries[locale], key);
    if (typeof value !== "string") continue;
    const slots = new Set([...value.matchAll(/\{\s*([A-Za-z0-9_.-]+)\s*\}/g)].map((m) => m[1]));
    const unfilled = [...slots].filter((n) => !passed.has(n));
    if (unfilled.length) failures.push(`${key} (${locale}): 채워지지 않는 슬롯 {${unfilled.join("}, {")}}`);
  }
  const firstValue = valueAt(dictionaries.ko, key);
  if (typeof firstValue === "string") {
    const slots = new Set([...firstValue.matchAll(/\{\s*([A-Za-z0-9_.-]+)\s*\}/g)].map((m) => m[1]));
    const unused = [...passed].filter((n) => !slots.has(n));
    if (unused.length) failures.push(`${key}: ko 템플릿이 쓰지 않는 vars ${unused.join(", ")}`);
  }
}

if (failures.length) {
  console.error("[fortune-marker-keys] FAILED:");
  failures.slice(0, 30).forEach((f) => console.error(`- ${f}`));
  process.exit(1);
}
console.log(`[fortune-marker-keys] OK — 변수 키 ${varKeys.length}개 · 템플릿 ${tplUsage.size}개 × 로케일 ${Object.keys(dictionaries).length}개, 슬롯 정합 확인`);
