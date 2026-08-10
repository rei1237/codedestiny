/**
 * @jest-environment node
 *
 * "이용권 확인이 결제창에서 503 으로 죽는다"의 회귀 가드.
 *
 * 프로덕션 실측(wrangler tail, 라이브 워커 a0ce5dbf):
 *   [db-op-timeout] totalMs:12000 connectMs:1525 opMs:10475 inFlightOps:1
 *                   commandStarted:47 checkedOut:46 maxCheckoutWaitMs:2440 maxCommandMs:228
 * 개별 쿼리는 228ms 로 빠르고 동시성 게이트도 포화가 아니었다(inFlightOps 1). 죽은 원인은
 * **한 요청이 내는 Mongo 왕복 수**다 — 커넥션 5개짜리 풀에서 46회 체크아웃하느라 체크아웃 대기가
 * 2.44초까지 밀렸고 그 합이 12초 상한을 넘겼다.
 *
 * 그 왕복 증폭의 정체는 coin-gate 이용권 조회가 **같은 User 문서를 세 번 읽는 것**이었다:
 *   ① getActiveMembershipPassForUser(authUserDoc 재사용, 0회)
 *   ② readSubscriptionStatusSnapshot 의 getOptionalUserFromRequest — 인증 왕복
 *   ③ readSubscriptionStatusSnapshot 의 connectDb + User.findById
 * ②③ 은 ① 이 같은 문서로 이미 내린 판정을 재생산할 뿐이라(select 목록이
 * BILLING_SNAPSHOT_USER_PROJECTION 의 부분집합) 새로 알아내는 것이 없었다. 초과하면
 * COIN_GATE_PASS_RESOLVE_TIMEOUT → isDatabaseUnavailableError → 503
 * PASS_STATUS_TEMPORARILY_UNAVAILABLE 이 된다.
 *
 * 이 경로가 선택되는 조건 hasResolvableSubscriptionSignal 은 "만료 구독 잔재(expiresAt·planId·
 * customerUid…)" 같은 **계정 문서의 속성**이라 매 요청 재현된다. 그래서 증상이 "간헐적"이 아니라
 * "항상"이었다. ("월정석 잔량 > 0" 도 신호로 세던 것은 2026-08-10 에 제거했다 — 위임은 tier 없이
 * active 를 낼 수 없어 월정석 보유자 전원이 결과가 정해진 위임을 타고 있었다.
 * 분류·신호 판정의 동작 가드는 __tests__/worker/billing.503-classification.test.js 에 있다.)
 */

import fs from "node:fs";
import path from "node:path";

const billingSource = fs.readFileSync(
  path.join(process.cwd(), "worker/routes/billing.js"),
  "utf8",
);

// 함수 본문을 중괄호 균형으로 잘라낸다.
// 🔴 매개변수 목록을 먼저 건너뛴다 — `options = {}` 같은 기본값의 중괄호를 본문 시작으로 오인하면
// 시그니처 한 줄만 잘려 나와, 단언이 조용히 "매칭 없음"으로 통과/실패한다.
function sliceFunction(source, header) {
  const start = source.indexOf(header);
  expect(start).toBeGreaterThanOrEqual(0);
  let paren = 0;
  let i = start;
  for (; i < source.length; i += 1) {
    const ch = source[i];
    if (ch === "(") paren += 1;
    else if (ch === ")") {
      paren -= 1;
      if (paren === 0) {
        i += 1;
        break;
      }
    }
  }
  let depth = 0;
  let seenBody = false;
  for (; i < source.length; i += 1) {
    const ch = source[i];
    if (ch === "{") {
      depth += 1;
      seenBody = true;
    } else if (ch === "}") {
      depth -= 1;
      if (seenBody && depth === 0) return source.slice(start, i + 1);
    }
  }
  throw new Error(`unbalanced braces for ${header}`);
}

