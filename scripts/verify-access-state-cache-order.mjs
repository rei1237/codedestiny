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
 *   🔴 같은 이유로 **결제 직후**도 새지 않아야 한다. 결제는 이용권을 늘리는 쪽이라 방향만 반대일 뿐,
 *   TTL 동안 옛 스냅샷이 나가면 방금 산 기능이 잠긴 채로 보인다(진입 판정이 로컬 스냅샷이므로).
 *   막는 수단은 두 개이고 **둘 다 있어야 한다**: 클라이언트가 x-code-destiny-cache-refresh 를 실은
 *   강제 GET 을 보내는 것(축 ③), 그리고 서버가 잔량 캐시를 버릴 때 스냅샷도 함께 버리는 것(축 ④).
 *
 * 🔴 fail-closed 축은 네 개다.
 *   ① 탈퇴 기록자 발견 — 소스 전수에서 `status: "withdrawn"` 을 쓰는 파일을 찾아, 그 파일이
 *      invalidateAccessStateCacheForUser 를 그 기록 **뒤에** 부르지 않으면 실패한다. 손으로 쓴 파일
 *      목록이 아니므로, 나중에 두 번째 탈퇴 경로가 생겨도 자동으로 걸린다. 발견이 0건이면
 *      (=탐지 정규식이 낡았으면) 그것도 실패다 — 검사 대상이 없을 때 통과시키는 가드는 가드가 아니다.
 *   ② 조회 위치 — readAccessStateCache 호출을 소스에서 전수로 찾아 **가장 이른 것**이
 *      requireUserFromRequest 보다 앞인지 본다. 특정 변수명이나 주석에 기대지 않는다.
 *   ③ 결제 후 강제 새로고침 호출자 — refreshUserAccessAfterPayment 는 **표면마다** 정의와 호출이
 *      함께 있어야 한다(정적 셸 = index.html + js/**, App Router = app/**). 정의를 못 찾으면 실패고,
 *      정의만 있고 호출이 0이면도 실패다. 실제로 2026-08-31 까지 **양쪽 다 호출자 0** 이었다 —
 *      배관은 다 깔렸는데 아무도 부르지 않아서, 결제 직후 최대 60초간 옛 스냅샷이 나갔다.
 *   ④ 잔량 캐시와의 짝 — worker/** 에서 표시용 잔량 캐시를 버리는 파일을 전수 발견해, 같은 파일이
 *      access-state 스냅샷도 버리는지 본다. 두 캐시는 같은 사건(결제·차감·환불)에 낡으므로 한쪽만
 *      버리면 잔량은 맞는데 잠금은 틀린 상태가 남는다. 버리는 방법은 세 가지를 인정한다:
 *      정적 import 호출 · __accessStateCache 직접 호출 · 접근결정 캐시 청크포인트에 위임.
 *      🔴 위임을 인정하려면 그 청크포인트가 실제로 access-state 를 버려야 하므로, 청크포인트 바인딩을
 *      소스에서 찾아 본문까지 확인한다(못 찾으면 실패 — 위임 인정이 공수표가 되면 안 된다).
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

const REFRESH_FN = "refreshUserAccessAfterPayment";
const SHELL_ENTRY = "index.html";
const SHELL_DIR = "js";
const APP_DIR = "app";
/** 정적 셸의 정의는 세션 캐시 객체의 프로퍼티다. */
const SHELL_REFRESH_DEF = new RegExp(`${REFRESH_FN}\\s*:\\s*function\\s*\\(`);
/** App Router 의 정의는 모듈 export 다. */
const APP_REFRESH_DEF = new RegExp(`export\\s+async\\s+function\\s+${REFRESH_FN}\\s*\\(`);
/** 표시용 잔량 캐시 무효화 — 이 호출이 있으면 access-state 도 함께 버려야 한다. */
const BALANCE_INVALIDATE = "globalThis.__billingBalanceCache?.invalidateForUser?.(";
const ACCESS_STATE_OPTIONAL = "globalThis.__accessStateCache?.invalidateForUser?.(";
const DECISION_OPTIONAL = "globalThis.__paidAccessDecisionCache?.invalidateForUser?.(";
/** 접근결정 캐시 청크포인트 바인딩 — 위임을 인정하기 전에 이 함수 본문을 확인한다. */
const DECISION_BIND = /paidAccessDecisionCache\.invalidateForUser\s*=\s*([A-Za-z_$][\w$]*)\s*;/;

function read(relativePath) {
  return readFileSync(resolve(root, relativePath), "utf8");
}

function walkJs(dirRelative, extensions = [".js"]) {
  const out = [];
  const stack = [resolve(root, dirRelative)];
  while (stack.length) {
    const dir = stack.pop();
    for (const entry of readdirSync(dir)) {
      if (entry === "node_modules" || entry.startsWith(".")) continue;
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) stack.push(full);
      else if (extensions.some((ext) => entry.endsWith(ext))) out.push([relative(root, full).replace(/\\/g, "/"), readFileSync(full, "utf8")]);
    }
  }
  return out.sort((a, b) => a[0].localeCompare(b[0]));
}

