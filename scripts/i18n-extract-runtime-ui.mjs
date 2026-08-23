#!/usr/bin/env node
/**
 * 런타임 생성 UI 문구 추출.
 *
 * 셸의 UI 상당수는 인라인 스크립트가 HTML 문자열을 조립해 만든다. 그 문구들은
 * data-cd-trans 마커가 없어 번역 대상 밖이고, 실측상 일본어 홈에 한국어 1,000자
 * 이상이 이렇게 남는다.
 *
 * 생성기 수백 곳에 마커를 심는 대신, 이 문구들을 사전에 넣기만 하면
 * cd-lang-native 의 **한국어 원문 역인덱스 복구 패스**가 자동으로 번역한다.
 * 그래서 이 스크립트는 소스를 고치지 않는다 — 추출만 한다.
 *
 * 🔴 무엇을 UI 로 볼 것인가
 * Korean 리터럴을 전부 긁으면 로그·비교값·정규식까지 들어와 오역 위험이 생긴다.
 * 그래서 **화면에 그려지는 것이 분명한 문맥**만 취한다.
 *   (a) HTML 조각 문자열 안의 태그 사이 텍스트
 *   (b) textContent/innerHTML/placeholder/title/aria-label 대입 우변
 *   (c) label/title/text/desc/message/placeholder/hint/cta 류 프로퍼티 값
 *
 * 사용법:
 *   node scripts/i18n-extract-runtime-ui.mjs --probe
 *   node scripts/i18n-extract-runtime-ui.mjs
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, relative } from "node:path";
import { createHash } from "node:crypto";
import { walkSourceFiles, parseJs, walkAst } from "./lib/i18n-source-scan.mjs";

const rootDir = process.cwd();
const probeOnly = process.argv.includes("--probe");

/**
 * 🔴 해석 결과 콘텐츠 엔진 — UI 가 아니라 운세 본문이라 여기서 뽑지 않는다.
 *
 * 측정하니 이 7개 파일이 런타임 UI 추출의 79%(약 80,000자)를 차지했다. 전부
 * 사주/타로/자미 **해석문**이고, 사용자가 범위를 정할 때 명시적으로 2차로 미룬
 * 영역이다. 섞여 들어오면 "UI 문구 4,042개" 처럼 규모가 부풀어 우선순위를 흐린다.
 * 이 엔진들의 UI 라벨(버튼·로딩·에러)은 이미 코어 사전의 sajuEngine.* /
 * entertainEngine.* / extremeT.* 키로 따로 처리돼 있다.
 */
const INTERPRETATION_ENGINES = new Set([
  "js/saju-engine.js",
  "js/saju-engine-tarot-sukuyo-quantum.js",
  "js/core/saju/extremeTResult.js",
  "worker/lib/destiny-flower-engine.js",
  "js/entertain-engine.js",
  "js/oracle-kcg.js",
  "js/tarot-data.js",
]);

const UI_PROPERTY_RE = /(label|title|text|desc|description|message|placeholder|hint|cta|caption|heading|subtitle|note|tooltip|aria)$/i;
const UI_ASSIGN_RE = /^(textContent|innerHTML|innerText|placeholder|title|value|ariaLabel)$/;

