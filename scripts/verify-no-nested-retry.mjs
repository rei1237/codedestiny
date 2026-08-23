/**
 * 중첩 재시도 금지 가드 (CLAUDE.md 코딩 원칙 6 "중첩 사전검사"의 검사 도구)
 *
 * 배경:
 *   withMongoRetry 는 각 시도를 per-attempt 타임아웃으로 감싸고, 연결 레벨 실패마다
 *   resetMongooseConnection 을 유발한다. 이미 재시도를 가진 함수를 밖에서 또 감싸면
 *   시도 횟수와 재연결이 배수로 늘어 재연결 폭풍에 가까워지는 반면, op-타임아웃은
 *   설계상 재시도 대상이 아니라 정작 나아지는 것이 없다.
 *
 *   실제 사고: /api/profile 503 을 고친다며 requireUserFromRequest 를 감쌌는데
 *   worker/lib/auth.js 의 resolveActiveUserAuth 가 이미 재시도 중이었다.
 *
 * 검사 방법:
 *   이름 grep 은 오탐이 난다(함수 본문 추출이 다음 함수까지 넘쳐 잡아 9곳 오탐한 전례).
 *   그래서 함수 본문을 중괄호 균형으로 정확히 잘라 내부를 확인한다.
 *
 * 실행: npm run verify:no-nested-retry
 */

import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { isBuildArtifactDir } from "./lib/source-scan-ignore.mjs";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const SEP = String.fromCharCode(92);
const LF = String.fromCharCode(10);
/** withMongoRetry 첫 인자가 콜백이면 true. 올바른 형태는 언제나 env(식별자) + 쉼표다. */
function callbackCameFirst(head) {
  const t = String(head).trimStart();
  return t.startsWith("(") || t.startsWith("async") || t.startsWith("function");
}
const workerRoot = resolve(root, "worker");

function collectJsFiles(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    // 빌드 산출물은 원본이 아니라 번들이라 검사 대상이 아니다.
    // (.wrangler·node_modules 만 막고 있었는데, --outdir 이 만드는 build-cache 로 실제로 뚫렸다.)
    if (isBuildArtifactDir(entry)) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) collectJsFiles(full, out);
    else if (entry.endsWith(".js")) out.push(full);
  }
  return out;
}

