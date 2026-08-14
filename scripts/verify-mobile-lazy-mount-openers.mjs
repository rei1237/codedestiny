#!/usr/bin/env node
/**
 * 모바일 지연 마운트(mobile-home-lazy-mount) 복귀 경로 가드.
 *
 * index.html 의 그 블록은 모바일에서 오버레이를 DOM 밖으로 물리적으로 들어낸다(성능). 다시
 * 붙이는 경로는 actionTargets(data-action 탭) · functionTargets(window 함수 래핑) ·
 * collectTargetsFromEvent 의 리터럴 addIds 셋뿐이다. detach 목록에만 올리고 **여는 경로**
 * 등록을 빠뜨리면 그 오버레이는 모바일에서 영영 안 열린다 — 그런데 화면은 멀쩡하고 콘솔도
 * 조용해서(인라인 onclick 안의 TypeError 는 아무 데도 안 남는다) 아무도 모른다.
 *
 * 실사고: tsModal 은 targetIds 에 있는데 등록이 `closeModal` 하나뿐이었다. 여는 쪽이 없어
 * 십성 카드(showTsDetail)와 만세력 글자(showCharDetail)가 모바일에서 통째로 죽어 있었다.
 *
 * 그래서 이 가드는 목록을 손으로 들고 있지 않는다 — index.html 소스에서 targetIds 를 전수로
 * 읽어 미분류를 실패시킨다. 예외는 UNWIRED_BY_DESIGN 에 사유와 함께 선언한다.
 *
 * 사용법: node scripts/verify-mobile-lazy-mount-openers.mjs
 */
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { resolve, join } from "node:path";

const rootDir = process.cwd();
const MARKER = "mobile-home-lazy-mount-v20260701";

/**
 * 여는 경로가 없어도 되는 id. 반드시 사유를 남긴다.
 * "여는 코드가 없다"가 아니라 "여는 경로가 이 블록 밖에서 마운트를 보장한다"만 예외다.
 */
const UNWIRED_BY_DESIGN = {
  // 여기 새 항목을 넣기 전에: 정말 여는 경로가 필요 없는지, 아니면 등록을 빠뜨린 건지 먼저 본다.
};

/** 등록 키가 "닫는 동작"이면 여는 경로로 세지 않는다. */
function isCloserName(name) {
  return /^close/i.test(name) || /^reset/i.test(name);
}

const failures = [];
const fail = (message) => failures.push(message);

/** `open` 위치의 여는 괄호부터 짝이 맞는 닫는 괄호까지 잘라 낸다(문자열 리터럴 인식). */
function sliceBalanced(source, startIndex, openChar, closeChar) {
  let depth = 0;
  let quote = "";
  for (let i = startIndex; i < source.length; i += 1) {
    const ch = source[i];
    if (quote) {
      if (ch === "\\") { i += 1; continue; }
      if (ch === quote) quote = "";
      continue;
    }
    if (ch === "'" || ch === '"' || ch === "`") { quote = ch; continue; }
    if (ch === openChar) depth += 1;
    else if (ch === closeChar) {
      depth -= 1;
      if (depth === 0) return source.slice(startIndex, i + 1);
    }
  }
  return "";
}

function readBlock(html) {
  const start = html.indexOf(`data-cd-marker="${MARKER}"`);
  if (start === -1) return "";
  const end = html.indexOf("</script>", start);
  if (end === -1) return "";
  return html.slice(start, end);
}

/** `var <name> = [ ... ];` 안의 문자열 리터럴을 순서대로 뽑는다. */
function readStringArray(block, name) {
  const at = block.indexOf(`var ${name} = [`);
  if (at === -1) return null;
  const literal = sliceBalanced(block, block.indexOf("[", at), "[", "]");
  if (!literal) return null;
  return [...literal.matchAll(/['"]([^'"]+)['"]/g)].map((m) => m[1]);
}

/** `{ key: [...ids], ... }` 리터럴을 key → ids 로 읽는다. */
function readTargetMap(objectLiteral) {
  const map = {};
  const entry = /([A-Za-z_$][\w$]*|'[^']+'|"[^"]+")\s*:\s*\[([^\]]*)\]/g;
  let match;
  while ((match = entry.exec(objectLiteral)) !== null) {
    const key = match[1].replace(/^['"]|['"]$/g, "");
    map[key] = [...match[2].matchAll(/['"]([^'"]+)['"]/g)].map((m) => m[1]);
  }
  return map;
}

const shellPath = resolve(rootDir, "index.html");
if (!existsSync(shellPath)) {
  console.error("index.html 이 없습니다.");
  process.exit(1);
}

const block = readBlock(readFileSync(shellPath, "utf8"));
if (!block) {
  console.error(`index.html 에서 ${MARKER} 블록을 찾지 못했습니다.`);
  console.error("블록 이름이 바뀌었다면 이 가드의 MARKER 도 함께 고쳐야 합니다 (조용히 통과시키지 말 것).");
  process.exit(1);
}

const targetIds = readStringArray(block, "targetIds");
if (!targetIds || targetIds.length === 0) {
  console.error(`${MARKER} 블록에서 targetIds 배열을 읽지 못했습니다.`);
  process.exit(1);
}

const actionTargetsAt = block.indexOf("var actionTargets = {");
const actionTargets = actionTargetsAt === -1
  ? {}
  : readTargetMap(sliceBalanced(block, block.indexOf("{", actionTargetsAt), "{", "}"));

// functionTargets = Object.assign({ ...추가분... }, actionTargets)
const functionTargetsAt = block.indexOf("var functionTargets = Object.assign(");
const functionTargetsExtra = functionTargetsAt === -1
  ? {}
  : readTargetMap(sliceBalanced(block, block.indexOf("{", functionTargetsAt), "{", "}"));

if (Object.keys(actionTargets).length === 0) {
  console.error(`${MARKER} 블록에서 actionTargets 를 읽지 못했습니다.`);
  process.exit(1);
}

// collectTargetsFromEvent 의 리터럴 마운트(타일 비용·#resultPage 해시·사주 입력폼 등).
const literalMounted = new Set();
for (const match of block.matchAll(/addIds\(\s*ids\s*,\s*\[([^\]]*)\]\s*\)/g)) {
  for (const id of match[1].matchAll(/['"]([^'"]+)['"]/g)) literalMounted.add(id[1]);
}

/**
 * 세 번째 정당한 복귀 경로 — 여는 코드가 공개 API 로 직접 마운트한다
 * (window.__cdMobileHomeLazyMount.mount('<id>')). 액션 등록이 어려운 진입점(인라인 onclick 등)에
 * 쓴다. js/ 전체를 훑어 전수로 찾는다 — 목록을 손으로 들고 있으면 다음 파일이 조용히 빠진다.
 */
const jsFiles = [];
(function walk(dir) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry === "vendor" || entry === "node_modules") continue;
      walk(full);
    } else if (entry.endsWith(".js")) {
      jsFiles.push(full);
    }
  }
})(resolve(rootDir, "js"));

