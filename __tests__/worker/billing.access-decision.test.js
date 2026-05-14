/**
 * @jest-environment node
 */

let utils;

beforeAll(async () => {
  const mod = await import("../../worker/routes/billing.js");
  utils = mod.__billingTestUtils;
});

describe("Billing access decision", () => {
  test("결제 POST 인증 프리체크는 미인증 요청을 AUTH_REQUIRED로 표준화해야 한다", async () => {
    const request = new Request("https://example.com/api/billing/purchase", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ featureKey: "premium_pdf_ziwei" }),
    });

    const result = await utils.requireBillingAuth(request, { NODE_ENV: "production" }, { featureKey: "premium_pdf_ziwei" });
    const payload = await result.response.json();

    expect(result.ok).toBe(false);
    expect(result.response.status).toBe(401);
    expect(payload.error.code).toBe("AUTH_REQUIRED");
  });

  test("무료 기능은 allowed=true/free 이어야 한다", () => {
    const decision = utils.buildAccessDecision({
      pricing: { featureKey: "free-feature", cost: 0 },
      authenticated: false,
      balance: 0,
      unlockMap: {},
      subscription: { isActive: false, freeLimit: 0 },
    });

    expect(decision.allowed).toBe(true);
    expect(decision.reason).toBe(utils.ACCESS_DECISION_REASONS.FREE);
  });

  test("미인증 사용자는 auth_required 이어야 한다", () => {
    const decision = utils.buildAccessDecision({
      pricing: { featureKey: "premium_pdf_ziwei", cost: 590 },
      authenticated: false,
      balance: 9999,
      unlockMap: {},
      subscription: { isActive: false, freeLimit: 0 },
    });

    expect(decision.allowed).toBe(false);
    expect(decision.reason).toBe(utils.ACCESS_DECISION_REASONS.AUTH_REQUIRED);
  });

  test("이미 해금된 기능은 already_unlocked 이어야 한다", () => {
    const decision = utils.buildAccessDecision({
      pricing: { featureKey: "premium_pdf_ziwei", cost: 590 },
      authenticated: true,
      balance: 10,
      unlockMap: { premium_pdf_ziwei: true },
      subscription: { isActive: false, freeLimit: 0 },
    });

    expect(decision.allowed).toBe(true);
    expect(decision.reason).toBe(utils.ACCESS_DECISION_REASONS.ALREADY_UNLOCKED);
  });

  test("구독 무료 한도 내 기능은 subscription_active 이어야 한다", () => {
    const decision = utils.buildAccessDecision({
      pricing: { featureKey: "tarot-mindscan", cost: 50 },
      authenticated: true,
      balance: 0,
      unlockMap: {},
      subscription: { isActive: true, freeLimit: 100 },
    });

    expect(decision.allowed).toBe(true);
    expect(decision.reason).toBe(utils.ACCESS_DECISION_REASONS.SUBSCRIPTION_ACTIVE);
  });

  test("잔액 부족은 insufficient_coins 이어야 한다", () => {
    const decision = utils.buildAccessDecision({
      pricing: { featureKey: "premium_pdf_ziwei", cost: 590 },
      authenticated: true,
      balance: 100,
      unlockMap: {},
      subscription: { isActive: false, freeLimit: 0 },
    });

    expect(decision.allowed).toBe(false);
    expect(decision.reason).toBe(utils.ACCESS_DECISION_REASONS.INSUFFICIENT_COINS);
  });

  test("잔액 충분한 유료 기능은 requires_purchase 이어야 한다", () => {
    const decision = utils.buildAccessDecision({
      pricing: { featureKey: "premium_pdf_ziwei", cost: 590 },
      authenticated: true,
      balance: 1000,
      unlockMap: {},
      subscription: { isActive: false, freeLimit: 0 },
    });

    expect(decision.allowed).toBe(false);
    expect(decision.reason).toBe(utils.ACCESS_DECISION_REASONS.REQUIRES_PURCHASE);
  });
});
