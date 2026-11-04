/**
 * @jest-environment node
 *
 * 상담 한도를 다 써도 이용권은 끝나지 않는다(라이트 운세가 계속 열린다).
 * 대신 소진 상태의 구매는 어떤 등급이든 처음 산 것처럼 새 이용권으로 시작한다.
 */
import { readFileSync } from "node:fs";
import { handlePaymentsContext } from "../../worker/payments/index.js";
import { consumePassForFeature } from "../../worker/lib/pass-consumption.js";
import { activatePassSubscription } from "../../worker/payments/passes.js";
import { legacyPassCheckEnvelope } from "../../worker/payments/compat.js";
import { resolveCanonicalEntitlement } from "../../worker/lib/entitlement-policy.js";
import {
  FAMILY_MIN_PASS_COVERABLE_COIN,
  MIN_PASS_COVERABLE_COIN,
  buildExhaustedPassRestore,
  buildPassCycleFields,
  buildPassRefundRevokeFields,
  computePassExpiry,
  evaluatePassTierTransition,
  isActivePassBudgetExhausted,
  isPassPolicyConflict,
  resolvePassPolicy,
} from "../../worker/lib/profile-limits.js";
import {
  CURRENT_PASS_POLICY_VERSION,
  PREVIOUS_PASS_POLICY_VERSION,
  currentPassPlan,
  previousPassPlan,
} from "../../lib/payment/pass-policy.js";
import { makeFakePaymentDb } from "../fixtures/fake-payment-db.mjs";

const USER = "64b000000000000000000002";
const ENV = { JWT_ACCESS_SECRET: "test-access-secret-value-0123456789" };
const TIERS = ["standard", "premium", "vvip", "family"];
const LLM_KEY = "tarot-love-relationship";
const NOW = new Date("2026-11-05T00:00:00.000Z");
const EXPIRES = new Date("2126-01-01T00:00:00.000Z");

const baseOf = (tier, version = CURRENT_PASS_POLICY_VERSION) =>
  resolvePassPolicy({ passPolicyVersion: version }, tier).monthlyCoveredCoin;

function subscription(tier, usedCoin, overrides = {}) {
  const version = overrides.passPolicyVersion || CURRENT_PASS_POLICY_VERSION;
  const expiresAt = overrides.expiresAt || EXPIRES;
  return {
    tier, passTier: tier, isActive: true, expiresAt,
    passPolicyVersion: version,
    premiumUseCycleKey: new Date(expiresAt).toISOString(),
    monthlySpendCoin: usedCoin,
    monthlyLimitCoin: baseOf(tier, version),
    ...overrides,
  };
}

const exhausted = (tier, overrides) => subscription(tier, baseOf(tier, overrides?.passPolicyVersion), overrides);

test("threshold is the cheapest counselling price, 50 coins, for every tier", () => {
  expect(MIN_PASS_COVERABLE_COIN).toBe(50);
  expect(FAMILY_MIN_PASS_COVERABLE_COIN).toBe(50);
});

