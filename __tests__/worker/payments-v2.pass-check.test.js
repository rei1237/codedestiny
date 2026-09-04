/**
 * @jest-environment node
 *
 * 이용권 검사 컷오버(POST /coin-gate/pass-check) — 판정·소비·응답 계약.
 *
 * 이 경로는 구 coin-gate MEMBERSHIP_PASS 분기가 왕복 4회(인증·이용권·프로필·소비 CAS)를 쓰던
 * 자리이고, M0 에서 그 팬아웃이 곧 커넥션 기아·503·"로그인이 필요합니다" 오탐이었다. 여기서
 * 고정하는 것은 세 가지다:
 *   ① 왕복 예산 — 신원은 JWT(Mongo 0회), 커버 판정·소비는 User 1읽기 + CAS 1쓰기
 *   ② 정책 — 건당 상한 + 단일 월 예산 2규칙(프리미엄 상담은 상한 우회, 예산에서만 차감)
 *   ③ 봉투 — 셸 판정기 `_cdIsMembershipFreePayload` 가 읽는 data.consume.accessType 등
 * 미커버는 반드시 402 로 나가야 한다(막다른 길 금지 — 결제창이 그 자리에서 인계받는다).
 */
import { handlePaymentsContext } from "../../worker/payments/index.js";
import { listProducts } from "../../worker/payments/catalog.js";
import { evaluatePassCoverage, terminatePassOnBudgetExhaustion } from "../../worker/payments/passes.js";
import { MIN_PASS_COVERABLE_COIN, MONTHLY_PASS_LIMITS, PASS_LIMITS } from "../../worker/lib/profile-limits.js";
import { makeFakePaymentDb } from "../fixtures/fake-payment-db.mjs";

const USER = "64b000000000000000000001";
const ENV = { JWT_ACCESS_SECRET: "test-access-secret-value-0123456789" };
const DAY_MS = 86_400_000;

// 건당 상한 안쪽의 저가 상품 하나를 레지스트리에서 고른다(가격 개정에 흔들리지 않게).
const CHEAP = listProducts().filter((p) => Number(p.priceCoins) > 0 && Number(p.priceCoins) <= PASS_LIMITS.standard)
  .sort((a, b) => Number(a.priceCoins) - Number(b.priceCoins))[0];

async function tokenFor(userId) {
  const { signAuthToken } = await import("../../worker/lib/auth.js");
  return signAuthToken({ _id: userId, email: "t@e.st", role: "user", name: "t" }, ENV);
}

function seedUser(db, profileSubscription) {
  const user = { _id: USER, points: 0, profileSubscription };
  db.rows.push(user);
  return user;
}

function activePass(tier, extra = {}) {
  return { tier, passTier: tier, isActive: true, expiresAt: new Date(Date.now() + 10 * DAY_MS), ...extra };
}

