/**
 * @jest-environment node
 *
 * 라이트 운세는 활성 이용권이면 금액 한도를 쓰지 않고 열린다. 건당 상한과 사용 증빙은 그대로다.
 */
import { handlePaymentsContext } from "../../worker/payments/index.js";
import { resolveProduct } from "../../worker/payments/catalog.js";
import { LIGHT_FORTUNE_FEATURE_KEYS } from "../../worker/lib/light-fortune-catalog.js";
import { consumePassForFeature, refundPassCoverage } from "../../worker/lib/pass-consumption.js";
import { describePassEligibility, evaluatePassCoverage, passUsageEvidenceId } from "../../worker/payments/passes.js";
import { MONTHLY_PASS_LIMITS } from "../../worker/lib/profile-limits.js";
import { resolveCanonicalEntitlement } from "../../worker/lib/entitlement-policy.js";
import { makeFakePaymentDb } from "../fixtures/fake-payment-db.mjs";
import { testCard } from "../fixtures/profile-card-model.mjs";

const USER = "64b000000000000000000001";
const ENV = { JWT_ACCESS_SECRET: "test-access-secret-value-0123456789" };
const TIERS = ["standard", "premium", "vvip", "family"];
const LIGHT_PRODUCTS = LIGHT_FORTUNE_FEATURE_KEYS.map((featureKey) => resolveProduct({ featureKey }));
const LIGHT_PER_USE = LIGHT_PRODUCTS.find((p) => p.billingType === "per_use" && !p.passExcluded && !p.familyPassOnly);
const LIGHT_UNLOCK = LIGHT_PRODUCTS.find((p) => p.billingType !== "per_use" && !p.passExcluded && !p.familyPassOnly);

function passUser(tier, spend = 0) {
  const expiresAt = new Date(Date.now() + 10 * 86_400_000);
  return {
    _id: USER, points: 0, recentConsumeRequestIds: [],
    profileSubscription: {
      tier, passTier: tier, isActive: true, expiresAt,
      premiumUseCycleKey: expiresAt.toISOString(), monthlySpendCoin: spend, monthlyLimitCoin: 0,
    },
  };
}

function seed(tier, spend, options) {
  const db = makeFakePaymentDb(options);
  const user = passUser(tier, spend);
  db.rows.push(user);
  return { db, user, entitlement: resolveCanonicalEntitlement(user) };
}

const evidenceRows = (db) => db.rows.filter((row) => row.metadata?.requestId);

