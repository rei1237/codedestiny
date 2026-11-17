/**
 * @jest-environment node
 *
 * refundPassCoverage — consumePassForFeature 가 이미 차감한 monthlySpendCoin 을
 * 후속 AI 생성 실패 시 되돌리는 CAS 헬퍼. worker/payments/passes.js 의 consumePassCoverage
 * 와 같은 사이클키 일치 + 잔액 조건부 $inc 규칙을 반대 방향으로 검증한다.
 */
import { refundPassCoverage } from "../../worker/lib/pass-consumption.js";
import { makeFakePaymentDb } from "../fixtures/fake-payment-db.mjs";

const USER = "64b000000000000000000001";
const CYCLE_KEY = "2099-09-30T00:00:00.000Z";

function seed(db, { monthlySpendCoin, premiumUseCycleKey = CYCLE_KEY } = {}) {
  const user = {
    _id: USER,
    profileSubscription: {
      tier: "family", passTier: "family", isActive: true,
      premiumUseCycleKey, monthlySpendCoin, monthlyLimitCoin: 0,
    },
    recentConsumeRequestIds: [],
  };
  db.rows.push(user);
  return user;
}

test("사이클키가 일치하고 잔액이 충분하면 정확히 cost 만큼 되돌린다", async () => {
  const db = makeFakePaymentDb();
  seed(db, { monthlySpendCoin: 300 });

  const result = await refundPassCoverage({ userId: USER, refundId: "test-request", cycleKey: CYCLE_KEY, cost: 300, db });

  expect(result).toMatchObject({ refunded: true, amount: 300 });
  expect(db.rows[0].profileSubscription.monthlySpendCoin).toBe(0);
});

test("사이클이 넘어간 뒤에는 다른 달 카운터를 건드리지 않고 조용히 skip 한다", async () => {
  const db = makeFakePaymentDb();
  seed(db, { monthlySpendCoin: 300, premiumUseCycleKey: "old-cycle" });

  const result = await refundPassCoverage({ userId: USER, refundId: "test-request", cycleKey: CYCLE_KEY, cost: 300, db });

  expect(result).toMatchObject({ refunded: false, skipped: true });
  expect(db.rows[0].profileSubscription.monthlySpendCoin).toBe(300);
});

test("잔액이 환불액보다 적으면(끼어든 다른 소비) skip 하고 음수로 만들지 않는다", async () => {
  const db = makeFakePaymentDb();
  seed(db, { monthlySpendCoin: 100 });

  const result = await refundPassCoverage({ userId: USER, refundId: "test-request", cycleKey: CYCLE_KEY, cost: 300, db });

  expect(result).toMatchObject({ refunded: false, skipped: true });
  expect(db.rows[0].profileSubscription.monthlySpendCoin).toBe(100);
});

test("같은 요청을 재호출해도 영속 영수증으로 이중 환불되지 않는다", async () => {
  const db = makeFakePaymentDb();
  seed(db, { monthlySpendCoin: 300 });

  const first = await refundPassCoverage({ userId: USER, refundId: "test-request", cycleKey: CYCLE_KEY, cost: 300, db });
  const second = await refundPassCoverage({ userId: USER, refundId: "test-request", cycleKey: CYCLE_KEY, cost: 300, db });

  expect(first).toMatchObject({ refunded: true, amount: 300 });
  expect(second).toMatchObject({ refunded: true, idempotent: true });
  expect(db.rows[0].profileSubscription.monthlySpendCoin).toBe(0);
});

test("마지막 사용으로 조기 종료된 Family도 무결과 환급과 같은 트랜잭션에서 복구한다", async () => {
  const db = makeFakePaymentDb();
  const user=seed(db, { monthlySpendCoin: 5000 });
  Object.assign(user.profileSubscription, {tier:"free",passTier:"",expiresAt:new Date("2099-09-23T00:00:00.000Z"),
    passExhaustedAt:new Date("2099-09-23T00:00:00.000Z"),passExhaustedFromExpiresAt:new Date(CYCLE_KEY),monthlyLimitCoin:0,maxCoveredCoin:0});
  const result=await refundPassCoverage({userId:USER,refundId:"terminal-empty",cycleKey:CYCLE_KEY,cost:500,db,
    restorePass:{tier:"family",expiresAt:CYCLE_KEY,monthlyLimitCoin:5000,profileLimit:0,maxCoveredCoin:999999999,passPolicyVersion:"flower-cost-20260921"}});
  expect(result).toMatchObject({refunded:true,amount:500});
  expect(user.profileSubscription).toMatchObject({tier:"family",passTier:"family",monthlySpendCoin:4500,monthlyLimitCoin:5000,
    profileLimit:0,maxCoveredCoin:999999999,passPolicyVersion:"flower-cost-20260921",passExhaustedAt:null,passExhaustedFromExpiresAt:null});
  expect(new Date(user.profileSubscription.expiresAt).toISOString()).toBe(CYCLE_KEY);
});