/** 주석 줄이 아닌 실제 등장 위치만 돌려준다. */
function occurrences(source, needle) {
  const out = [];
  let at = source.indexOf(needle);
  while (at !== -1) {
    const lineStart = source.lastIndexOf("\n", at) + 1;
    const linePrefix = source.slice(lineStart, at).trimStart();
    if (!linePrefix.startsWith("//") && !linePrefix.startsWith("*")) out.push(at);
    at = source.indexOf(needle, at + 1);
  }
  return out;
}

/** 주석 줄이 아닌 실제 호출 위치만 돌려준다. */
function callIndexes(source, name) {
  return occurrences(source, `${name}(`);
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

/**
 * 축 ③ — 결제 후 강제 새로고침이 **표면마다** 정의되고 실제로 불리는지.
 *
 * 표면을 나눠 세는 이유: 한쪽에만 호출자가 있으면 다른 표면 사용자는 그대로 60초를 기다린다.
 * 정의 자체를 소스에서 찾으므로, 함수 이름이 바뀌면 "호출 0"이 아니라 "정의 0"으로 먼저 실패한다.
 */
export function auditPaymentRefreshWiring(shellSources, appSources) {
  const problems = [];

  const shellDefined = shellSources.some(([, source]) => SHELL_REFRESH_DEF.test(source));
  if (!shellDefined) {
    problems.push(`정적 셸에서 ${REFRESH_FN} 정의를 못 찾았다 — 가드 정규식이 낡았다(정의 0건은 통과가 아니다).`);
  } else {
    // 셸은 파일이 하나(index.html)라 "정의 밖"으로 못 가른다. 대신 **멤버 호출** 형태로 가른다 —
    // 정의는 `refreshUserAccessAfterPayment: function ()` 이라 앞에 점이 없다.
    const callers = shellSources.filter(([, source]) => callIndexes(source, `.${REFRESH_FN}`).length);
    if (!callers.length) {
      problems.push(`정적 셸에 ${REFRESH_FN} 호출자가 없다 — 결제 직후 셸 사용자는 스냅샷 TTL 동안 잠긴 화면을 본다.`);
    }
  }

  const appDefinition = appSources.find(([, source]) => APP_REFRESH_DEF.test(source));
  if (!appDefinition) {
    problems.push(`App Router 에서 ${REFRESH_FN} 정의를 못 찾았다 — 가드 정규식이 낡았다(정의 0건은 통과가 아니다).`);
  } else {
    // 정의 모듈 안의 훅 래퍼(useCallback)는 호출자로 안 센다 — 그것만으로는 아무도 안 부르는 상태다.
    const callers = appSources.filter(([file, source]) => file !== appDefinition[0] && callIndexes(source, REFRESH_FN).length);
    if (!callers.length) {
      problems.push(`App Router 에 ${REFRESH_FN} 호출자가 없다(정의 모듈 ${appDefinition[0]} 안의 래퍼는 세지 않는다).`);
    }
  }

  return problems;
}

/** 지정한 함수의 본문(첫 줄부터 열 0 의 닫는 중괄호까지)을 잘라 돌려준다. */
function functionBody(source, name) {
  const at = source.indexOf(`function ${name}(`);
  if (at === -1) return "";
  const end = source.indexOf("\n}", at);
  return source.slice(at, end === -1 ? source.length : end);
}

/**
 * 축 ④ — 표시용 잔량 캐시를 버리는 곳은 access-state 스냅샷도 버려야 한다.
 *
 * 두 캐시는 같은 사건(결제·차감·환불)에 낡는다. 한쪽만 버리면 잔량은 맞는데 잠금은 틀린 상태가
 * 남아서, 사용자에게는 "결제는 됐는데 콘텐츠가 안 열린다"로 보인다. 실제로 PortOne 확정 경로와
 * 월정석 차감/복구 경로가 그 상태였다(2026-08-31).
 */
export function auditBalanceInvalidationParity(sources) {
  const problems = [];
  const writers = sources.filter(([, source]) => occurrences(source, BALANCE_INVALIDATE).length);

  if (!writers.length) {
    return ["표시용 잔량 캐시를 버리는 곳을 한 곳도 못 찾았다 — 탐지 문자열이 낡았다(검사 대상 0건은 통과가 아니다)."];
  }

  // 위임을 인정하기 전에 청크포인트 계약을 확인한다: 그 함수가 정말 access-state 를 버리는가.
  let delegateOk = false;
  for (const [, source] of sources) {
    const bind = source.match(DECISION_BIND);
    if (!bind) continue;
    delegateOk = functionBody(source, bind[1]).includes(ACCESS_STATE_OPTIONAL);
    break;
  }
  if (!delegateOk) {
    problems.push(`접근결정 캐시 청크포인트(paidAccessDecisionCache.invalidateForUser)가 ${ACCESS_STATE_OPTIONAL} 를 부르지 않는다 — 그 위임에 기대던 결제·환불 경로가 통째로 스냅샷을 안 버린다.`);
  }

  for (const [file, source] of writers) {
    const staticallyImported = new RegExp(`import\\s*\\{[^}]*\\b${INVALIDATOR}\\b[^}]*\\}\\s*from\\s*["'][^"']*access-state(?:-cache)?\\.js["']`).test(source);
    if (staticallyImported && callIndexes(source, INVALIDATOR).length) continue;
    if (occurrences(source, ACCESS_STATE_OPTIONAL).length) continue;
    if (delegateOk && occurrences(source, DECISION_OPTIONAL).length) continue;
    problems.push(`${file}: 잔량 캐시만 버리고 access-state 스냅샷은 그대로 둔다 — 결제 직후 잔량은 맞는데 잠금이 틀린 창이 TTL 만큼 남는다.`);
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

  // ── 축 ③: 결제 후 새로고침 호출자 ──────────────────────────────────────────
  const shellSources = [[SHELL_ENTRY, read(SHELL_ENTRY)], ...walkJs(SHELL_DIR)];
  const appSources = walkJs(APP_DIR, [".ts", ".tsx", ".js", ".jsx"]);
  const refreshBaseline = auditPaymentRefreshWiring(shellSources, appSources);
  if (refreshBaseline.length) throw new Error(`self-test 기준선 실패(축 ③):\n  ${refreshBaseline.join("\n  ")}`);

  const appDefinition = appSources.find(([, source]) => APP_REFRESH_DEF.test(source));
  const stripCalls = (list, skipFile) => list.map(([file, source]) => [
    file,
    file === skipFile ? source : source.split(`${REFRESH_FN}(`).join("__silenced("),
  ]);

  const refreshMutations = [
    ["셸 호출자를 전부 지운다", () => auditPaymentRefreshWiring(stripCalls(shellSources, null), appSources)],
    ["App Router 호출자를 전부 지운다(정의 모듈의 래퍼만 남긴다)", () => auditPaymentRefreshWiring(shellSources, stripCalls(appSources, appDefinition[0]))],
    ["셸 정의를 지운다", () => auditPaymentRefreshWiring(shellSources.map(([f, s]) => [f, s.replace(SHELL_REFRESH_DEF, "__renamed: function (")]), appSources)],
    ["App Router 정의를 지운다", () => auditPaymentRefreshWiring(shellSources, appSources.map(([f, s]) => [f, s.replace(APP_REFRESH_DEF, "export async function __renamed(")]))],
  ];
  for (const [label, run] of refreshMutations) {
    if (run().length === 0) throw new Error(`단언이 공허하다 — ${label}`);
  }

  // ── 축 ④: 잔량 캐시와의 짝 ─────────────────────────────────────────────────
  const parityBaseline = auditBalanceInvalidationParity(sources);
  if (parityBaseline.length) throw new Error(`self-test 기준선 실패(축 ④):\n  ${parityBaseline.join("\n  ")}`);

  const parityMutations = [
    ["청크포인트가 access-state 를 안 버리게 만든다", (list) => list.map(([f, s]) => [f, s.split(ACCESS_STATE_OPTIONAL).join("__silenced(")])],
    ["잔량만 버리는 새 파일이 들어온다", (list) => [...list, ["worker/lib/ghost-balance.js", `${BALANCE_INVALIDATE}uid); }\n`]]],
  ];
  for (const [label, mutate] of parityMutations) {
    const mutated = mutate(sources);
    if (auditBalanceInvalidationParity(mutated).length === 0) throw new Error(`단언이 공허하다 — ${label}`);
  }

  console.log(`[verify-access-state-cache-order] self-test passed (라우트 ${routeMutations.length} · 배선 ${wiringMutations.length} · 발견 1 · 새로고침 ${refreshMutations.length} · 잔량짝 ${parityMutations.length})`);
}

function main() {
  if (process.argv.includes("--self-test")) return runSelfTest();

  const sources = walkJs(WORKER_DIR);
  const shellSources = [[SHELL_ENTRY, read(SHELL_ENTRY)], ...walkJs(SHELL_DIR)];
  const appSources = walkJs(APP_DIR, [".ts", ".tsx", ".js", ".jsx"]);
  const failures = [
    ...auditRouteOrder(read(ROUTE_PATH)),
    ...auditWithdrawalWiring(sources),
    ...auditPaymentRefreshWiring(shellSources, appSources),
    ...auditBalanceInvalidationParity(sources),
  ];

  if (failures.length) {
    console.error("[verify-access-state-cache-order] FAIL");
    for (const failure of failures) console.error(`  - ${failure}`);
    process.exit(1);
  }

  const writers = sources.filter(([, source]) => WITHDRAW_WRITE.test(source)).map(([file]) => file);
  const balanceWriters = sources.filter(([, source]) => occurrences(source, BALANCE_INVALIDATE).length).length;
  const shellCalls = shellSources.reduce((sum, [, source]) => sum + callIndexes(source, `.${REFRESH_FN}`).length, 0);
  const appDefinition = appSources.find(([, source]) => APP_REFRESH_DEF.test(source));
  const appCalls = appSources.reduce((sum, [file, source]) => sum + (file === appDefinition?.[0] ? 0 : callIndexes(source, REFRESH_FN).length), 0);
  console.log(`[verify-access-state-cache-order] OK — 조기 조회가 인증보다 앞이고, 탈퇴 기록자 ${writers.length}곳(${writers.join(" · ")}) 전부 무효화를 부른다.`);
  console.log(`  결제 후 새로고침 호출: 셸 ${shellCalls} · App Router ${appCalls} / 잔량 캐시 무효화 ${balanceWriters}곳 전부 access-state 도 버린다.`);
}

main();