async function postPassCheck(db, body) {
  const request = new Request("https://code-destiny.com/api/payments/coin-gate/pass-check", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${await tokenFor(USER)}` },
    body: JSON.stringify(body),
  });
  const response = await handlePaymentsContext(request, ENV, {
    prefix: "/api/payments",
    withDb: (_env, _ctx, fn) => fn(db),
  });
  return { response, payload: await response.json(), ops: db.ctx.ops };
}

describe("정책 — 건당 상한 + 단일 월 예산 2규칙", () => {
  const ent = (tier) => ({ tier, passTier: tier, isActive: true, expiresAt: new Date(Date.now() + 10 * DAY_MS) });

  test("상한 이하 + 예산 여유 → 커버", () => {
    const result = evaluatePassCoverage({ user: { profileSubscription: activePass("standard") }, entitlement: ent("standard"), coinCost: 10 });
    expect(result.covered).toBe(true);
    expect(result.tier).toBe("standard");
  });

  test("건당 상한 초과(프리미엄 미만) → price_exceeds_pass_limit", () => {
    const over = PASS_LIMITS.standard + 1;
    const result = evaluatePassCoverage({ user: { profileSubscription: activePass("standard") }, entitlement: ent("standard"), coinCost: over });
    expect(result.covered).toBe(false);
    expect(result.reason).toBe("price_exceeds_pass_limit");
  });

  test("🔴 건당 상한 우회는 폐지됐다 — 고가 상담(300코인)은 family 만 커버한다", () => {
    // 2026-08-24: 구 정책은 '프리미엄 상담 포함 횟수'(family 10회·vvip 3회)를 가진 등급이
    // 300코인 이상에서 건당 상한을 우회했다. vvip 상한이 200코인(20,000원)으로 오른 뒤
    // 그 우회를 남기면 20,001~29,999원만 미커버인 설명 불가능한 구간이 생겨 폐지했다.
    // 이제 규칙은 하나다: 정상 판매가가 등급의 적용 가격 범위 안인가.
    expect(PASS_LIMITS.vvip).toBeLessThan(300);
    for (const tier of ["standard", "premium", "vvip"]) {
      const result = evaluatePassCoverage({ user: { profileSubscription: activePass(tier) }, entitlement: ent(tier), coinCost: 300 });
      expect(result.covered).toBe(false);
      expect(result.reason).toBe("price_exceeds_pass_limit");
    }
    // family 는 건당 상한이 없어 그대로 커버된다(월 이용 한도는 별도 검사).
    const family = evaluatePassCoverage({ user: { profileSubscription: activePass("family") }, entitlement: ent("family"), coinCost: 300 });
    expect(family.covered).toBe(true);
  });

  test("건당 상한 경계 — 정확히 상한이면 커버, 1코인 넘으면 미커버", () => {
    for (const tier of ["standard", "premium", "vvip"]) {
      const limit = PASS_LIMITS[tier];
      const atLimit = evaluatePassCoverage({ user: { profileSubscription: activePass(tier) }, entitlement: ent(tier), coinCost: limit });
      expect(atLimit.covered).toBe(true);
      const overLimit = evaluatePassCoverage({ user: { profileSubscription: activePass(tier) }, entitlement: ent(tier), coinCost: limit + 1 });
      expect(overLimit.covered).toBe(false);
      expect(overLimit.reason).toBe("price_exceeds_pass_limit");
    }
  });

  test("월 예산 소진 → monthly_pass_limit_exceeded (건당 상한을 통과해도 막힌다)", () => {
    const entitlement = ent("standard");
    const cycleKey = new Date(entitlement.expiresAt).toISOString();
    const sub = { ...activePass("standard"), premiumUseCycleKey: cycleKey, monthlySpendCoin: MONTHLY_PASS_LIMITS.standard };
    const result = evaluatePassCoverage({ user: { profileSubscription: sub }, entitlement, coinCost: 10 });
    expect(result.covered).toBe(false);
    expect(result.reason).toBe("monthly_pass_limit_exceeded");
    expect(result.remainingCoin).toBe(0);
  });

  test("다른 사이클의 사용량은 이월되지 않는다(만료일이 바뀌면 예산이 리셋된다)", () => {
    const entitlement = ent("standard");
    const sub = { ...activePass("standard"), premiumUseCycleKey: "옛-사이클", monthlySpendCoin: MONTHLY_PASS_LIMITS.standard };
    const result = evaluatePassCoverage({ user: { profileSubscription: sub }, entitlement, coinCost: 10 });
    expect(result.covered).toBe(true);
    expect(result.usedCoin).toBe(0);
  });

  test("이용권 없음 → no_active_pass", () => {
    const result = evaluatePassCoverage({ user: { profileSubscription: {} }, entitlement: { isActive: false }, coinCost: 10 });
    expect(result.covered).toBe(false);
    expect(result.reason).toBe("no_active_pass");
  });
});

describe("라우트 — 왕복 예산·소비·봉투", () => {
  test("🔴 커버 성공: 셸 판정기가 읽는 키 + User 1읽기 + CAS 1쓰기(왕복 2회)", async () => {
    const db = makeFakePaymentDb();
    const user = seedUser(db, activePass("premium"));
    const { response, payload, ops } = await postPassCheck(db, {
      featureKey: CHEAP.featureKey, paymentMode: "MEMBERSHIP_PASS", requestId: "pass-req-1",
    });
    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    // _cdToCoinPayload 가 data.consume 을 최상위로 병합한 뒤 _cdIsMembershipFreePayload 가 보는 키
    expect(payload.data.consume.accessType).toBe("membership_pass");
    expect(payload.data.consume.accessMethod).toBe("PASS");
    expect(payload.data.consume.chargedCoins).toBe(0);
    expect(payload.data.freeBySubscription).toBe(true);
    expect(payload.data.accessGrant.featureKey).toBe(CHEAP.featureKey);
    expect(payload.data.membershipPass.tier).toBe("premium");
    // 왕복 예산: 신원은 JWT 라 Mongo 0회 · 판정 1읽기 + 소비 CAS 1쓰기 + 증빙 1쓰기 = 3
    // (구 경로는 인증·이용권·프로필·소비로 4회 이상을 공유 풀에서 썼다)
    expect(ops).toBe(3);
    // 월 예산에 이번 건이 가산됐다
    expect(user.profileSubscription.monthlySpendCoin).toBe(Number(CHEAP.priceCoins));
  });

  test("🔴 이용권 사용 증빙(PointHistory)을 남긴다 — 구 deferred/register 가 이 행으로 결제를 확인한다", async () => {
    // 없으면 지연차감 흐름에서 "이용권은 소비됐는데 402 로 기능이 막히는" 최악의 조합이 된다.
    const db = makeFakePaymentDb();
    seedUser(db, activePass("premium"));
    await postPassCheck(db, { featureKey: CHEAP.featureKey, paymentMode: "MEMBERSHIP_PASS", requestId: "pass-req-evidence" });
    const evidence = db.rows.find((row) => row.kind === "deduct" && row.featureKey === CHEAP.featureKey);
    expect(evidence).toBeTruthy();
    expect(evidence.delta).toBe(0); // 잔액에 영향 없음(구 FAMILY 기록과 같은 형태)
    // findVerifiedDeferredBillingEvidence 의 $or 절이 보는 키들
    expect(evidence.metadata.requestId).toBe("pass-req-evidence");
    expect(evidence.metadata.purchaseId).toBe("pass-req-evidence");
    expect(evidence.metadata.accessMethod).toBe("PASS");
  });

  test("같은 requestId 재요청: 예산을 두 번 깎지 않는다(멱등 마커)", async () => {
    const db = makeFakePaymentDb();
    const user = seedUser(db, activePass("premium"));
    const body = { featureKey: CHEAP.featureKey, paymentMode: "MEMBERSHIP_PASS", requestId: "pass-req-replay" };
    await postPassCheck(db, body);
    const spentOnce = user.profileSubscription.monthlySpendCoin;
    const { response, payload } = await postPassCheck(db, body);
    expect(response.status).toBe(200);
    expect(payload.data.consume.idempotent).toBe(true);
    expect(user.profileSubscription.monthlySpendCoin).toBe(spentOnce);
  });

  test("🔴 이미 해금한 영구 콘텐츠 재열람: 예산을 다시 깎지 않는다(재열람=반복 과금 금지)", async () => {
    // 영구 해금형 상품 하나를 고른다. 없으면 이 계약은 검증 대상이 아니다.
    const { listProducts: list } = await import("../../worker/payments/catalog.js");
    const unlockItem = list().find((p) => p.billingType !== "per_use" && Number(p.priceCoins) > 0
      && Number(p.priceCoins) <= PASS_LIMITS.family);
    if (!unlockItem) return;
    const db = makeFakePaymentDb();
    const user = seedUser(db, activePass("family"));
    const first = await postPassCheck(db, {
      featureKey: unlockItem.featureKey, paymentMode: "MEMBERSHIP_PASS", requestId: "unlock-req-1",
    });
    expect(first.response.status).toBe(200);
    const spentOnce = Number(user.profileSubscription.monthlySpendCoin || 0);

    // 다른 requestId(=새 클릭)로 다시 열어도 이미 소유한 콘텐츠라 예산이 늘지 않아야 한다.
    const second = await postPassCheck(db, {
      featureKey: unlockItem.featureKey, paymentMode: "MEMBERSHIP_PASS", requestId: "unlock-req-2",
    });
    expect(second.response.status).toBe(200);
    expect(second.payload.data.consume.alreadyUnlocked).toBe(true);
    expect(Number(user.profileSubscription.monthlySpendCoin || 0)).toBe(spentOnce);
  });

  test("🔴 미커버는 402 로 인계한다 — 막다른 길(4xx 아닌 실패·빈 화면) 금지", async () => {
    const db = makeFakePaymentDb();
    seedUser(db, { tier: "free", expiresAt: null });
    const { response, payload } = await postPassCheck(db, {
      featureKey: CHEAP.featureKey, paymentMode: "MEMBERSHIP_PASS", requestId: "pass-req-2",
    });
    expect(response.status).toBe(402);
    expect(payload.ok).toBe(false);
    expect(payload.code).toBe("MEMBERSHIP_PASS_NOT_COVERED");
    expect(payload.status).toBe("payment_required"); // 셸이 결제창으로 인계하는 신호
    expect(payload.accessGrant).toBeNull();
  });

  test("월 예산 소진 계정: 402 + 잔여 한도 안내(쓰기 없음)", async () => {
    const db = makeFakePaymentDb();
    const expiresAt = new Date(Date.now() + 10 * DAY_MS);
    const user = seedUser(db, {
      ...activePass("standard", { expiresAt }),
      premiumUseCycleKey: expiresAt.toISOString(),
      monthlySpendCoin: MONTHLY_PASS_LIMITS.standard,
    });
    const { response, payload } = await postPassCheck(db, {
      featureKey: CHEAP.featureKey, paymentMode: "MEMBERSHIP_PASS", requestId: "pass-req-3",
    });
    expect(response.status).toBe(402);
    expect(payload.monthlyPassLimit).toBe(MONTHLY_PASS_LIMITS.standard);
    expect(payload.monthlySpendRemaining).toBe(0);
    // 미커버 판정은 읽기만 한다 — 소비 CAS 가 돌면 안 된다.
    expect(user.profileSubscription.monthlySpendCoin).toBe(MONTHLY_PASS_LIMITS.standard);
  });

  test("비로그인: 401 + Mongo 0회", async () => {
    const db = makeFakePaymentDb();
    const request = new Request("https://code-destiny.com/api/payments/coin-gate/pass-check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ featureKey: CHEAP.featureKey, paymentMode: "MEMBERSHIP_PASS" }),
    });
    const response = await handlePaymentsContext(request, ENV, {
      prefix: "/api/payments",
      withDb: (_env, _ctx, fn) => fn(db),
    });
    expect(response.status).toBe(401);
    expect(db.ctx.ops).toBe(0);
  });
});

describe("조기 종료 — 월 한도를 다 쓰면 30일이 남아도 이용권이 끝난다", () => {
  // 한도 사이클 키가 이용권 자신의 만료일이라 기간 안에서 예산이 리셋되는 일이 없다.
  // 그래서 다 쓴 이용권의 남은 기간은 가치가 0이었다 — 2026-09-04 부터 그 자리에서 끝낸다.
  const COST = Number(CHEAP.priceCoins);

  function seedNearlyExhausted(db, remainingCoin) {
    const expiresAt = new Date(Date.now() + 10 * DAY_MS);
    const user = seedUser(db, {
      ...activePass("standard", { expiresAt }),
      premiumUseCycleKey: expiresAt.toISOString(),
      monthlySpendCoin: MONTHLY_PASS_LIMITS.standard - remainingCoin,
    });
    return { user, expiresAt };
  }

  const body = (requestId) => ({ featureKey: CHEAP.featureKey, paymentMode: "MEMBERSHIP_PASS", requestId });

  test("🔴 마지막 한 건이 예산을 비우면 만료일을 그 자리에서 당긴다", async () => {
    const db = makeFakePaymentDb();
    const { user, expiresAt } = seedNearlyExhausted(db, COST);
    const before = Date.now();
    const { response, payload } = await postPassCheck(db, body("pass-end-1"));

    // 그 요청 자체는 커버된다 — 마지막 한 건을 뺏으면 판매한 예산을 다 못 쓴다.
    expect(response.status).toBe(200);
    const sub = user.profileSubscription;
    expect(sub.monthlySpendCoin).toBe(MONTHLY_PASS_LIMITS.standard);
    // 종료는 만료일을 당기는 것 하나로 끝난다(새 '소진 플래그'를 만들지 않는다).
    expect(new Date(sub.expiresAt).getTime()).toBeGreaterThanOrEqual(before);
    expect(new Date(sub.expiresAt).getTime()).toBeLessThanOrEqual(Date.now());
    expect(sub.tier).toBe("free");
    expect(sub.passTier).toBe("");
    // CS·환불 문의에서 "왜 30일 전에 끝났나"의 유일한 증거다.
    expect(new Date(sub.passExhaustedFromExpiresAt).toISOString()).toBe(expiresAt.toISOString());
    expect(sub.passExhaustedAt).toBeTruthy();
    // 소진을 유발한 이 응답이 클라 스냅샷을 뒤집는 유일한 기회다.
    expect(payload.data.membershipPass.passEnded).toBe(true);
    expect(payload.data.membershipPass.passEndedAt).toBeTruthy();
  });

  test("🔴 잔여가 최저가 미만이면 남겨두지 않고 종료한다 — 그 잔여로는 아무것도 못 연다", async () => {
    const db = makeFakePaymentDb();
    const leftover = MIN_PASS_COVERABLE_COIN - 1;
    const { user } = seedNearlyExhausted(db, COST + leftover);
    const { response } = await postPassCheck(db, body("pass-end-2"));
    expect(response.status).toBe(200);
    expect(MONTHLY_PASS_LIMITS.standard - user.profileSubscription.monthlySpendCoin).toBe(leftover);
    expect(new Date(user.profileSubscription.expiresAt).getTime()).toBeLessThanOrEqual(Date.now());
  });

  test("잔여가 최저가와 같으면 아직 끝내지 않는다", async () => {
    const db = makeFakePaymentDb();
    const { user, expiresAt } = seedNearlyExhausted(db, COST + MIN_PASS_COVERABLE_COIN);
    const { response, payload } = await postPassCheck(db, body("pass-end-keep"));
    expect(response.status).toBe(200);
    expect(new Date(user.profileSubscription.expiresAt).toISOString()).toBe(expiresAt.toISOString());
    expect(user.profileSubscription.tier).toBe("standard");
    expect(payload.data.membershipPass.passEnded).toBeUndefined();
  });

  test("🔴 종료 뒤 다음 클릭은 이용권 없음으로 402 — 상점으로 보내는 것이 옳은 동작이 된다", async () => {
    const db = makeFakePaymentDb();
    seedNearlyExhausted(db, COST);
    expect((await postPassCheck(db, body("pass-end-3a"))).response.status).toBe(200);

    const { response, payload } = await postPassCheck(db, body("pass-end-3b"));
    expect(response.status).toBe(402);
    expect(payload.code).toBe("MEMBERSHIP_PASS_NOT_COVERED");
    expect(payload.status).toBe("payment_required"); // 막다른 길 금지 — 결제창이 인계한다
    // 소진(MONTHLY_PASS_LIMIT_EXCEEDED)이 아니라 '이용권 없음'이다. 셸의 isMonthlyLimitPayload
    // 가 false 를 내야 이용권 상점으로 보낸다 — 이제 그게 맞는 안내다.
    expect(payload.decisionReason).toBe("PAYMENT_REQUIRED");
  });

  test("종료 write 는 멱등하다 — 두 번째 시도가 만료일·증거를 덮지 않는다", async () => {
    const db = makeFakePaymentDb();
    const { user, expiresAt } = seedNearlyExhausted(db, COST);
    await postPassCheck(db, body("pass-end-4"));
    const endedAt = new Date(user.profileSubscription.expiresAt).toISOString();

    // 병렬 요청 2건이 동시에 소진에 걸린 상황 — 조건부 CAS 라 두 번째는 no-op 이어야 한다.
    const again = await terminatePassOnBudgetExhaustion(db, {
      userId: USER,
      cycleKey: expiresAt.toISOString(),
      previousExpiresAt: new Date(Date.now() + DAY_MS),
      now: new Date(),
    });
    expect(again).toBe(false);
    expect(new Date(user.profileSubscription.expiresAt).toISOString()).toBe(endedAt);
    expect(new Date(user.profileSubscription.passExhaustedFromExpiresAt).toISOString()).toBe(expiresAt.toISOString());
  });
});