test("an exhausted non-Family pass comes back as its own tier and caps, not as Family", async () => {
  const db = makeFakePaymentDb();
  const user=seed(db, { monthlySpendCoin: 600 });
  Object.assign(user.profileSubscription, {tier:"free",passTier:"",expiresAt:new Date("2099-09-23T00:00:00.000Z"),
    passExhaustedAt:new Date("2099-09-23T00:00:00.000Z"),passExhaustedFromExpiresAt:new Date(CYCLE_KEY),monthlyLimitCoin:0,maxCoveredCoin:0});
  const result=await refundPassCoverage({userId:USER,refundId:"terminal-premium",cycleKey:CYCLE_KEY,cost:100,db,
    restorePass:{tier:"premium",expiresAt:CYCLE_KEY,monthlyLimitCoin:600,profileLimit:0,maxCoveredCoin:100,passPolicyVersion:"flower-20261104"}});
  expect(result).toMatchObject({refunded:true,amount:100});
  expect(user.profileSubscription).toMatchObject({tier:"premium",passTier:"premium",monthlySpendCoin:500,monthlyLimitCoin:600,
    maxCoveredCoin:100,passLimit:100,passPolicyVersion:"flower-20261104",passExhaustedAt:null,passExhaustedFromExpiresAt:null});
});

test("other usage remains intact after a repeated refund with sufficient balance", async () => {
  const db = makeFakePaymentDb();
  seed(db, { monthlySpendCoin: 1200 });
  const input = { userId: USER, cycleKey: CYCLE_KEY, cost: 300, refundId: "first", db };
  await refundPassCoverage(input);
  expect(await refundPassCoverage(input)).toMatchObject({ refunded: true, idempotent: true });
  expect(db.rows[0].profileSubscription.monthlySpendCoin).toBe(900);
  await refundPassCoverage({ ...input, refundId: "second" });
  expect(db.rows[0].profileSubscription.monthlySpendCoin).toBe(600);
});

test("receipt write failure rolls back quota and a retry restores it once", async () => {
  const db = makeFakePaymentDb();
  seed(db, { monthlySpendCoin: 1200 });
  const write = db.findOneAndUpdate;
  db.findOneAndUpdate = async (...args) => {
    if (args[2].$setOnInsert) throw new Error("receipt unavailable");
    return write(...args);
  };
  const input = { userId: USER, cycleKey: CYCLE_KEY, cost: 300, refundId: "atomic", db };
  await expect(refundPassCoverage(input)).rejects.toThrow("receipt unavailable");
  expect(db.rows[0].profileSubscription.monthlySpendCoin).toBe(1200);
  db.findOneAndUpdate = write;
  await refundPassCoverage(input);
  expect(db.rows[0].profileSubscription.monthlySpendCoin).toBe(900);
});

test("missing refund identity cannot restore quota", async () => {
  const db = makeFakePaymentDb();
  seed(db, { monthlySpendCoin: 300 });
  expect(await refundPassCoverage({ userId: USER, cycleKey: CYCLE_KEY, cost: 300, db })).toMatchObject({ refunded: false });
  expect(db.rows[0].profileSubscription.monthlySpendCoin).toBe(300);
});

test("cost 가 0 이하이거나 cycleKey 가 없으면 DB 를 건드리지 않고 skip 한다", async () => {
  const db = makeFakePaymentDb();
  seed(db, { monthlySpendCoin: 300 });

  expect(await refundPassCoverage({ userId: USER, refundId: "test-request", cycleKey: CYCLE_KEY, cost: 0, db })).toMatchObject({ refunded: false, skipped: true });
  expect(await refundPassCoverage({ userId: USER, refundId: "test-request", cycleKey: "", cost: 300, db })).toMatchObject({ refunded: false, skipped: true });
  expect(db.rows[0].profileSubscription.monthlySpendCoin).toBe(300);
});