/** 로그·에러 추적·개발자용 문자열은 화면에 안 나온다. */
const NOISE_RE = /^(https?:|\/|\.\/|#|\[|\{)|console|debug|deprecated/i;

const collected = new Map(); // koText -> { sources:Set }
function collect(text, source) {
  const normalized = String(text).replace(/\s+/g, " ").trim();
  if (!normalized || !/[가-힣]/.test(normalized)) return;
  if (normalized.length < 2 || normalized.length > 300) return;
  if (NOISE_RE.test(normalized)) return;
  // 🔴 HTML 조각을 통째로 담지 않는다. 복구 패스는 **텍스트 노드**와 대조하므로
  // `<div ...>문구</div>` 같은 값은 영원히 매칭되지 않는다 — 번역해도 무용지물이고
  // 저작 분량만 부풀린다. 태그 사이 텍스트만 따로 뽑아 담는다.
  if (/<[a-zA-Z][^>]*>/.test(normalized)) {
    collectFromHtmlFragment(normalized, source);
    return;
  }
  if (!collected.has(normalized)) collected.set(normalized, { sources: new Set() });
  collected.get(normalized).sources.add(source);
}

/** HTML 조각 문자열에서 태그 사이 텍스트와 번역 대상 속성값을 뽑는다. */
function collectFromHtmlFragment(value, source) {
  if (!/<[a-zA-Z][^>]*>/.test(value)) return false;
  for (const m of value.matchAll(/>([^<>]*[가-힣][^<>]*)</g)) collect(m[1], source);
  for (const m of value.matchAll(/(?:placeholder|title|alt|aria-label)\s*=\s*["']([^"']*[가-힣][^"']*)["']/g)) {
    collect(m[1], source);
  }
  return true;
}

function literalText(node) {
  if (!node) return null;
  if (node.type === "Literal" && typeof node.value === "string") return node.value;
  if (node.type === "TemplateLiteral") return node.quasis.map((q) => q.value.cooked || "").join(" ");
  return null;
}

function scan(source, label) {
  const ast = parseJs(source);
  if (!ast) return;
  walkAst(ast, (node) => {
    // (a) HTML 조각
    const direct = literalText(node);
    if (direct && /[가-힣]/.test(direct) && collectFromHtmlFragment(direct, label)) return;

    // (b) 대입 우변
    if (node.type === "AssignmentExpression" && node.left.type === "MemberExpression" && !node.left.computed) {
      const prop = node.left.property.name;
      const text = literalText(node.right);
      if (UI_ASSIGN_RE.test(String(prop)) && text) collect(text, label);
      return;
    }

    // setAttribute('placeholder'|'title'|'aria-label', '한국어')
    if (node.type === "CallExpression" && node.callee.type === "MemberExpression"
      && node.callee.property?.name === "setAttribute" && node.arguments.length >= 2) {
      const attr = literalText(node.arguments[0]);
      const text = literalText(node.arguments[1]);
      if (attr && /^(placeholder|title|aria-label|alt)$/.test(attr) && text) collect(text, label);
      return;
    }

    // (c) UI 성격 프로퍼티
    if (node.type === "Property" && !node.computed) {
      const key = node.key.type === "Identifier" ? node.key.name : node.key.value;
      const text = literalText(node.value);
      if (key && UI_PROPERTY_RE.test(String(key)) && text) collect(text, label);
    }
  });
}

// ── 셸 인라인 스크립트 ────────────────────────────────────────────────────
const shell = readFileSync(resolve(rootDir, "index.html"), "utf8");
let blockIndex = 0;
for (const match of shell.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
  blockIndex += 1;
  if (/\bsrc\s*=/i.test(match[1])) continue;
  if (/type\s*=\s*["'](?!text\/javascript|module)/i.test(match[1])) continue;
  scan(match[2], `index.html#script${blockIndex}`);
}

// ── js/ 런타임 모듈 ───────────────────────────────────────────────────────
for (const file of walkSourceFiles(rootDir, { extensions: [".js"] })) {
  const rel = relative(rootDir, file).split("\\").join("/");
  if (!rel.startsWith("js/")) continue;
  if (INTERPRETATION_ENGINES.has(rel)) continue;
  const source = readFileSync(file, "utf8");
  if (!/[가-힣]/.test(source)) continue;
  scan(source, rel);
}

// ── 이미 사전에 있는 문구는 제외 ──────────────────────────────────────────
const koDictionary = JSON.parse(readFileSync(resolve(rootDir, "public/i18n/ko.json"), "utf8"));
const known = new Set();
(function walk(node) {
  for (const value of Object.values(node || {})) {
    if (typeof value === "string") known.add(value.replace(/\s+/g, " ").trim());
    else if (value && typeof value === "object") walk(value);
  }
})(koDictionary);

const fresh = [...collected.entries()].filter(([text]) => !known.has(text));

/**
 * 키는 순차 짧은 id 를 쓴다. 해시 키(24자)는 11개 로케일 파일에 그대로 반복돼
 * 산출물이 크게 불어난다. 복구 패스는 **한국어 원문**으로 키를 역조회하므로
 * 키 형태 자체는 아무 의미가 없다 — 짧을수록 좋다.
 * 정렬 후 번호를 매겨 재실행 시 같은 문구가 같은 키를 받게 한다.
 */
const entries = {};
fresh.map(([text]) => text).sort().forEach((text, index) => {
  entries[`shellRuntime.s${index}`] = text;
});

const chars = Object.values(entries).join("").match(/[가-힣]/g)?.length || 0;
console.log(`[runtime-ui] 수집 문구        : ${collected.size}`);
console.log(`[runtime-ui] 이미 사전에 있음  : ${collected.size - fresh.length}`);
console.log(`[runtime-ui] 신규            : ${fresh.length} (한글 ${chars}자)`);
console.log("[runtime-ui] 표본:");
fresh.slice(0, 12).forEach(([text, meta]) => console.log(`[runtime-ui]    ${text.slice(0, 56).padEnd(58)} ${[...meta.sources][0]}`));

if (probeOnly) {
  console.log("[runtime-ui] --probe: 파일을 기록하지 않았습니다.");
  process.exit(0);
}

mkdirSync(resolve(rootDir, "i18n", "pending"), { recursive: true });
writeFileSync(
  resolve(rootDir, "i18n", "pending", "shellRuntime.ko.json"),
  `${JSON.stringify(entries, null, 2)}\n`,
  "utf8",
);
console.log(`[runtime-ui] i18n/pending/shellRuntime.ko.json 에 ${Object.keys(entries).length}키 기록`);
