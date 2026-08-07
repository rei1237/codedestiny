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
 * 이 경로가 선택되는 조건 hasResolvableSubscriptionSignal 은 "월정석 잔량 > 0" 또는
 * "만료 구독 잔재(expiresAt·planId·customerUid…)"라 **계정 문서의 속성**이다 — 즉 매 요청
 * 재현된다. 그래서 증상이 "간헐적"이 아니라 "항상"이었다.
 */

import fs from "node:fs";
import path from "node:path";

const billingSource = fs.readFileSync(
  path.join(process.cwd(), "worker/routes/billing.js"),
  "utf8",
);

function sliceFunction(source, header) {
  const start = source.indexOf(header);
  expect(start).toBeGreaterThanOrEqual(0);
  let depth = 0;
  let seenBody = false;
  for (let i = start; i < source.length; i += 1) {
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

describe("월정석 재조회(fresh=1) 보호장치 가드", () => {
  test("fresh 는 캐시 읽기만 건너뛰고 in-flight 합류와 write-back 은 유지한다", () => {
    const fn = sliceFunction(
      billingSource,
      "async function handleBillingSnapshotBalance(",
    );
    // 예전에는 cacheUserId 를 fresh 일 때 "" 로 비워, 캐시 키가 사라지면서 in-flight 합류와
    // 성공 write-back 까지 함께 죽었다 — 재조회를 누를수록 매번 인증+조회 왕복을 새로 내고
    // (coin-gate 와 같은 커넥션 풀을 경합) 캐시는 영영 안 채워졌다.
    expect(fn).not.toMatch(/const cacheUserId = isFresh \? "" :/);
    expect(fn).toMatch(
      /const cacheUserId = await peekAccessTokenUserId\(request, env\)\.catch\(\(\) => ""\);/,
    );
    // 건너뛰는 것은 캐시 '읽기' 하나뿐이어야 한다.
    expect(fn).toMatch(/if \(cacheKey && !isFresh\) \{/);
    // in-flight 키와 write-back 은 cacheKey 만 보고 살아 있어야 한다.
    expect(fn).toMatch(/const snapshotInFlightKey = cacheKey/);
    expect(fn).toMatch(/writeBillingBalanceToCache\(cacheKey, snapshot\);/);
  });
});