describe("환불 뒤 같은 requestId 재시도는 무료 재생이 아니라 재차감이다", () => {
  const FEATURE = "vedic-ai-consultation";
  const REQUEST = "retry-after-refund";
  const DAY_MS = 86_400_000;
  let consumePassForFeature, hasConsumedPassFeature, passUsageEvidenceId;
  beforeAll(async () => {
    ({ consumePassForFeature, hasConsumedPassFeature } = await import("../../worker/lib/pass-consumption.js"));
    ({ passUsageEvidenceId } = await import("../../worker/payments/passes.js"));
  });

  function seedActive(db) {
    const at = new Date(Date.now() + 10 * DAY_MS);
    const user = {
      _id: USER,
      profileSubscription: { tier: "family", passTier: "family", isActive: true, expiresAt: at,
        premiumUseCycleKey: at.toISOString(), monthlySpendCoin: 0, monthlyLimitCoin: 0 },
      recentConsumeRequestIds: [],
    };
    db.rows.push(user);
    return { user, at, entitlement: { tier: "family", passTier: "family", isActive: true, expiresAt: at } };
  }
  const consume = (db, user, entitlement) => consumePassForFeature({ db, user, entitlement, userId: USER,
    featureKey: FEATURE, requestId: REQUEST, coinCost: 300 });
  const evidenceRow = db => db.rows.find(row => String(row._id) === String(passUsageEvidenceId(USER, FEATURE, REQUEST)));

  test("소스 식별자로 환불하면 멱등 마커를 지우고 사용 증빙을 환불됨으로 표시한다", async () => {
    const db = makeFakePaymentDb();
    const { user, at, entitlement } = seedActive(db);
    expect(await consume(db, user, entitlement)).toMatchObject({ covered: true, replayed: false });
    expect(user.recentConsumeRequestIds).toContain(`tier-pass:${FEATURE}:${REQUEST}`);

    const refunded = await refundPassCoverage({ db, userId: USER, cycleKey: at.toISOString(), cost: 300,
      refundId: `vedic:${REQUEST}`, sourceFeatureKey: FEATURE, sourceRequestId: REQUEST });

    expect(refunded).toMatchObject({ refunded: true, amount: 300 });
    expect(user.profileSubscription.monthlySpendCoin).toBe(0);
    expect(user.recentConsumeRequestIds).not.toContain(`tier-pass:${FEATURE}:${REQUEST}`);
    expect(evidenceRow(db).metadata.refundedForServiceExecution).toBe(true);
    expect(await hasConsumedPassFeature(user, FEATURE, REQUEST, db)).toBe(false);
  });

  test("sourcePointHistoryId 로 환불해도 그 증빙의 마커를 지운다", async () => {
    const db = makeFakePaymentDb();
    const { user, at, entitlement } = seedActive(db);
    await consume(db, user, entitlement);
    await refundPassCoverage({ db, userId: USER, cycleKey: at.toISOString(), cost: 300, refundId: `consultation:${REQUEST}`,
      sourcePointHistoryId: passUsageEvidenceId(USER, FEATURE, REQUEST) });
    expect(user.recentConsumeRequestIds).not.toContain(`tier-pass:${FEATURE}:${REQUEST}`);
    expect(await hasConsumedPassFeature(user, FEATURE, REQUEST, db)).toBe(false);
  });

  test("환불 뒤 재시도는 다시 차감하고, 그 재차감이 또 실패하면 다시 환불된다", async () => {
    const db = makeFakePaymentDb();
    const { user, at, entitlement } = seedActive(db);
    const refund = () => refundPassCoverage({ db, userId: USER, cycleKey: at.toISOString(), cost: 300,
      refundId: `vedic:${REQUEST}`, sourceFeatureKey: FEATURE, sourceRequestId: REQUEST });
    await consume(db, user, entitlement);
    await refund();

    const again = await consume(db, user, entitlement);
    expect(again).toMatchObject({ covered: true, replayed: false });
    expect(user.profileSubscription.monthlySpendCoin).toBe(300);
    expect(evidenceRow(db).metadata.refundedForServiceExecution).not.toBe(true);
    expect(await hasConsumedPassFeature(user, FEATURE, REQUEST, db)).toBe(true);

    const second = await refund();
    expect(second).toMatchObject({ refunded: true });
    expect(second.idempotent).not.toBe(true);
    expect(user.profileSubscription.monthlySpendCoin).toBe(0);
    // 같은 실패를 다시 정산해도 두 번 돌려주지 않는다.
    expect(await refund()).toMatchObject({ refunded: true, idempotent: true });
    expect(user.profileSubscription.monthlySpendCoin).toBe(0);
  });
});