describe("coin-gate 이용권 조회 왕복 수 가드", () => {
  test("스냅샷 위임에 이미 읽은 User 문서를 넘겨야 한다", () => {
    const fn = sliceFunction(
      billingSource,
      "async function getMembershipPassForBillingRequest(",
    );
    // 🔴 인자 없이 부르면 인증 왕복 + User.findById 가 되살아나 3왕복으로 돌아간다.
    expect(fn).toMatch(
      /readSubscriptionStatusSnapshot\(request, env, authUserDoc\)/,
    );
    expect(fn).not.toMatch(/readSubscriptionStatusSnapshot\(request, env\)/);
  });

  test("문서를 받으면 인증 왕복과 User.findById 를 둘 다 건너뛴다", () => {
    const fn = sliceFunction(
      billingSource,
      "async function readSubscriptionStatusSnapshot(",
    );
    expect(fn).toMatch(/async function readSubscriptionStatusSnapshot\(request, env, resolvedUserDoc = null\)/);

    // 두 읽기는 반드시 "문서를 못 받았을 때"에만 도는 가드 안에 있어야 한다.
    const guardAt = fn.indexOf("if (!hasAuthContext) {");
    const authReadAt = fn.indexOf("getOptionalUserFromRequest(request, env)");
    const userReadAt = fn.indexOf("User.findById(auth.userId)");
    expect(guardAt).toBeGreaterThanOrEqual(0);
    expect(authReadAt).toBeGreaterThan(guardAt);
    expect(userReadAt).toBeGreaterThan(guardAt);

    // 판정 분기는 user 존재 여부가 아니라 인증 맥락으로 갈라야 한다 — 문서를 받았는데 그 문서가
    // null 인 경우(탈퇴 등)의 동작이 원본과 달라지면 안 된다.
    expect(fn).toMatch(/let hasAuthContext = Boolean\(resolvedUserDoc\);/);
    expect(fn).toMatch(/if \(hasAuthContext\) \{/);
  });

  test("각 왕복은 여전히 재시도 중첩 없이 유지된다", () => {
    const fn = sliceFunction(
      billingSource,
      "async function readSubscriptionStatusSnapshot(",
    );
    // 🔴 CLAUDE.md 원칙 6 — 안쪽(getOptionalUserFromRequest·handleFortuneRoutes)이 이미
    // 재시도를 갖고 있으므로 여기서 다시 감싸면 시도·재연결이 배수로 늘어난다.
    expect(fn).not.toMatch(/withMongoRetry/);
  });
});

describe("폐지된 코인 잔재가 만들던 왕복 가드", () => {
  test("잔액 스냅샷은 seed 경로에서도 요청 단위 인증 메모를 탄다", () => {
    const fn = sliceFunction(billingSource, "async function readBillingSnapshot(");
    // 예전에는 seed 경로만 "projection 없는 전체 문서가 필요하다"며 메모를 우회해 인증 왕복을
    // 하나 더 냈다. 정작 seed 가 보는 필드(points·profileSubscription)는 이미 들어 있었다.
    expect(fn).not.toMatch(/getOptionalUserFromRequest\(request, env, \{ surfaceDbInfraError: true, userProjection: null \}\)/);
    expect(fn).toMatch(/auth = await resolveBillingRequestAuth\(request, env\);/);
    // BILLING_SNAPSHOT_USER_PROJECTION 이 seed 판정 필드를 계속 담고 있어야 위 재사용이 성립한다.
    const projection = billingSource.slice(
      billingSource.indexOf("const BILLING_SNAPSHOT_USER_PROJECTION = {"),
      billingSource.indexOf("};", billingSource.indexOf("const BILLING_SNAPSHOT_USER_PROJECTION = {")),
    );
    expect(projection).toMatch(/\bpoints: 1,/);
    expect(projection).toMatch(/\bprofileSubscription: 1,/);
  });

  test("legacy seed 는 실제로 전환할 것이 있을 때만 왕복을 만든다", () => {
    const fn = sliceFunction(billingSource, "async function readBillingSnapshot(");
    // 이미 읽은 문서로 판정 → 필요할 때만 write. 무조건 호출로 되돌리면 안 된다.
    expect(fn).toMatch(/seedLegacyCredit === true && needsLegacyCoinCreditSeed\(user\)/);
    expect(fn).not.toMatch(/const seededUser = seedLegacyCredit === true\s*\r?\n?\s*\? await seedMembershipCreditFromUserDoc/);
    // seed 경로도 authUserDoc 를 재사용한다.
    expect(fn).toMatch(/const reusableUserDoc = auth\.authUserDoc \|\| null;/);
    // 🔴 단, 멱등 가드에 걸려 write 가 없었던 경우에만 다시 읽어야 한다 — 그 재조회가 사라지면
    // 갓 지급된 월정석을 pre-seed 문서로 0 으로 과소보고한다.
    expect(fn).toMatch(/if \(!seededUser\) \{[\s\S]{0,400}?User\.findById\(auth\.userId\)/);
    // 판정 함수는 seed 여부와 잔여 포인트를 모두 봐야 한다.
    const predicate = sliceFunction(billingSource, "function needsLegacyCoinCreditSeed(");
    expect(predicate).toMatch(/legacyCoinCreditSeeded === true/);
    expect(predicate).toMatch(/Number\(user\?\.points \|\| 0\) > 0/);
  });

  test("/api/billing/access 는 보안 단계가 읽은 인증을 재사용한다", () => {
    const fn = sliceFunction(billingSource, "async function handlePaidAccessCheck(");
    // /access 는 isBillingSecurityPath 라 enforceBillingRouteSecurity 가 이미 인증을 읽는다.
    // 메모를 안 타면 GET 100회/분 라우트가 매번 인증 왕복을 2회 낸다.
    expect(fn).toMatch(/const auth = await resolveBillingRequestAuth\(request, env\);/);
    expect(fn).not.toMatch(/getOptionalUserFromRequest\(request, env\)/);
  });
});

describe("월정석 재조회(fresh=1) 보호장치 가드", () => {
  test("fresh 는 캐시 읽기만 건너뛰고 in-flight 합류와 write-back 은 유지한다", () => {
    const fn = sliceFunction(
      billingSource,
      "async function handleBillingSnapshotBalance(",
    );
    // 예전에는 cacheUserId 를 fresh 일 때 "" 로 비워, 캐시 키가 사라지면서 성공 write-back 까지
    // 함께 죽었다 — 재조회를 누를수록 매번 인증+조회 왕복을 새로 내고(coin-gate 와 같은 커넥션 풀을
    // 경합) 캐시는 영영 안 채워졌다.
    expect(fn).not.toMatch(/const cacheUserId = isFresh \? "" :/);
    expect(fn).toMatch(
      /const cacheUserId = await peekAccessTokenUserId\(request, env\)\.catch\(\(\) => ""\);/,
    );
    // 건너뛰는 것은 캐시 '읽기' 하나뿐이어야 한다.
    expect(fn).toMatch(/if \(cacheKey && !isFresh\) \{/);
    // write-back 은 cacheKey 만 보고 살아 있어야 한다.
    // (요청 간 in-flight Promise 합류는 Workers 위법이라 제거됐다 — worker/routes/billing.js 주석 참고.)
    expect(fn).toMatch(/writeBillingBalanceToCache\(cacheKey, snapshot\);/);
    expect(fn).not.toMatch(/billingBalanceCache\.inFlight/);
  });
});