describe("exhaustion does not close the pass", () => {
  function seed(spend) {
    const db = makeFakePaymentDb();
    const expiresAt = new Date(Date.now() + 10 * 86_400_000);
    const user = {
      _id: USER, points: 0, recentConsumeRequestIds: [],
      profileSubscription: {
        tier: "standard", passTier: "standard", isActive: true, expiresAt,
        premiumUseCycleKey: expiresAt.toISOString(), monthlySpendCoin: spend, monthlyLimitCoin: 0,
      },
    };
    db.rows.push(user);
    return { db, user, expiresAt };
  }

  test("the consumption that empties the budget keeps expiry and tier", async () => {
    const { db, user, expiresAt } = seed(0);
    const budget = resolvePassPolicy({}, "standard").monthlyCoveredCoin;
    user.profileSubscription.monthlySpendCoin = budget - 50;
    const result = await consumePassForFeature({
      db, user, entitlement: resolveCanonicalEntitlement(user), userId: USER,
      featureKey: LLM_KEY, requestId: "last-llm", coinCost: 50,
    });
    expect(result.covered).toBe(true);
    const stored = db.rows.find((row) => String(row._id) === USER).profileSubscription;
    expect(stored.monthlySpendCoin).toBe(budget);
    expect(new Date(stored.expiresAt).toISOString()).toBe(expiresAt.toISOString());
    expect(stored.tier).toBe("standard");
    expect(stored.passExhaustedAt).toBeUndefined();
  });

  test("pass-check does not announce the end of the pass", async () => {
    const budget = resolvePassPolicy({}, "standard").monthlyCoveredCoin;
    const { db } = seed(budget - 50);
    const { signAuthToken } = await import("../../worker/lib/auth.js");
    const token = await signAuthToken({ _id: USER, email: "t@e.st", role: "user", name: "t" }, ENV);
    const request = new Request("https://code-destiny.com/api/payments/coin-gate/pass-check", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ featureKey: LLM_KEY, paymentMode: "MEMBERSHIP_PASS", requestId: "check-last" }),
    });
    const response = await handlePaymentsContext(request, ENV, { prefix: "/api/payments", withDb: (_e, _c, fn) => fn(db) });
    const payload = await response.json();
    expect(response.status).toBe(200);
    expect(payload.data.membershipPass.passEnded).toBeUndefined();
    expect(payload.data.membershipPass.monthlySpendRemaining).toBe(0);
  });
});

test("compat membershipPass.passEnded stays false at exhaustion", () => {
  const envelope = legacyPassCheckEnvelope({
    product: { featureKey: LLM_KEY, priceCoins: 50, billingType: "per_use" }, requestId: "r",
    coverage: { tier: "standard", budgetApplies: true, usedCoin: 300, remainingCoin: 0, coinCost: 50 },
    entitlement: { tier: "standard" }, user: { _id: USER, profileSubscription: exhausted("standard") },
  });
  expect(envelope.data?.membershipPass?.passEnded).toBeUndefined();
  expect(envelope.data?.membershipPass?.passEndedAt).toBeUndefined();
});

describe.each(TIERS)("exhausted %s buys any tier as new", (priorTier) => {
  test.each(TIERS)("→ %s", (nextTier) => {
    const prior = exhausted(priorTier);
    const transition = evaluatePassTierTransition(prior, nextTier, NOW);
    expect(transition).toEqual({ code: "NEW", activeTier: "free" });
    const expiresAt = computePassExpiry({ transition, paidAt: NOW, now: NOW });
    expect(expiresAt.getTime()).not.toBe(EXPIRES.getTime());
    const fields = buildPassCycleFields({
      priorSubscription: prior, tier: nextTier, expiresAt, now: NOW, passPolicyVersion: CURRENT_PASS_POLICY_VERSION,
    });
    expect(fields).toEqual({
      premiumUseCycleKey: expiresAt.toISOString(), premiumUseCount: 0, monthlySpendCoin: 0, monthlyLimitCoin: baseOf(nextTier),
    });
  });
});