function escapeRe(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** from 위치의 여는 괄호부터 짝이 맞는 닫는 괄호까지의 인덱스(포함). 못 찾으면 -1. */
function matchBalanced(source, from, open, close) {
  let depth = 0;
  for (let i = from; i < source.length; i += 1) {
    if (source[i] === open) depth += 1;
    else if (source[i] === close) {
      depth -= 1;
      if (depth === 0) return i;
    }
  }
  return -1;
}

/**
 * 선언부 뒤 첫 '{' 부터 중괄호 균형이 맞는 지점까지를 본문으로 잘라낸다.
 * `function f() {}` 뿐 아니라 `const f = () => {}` / `const f = async () => expr` 도 인식한다 —
 * 화살표 const 만 쓰는 함수를 놓치면(예: 예전의 resolveProfileIdFromDb) 후보에서 통째로 빠진다.
 */
function functionBody(source, name) {
  const escaped = escapeRe(name);
  const declaration = new RegExp(
    `(?:export\\s+)?(?:async\\s+)?function\\s+${escaped}\\s*\\([^)]*\\)\\s*\\{`,
  );
  const match = declaration.exec(source);
  if (match) {
    const end = matchBalanced(source, match.index + match[0].length - 1, "{", "}");
    return end < 0 ? null : source.slice(match.index, end + 1);
  }

  const arrow = new RegExp(
    `(?:export\\s+)?(?:const|let|var)\\s+${escaped}\\s*=\\s*(?:async\\s*)?\\(`,
  );
  const arrowMatch = arrow.exec(source);
  if (!arrowMatch) return null;
  const parenOpen = source.indexOf("(", arrowMatch.index + arrowMatch[0].length - 1);
  const parenClose = matchBalanced(source, parenOpen, "(", ")");
  if (parenClose < 0) return null;
  const afterArrow = source.indexOf("=>", parenClose);
  if (afterArrow < 0) return null;
  let cursor = afterArrow + 2;
  while (cursor < source.length && /\s/.test(source[cursor])) cursor += 1;
  if (source[cursor] === "{") {
    const end = matchBalanced(source, cursor, "{", "}");
    return end < 0 ? null : source.slice(arrowMatch.index, end + 1);
  }
  // 블록 없는 화살표식: 다음 문장 경계(세미콜론)까지를 본문으로 본다.
  const semi = source.indexOf(";", cursor);
  return source.slice(arrowMatch.index, semi < 0 ? source.length : semi + 1);
}

/** 소스에서 선언된 모든 함수 이름(함수 선언 + 화살표 const). */
function declaredFunctionNames(source) {
  const names = new Set();
  for (const match of source.matchAll(/(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*\(/g)) names.add(match[1]);
  for (const match of source.matchAll(/(?:export\s+)?(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s*)?\(/g)) names.add(match[1]);
  return names;
}

const files = collectJsFiles(workerRoot);
console.log(`=== 중첩 재시도 검사 (worker/*.js ${files.length}개) ===\n`);

/* [1] 내부에 재시도를 가진 함수를 밖에서 또 감싸지 않는가.
   ⚠️ 함수명은 파일마다 겹친다(hasPaidPayment·resolveServerAccess 가 AI 라우트마다 따로 있다).
   전역 이름 맵으로 보면 남의 파일 동명이인을 자기 것으로 착각해 오탐한다 — 반드시 모듈 스코프로 본다.
   같은 파일에 정의된 함수 + 그 파일이 명시적으로 import 한 함수만 후보로 삼는다. */
const sources = new Map(files.map((file) => [file, readFileSync(file, "utf8")]));

// 각 파일의 함수 본문을 한 번만 잘라 둔다(모듈 스코프 유지 — 파일마다 동명이인이 흔하다).
const bodiesByFile = new Map();
for (const [file, source] of sources) {
  const bodies = new Map();
  for (const name of declaredFunctionNames(source)) {
    const body = functionBody(source, name);
    if (body) bodies.set(name, body);
  }
  bodiesByFile.set(file, bodies);
}

/** 이 파일이 named import 로 가져온 이름 → 원본 파일 경로 */
function importedNameOrigins(file, source) {
  const origins = new Map();
  for (const match of source.matchAll(/import\s*\{([^}]+)\}\s*from\s*["']([^"']+)["']/g)) {
    const names = match[1].split(",").map((part) => part.trim().split(/\s+as\s+/)[0].trim()).filter(Boolean);
    const specifier = match[2];
    if (!specifier.startsWith(".")) continue;
    const target = resolve(file, "..", specifier.endsWith(".js") ? specifier : `${specifier}.js`);
    if (!sources.has(target)) continue;
    for (const name of names) origins.set(name, target);
  }
  return origins;
}

const importOriginsByFile = new Map(
  [...sources].map(([file, source]) => [file, importedNameOrigins(file, source)]),
);

/**
 * "재시도를 품은 함수" 집합을 호출그래프 고정점으로 넓힌다(전이 폐포).
 * 1-hop 만 보던 예전 판정은 본문에 withMongoRetry 문자열이 없는 중간 함수에서 끊겼다 —
 * 예: getMembershipPassForBillingRequest 는 자기 본문엔 없고 readSubscriptionStatusSnapshot →
 * getOptionalUserFromRequest(auth.js 재시도)로 내려간다. 그 사이에 낀 호출부가 밖에서 또 감싸도
 * 예전 가드는 통과시켰다.
 */
const retryFunctionsByFile = new Map([...sources.keys()].map((file) => [file, new Map()]));
for (const [file, bodies] of bodiesByFile) {
  const local = retryFunctionsByFile.get(file);
  for (const [name, body] of bodies) {
    if (body.includes("withMongoRetry(")) local.set(name, relative(root, file).replace(/\\/g, "/"));
  }
}

for (let pass = 0; pass < 12; pass += 1) {
  let grew = false;
  for (const [file, bodies] of bodiesByFile) {
    const local = retryFunctionsByFile.get(file);
    const imported = importOriginsByFile.get(file);
    for (const [name, body] of bodies) {
      if (local.has(name)) continue;
      for (const [calleeName, calleeFile] of [
        ...[...local.keys()].map((n) => [n, file]),
        ...[...imported].map(([n, f]) => [n, f]),
      ]) {
        if (calleeName === name) continue;
        if (!retryFunctionsByFile.get(calleeFile)?.has(calleeName)) continue;
        if (!new RegExp(`\\b${escapeRe(calleeName)}\\s*\\(`).test(body)) continue;
        local.set(name, retryFunctionsByFile.get(calleeFile).get(calleeName));
        grew = true;
        break;
      }
    }
  }
  if (!grew) break;
}

/** 이 파일이 named import 로 가져온 함수 중, 원본 모듈에서 내부 재시도를 가진 것 */
function importedRetryFunctions(file) {
  const found = new Map();
  for (const [name, target] of importOriginsByFile.get(file) || []) {
    const origin = retryFunctionsByFile.get(target);
    if (origin?.has(name)) found.set(name, origin.get(name));
  }
  return found;
}

const nested = [];
for (const [file, source] of sources) {
  const candidates = new Map([...retryFunctionsByFile.get(file), ...importedRetryFunctions(file)]);
  if (!candidates.size) continue;
  // 🔴 콜백을 길이 제한 정규식으로 자르지 않는다. 예전에는 [\s\S]{0,600} 이라 600자를 넘는 콜백의
  // 뒷부분이 통째로 검사에서 빠졌다. 여는 괄호부터 괄호 균형으로 정확히 잘라 전체를 본다.
  for (const match of source.matchAll(/withMongoRetry\s*\(/g)) {
    const open = match.index + match[0].length - 1;
    const close = matchBalanced(source, open, "(", ")");
    if (close < 0) continue;
    const callback = source.slice(open + 1, close);
    for (const [name, definedIn] of candidates) {
      if (!new RegExp(`\\b${escapeRe(name)}\\s*\\(`).test(callback)) continue;
      nested.push({
        at: `${relative(root, file).replace(/\\/g, "/")}:${source.slice(0, match.index).split("\n").length}`,
        wraps: name,
        definedIn,
      });
    }
  }
}

assert.deepEqual(
  nested.map((row) => `${row.at} → ${row.wraps}() (${row.definedIn} 에서 이미 재시도)`),
  [],
  "중첩 재시도가 발견됐습니다. 밖에서 감싸지 말고 원래 지점을 고치세요.",
);
const retryFunctionCount = new Set(
  [...retryFunctionsByFile.values()].flatMap((perFile) => [...perFile.keys()]),
).size;
console.log(`[1] 내부 재시도 함수 ${retryFunctionCount}종 — 이중으로 감싼 곳 없음 OK`);

/* [2] 인증 진입점은 감싸지 않는다.
   인증의 실제 DB 읽기는 auth.js 안쪽에 있고, 그 위 계층을 감싸는 순간 중첩이 된다. */
const AUTH_ENTRY_POINTS = ["getOptionalUserFromRequest", "requireUserFromRequest", "resolvePaidRouteAuth", "requireAuth"];
const wrappedAuth = [];
for (const file of files) {
  const source = readFileSync(file, "utf8");
  for (const match of source.matchAll(/withMongoRetry\(\s*\w+\s*,\s*(?:async\s*)?\(\)\s*=>\s*([\s\S]{0,400}?)(?:\n\s*\}|\),\s*\{|\)\);|\)\))/g)) {
    for (const name of AUTH_ENTRY_POINTS) {
      if (!new RegExp(`\\b${name}\\s*\\(`).test(match[1])) continue;
      wrappedAuth.push(`${relative(root, file).replace(/\\/g, "/")}:${source.slice(0, match.index).split("\n").length} → ${name}()`);
    }
  }
}
assert.deepEqual(
  wrappedAuth,
  [],
  "인증 진입점을 withMongoRetry 로 감쌌습니다. 인증 DB 읽기는 auth.js 안쪽에서 이미 재시도됩니다.",
);
console.log(`[2] 인증 진입점(${AUTH_ENTRY_POINTS.length}종)을 감싼 곳 없음 OK`);

