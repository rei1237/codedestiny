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

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const workerRoot = resolve(root, "worker");

function collectJsFiles(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    // 빌드 산출물은 원본이 아니라 번들이라 검사 대상이 아니다.
    if (entry === ".wrangler" || entry === "node_modules") continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) collectJsFiles(full, out);
    else if (entry.endsWith(".js")) out.push(full);
  }
  return out;
}

/** 선언부 뒤 첫 '{' 부터 중괄호 균형이 맞는 지점까지를 본문으로 잘라낸다. */
function functionBody(source, name) {
  const declaration = new RegExp(
    `(?:export\\s+)?(?:async\\s+)?function\\s+${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\([^)]*\\)\\s*\\{`,
  );
  const match = declaration.exec(source);
  if (!match) return null;
  let depth = 0;
  for (let i = match.index + match[0].length - 1; i < source.length; i += 1) {
    if (source[i] === "{") depth += 1;
    else if (source[i] === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(match.index, i + 1);
    }
  }
  return null;
}

const files = collectJsFiles(workerRoot);
console.log(`=== 중첩 재시도 검사 (worker/*.js ${files.length}개) ===\n`);

/* [1] 내부에 재시도를 가진 함수를 밖에서 또 감싸지 않는가.
   ⚠️ 함수명은 파일마다 겹친다(hasPaidPayment·resolveServerAccess 가 AI 라우트마다 따로 있다).
   전역 이름 맵으로 보면 남의 파일 동명이인을 자기 것으로 착각해 오탐한다 — 반드시 모듈 스코프로 본다.
   같은 파일에 정의된 함수 + 그 파일이 명시적으로 import 한 함수만 후보로 삼는다. */
const sources = new Map(files.map((file) => [file, readFileSync(file, "utf8")]));
const retryFunctionsByFile = new Map();
for (const [file, source] of sources) {
  const local = new Map();
  if (source.includes("withMongoRetry")) {
    for (const match of source.matchAll(/(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*\(/g)) {
      const name = match[1];
      if (local.has(name)) continue;
      const body = functionBody(source, name);
      if (body && body.includes("withMongoRetry(")) local.set(name, relative(root, file).replace(/\\/g, "/"));
    }
  }
  retryFunctionsByFile.set(file, local);
}

/** 이 파일이 named import 로 가져온 함수 중, 원본 모듈에서 내부 재시도를 가진 것 */
function importedRetryFunctions(file, source) {
  const found = new Map();
  for (const match of source.matchAll(/import\s*\{([^}]+)\}\s*from\s*["']([^"']+)["']/g)) {
    const names = match[1].split(",").map((part) => part.trim().split(/\s+as\s+/)[0].trim()).filter(Boolean);
    const specifier = match[2];
    if (!specifier.startsWith(".")) continue;
    const target = resolve(file, "..", specifier.endsWith(".js") ? specifier : `${specifier}.js`);
    const targetSource = sources.get(target);
    if (!targetSource) continue;
    for (const name of names) {
      const body = functionBody(targetSource, name);
      if (body && body.includes("withMongoRetry(")) found.set(name, relative(root, target).replace(/\\/g, "/"));
    }
  }
  return found;
}

const nested = [];
for (const [file, source] of sources) {
  const candidates = new Map([...retryFunctionsByFile.get(file), ...importedRetryFunctions(file, source)]);
  if (!candidates.size) continue;
  for (const match of source.matchAll(/withMongoRetry\(\s*\w+\s*,\s*(?:async\s*)?\(\)\s*=>\s*([\s\S]{0,600}?)(?:\n\s*\}|\),\s*\{|\)\);|\)\))/g)) {
    const callback = match[1];
    for (const [name, definedIn] of candidates) {
      if (!new RegExp(`\\b${name}\\s*\\(`).test(callback)) continue;
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

console.log("\n중첩 재시도 검사 통과.\n");
