#!/usr/bin/env node
/**
 * `$setOnInsert` 안에 `updatedAt` 을 넣는 upsert 를 금지한다.
 *
 * 왜 정적 검사인가: 이 버그는 인메모리 store 로 재현되지 않는다. Mongoose 가 update 문서를
 * 조립하는 단계에서 생기고, 실패는 MongoDB 서버가 낸다. 그래서 단위 테스트로는 못 잡는다.
 *
 * 무슨 일이 있었나 (2026-08-09): `worker/lib/guardian-fortune-usage.js` 의 ensureGuest·ensureDaily 가
 *   { $setOnInsert: { …, createdAt: now, updatedAt: now } }
 * 를 보냈다. 두 스키마는 timestamps:true 이고, Mongoose 의 applyTimestampsToUpdate 는 updatedAt 을
 * 넣을 때 `$currentDate` 만 확인하고 **`$setOnInsert` 는 보지 않는다** — 그래서 `$set.updatedAt` 을
 * 무조건 덧붙인다. 결과적으로 updatedAt 이 두 연산자에 동시에 실려 MongoDB 가
 * ConflictingUpdateOperators(code 40)로 **매번** 거부했다.
 *
 * 피해: guardianFortuneGuestUsages 컬렉션에 문서가 단 하나도 만들어지지 못했고, 「연이 운명 상담」의
 * 게스트·로그인 무료·유료 경로가 전부 이 함수를 지나므로 기능 전체가 100% 죽어 있었다. 게다가
 * MongoServerError 라 isDbUnavailableError 가 "DB 일시 장애" 503 으로 위장해 며칠간 보이지 않았다.
 *
 * 올바른 형태: createdAt·updatedAt 은 아예 쓰지 않고 timestamps:true 에 맡긴다. 굳이 명시해야 하면
 * `$set: { updatedAt }` + `$setOnInsert: { createdAt }` 로 연산자를 분리한다
 * (정답 사례: worker/routes/neo-operation-room.js 의 migratedAt 갱신).
 *
 * 사용: node scripts/verify-no-timestamp-update-conflict.mjs
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

import { BUILD_ARTIFACT_DIRS } from "./lib/source-scan-ignore.mjs";

const ROOTS = ["worker", "lib", "server", "app", "models"];
const EXTENSIONS = new Set([".js", ".mjs", ".ts", ".tsx"]);
const SKIP_DIRECTORIES = new Set(BUILD_ARTIFACT_DIRS);
const MARKER = "$setOnInsert";

function walk(dir, files = []) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return files;
  }
  for (const entry of entries) {
    if (SKIP_DIRECTORIES.has(entry)) continue;
    const full = join(dir, entry);
    let info;
    try {
      info = statSync(full);
    } catch {
      continue;
    }
    if (info.isDirectory()) walk(full, files);
    else if (EXTENSIONS.has(full.slice(full.lastIndexOf(".")))) files.push(full);
  }
  return files;
}

/**
 * `$setOnInsert` 뒤에 오는 객체 리터럴을 **중괄호 균형으로** 잘라낸다. 이름 기반 정규식만 쓰면
 * 같은 update 문서의 다른 연산자($set 등)에 있는 updatedAt 까지 오탐한다.
 */
function extractBalancedObject(source, fromIndex) {
  const start = source.indexOf("{", fromIndex);
  if (start === -1) return "";
  let depth = 0;
  for (let i = start; i < source.length; i += 1) {
    const char = source[i];
    if (char === "{") depth += 1;
    else if (char === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(start, i + 1);
    }
  }
  return "";
}

function lineOf(source, index) {
  return source.slice(0, index).split("\n").length;
}

/**
 * `timestamps: false` 를 같은 연산에 준 경우는 안전하다 — Mongoose 가 타임스탬프 주입을 통째로
 * 건너뛰므로 $set.updatedAt 이 생기지 않는다. insert-only 계약을 지켜야 하는 upsert(예: 결제
 * 권한 백필)는 updatedAt 을 $set 으로 옮기면 기존 행을 건드리게 되므로 이쪽이 정답이다.
 * 형제 키라 블록 앞뒤 가까운 곳에 온다.
 */
function hasTimestampsOptOut(source, blockStart, blockEnd) {
  const window = source.slice(Math.max(0, blockStart - 600), Math.min(source.length, blockEnd + 600));
  return /timestamps\s*:\s*false/.test(window);
}

const violations = [];
for (const root of ROOTS) {
  for (const file of walk(root)) {
    const source = readFileSync(file, "utf8");
    if (!source.includes(MARKER)) continue;
    let cursor = source.indexOf(MARKER);
    while (cursor !== -1) {
      const block = extractBalancedObject(source, cursor + MARKER.length);
      // 키로 등장하는 경우만 본다 — 문자열 안의 우연한 일치를 배제한다.
      if (/(^|[{,\s])updatedAt\s*:/.test(block) && !hasTimestampsOptOut(source, cursor, cursor + block.length)) {
        violations.push({ file: relative(process.cwd(), file).replace(/\\/g, "/"), line: lineOf(source, cursor) });
      }
      cursor = source.indexOf(MARKER, cursor + MARKER.length);
    }
  }
}

if (violations.length) {
  console.error(`\n[verify-no-timestamp-update-conflict] 위반 ${violations.length}건 — $setOnInsert 안에 updatedAt 이 있습니다.`);
  console.error("timestamps:true 스키마에서는 Mongoose 가 $set.updatedAt 을 무조건 추가하므로");
  console.error("MongoDB 가 ConflictingUpdateOperators(code 40)로 그 쓰기를 매번 거부합니다.\n");
  for (const item of violations) console.error(`  ✗ ${item.file}:${item.line}`);
  console.error("\n고치는 법: $setOnInsert 에서 updatedAt(과 createdAt)을 빼고 timestamps 에 맡기거나,");
  console.error("           $set: { updatedAt } / $setOnInsert: { createdAt } 로 연산자를 분리하세요.");
  process.exit(1);
}
console.log("[verify-no-timestamp-update-conflict] 통과 — $setOnInsert 안에 updatedAt 없음");
