/**
 * @jest-environment node
 *
 * 이용권 월 누적 한도의 **하드 게이트** — coin-gate 밖 경로의 차감 계약.
 *
 * 배경(2026-09-06): 한도 판정 기계(evaluatePassCoverage)와 소비 기계(consumePassCoverage)는
 * 이미 있었지만, 소스 호출부가 worker/payments/index.js 하나뿐이었다. coin-gate 를 거치지 않고
 * 자체 게이트로 이용권 통과를 내주던 두 경로
 *   · worker/lib/nakshatra-paid-access.js verifyPerUsePayment 4)분기 (라우트 9곳이 쓴다)
 *   · worker/routes/master-love-codex.js  resolveBillingDecision / resolveStartAccess
 * 는 monthlySpendCoin 을 **한 번도 증가시키지 않았다.** 누적이 안 쌓이니 한도에 도달하는 것이
 * 구조적으로 불가능했고(= 그 자리의 초과 검사는 참이 될 수 없는 조건), 소진 종료도 영영
 * 트리거되지 않았다. 이 파일은 그 구멍이 다시 열리지 않게 못 박는다.
 *
 * 🔴 여기서 고정하지 않는 것: 재구매 시 한도 갱신 정책(같은 등급 가산 · 만료 뒤 재구매 리셋)은
 *    __tests__/worker/payments-v2.pass-check.test.js 가 이미 고정한다. 사본을 만들지 않는다.
 */
import { consumePassForFeature } from "../../worker/lib/pass-consumption.js";
import { MIN_PASS_COVERABLE_COIN, MONTHLY_PASS_LIMITS, PASS_LIMITS } from "../../worker/lib/profile-limits.js";
import { makeFakePaymentDb } from "../fixtures/fake-payment-db.mjs";

const USER = "64b000000000000000000001";
const DAY_MS = 86_400_000;
const TIER = "premium";
const BUDGET = MONTHLY_PASS_LIMITS[TIER];
const FEATURE = "fusion-fortune-consultation";

function expiresAt() {
  return new Date(Date.now() + 10 * DAY_MS);
}

function entitlement(at) {
  return { tier: TIER, passTier: TIER, isActive: true, expiresAt: at };
}

/** 사이클 키가 만료일 ISO 와 일치해야 저장된 누적액이 실제로 읽힌다(불일치 = 0으로 취급). */
function seed(db, { spent, at }) {
  const user = {
    _id: USER,
    profileSubscription: {
      tier: TIER, passTier: TIER, isActive: true, expiresAt: at,
      premiumUseCycleKey: at.toISOString(),
      monthlySpendCoin: spent,
      monthlyLimitCoin: 0, // 0 = 등급 기본 한도
    },
    recentConsumeRequestIds: [],
  };
  db.rows.push(user);
  return user;
}

function consume(db, user, at, { cost, requestId }) {
  return consumePassForFeature({
    db, user, entitlement: entitlement(at), userId: USER,
    featureKey: FEATURE, requestId, coinCost: cost,
  });
}

describe("한도 경계 — 도달 직전 · 도달 · 초과 이후", () => {
  test("한도 안이면 통과하고 누적 사용액이 정확히 가격만큼 증가한다", async () => {
    const db = makeFakePaymentDb();
    const at = expiresAt();
    const cost = PASS_LIMITS[TIER];
    const user = seed(db, { spent: 0, at });

    const result = await consume(db, user, at, { cost, requestId: "req-1" });

    expect(result.covered).toBe(true);
    // 🔴 이 단언이 이번 수정의 본체다. 예전에는 판정만 하고 이 값이 0 에 머물렀다.
    expect(db.rows[0].profileSubscription.monthlySpendCoin).toBe(cost);
  });

  test("🔴 남은 예산으로 이 건을 못 덮으면 통과하지 못한다(한도 초과)", async () => {
    const db = makeFakePaymentDb();
    const at = expiresAt();
    const cost = PASS_LIMITS[TIER];
    const user = seed(db, { spent: BUDGET - cost + 1, at });

    const result = await consume(db, user, at, { cost, requestId: "req-2" });

    expect(result.covered).toBe(false);
    expect(result.reason).toBe("monthly_pass_limit_exceeded");
    expect(db.rows[0].profileSubscription.monthlySpendCoin).toBe(BUDGET - cost + 1);
  });

  test("🔴 예산을 다 쓰면 그 자리에서 이용권이 종료된다 — 만료일이 남아 있어도 잠긴다", async () => {
    const db = makeFakePaymentDb();
    const at = expiresAt();
    const cost = PASS_LIMITS[TIER];
    // 차감 뒤 남는 잔액이 최소 커버 가능 금액보다 작아야 소진 판정이 선다.
    const user = seed(db, { spent: BUDGET - cost - (MIN_PASS_COVERABLE_COIN - 1), at });

    const result = await consume(db, user, at, { cost, requestId: "req-3" });

    expect(result.covered).toBe(true);
    const sub = db.rows[0].profileSubscription;
    // 소진 종료는 만료일을 now 로 당기는 것이 전부다 — 새 '소진 플래그'를 만들지 않는다.
    expect(new Date(sub.expiresAt).getTime()).toBeLessThanOrEqual(Date.now());
    expect(sub.tier).toBe("free");
    expect(sub.passExhaustedAt).toBeTruthy();
  });
});

describe("멱등 — 같은 요청의 재시도가 예산을 두 번 깎지 않는다", () => {
  test("같은 (기능, requestId) 로 다시 부르면 차감 없이 통과한다", async () => {
    const db = makeFakePaymentDb();
    const at = expiresAt();
    const cost = PASS_LIMITS[TIER];
    const user = seed(db, { spent: 0, at });

    const first = await consume(db, user, at, { cost, requestId: "req-same" });
    expect(first.covered).toBe(true);
    expect(db.rows[0].profileSubscription.monthlySpendCoin).toBe(cost);

    // 두 번째 호출은 첫 호출이 남긴 마커가 실린 **갱신된 문서**로 판정한다
    // (라우트도 요청마다 User 를 새로 읽으므로 같은 조건이다).
    const second = await consume(db, db.rows[0], at, { cost, requestId: "req-same" });
    expect(second.covered).toBe(true);
    expect(second.replayed).toBe(true);
    expect(db.rows[0].profileSubscription.monthlySpendCoin).toBe(cost);
  });
});

describe("건당 상한 — 예산과 별개의 AND 게이트", () => {
  test("건당 상한을 넘는 가격은 예산이 남아 있어도 커버하지 않는다", async () => {
    const db = makeFakePaymentDb();
    const at = expiresAt();
    const user = seed(db, { spent: 0, at });

    const result = await consume(db, user, at, { cost: PASS_LIMITS[TIER] + 1, requestId: "req-4" });

    expect(result.covered).toBe(false);
    expect(result.reason).toBe("price_exceeds_pass_limit");
    expect(db.rows[0].profileSubscription.monthlySpendCoin).toBe(0);
  });
});
