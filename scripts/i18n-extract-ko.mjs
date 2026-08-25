#!/usr/bin/env node
/**
 * public/i18n/ko.json 생성기 + 사전 누락 네임스페이스 진단.
 *
 * 배경: 이 프로젝트는 한국어를 "로케일"이 아니라 "fallback"으로 다뤄왔다.
 * 한국어 원문은 index.html 마크업, 모듈별 `*_TEXT_TRANSLATIONS.ko` 테이블,
 * 그리고 호출부 fallback 인자에 흩어져 있고 ko.json은 존재하지 않았다.
 * 이 스크립트는 흩어진 원문을 모아 ko를 나머지 11개 로케일과 동일한
 * 1급 로케일로 승격시킨다.
 *
 * 추출 우선순위 (앞선 소스가 이긴다):
 *   1. i18n/ko-overrides.json   수기 확정본
 *   2. shell:text               index.html [data-cd-trans] 텍스트
 *   3. shell:attr               index.html [data-cd-trans-attr] 속성값
 *   4. module:table             모듈별 *_TEXT_TRANSLATIONS.ko 등 KO 테이블(AST)
 *   5. call:fallback            cdTranslate/래퍼 호출의 한국어 fallback 리터럴
 *
 * 사용법:
 *   node scripts/i18n-extract-ko.mjs --probe   보고만 (파일 미기록)
 *   node scripts/i18n-extract-ko.mjs           public/i18n/ko.json + 리포트 기록
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import { join, resolve, relative } from "node:path";
import { JSDOM } from "jsdom";
import {
  walkSourceFiles, flatten, parseJs, walkAst, literalValue,
  deriveNamespace, decodeEscapes, PASSTHROUGH_WRAPPERS, PREFIXED_WRAPPERS, TABLE_NAME_RE,
} from "./lib/i18n-source-scan.mjs";

const rootDir = process.cwd();
const i18nDir = resolve(rootDir, "public", "i18n");
const outPath = join(i18nDir, "ko.json");
const reportPath = resolve(rootDir, "reports", "i18n-ko-extraction.json");
const overridePath = resolve(rootDir, "i18n", "ko-overrides.json");
const probeOnly = process.argv.includes("--probe");

const base = JSON.parse(readFileSync(join(i18nDir, "en.json"), "utf8"));

const found = new Map(); // key -> { value, source }

/**
 * @param requireKorean 코드 리터럴에서 긁어온 값은 한글이 있어야 원문으로 인정한다.
 *   반면 셸 마커(data-cd-trans)에서 읽은 값은 **현재 한국어 화면에 실제로 렌더되는 값**
 *   이므로 이메일 주소나 영문 kicker("DESTINY CARD")처럼 한글이 없어도 정본이다.
 */
function record(key, value, source, { requireKorean = true } = {}) {
  if (!key || typeof value !== "string") return;
  const trimmed = value.replace(/\s+/g, " ").trim();
  if (!trimmed) return;
  if (requireKorean && !/[가-힣]/.test(trimmed)) return;
  if (found.has(key)) return;
  found.set(key, { value: trimmed, source });
}

// ── 1. 수기 확정본 ────────────────────────────────────────────────────────
if (existsSync(overridePath)) {
  for (const [key, value] of Object.entries(flatten(JSON.parse(readFileSync(overridePath, "utf8"))))) {
    record(key, value, "override");
  }
}

// ── 2·3. 정적 셸 마크업 ───────────────────────────────────────────────────
const doc = new JSDOM(readFileSync(resolve(rootDir, "index.html"), "utf8")).window.document;
for (const el of doc.querySelectorAll("[data-cd-trans]")) {
  record(el.getAttribute("data-key") || el.getAttribute("data-cd-trans"), el.textContent || "", "shell:text", { requireKorean: false });
}
for (const el of doc.querySelectorAll("[data-cd-trans-attr]")) {
  for (const item of (el.getAttribute("data-cd-trans-attr") || "").split(",")) {
    const parts = item.trim().split(":");
    const attrName = String(parts.shift() || "").trim();
    const attrKey = parts.join(":").trim();
    if (attrName && attrKey) record(attrKey, el.getAttribute(attrName) || "", "shell:attr", { requireKorean: false });
  }
}

// ── 4. 모듈별 KO 테이블 (AST) ─────────────────────────────────────────────
const tableStats = [];
const collisions = [];
const baseLookup = flatten(base);

