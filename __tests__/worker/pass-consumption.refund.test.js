/**
 * @jest-environment node
 *
 * refundPassCoverage — consumePassForFeature 가 이미 차감한 monthlySpendCoin 을
 * 후속 AI 생성 실패 시 되돌리는 CAS 헬퍼. worker/payments/passes.js 의 consumePassCoverage
 * 와 같은 사이클키 일치 + 잔액 조건부 $inc 규칙을 반대 방향으로 검증한다.
 */
import { refundPassCoverage } from "../../worker/lib/pass-consumption.js";
import { buildPassRestoreSnapshot } from "../../worker/lib/pass-restore-snapshot.js";
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

// 차감 판정(coverage)에서 만든 스냅샷이 환불과 만나는 전 구간: 소진 종료된 프리미엄 이용권이 되살아나는지.
const PREMIUM_COVERAGE = { tier: "premium", cycleKey: CYCLE_KEY, budgetCoin: 600, perItemLimit: 100 };
const PREMIUM_BEFORE = { profileSubscription: { profileLimit: 7, passPolicyVersion: "flower-20260930" } };
const exhaust = (user) => Object.assign(user.profileSubscription, {
  tier: "free", passTier: "", expiresAt: new Date("2099-09-23T00:00:00.000Z"), monthlyLimitCoin: 0, maxCoveredCoin: 0,
  passExhaustedAt: new Date("2099-09-23T00:00:00.000Z"), passExhaustedFromExpiresAt: new Date(CYCLE_KEY),
});

test("복원 스냅샷은 차감 판정과 차감 전 문서에서 만들고, 사이클·등급이 없으면 만들지 않는다", () => {
  expect(buildPassRestoreSnapshot(PREMIUM_COVERAGE, PREMIUM_BEFORE)).toEqual({
    tier: "premium", expiresAt: CYCLE_KEY, monthlyLimitCoin: 600, profileLimit: 7, maxCoveredCoin: 100, passPolicyVersion: "flower-20260930",
  });
  expect(buildPassRestoreSnapshot({ ...PREMIUM_COVERAGE, cycleKey: "" }, PREMIUM_BEFORE)).toBeUndefined();
  expect(buildPassRestoreSnapshot({ ...PREMIUM_COVERAGE, tier: "" }, PREMIUM_BEFORE)).toBeUndefined();
  expect(buildPassRestoreSnapshot(undefined, undefined)).toBeUndefined();
});

test("마지막 차감으로 소진 종료된 프리미엄 이용권은 환불과 함께 같은 만료일·한도로 되살아난다", async () => {
  const db = makeFakePaymentDb();
  const user = seed(db, { monthlySpendCoin: 600 });
  exhaust(user);
  const restorePass = buildPassRestoreSnapshot(PREMIUM_COVERAGE, PREMIUM_BEFORE);
  await refundPassCoverage({ userId: USER, refundId: "tea-exhausted", cycleKey: CYCLE_KEY, cost: 100, db, restorePass });
  expect(user.profileSubscription).toMatchObject({
    tier: "premium", passTier: "premium", monthlySpendCoin: 500, monthlyLimitCoin: 600, maxCoveredCoin: 100,
    profileLimit: 7, passPolicyVersion: "flower-20260930", passExhaustedAt: null, passExhaustedFromExpiresAt: null,
  });
  expect(new Date(user.profileSubscription.expiresAt).toISOString()).toBe(CYCLE_KEY);
});

test("소진 종료되지 않은 이용권은 스냅샷이 있어도 쿼터만 돌리고 등급·만료일을 건드리지 않는다", async () => {
  const db = makeFakePaymentDb();
  const user = seed(db, { monthlySpendCoin: 300 });
  Object.assign(user.profileSubscription, { tier: "premium", passTier: "premium", expiresAt: new Date(CYCLE_KEY), monthlyLimitCoin: 600 });
  const restorePass = buildPassRestoreSnapshot({ ...PREMIUM_COVERAGE, budgetCoin: 999 }, PREMIUM_BEFORE);
  await refundPassCoverage({ userId: USER, refundId: "tea-active", cycleKey: CYCLE_KEY, cost: 100, db, restorePass });
  expect(user.profileSubscription).toMatchObject({ tier: "premium", monthlySpendCoin: 200, monthlyLimitCoin: 600 });
});

test("그 사이 다른 사이클의 새 이용권이 들어왔으면 스냅샷이 있어도 아무것도 되살리지 않는다", async () => {
  const db = makeFakePaymentDb();
  const user = seed(db, { monthlySpendCoin: 40, premiumUseCycleKey: "2099-12-31T00:00:00.000Z" });
  Object.assign(user.profileSubscription, { tier: "premium", passTier: "premium", monthlyLimitCoin: 600 });
  const restorePass = buildPassRestoreSnapshot(PREMIUM_COVERAGE, PREMIUM_BEFORE);
  const result = await refundPassCoverage({ userId: USER, refundId: "tea-new-pass", cycleKey: CYCLE_KEY, cost: 100, db, restorePass });
  expect(result).toMatchObject({ refunded: false, skipped: true });
  expect(user.profileSubscription).toMatchObject({ tier: "premium", monthlySpendCoin: 40, premiumUseCycleKey: "2099-12-31T00:00:00.000Z" });
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