/* [3] 그 대신 안쪽 재시도는 반드시 살아 있어야 한다.
   중첩을 없앤다고 밑에서까지 걷어내면 인증이 무방비가 된다. */
const authSource = readFileSync(resolve(workerRoot, "lib/auth.js"), "utf8");
for (const name of ["resolveActiveUserAuth", "verifyRefreshSessionToAuth"]) {
  const body = functionBody(authSource, name);
  assert.ok(body, `worker/lib/auth.js 에 ${name} 가 없습니다`);
  assert.ok(
    body.includes("withMongoRetry("),
    `${name}: 인증 DB 읽기의 유일한 재시도가 사라졌습니다 — 여기서만큼은 반드시 감싸야 합니다.`,
  );
}
console.log("[3] 인증 DB 읽기의 단일 재시도 지점 유지 OK");

/* [4] withMongoRetry 는 (env, operation) 순서다.
   콜백을 첫 인자로 넘기면 operation 이 undefined 가 되어 TypeError 를 던지는데, 호출부는 거의
   항상 그 예외를 catch 해 null/false 로 접는다. 그러면 재시도가 아니라 **그 DB 연산 자체가
   영구 실패**하고 로그에는 "DB 장애처럼 보이는" 메시지만 남는다.
   실사고: worker/routes/human-design.js 4곳이 이 형태였고 아카이브가 한 번도 동작하지 않았다
   (같은 출생 데이터에 매번 천문 재계산 + 해석 재열람마다 LLM 재호출). 2026-09 수정. */
const badRetryOrder = [];
for (const [file, source] of sources) {
  const rel = relative(root, file).split(SEP).join("/");
  let at = source.indexOf("withMongoRetry(");
  while (at >= 0) {
    if (callbackCameFirst(source.slice(at + "withMongoRetry(".length, at + 40))) {
      badRetryOrder.push(rel + ":" + (source.slice(0, at).split(LF).length));
    }
    at = source.indexOf("withMongoRetry(", at + 1);
  }
}
assert.deepEqual(
  badRetryOrder,
  [],
  "withMongoRetry(env, operation) 인자 순서 위반 — 콜백이 첫 인자로 갔습니다: " + badRetryOrder.join(", "),
);
console.log("[4] withMongoRetry 인자 순서 OK (" + sources.size + "개 파일)");

console.log("\n중첩 재시도 검사 통과.\n");