/** `a.b.c` 의 조상(`a`, `a.b`) 중 이미 문자열로 존재하는 경로가 있으면 그 경로를 돌려준다. */
function ancestorStringPath(key) {
  const parts = key.split(".");
  for (let i = 1; i < parts.length; i += 1) {
    const path = parts.slice(0, i).join(".");
    if (typeof baseLookup[path] === "string") return path;
  }
  return null;
}
const codeFiles = [...walkSourceFiles(rootDir)];

for (const file of codeFiles) {
  const source = readFileSync(file, "utf8");
  if (!/_TRANSLATIONS|_BY_LOCALE|_LOCALE_COPY/.test(source)) continue;
  if (!/[가-힣]/.test(source)) continue;
  const ast = parseJs(source);
  if (!ast) continue;
  const relPath = relative(rootDir, file);
  const ns = deriveNamespace(source, relPath);

  walkAst(ast, (node) => {
    if (node.type !== "VariableDeclarator" || node.id.type !== "Identifier") return;
    if (!TABLE_NAME_RE.test(node.id.name)) return;
    const table = literalValue(node.init);
    if (!table || typeof table !== "object" || Array.isArray(table)) return;
    if (!table.ko || typeof table.ko !== "object") return;
    if (!ns) {
      tableStats.push({ file: relPath, table: node.id.name, namespace: null, keys: 0, skipped: "네임스페이스 유도 실패" });
      return;
    }
    const flat = flatten(table.ko);
    let n = 0;
    for (const [key, value] of Object.entries(flat)) {
      if (typeof value !== "string") continue;
      record(`${ns}.${key}`, value, "module:table");
      n += 1;
    }
    tableStats.push({ file: relPath, table: node.id.name, namespace: ns, keys: n });
  });

  // 네임스페이스를 유도하지 못한 테이블 중, **키 자체가 이미 정규화된** 것들이 있다.
  // 예: SIBYL_TEXT_TRANSLATIONS.ko 는 "sibyl.title.001" 처럼 완전한 키를 쓴다.
  // 이 경우 접두어를 덧붙이면 안 되고 키를 그대로 사전에 넣어야 한다.
  if (ns) continue;
  walkAst(ast, (node) => {
    if (node.type !== "VariableDeclarator" || node.id.type !== "Identifier") return;
    if (!TABLE_NAME_RE.test(node.id.name)) return;
    const table = literalValue(node.init);
    if (!table?.ko || typeof table.ko !== "object") return;
    const flat = flatten(table.ko);
    const keys = Object.keys(flat);
    const firstSegments = new Set(keys.map((k) => k.split(".")[0]));
    // 모든 키가 점을 포함하고 첫 세그먼트가 하나로 모이면 자체 네임스페이스로 본다
    const selfNamespaced = keys.length > 1
      && keys.every((k) => k.includes("."))
      && firstSegments.size === 1
      && /^[a-z][A-Za-z0-9]*$/.test([...firstSegments][0]);
    if (!selfNamespaced) return;
    let n = 0;
    for (const [key, value] of Object.entries(flat)) {
      if (typeof value !== "string") continue;
      // 🔴 충돌 가드. 모듈 테이블의 "sibyl.title.001" 을 그대로 넣으면 사전에 이미
      // 문자열로 있던 "sibyl.title"(셸 마커가 쓰던 제목)이 객체로 덮여 사라진다.
      // 실제로 한 번 잃었다 — 조상 경로가 문자열인 키는 넣지 않고 보고한다.
      const clash = ancestorStringPath(key);
      if (clash) { collisions.push({ key, clash, file: relPath }); continue; }
      record(key, value, "module:table");
      n += 1;
    }
    tableStats.push({ file: relPath, table: node.id.name, namespace: `${[...firstSegments][0]} (자체)`, keys: n });
  });
}