describe("refundPassUseEvidence — 결제 화면 pass-check 가 미리 차감한 이용권을 생성 실패 때 되돌린다", () => {
  const FEATURE = "vedic-ai-consultation";
  const REQUEST = "pass-check-request";
  let consumePassForFeature, refundPassUseEvidence;
  beforeAll(async () => {
    ({ consumePassForFeature, refundPassUseEvidence } = await import("../../worker/lib/pass-consumption.js"));
  });
  function seedConsumed(db) {
    const at = new Date(Date.now() + 10 * 86_400_000);
    const user = { _id: USER, recentConsumeRequestIds: [], profileSubscription: { tier: "family", passTier: "family",
      isActive: true, expiresAt: at, premiumUseCycleKey: at.toISOString(), monthlySpendCoin: 0, monthlyLimitCoin: 0 } };
    db.rows.push(user);
    const entitlement = { tier: "family", passTier: "family", isActive: true, expiresAt: at };
    return { user, at, consume: () => consumePassForFeature({ db, user, entitlement, userId: USER,
      featureKey: FEATURE, requestId: REQUEST, coinCost: 300 }) };
  }

  test("증빙의 금액·사이클로 한 번만 되돌리고, 다시 불러도 두 번 되돌리지 않는다", async () => {
    const db = makeFakePaymentDb();
    const { user, consume } = seedConsumed(db);
    await consume();
    expect(user.profileSubscription.monthlySpendCoin).toBe(300);

    expect(await refundPassUseEvidence({ db, userId: USER, featureKey: FEATURE, requestId: REQUEST }))
      .toMatchObject({ refunded: true, amount: 300 });
    expect(user.profileSubscription.monthlySpendCoin).toBe(0);
    expect(user.recentConsumeRequestIds).not.toContain(`tier-pass:${FEATURE}:${REQUEST}`);
    expect(await refundPassUseEvidence({ db, userId: USER, featureKey: FEATURE, requestId: REQUEST }))
      .toMatchObject({ refunded: false, skipped: true });
    expect(user.profileSubscription.monthlySpendCoin).toBe(0);
  });

  test("다른 영수증 id 의 (기능, requestId) 환불이 먼저 되돌렸으면 건너뛴다(이중 환불 없음)", async () => {
    const db = makeFakePaymentDb();
    const { user, at, consume } = seedConsumed(db);
    await consume();
    await consume(); // 다른 요청이 같은 사이클 사용액을 올려 둔다 — 이중 환불이면 0 아래로 내려간다.
    user.profileSubscription.monthlySpendCoin = 600;
    await refundPassCoverage({ db, userId: USER, cycleKey: at.toISOString(), cost: 300, refundId: `route:${REQUEST}`,
      sourceFeatureKey: FEATURE, sourceRequestId: REQUEST });
    expect(await refundPassUseEvidence({ db, userId: USER, featureKey: FEATURE, requestId: REQUEST }))
      .toMatchObject({ refunded: false, skipped: true });
    expect(await refundPassCoverage({ db, userId: USER, cycleKey: at.toISOString(), cost: 300, refundId: `other:${REQUEST}`,
      sourceFeatureKey: FEATURE, sourceRequestId: REQUEST })).toMatchObject({ refunded: false, reason: "PASS_EVIDENCE_ALREADY_REFUNDED" });
    expect(user.profileSubscription.monthlySpendCoin).toBe(300);
  });

  test("이용권 증빙이 없으면(코인·카드 결제) 아무것도 건드리지 않는다", async () => {
    const db = makeFakePaymentDb();
    const { user } = seedConsumed(db);
    user.profileSubscription.monthlySpendCoin = 300;
    expect(await refundPassUseEvidence({ db, userId: USER, featureKey: FEATURE, requestId: "card-paid" }))
      .toMatchObject({ refunded: false, skipped: true, reason: "PASS_EVIDENCE_NOT_FOUND" });
    expect(user.profileSubscription.monthlySpendCoin).toBe(300);
  });
});
