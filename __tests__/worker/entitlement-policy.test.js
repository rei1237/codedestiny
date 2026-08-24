/**
 * @jest-environment node
 *
 * Pure server-policy regression tests. No database, payment provider, or
 * external API is contacted.
 */

let policy;

beforeAll(async () => {
  policy = await import("../../worker/lib/entitlement-policy.js");
});

const future = "2099-01-01T00:00:00.000Z";
const active = (tier, extra = {}) => ({
  profileSubscription: {
    tier,
    passTier: tier,
    status: "active",
    isActive: true,
    expiresAt: future,
    ...extra,
  },
});

describe("canonical entitlement and feature access policy", () => {
  // 2026-08-24 적용 가격 범위: standard 50 · premium 100 · vvip 200 코인(= 5,000/10,000/20,000원).
  test.each([
    ["standard", 50, 51],
    ["premium", 100, 101],
    ["vvip", 200, 201],
  ])("%s uses its canonical feature limit", (tier, allowedCost, deniedCost) => {
    expect(policy.resolveFeatureAccessPolicy({ user: active(tier), coinCost: allowedCost })).toMatchObject({
      allowed: true,
      tier,
      isPaymentSubstitute: false,
    });
    expect(policy.resolveFeatureAccessPolicy({ user: active(tier), coinCost: deniedCost })).toMatchObject({
      allowed: false,
      reason: "PRICE_EXCEEDS_PASS_LIMIT",
      isPaymentSubstitute: false,
    });
  });

  test("family is feature access only and does not become a payment substitute", () => {
    const result = policy.resolveFeatureAccessPolicy({ user: active("family"), coinCost: 300 });
    expect(result).toMatchObject({ allowed: true, tier: "family", isPaymentSubstitute: false });
    expect(result.accessType).toBe("family");
  });

  test("canonical standard is never elevated by legacy family", () => {
    const user = {
      ...active("standard"),
      membership: { tier: "family", status: "active", expiresAt: future },
    };
    expect(policy.resolveCanonicalEntitlement(user)).toMatchObject({
      tier: "standard",
      source: "profileSubscription",
      conflict: false,
    });
    // standard 상한(50코인)을 넘는 금액이라야 "legacy family 가 끌어올리지 않는다"가 실제로 재진다.
    expect(policy.resolveFeatureAccessPolicy({ user, coinCost: 51 }).allowed).toBe(false);
  });

  test("expired canonical entitlement does not fall back to active legacy", () => {
    const user = {
      profileSubscription: { tier: "standard", status: "expired", expiresAt: "2020-01-01T00:00:00.000Z" },
      subscription: { tier: "family", status: "active", expiresAt: future },
    };
    expect(policy.resolveCanonicalEntitlement(user)).toMatchObject({
      tier: "standard",
      source: "profileSubscription",
      isActive: false,
    });
  });

  test("conflicting legacy entitlements fail closed", () => {
    const user = {
      subscription: { tier: "standard", status: "active", expiresAt: future },
      membership: { tier: "family", status: "active", expiresAt: future },
    };
    expect(policy.resolveCanonicalEntitlement(user)).toMatchObject({ conflict: true, tier: "none" });
    expect(policy.resolveFeatureAccessPolicy({ user, coinCost: 1 })).toMatchObject({
      allowed: false,
      reason: "LEGACY_ENTITLEMENT_CONFLICT",
    });
  });
});

describe("server purchase policy", () => {
  test.each(["standard", "premium", "vvip", "family"])(
    "%s cannot buy a pass-like product with pass coverage",
    (tier) => {
      const result = policy.validatePurchasePolicy({
        userId: "user-test",
        productId: `cd_pass_${tier}_30d`,
        productType: "pass",
        price: 9900,
        requestedPaymentMethod: "pass",
        currentSubscription: active(tier).profileSubscription,
        familyPlanInfo: tier === "family" ? active(tier).profileSubscription : null,
        orderContext: { coveredByPass: true, userEntitlement: { tier } },
      });
      expect(result).toMatchObject({
        allowed: false,
        denialReason: "CANNOT_BUY_PASS_WITH_PASS",
        auditCode: "CANNOT_BUY_PASS_WITH_PASS",
      });
    },
  );

  test.each(["pass", "subscription", "bundle", "family"])(
    "%s requires direct PG checkout",
    (productType) => {
      expect(policy.validatePurchasePolicy({ productType, requestedPaymentMethod: "pass" }).allowed).toBe(false);
      expect(policy.validatePurchasePolicy({ productType, requestedPaymentMethod: "pg" }).allowed).toBe(true);
      expect(policy.validatePurchasePolicy({ productType, requestedPaymentMethod: "monthly_credit" })).toMatchObject({
        allowed: false,
        denialReason: "INVALID_PAYMENT_METHOD_FOR_PASS_PRODUCT",
      });
    },
  );

  test("client coveredByPass tampering is rejected for pass products", () => {
    const result = policy.validatePurchasePolicy({
      productType: "subscription",
      requestedPaymentMethod: "pg",
      orderContext: { coveredByPass: true },
    });
    expect(result).toMatchObject({ allowed: false, denialReason: "CLIENT_PAYMENT_METHOD_TAMPERING_DETECTED" });
  });
});