describe("exhaustion boundary is 50 coins", () => {
  const base = baseOf("premium");

  test("50 left is not exhausted and keeps the existing ladder", () => {
    const prior = subscription("premium", base - 50);
    expect(isActivePassBudgetExhausted(prior, NOW)).toBe(false);
    expect(evaluatePassTierTransition(prior, "standard", NOW).code).toBe("DOWNGRADE_BLOCKED");
    expect(evaluatePassTierTransition(prior, "premium", NOW).code).toBe("EXTENSION_ALLOWED");
    expect(evaluatePassTierTransition(prior, "vvip", NOW).code).toBe("UPGRADE_ALLOWED");
  });

  test("49 left is exhausted", () => {
    const prior = subscription("premium", base - 49);
    expect(isActivePassBudgetExhausted(prior, NOW)).toBe(true);
    expect(evaluatePassTierTransition(prior, "standard", NOW).code).toBe("NEW");
  });

  test("a stale cycle key reads as nothing spent", () => {
    expect(isActivePassBudgetExhausted(subscription("premium", base, { premiumUseCycleKey: "old" }), NOW)).toBe(false);
  });

  test("a stacked limit raises the budget", () => {
    expect(isActivePassBudgetExhausted(subscription("premium", base, { monthlyLimitCoin: base * 2 }), NOW)).toBe(false);
  });

  test("no pass is not an exhausted pass", () => {
    expect(isActivePassBudgetExhausted({}, NOW)).toBe(false);
    expect(isActivePassBudgetExhausted(null, NOW)).toBe(false);
  });
});

describe("exhausted v3 holder buys v5, app-store and gift included", () => {
  const v3 = (used) => subscription("standard", used, { passPolicyVersion: PREVIOUS_PASS_POLICY_VERSION });
  const v3Base = baseOf("standard", PREVIOUS_PASS_POLICY_VERSION);

  test("conflict rule lets only the exhausted holder through", () => {
    expect(isPassPolicyConflict(v3(v3Base), currentPassPlan("standard"), NOW)).toBe(false);
    expect(isPassPolicyConflict(v3(0), currentPassPlan("standard"), NOW)).toBe(true);
    expect(isPassPolicyConflict(v3(0), previousPassPlan("standard"), NOW)).toBe(false);
  });

  test("web activation starts a fresh v5 pass", async () => {
    const db = makeFakePaymentDb();
    const user = { _id: USER, points: 0, profileSubscription: v3(v3Base) };
    db.rows.push(user);
    const plan = currentPassPlan("standard");
    const expiresAt = computePassExpiry({
      transition: evaluatePassTierTransition(user.profileSubscription, plan.tier, NOW), paidAt: NOW, now: NOW,
    });
    await activatePassSubscription(db, { userId: USER, plan, orderId: "repurchase-v5", paidAt: NOW, expiresAt, now: NOW, existing: user });
    const stored = db.rows.find((row) => String(row._id) === USER).profileSubscription;
    expect(stored).toMatchObject({
      tier: "standard", passPolicyVersion: CURRENT_PASS_POLICY_VERSION, monthlySpendCoin: 0,
      monthlyLimitCoin: baseOf("standard"), premiumUseCycleKey: expiresAt.toISOString(),
    });
  });

  test.each([
    ["worker/payments/passes.js"],
    ["worker/payments/index.js"],
    ["worker/payments/gifts.js"],
    ["worker/routes/app-store.js"],
  ])("%s applies the same conflict rule", (file) => {
    const source = readFileSync(new URL(`../../${file}`, import.meta.url), "utf8");
    expect(source).toContain("isPassPolicyConflict(");
    expect(source).not.toContain("isPassPolicyMix(");
  });
});

test("expired pass is not revived", () => {
  const expiresAt = new Date(NOW.getTime() - 1000);
  const prior = exhausted("premium", { expiresAt });
  expect(isActivePassBudgetExhausted(prior, NOW)).toBe(false);
  expect(evaluatePassTierTransition(prior, "standard", NOW)).toEqual({ code: "NEW", activeTier: "free" });
});