const apiMounted = new Map(); // id -> 파일 경로
// 뒤에 식별자 문자가 오면 다른 이름이다 — 오타(__cdMobileHomeLazyMountXX)를 통과시키지 않는다.
const API_NAME = /__cdMobileHomeLazyMount(?![A-Za-z0-9_$])/g;
for (const file of jsFiles) {
  const source = readFileSync(file, "utf8");
  for (const hit of source.matchAll(API_NAME)) {
    const nearby = source.slice(hit.index, hit.index + 400);
    for (const m of nearby.matchAll(/\.mount(?:Many)?\(\s*\[?\s*['"]([^'"]+)['"]/g)) {
      if (!apiMounted.has(m[1])) apiMounted.set(m[1], file.slice(rootDir.length + 1).replace(/\\/g, "/"));
    }
  }
}

const openers = new Map(); // id -> 여는 등록 이름들
const record = (id, name) => {
  if (!openers.has(id)) openers.set(id, []);
  openers.get(id).push(name);
};

for (const [name, ids] of Object.entries({ ...actionTargets, ...functionTargetsExtra })) {
  if (isCloserName(name)) continue;
  for (const id of ids) record(id, name);
}
for (const id of literalMounted) record(id, "collectTargetsFromEvent");
for (const [id, file] of apiMounted) record(id, `${file} (__cdMobileHomeLazyMount.mount)`);

for (const id of targetIds) {
  if (openers.has(id)) continue;
  if (UNWIRED_BY_DESIGN[id]) continue;
  const closerOnly = Object.entries(actionTargets)
    .filter(([name, ids]) => ids.includes(id) && isCloserName(name))
    .map(([name]) => name);
  const detail = closerOnly.length
    ? `등록이 닫는 동작뿐입니다 (${closerOnly.join(", ")}).`
    : "등록된 복귀 경로가 하나도 없습니다.";
  fail(
    `${id}: 모바일에서 detach 되는데 여는 경로가 없습니다. ${detail}\n` +
    `    → actionTargets/functionTargets 에 여는 액션을 등록하거나, 여는 코드에서 ` +
    `window.__cdMobileHomeLazyMount.mount('${id}') 를 먼저 부르세요.`,
  );
}

/**
 * tsModal 전용 규율 — 사주 엔진이 모달을 여는 지점은 반드시 마운트를 보장하는 헬퍼를 거쳐야 한다.
 * 여기서 막지 않으면 다음 수정이 다시 classList.add('show') 한 줄로 돌아가고 같은 버그가 재발한다.
 */
const SAJU_OPENER_FILES = ["js/saju-engine.js", "js/saju-engine-continuation.js"];
const HELPER_NAMES = ["openSajuDetailModal", "ensureSajuDetailModal"];

for (const relativePath of SAJU_OPENER_FILES) {
  const absolutePath = resolve(rootDir, relativePath);
  if (!existsSync(absolutePath)) {
    fail(`${relativePath}: 파일이 없습니다.`);
    continue;
  }
  const source = readFileSync(absolutePath, "utf8");
  const usesHelper = HELPER_NAMES.some((name) => source.includes(name));
  const opensTsModal = /getElementById\(\s*['"]tsModal['"]\s*\)[\s\S]{0,120}?classList\.add\(\s*['"]show['"]/.test(source)
    || /\btsModal\b[\s\S]{0,80}?classList\.add\(\s*['"]show['"]/.test(source);
  // #modalBody 를 마운트 보장 없이 바로 읽으면 detach 상태에서 null 이다.
  const readsModalBody = source.includes("getElementById('modalBody')") || source.includes('getElementById("modalBody")');
  if ((opensTsModal || readsModalBody) && !usesHelper) {
    fail(
      `${relativePath}: #tsModal 을 마운트 보장 없이 직접 엽니다. ` +
      `${HELPER_NAMES.join(" / ")} 를 거치세요 (모바일에서 노드가 DOM 밖에 있습니다).`,
    );
  }
}

if (failures.length > 0) {
  console.error("모바일 지연 마운트 복귀 경로 검사 실패:\n");
  for (const message of failures) console.error(`- ${message}`);
  console.error(`\n검사 대상: index.html ${MARKER} 블록의 targetIds ${targetIds.length}개.`);
  process.exit(1);
}

console.log("Mobile lazy-mount openers OK");
console.log(`- Detached targets: ${targetIds.length}`);
console.log(`- Opening registrations: ${openers.size}`);