// ── 5. 호출부 fallback 리터럴 ─────────────────────────────────────────────
const WRAPPER_NAMES = [...PASSTHROUGH_WRAPPERS, ...Object.keys(PREFIXED_WRAPPERS)];
const CALL_RE = new RegExp(
  `\\b(${WRAPPER_NAMES.join("|")})\\s*\\(\\s*(['"])([A-Za-z][\\w.]*?)\\2\\s*,([\\s\\S]{0,300}?)\\)`,
  "g",
);
for (const file of [...codeFiles, resolve(rootDir, "index.html")]) {
  const source = readFileSync(file, "utf8");
  if (!WRAPPER_NAMES.some((w) => source.includes(`${w}(`))) continue;
  CALL_RE.lastIndex = 0;
  let match;
  while ((match = CALL_RE.exec(source))) {
    const literals = [...match[4].matchAll(/(['"])((?:\\.|(?!\1)[^\\])*)\1/g)].map((m) => decodeEscapes(m[2]));
    const korean = literals.reverse().find((s) => /[가-힣]/.test(s));
    if (!korean) continue;
    const prefix = PREFIXED_WRAPPERS[match[1]];
    record(prefix ? `${prefix}.${match[3]}` : match[3], korean, "call:fallback");
  }
}

// ── en.json 구조를 따라 ko 트리 생성 ─────────────────────────────────────
// 🔴 복원 못 한 키는 **영어 값으로 채우지 않는다**. 한국어 로케일에 영어를 넣으면
// 게이트는 통과하면서 사용자에겐 영어가 보이는, 가장 나쁜 형태의 거짓 완결이 된다.
// 미복원 키는 그냥 빠지고, verify:i18n-ko-coverage 가 커버리지를 추적한다.
const OMITTED = Symbol("omitted");
const missing = [];
const placeholderDropped = [];
const placeholdersOf = (value) =>
  [...String(value).matchAll(/\{[A-Za-z0-9_.-]+\}/g)].map((m) => m[0]).sort().join("\0");
function build(node, prefix = "") {
  if (Array.isArray(node)) {
    const items = node.map((item, i) => build(item, `${prefix}.${i}`));
    // 배열은 인덱스가 키의 일부라 부분 생략이 불가능하다 — 하나라도 비면 통째로 뺀다
    return items.some((v) => v === OMITTED) ? OMITTED : items;
  }
  if (node && typeof node === "object") {
    const out = {};
    for (const [k, v] of Object.entries(node)) {
      const built = build(v, prefix ? `${prefix}.${k}` : k);
      if (built !== OMITTED) out[k] = built;
    }
    return Object.keys(out).length ? out : OMITTED;
  }
  if (typeof node !== "string") return node; // _version 등 비문자열은 유지
  const hit = found.get(prefix);
  if (!hit) { missing.push(prefix); return OMITTED; }
  // 🔴 보간 자리표시자 손실 검사. `safeSubscription + ' · 오늘도…'` 같은 호출부에서는
  // 리터럴 조각만 긁히면서 {subscription} 이 사라진다. 그대로 채우면 i18n:check 의
  // placeholder 검사에 걸리고, 무엇보다 런타임 보간이 조용히 깨진다. 버리는 쪽이 옳다.
  if (placeholdersOf(node) !== placeholdersOf(hit.value)) {
    placeholderDropped.push(prefix);
    missing.push(prefix);
    return OMITTED;
  }
  return hit.value;
}
const built = build(base);
const koTree = built === OMITTED ? {} : built;

// ── 집계 ─────────────────────────────────────────────────────────────────
const baseFlat = flatten(base);
const baseStringKeys = Object.entries(baseFlat).filter(([, v]) => typeof v === "string").map(([k]) => k);
const bySource = {};
for (const key of baseStringKeys) {
  const hit = found.get(key);
  if (hit) bySource[hit.source] = (bySource[hit.source] || 0) + 1;
}
const recovered = baseStringKeys.length - missing.length;

/** 사전에 아직 없는 키 — 이게 곧 "비한국어 사용자에게 Translation pending으로 보이는" 구멍이다. */
const orphanKeys = [...found.keys()].filter((k) => !(k in baseFlat));
const orphanByNamespace = {};
for (const key of orphanKeys) {
  const ns = key.split(".")[0];
  orphanByNamespace[ns] = (orphanByNamespace[ns] || 0) + 1;
}

console.log(`[extract-ko] 기준 키(문자열)  : ${baseStringKeys.length}`);
console.log(`[extract-ko] 원문 복원        : ${recovered} (${((recovered / baseStringKeys.length) * 100).toFixed(1)}%)`);
for (const [source, count] of Object.entries(bySource).sort((a, b) => b[1] - a[1])) {
  console.log(`[extract-ko]    ${source.padEnd(15)} ${count}`);
}
console.log(`[extract-ko] 미복원          : ${missing.length}`);
if (collisions.length) {
  console.log(`[extract-ko] 🔴 키 충돌로 제외 : ${collisions.length}`);
  console.log("[extract-ko]    (조상 경로가 이미 문자열인 키 — 넣으면 기존 문구가 사라진다)");
  collisions.slice(0, 8).forEach((c) => console.log(`[extract-ko]      ${c.key}  ← "${c.clash}" 와 충돌  (${c.file})`));
}
if (placeholderDropped.length) {
  console.log(`[extract-ko]    ↳ 자리표시자 손실로 폐기: ${placeholderDropped.length} (${placeholderDropped.slice(0, 5).join(", ")})`);
}
console.log("");
console.log(`[extract-ko] 🔴 사전에 없는 키(고아) : ${orphanKeys.length}`);
console.log("[extract-ko]    → 비한국어 사용자에게 'Translation pending'으로 노출되는 구간");
for (const [ns, n] of Object.entries(orphanByNamespace).sort((a, b) => b[1] - a[1]).slice(0, 15)) {
  console.log(`[extract-ko]    ${String(n).padStart(6)}  ${ns}`);
}
console.log("");
console.log(`[extract-ko] KO 테이블 수집   : ${tableStats.filter((t) => t.namespace).length}개 테이블`);
for (const t of tableStats.filter((t) => t.namespace).sort((a, b) => b.keys - a.keys).slice(0, 12)) {
  console.log(`[extract-ko]    ${String(t.keys).padStart(6)}  ${t.namespace.padEnd(24)} ${t.file}`);
}
const skipped = tableStats.filter((t) => !t.namespace);
if (skipped.length) {
  console.log(`[extract-ko] 네임스페이스 유도 실패 테이블: ${skipped.length}`);
  skipped.slice(0, 10).forEach((t) => console.log(`[extract-ko]      ${t.table}  (${t.file})`));
}

if (probeOnly) {
  console.log("[extract-ko] --probe 모드: 파일을 기록하지 않았습니다.");
  process.exit(0);
}

writeFileSync(outPath, `${JSON.stringify(koTree, null, 2)}\n`, "utf8");

/**
 * 고아 키(코드는 요구하는데 사전엔 없는 키)의 한국어 원문을 네임스페이스별로 내보낸다.
 * 이 파일이 곧 번역 파이프라인의 입력이자, "Translation pending 구멍"의 정확한 명세다.
 */
const pendingDir = resolve(rootDir, "i18n", "pending");
mkdirSync(pendingDir, { recursive: true });
// 추출 규칙이 바뀌면 키 이름도 바뀐다. 이전 실행의 산출물을 남겨 두면 폐기된 키가
// 번역 파이프라인 입력으로 되살아나 사전 최상위에 쓰레기 키가 생긴다.
// 🔴 단 다른 도구가 소유한 파일은 건드리지 않는다. 이 목록에서 빠지면 그 도구의 산출물이
// 이 스크립트를 한 번 돌리는 것만으로 조용히 사라진다(2026-08-25 실측: shellRuntime.ko.json
// 1,114키와 loveSimulationScenes.ko.json 4,699키가 둘 다 삭제 대상이었다).
//   shell.ko.json              ← scripts/i18n-mark-shell.mjs
//   shellRuntime.ko.json       ← scripts/i18n-extract-runtime-ui.mjs
//   loveSimulationScenes.ko.json ← scripts/i18n-extract-love-simulation.mjs
const FOREIGN_PENDING = new Set(["shell.ko.json", "shellRuntime.ko.json", "loveSimulationScenes.ko.json"]);
for (const stale of readdirSync(pendingDir)) {
  if (!stale.endsWith(".ko.json") || FOREIGN_PENDING.has(stale)) continue;
  rmSync(join(pendingDir, stale));
}
const pendingByNamespace = {};
for (const key of orphanKeys) {
  const ns = key.split(".")[0];
  (pendingByNamespace[ns] ||= {})[key] = found.get(key).value;
}
let pendingChars = 0;
for (const [ns, entries] of Object.entries(pendingByNamespace)) {
  const chars = Object.values(entries).join("").match(/[가-힣]/g)?.length || 0;
  pendingChars += chars;
  writeFileSync(join(pendingDir, `${ns}.ko.json`), `${JSON.stringify(entries, null, 2)}\n`, "utf8");
  console.log(`[extract-ko]    pending/${ns}.ko.json  ${Object.keys(entries).length}키 / ${chars}자`);
}
console.log(`[extract-ko] 번역 대기 총 한글 : ${pendingChars}자 × 11개 언어`);

mkdirSync(resolve(rootDir, "reports"), { recursive: true });
writeFileSync(
  reportPath,
  `${JSON.stringify({
    generatedFrom: "scripts/i18n-extract-ko.mjs",
    baseStringKeys: baseStringKeys.length,
    recovered,
    bySource,
    missingKeys: missing,
    orphanKeys: orphanKeys.sort(),
    orphanByNamespace,
    tables: tableStats,
  }, null, 2)}\n`,
  "utf8",
);
console.log(`[extract-ko] 기록: ${relative(rootDir, outPath)}, ${relative(rootDir, reportPath)}`);