describe("refund", () => {
  const base = baseOf("standard");

  test("refund of a repurchase keeps the pass while earlier limit remains", () => {
    const stacked = subscription("standard", base + 100, { monthlyLimitCoin: base * 2 });
    const result = buildPassRefundRevokeFields({ subscription: stacked, now: NOW });
    expect(result.downgraded).toBe(false);
    expect(result.fields).toEqual({ monthlyLimitCoin: base, updatedAt: NOW });
  });

  const applyRefund = (sub) => {
    const { downgraded, fields } = buildPassRefundRevokeFields({ subscription: sub, now: NOW });
    return { downgraded, after: { ...sub, ...fields } };
  };

  test("refund of a repurchase made while exhausted restores the earlier pass and its light rights", async () => {
    const earlier = exhausted("standard", { lastPassOrderId: "earlier-order" });
    const db = makeFakePaymentDb();
    const user = { _id: USER, points: 0, profileSubscription: earlier };
    db.rows.push(user);
    const plan = currentPassPlan("premium");
    const expiresAt = computePassExpiry({ transition: evaluatePassTierTransition(earlier, plan.tier, NOW), paidAt: NOW, now: NOW });
    await activatePassSubscription(db, { userId: USER, plan, orderId: "repurchase", paidAt: NOW, expiresAt, now: NOW, existing: user });
    const repurchased = db.rows.find((row) => String(row._id) === USER).profileSubscription;
    expect(repurchased).toMatchObject({ tier: "premium", monthlySpendCoin: 0 });

    const { downgraded, after } = applyRefund(repurchased);
    expect(downgraded).toBe(false);
    expect(after).toMatchObject({
      tier: "standard", passTier: "standard", expiresAt: EXPIRES, lastPassOrderId: "earlier-order",
      premiumUseCycleKey: EXPIRES.toISOString(), monthlySpendCoin: base, monthlyLimitCoin: base,
      exhaustedPassRestore: null,
    });
    expect(isActivePassBudgetExhausted(after, NOW)).toBe(true);
  });

  test("restore keeps only the latest exhausted pass, without nesting", () => {
    const older = { tier: "vvip", passTier: "vvip", expiresAt: EXPIRES };
    const snapshot = buildExhaustedPassRestore({ priorSubscription: exhausted("standard", { exhaustedPassRestore: older }), tier: "premium", now: NOW });
    expect(snapshot).toMatchObject({ tier: "standard", monthlySpendCoin: base });
    expect(snapshot).not.toHaveProperty("exhaustedPassRestore");
  });

  test("restore survives a same-tier repurchase and is dropped by an upgrade", () => {
    const restore = exhausted("standard");
    const active = subscription("premium", 0, { exhaustedPassRestore: restore });
    expect(buildExhaustedPassRestore({ priorSubscription: active, tier: "premium", now: NOW })).toBe(restore);
    expect(buildExhaustedPassRestore({ priorSubscription: active, tier: "vvip", now: NOW })).toBeNull();
  });

  test("refund of a stacked repurchase keeps the restore for the earlier order", () => {
    const restore = exhausted("standard");
    const stacked = subscription("premium", 0, { monthlyLimitCoin: baseOf("premium") * 2, exhaustedPassRestore: restore });
    const { downgraded, after } = applyRefund(stacked);
    expect(downgraded).toBe(false);
    expect(after).toMatchObject({ tier: "premium", monthlyLimitCoin: baseOf("premium"), exhaustedPassRestore: restore });
  });

  test("no restore for a first purchase, and an expired restore does not revive", () => {
    expect(buildExhaustedPassRestore({ priorSubscription: {}, tier: "standard", now: NOW })).toBeNull();
    const lapsed = exhausted("standard", { expiresAt: new Date(NOW.getTime() - 1000) });
    expect(buildExhaustedPassRestore({ priorSubscription: lapsed, tier: "standard", now: NOW })).toBeNull();
    const stale = subscription("premium", 0, { exhaustedPassRestore: lapsed });
    expect(applyRefund(stale).downgraded).toBe(true);
    expect(applyRefund(stale).after).toMatchObject({ tier: "free", monthlyLimitCoin: 0 });
  });

  test("refund of first purchase or upgrade terminates", () => {
    const first = subscription("standard", 0);
    expect(buildPassRefundRevokeFields({ subscription: first, now: NOW })).toMatchObject({
      downgraded: true, fields: { tier: "free", monthlyLimitCoin: 0 },
    });
  });
});
