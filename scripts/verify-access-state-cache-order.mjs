#!/usr/bin/env node
/**
 * GET /api/me/access-state 의 **스냅샷 조회 순서**와 그 대가를 갚는 무효화 배선 가드.
 *
 * 왜 필요한가:
 *   이 라우트는 캐시 히트일 때 requireUserFromRequest 를 **건너뛴다**. 그게 이 최적화의 전부다 —
 *   Cloudflare 는 요청 컨텍스트가 끝나면 Mongo 소켓을 못 쓰게 만들어서, 인증 왕복은 히트든 미스든
 *   매번 새 핸드셰이크를 낸다. 조회를 인증 앞으로 옮겨야 그 값을 실제로 아낀다.
 *
 *   🔴 그런데 그 인증이 하던 일이 하나 더 있었다: 탈퇴 계정 거부(worker/lib/auth.js 의 isWithdrawnUser).
 *   액세스 JWT 에는 폐기 검사가 없으므로, 조회가 인증 앞으로 가면 탈퇴 뒤에도 캐시가 살아 있는 동안
 *   유효한 이용권 스냅샷이 계속 나간다. 그 창을 닫는 것은 탈퇴 라우트의 무효화 호출 **하나뿐**이다.
 *   즉 이 가드가 지키는 것은 "순서"가 아니라 **순서와 무효화의 쌍**이다. 한쪽만 남으면 조용히 샌다.
 *
 * 🔴 fail-closed 축은 두 개다.
 *   ① 탈퇴 기록자 발견 — 소스 전수에서 `status: "withdrawn"` 을 쓰는 파일을 찾아, 그 파일이
 *      invalidateAccessStateCacheForUser 를 그 기록 **뒤에** 부르지 않으면 실패한다. 손으로 쓴 파일
 *      목록이 아니므로, 나중에 두 번째 탈퇴 경로가 생겨도 자동으로 걸린다. 발견이 0건이면
 *      (=탐지 정규식이 낡았으면) 그것도 실패다 — 검사 대상이 없을 때 통과시키는 가드는 가드가 아니다.
 *   ② 조회 위치 — readAccessStateCache 호출을 소스에서 전수로 찾아 **가장 이른 것**이
 *      requireUserFromRequest 보다 앞인지 본다. 특정 변수명이나 주석에 기대지 않는다.
 *
 * 실행: npm run verify:access-state-cache-order [--self-test]
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { resolve, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const ROUTE_PATH = "worker/routes/access-state.js";
const WORKER_DIR = "worker";
const INVALIDATOR = "invalidateAccessStateCacheForUser";
/** 탈퇴 기록의 형태. 이 정규식이 낡아 0건이 되면 가드가 실패한다(fail-closed). */
const WITHDRAW_WRITE = /status:\s*"withdrawn"/;

function read(relativePath) {
  return readFileSync(resolve(root, relativePath), "utf8");
}

function walkJs(dirRelative) {
  const out = [];
  const stack = [resolve(root, dirRelative)];
  while (stack.length) {
    const dir = stack.pop();
    for (const entry of readdirSync(dir)) {
      if (entry === "node_modules" || entry.startsWith(".")) continue;
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) stack.push(full);
      else if (entry.endsWith(".js")) out.push([relative(root, full).replace(/\\/g, "/"), readFileSync(full, "utf8")]);
    }
  }
  return out.sort((a, b) => a[0].localeCompare(b[0]));
}

/** 주석 줄이 아닌 실제 호출 위치만 돌려준다. */
function callIndexes(source, name) {
  const out = [];
  const needle = `${name}(`;
  let at = source.indexOf(needle);
  while (at !== -1) {
    const lineStart = source.lastIndexOf("\n", at) + 1;
    const linePrefix = source.slice(lineStart, at).trimStart();
    if (!linePrefix.startsWith("//") && !linePrefix.startsWith("*")) out.push(at);
    at = source.indexOf(needle, at + 1);
  }
  return out;
}