async function postPassCheck(db, body) {
  const { signAuthToken } = await import("../../worker/lib/auth.js");
  const token = await signAuthToken({ _id: USER, email: "t@e.st", role: "user", name: "t" }, ENV);
  const request = new Request("https://code-destiny.com/api/payments/coin-gate/pass-check", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  const response = await handlePaymentsContext(request, ENV, { prefix: "/api/payments", withDb: (_env, _ctx, fn) => fn(db) });
  return { response, payload: await response.json() };
}

test.each(TIERS)("%s light product is covered without touching budget", async (tier) => {
  const { db, user, entitlement } = seed(tier, 30);
  user.profileSubscription.premiumUseCount = 2;
  const result = await consumePassForFeature({
    db, user, entitlement, userId: USER, featureKey: LIGHT_PER_USE.featureKey,
    requestId: `light-${tier}`, coinCost: LIGHT_PER_USE.priceCoins,
  });
  expect(result.covered).toBe(true);
  expect(result.coverage.budgetApplies).toBe(false);
  const stored = db.rows.find((row) => String(row._id) === USER);
  expect(stored.profileSubscription.monthlySpendCoin).toBe(30);
  expect(stored.profileSubscription.premiumUseCount).toBe(2);
  expect(stored.recentConsumeRequestIds).toHaveLength(1);
});

test("exhausted pass still covers light and blocks LLM", () => {
  const { user, entitlement } = seed("standard", MONTHLY_PASS_LIMITS.standard);
  const light = evaluatePassCoverage({ user, entitlement, coinCost: 50, lightFortune: true });
  const llm = evaluatePassCoverage({ user, entitlement, coinCost: 50 });
  expect(light.covered).toBe(true);
  expect(llm).toMatchObject({ covered: false, reason: "monthly_pass_limit_exceeded" });
});

test("missing lightFortune flag charges budget", () => {
  const { user, entitlement } = seed("standard", 30);
  const coverage = evaluatePassCoverage({ user, entitlement, coinCost: 50 });
  expect(coverage).toMatchObject({ covered: true, budgetApplies: true, remainingCoin: MONTHLY_PASS_LIMITS.standard - 80 });
});

test("light product over the per-use cap is still rejected", () => {
  const { user, entitlement } = seed("standard", 0);
  expect(evaluatePassCoverage({ user, entitlement, coinCost: 51, lightFortune: true }))
    .toMatchObject({ covered: false, reason: "price_exceeds_pass_limit", perItemLimit: 50 });
});

test("remainingCoin reports the real remainder", () => {
  const under = seed("standard", 30);
  expect(evaluatePassCoverage({ user: under.user, entitlement: under.entitlement, coinCost: 50, lightFortune: true }).remainingCoin)
    .toBe(MONTHLY_PASS_LIMITS.standard - 30);
  const over = seed("standard", MONTHLY_PASS_LIMITS.standard + 10);
  expect(evaluatePassCoverage({ user: over.user, entitlement: over.entitlement, coinCost: 50, lightFortune: true }).remainingCoin).toBe(0);
});

test("describePassEligibility quotes deductKRW 0 for light", () => {
  const { user, entitlement } = seed("standard", MONTHLY_PASS_LIMITS.standard);
  const light = describePassEligibility({ user, entitlement, product: LIGHT_PER_USE });
  expect(light).toMatchObject({ eligible: true, reason: "covered", deductKRW: 0 });
  const llm = describePassEligibility({ user, entitlement, product: { ...LIGHT_PER_USE, lightFortune: false } });
  expect(llm).toMatchObject({ eligible: false, reason: "monthly_pass_limit_exceeded", deductKRW: 0 });
});

describe("pass-check per-use and unlock paths exempt light", () => {
  test("per-use", async () => {
    const { db } = seed("standard", MONTHLY_PASS_LIMITS.standard);
    const { response, payload } = await postPassCheck(db, {
      featureKey: LIGHT_PER_USE.featureKey, paymentMode: "MEMBERSHIP_PASS", requestId: "check-per-use",
    });
    expect(response.status).toBe(200);
    expect(payload.data.consume.accessType).toBe("membership_pass");
    expect(db.rows.find((row) => String(row._id) === USER).profileSubscription.monthlySpendCoin).toBe(MONTHLY_PASS_LIMITS.standard);
  });

  test("unlock", async () => {
    const { db } = seed("standard", MONTHLY_PASS_LIMITS.standard, { profileCards: [testCard("p1", { userId: USER })] });
    const { response } = await postPassCheck(db, {
      featureKey: LIGHT_UNLOCK.featureKey, paymentMode: "MEMBERSHIP_PASS", requestId: "check-unlock", profileId: "p1",
    });
    expect(response.status).toBe(200);
    expect(db.rows.find((row) => String(row._id) === USER).profileSubscription.monthlySpendCoin).toBe(MONTHLY_PASS_LIMITS.standard);
    const evidence = evidenceRows(db).find((row) => row.metadata.requestId === "check-unlock");
    expect(evidence.metadata.passBudgetExempt).toBe(true);
  });
});

test("evidence has passBudgetExempt and monthlySpendUsed equals usedCoin", async () => {
  const { db, user, entitlement } = seed("premium", 120);
  await consumePassForFeature({
    db, user, entitlement, userId: USER, featureKey: LIGHT_PER_USE.featureKey,
    requestId: "evidence", coinCost: LIGHT_PER_USE.priceCoins,
  });
  const [row] = evidenceRows(db);
  expect(row.metadata).toMatchObject({ passBudgetExempt: true, monthlySpendUsed: 120 });
});

test("charged usage does not carry the exemption marker", async () => {
  const { db, user, entitlement } = seed("premium", 120);
  await consumePassForFeature({ db, user, entitlement, userId: USER, featureKey: "tarot-love-relationship", requestId: "charged", coinCost: 50 });
  const [row] = evidenceRows(db);
  expect(row.metadata.passBudgetExempt).toBeUndefined();
  expect(row.metadata.monthlySpendUsed).toBe(170);
});

test("concurrent and retried light requests leave one evidence row and no counter change", async () => {
  const { db, user, entitlement } = seed("standard", 30);
  const consume = () => consumePassForFeature({
    db, user, entitlement, userId: USER, featureKey: LIGHT_PER_USE.featureKey,
    requestId: "same-request", coinCost: LIGHT_PER_USE.priceCoins,
  });
  const results = await Promise.all([consume(), consume()]);
  const retried = await consume();
  expect([...results, retried].every((result) => result.covered)).toBe(true);
  expect(evidenceRows(db)).toHaveLength(1);
  const stored = db.rows.find((row) => String(row._id) === USER);
  expect(stored.profileSubscription.monthlySpendCoin).toBe(30);
  expect(stored.recentConsumeRequestIds).toHaveLength(1);
});

test("refundPassCoverage skips a light source", async () => {
  const { db, user } = seed("standard", 100);
  const cycleKey = user.profileSubscription.premiumUseCycleKey;
  const result = await refundPassCoverage({
    userId: USER, cycleKey, cost: 50, refundId: "light-refund", db,
    sourcePointHistoryId: passUsageEvidenceId(USER, LIGHT_PER_USE.featureKey, "r1"),
    sourceFeatureKey: LIGHT_PER_USE.featureKey, sourceRequestId: "r1",
  });
  expect(result).toEqual({ refunded: false, skipped: true, reason: "PASS_BUDGET_EXEMPT" });
  expect(db.rows.find((row) => String(row._id) === USER).profileSubscription.monthlySpendCoin).toBe(100);
});