/** 라우트의 조회 순서와 조기 경로의 안전조건. */
export function auditRouteOrder(routeSource) {
  const problems = [];
  const authAt = routeSource.indexOf("await requireUserFromRequest(");
  const reads = callIndexes(routeSource, "readAccessStateCache");

  if (authAt === -1) return ["access-state 라우트에서 requireUserFromRequest 호출을 못 찾았다 — 가드 정규식이 낡았다."];
  if (!reads.length) return ["access-state 라우트에서 readAccessStateCache 호출을 못 찾았다 — 가드 정규식이 낡았다."];

  const earliest = reads[0];
  if (earliest > authAt) {
    problems.push("스냅샷 조회가 인증 DB 왕복 **뒤**에 있다 — 캐시 히트여도 Mongo 핸드셰이크를 그대로 낸다.");
    return problems;
  }

  const statementStart = routeSource.lastIndexOf("\n    const ", earliest);
  const statement = routeSource.slice(statementStart === -1 ? 0 : statementStart, routeSource.indexOf(";", earliest) + 1);
  if (!statement.includes("requestedProfileId")) {
    problems.push("조기 조회가 요청 profileId 로 제한되지 않았다 — 빈 키는 아이솔레이트 로컬 폴백을 타서 옛 프로필 스냅샷이 나간다.");
  }
  if (!statement.includes("forceRefresh")) {
    problems.push("조기 조회가 강제 새로고침을 존중하지 않는다 — 결제 직후 새로고침이 옛 스냅샷을 그대로 돌려준다.");
  }

  if (!routeSource.includes("CREDENTIAL_CACHE_REFRESH_HEADER")) {
    problems.push("라우트가 CREDENTIAL_CACHE_REFRESH_HEADER 를 읽지 않는다 — forceRefresh 가 상수 false 가 된다.");
  }

  const earlyRegion = routeSource.slice(earliest, authAt);
  if (!earlyRegion.includes("responseFor(")) {
    problems.push("조기 히트가 responseFor 를 안 거친다 — ETag·Cache-Control·304 계약이 조용히 바뀐다.");
  }
  if (!earlyRegion.includes('"hit-early"')) {
    problems.push('조기 히트에 trace 표식("hit-early")이 없다 — 인증을 건너뛴 히트를 운영에서 셀 수 없다.');
  }

  const lateRegion = routeSource.slice(authAt);
  if (!/forceRefresh\s*\?\s*null\s*:\s*readAccessStateCache\(/.test(lateRegion)) {
    problems.push("인증 뒤 조회가 강제 새로고침을 존중하지 않는다 — 리프레시 폴백 사용자는 새로고침이 여전히 헛돈다.");
  }

  return problems;
}

/** 탈퇴 기록자 전수 발견 → 무효화 배선 단언. */
export function auditWithdrawalWiring(sources) {
  const problems = [];
  const writers = sources.filter(([, source]) => WITHDRAW_WRITE.test(source));

  if (!writers.length) {
    return ['`status: "withdrawn"` 기록자를 한 곳도 못 찾았다 — 탐지 정규식이 낡았다(검사 대상 0건은 통과가 아니다).'];
  }

  for (const [file, source] of writers) {
    // 🔴 globalThis.__accessStateCache?.invalidateForUser?.() 같은 옵셔널 경유는 fail-open 이다 —
    //    worker/lib/access-state.js 가 그 아이솔레이트에서 아직 로드되지 않았으면 조용히 아무 일도
    //    안 한다. 그래서 여기서는 정적 import 를 요구한다.
    const imported = new RegExp(`import\\s*\\{[^}]*\\b${INVALIDATOR}\\b[^}]*\\}\\s*from\\s*["'][^"']*access-state(?:-cache)?\\.js["']`).test(source);
    if (!imported) {
      problems.push(`${file}: 탈퇴를 기록하면서 ${INVALIDATOR} 를 access-state 캐시 모듈에서 정적 import 하지 않는다.`);
      continue;
    }
    const writeAt = source.search(WITHDRAW_WRITE);
    const calls = callIndexes(source, INVALIDATOR).filter((at) => at > writeAt);
    if (!calls.length) {
      problems.push(`${file}: 탈퇴 기록 뒤에 ${INVALIDATOR} 호출이 없다 — 탈퇴한 계정이 캐시 TTL 동안 유효한 이용권 스냅샷을 계속 받는다.`);
    }
  }

  return problems;
}

function runSelfTest() {
  const routeSource = read(ROUTE_PATH);
  const sources = walkJs(WORKER_DIR);

  const baseline = [...auditRouteOrder(routeSource), ...auditWithdrawalWiring(sources)];
  if (baseline.length) throw new Error(`self-test 기준선 실패:\n  ${baseline.join("\n  ")}`);

  const earliest = callIndexes(routeSource, "readAccessStateCache")[0];
  const statementStart = routeSource.lastIndexOf("\n    const ", earliest);
  const earlyStatement = routeSource.slice(statementStart, routeSource.indexOf(";", earliest) + 1);

  const routeMutations = [
    ["조기 조회를 없앤다", (t) => t.replace(earlyStatement, "\n    const earlyCached = null;")],
    ["profileId 제한을 푼다", (t) => t.replace(earlyStatement, earlyStatement.replace(/requestedProfileId/g, "storedFallback"))],
    ["강제 새로고침 존중을 뺀다", (t) => t.replace(earlyStatement, earlyStatement.replace(/!forceRefresh &&\s*/, ""))],
    ["헤더 상수를 뗀다", (t) => t.replace(/CREDENTIAL_CACHE_REFRESH_HEADER/g, '"x-legacy"')],
    ["조기 히트를 responseFor 없이 만든다", (t) => t.replace('return finish(responseFor(earlyCached, false, request), "");', 'return finish(json(earlyCached), "");')],
    ["trace 표식을 지운다", (t) => t.replace('trace.cache = "hit-early";', 'trace.cache = "hit";')],
    ["인증 뒤 조회의 새로고침 분기를 되돌린다", (t) => t.replace("forceRefresh ? null : readAccessStateCache(userId, { profileId, include })", "readAccessStateCache(userId, { profileId, include })")],
  ];

  for (const [label, mutate] of routeMutations) {
    const mutated = mutate(routeSource);
    if (mutated === routeSource) throw new Error(`self-test 픽스처가 라우트를 못 바꿨다: ${label}`);
    if (auditRouteOrder(mutated).length === 0) throw new Error(`단언이 공허하다 — ${label}`);
  }

  const withdrawFile = sources.find(([, source]) => WITHDRAW_WRITE.test(source));
  if (!withdrawFile) throw new Error("self-test: 탈퇴 기록자를 못 찾았다");

  const wiringMutations = [
    ["무효화 호출을 지운다", (s) => s.replace(new RegExp(`\\n\\s*${INVALIDATOR}\\([^)]*\\);`), "")],
    ["무효화 import 를 지운다", (s) => s.replace(new RegExp(`import \\{ ${INVALIDATOR} \\} from "\\.\\./lib/access-state-cache\\.js";\\n`), "")],
  ];

  for (const [label, mutate] of wiringMutations) {
    const mutatedSources = sources.map(([file, source]) => (file === withdrawFile[0] ? [file, mutate(source)] : [file, source]));
    if (mutatedSources.find(([file]) => file === withdrawFile[0])[1] === withdrawFile[1]) {
      throw new Error(`self-test 픽스처가 탈퇴 라우트를 못 바꿨다: ${label}`);
    }
    if (auditWithdrawalWiring(mutatedSources).length === 0) throw new Error(`단언이 공허하다 — ${label}`);
  }

  // 🔴 발견이 소스 기반인지도 증명한다: 탈퇴를 기록하는 새 파일이 배선 없이 들어오면 실패해야 한다.
  const ghost = [...sources, ["worker/routes/ghost-withdraw.js", 'await User.updateOne({}, { $set: { status: "withdrawn" } });\n']];
  if (auditWithdrawalWiring(ghost).length === 0) throw new Error("단언이 공허하다 — 배선 없는 새 탈퇴 경로를 못 잡는다");

  console.log(`[verify-access-state-cache-order] self-test passed (라우트 ${routeMutations.length} · 배선 ${wiringMutations.length} · 발견 1)`);
}

function main() {
  if (process.argv.includes("--self-test")) return runSelfTest();

  const sources = walkJs(WORKER_DIR);
  const failures = [...auditRouteOrder(read(ROUTE_PATH)), ...auditWithdrawalWiring(sources)];

  if (failures.length) {
    console.error("[verify-access-state-cache-order] FAIL");
    for (const failure of failures) console.error(`  - ${failure}`);
    process.exit(1);
  }

  const writers = sources.filter(([, source]) => WITHDRAW_WRITE.test(source)).map(([file]) => file);
  console.log(`[verify-access-state-cache-order] OK — 조기 조회가 인증보다 앞이고, 탈퇴 기록자 ${writers.length}곳(${writers.join(" · ")}) 전부 무효화를 부른다.`);
}

main();
