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

  test("공통 유료 콘텐츠 판정은 already_unlocked에서 결제 선택창을 열지 않아야 한다", () => {
    const decision = utils.buildPaidContentAccessDecision({
      accessGranted: true,
      reason: "already_unlocked",
      shouldOpenPaymentSelector: true,
      unlockId: "unlock_1",
      priceCoin: 50,
    });

    expect(decision).toEqual({
      accessGranted: true,
      reason: "already_unlocked",
      shouldOpenPaymentSelector: false,
      availableMethods: ["pass", "monthly", "one_time"],
      unlockId: "unlock_1",
      priceCoin: 50,
    });
  });

  test("공통 유료 콘텐츠 판정은 payment_required에서만 결제 선택창을 열어야 한다", () => {
    const passCovered = utils.buildPaidContentAccessDecision({
      accessGranted: true,
      reason: "pass_covered",
      shouldOpenPaymentSelector: true,
      priceCoin: 50,
    });
    const paymentRequired = utils.buildPaidContentAccessDecision({
      reason: "payment_required",
      shouldOpenPaymentSelector: true,
      priceCoin: 50,
    });

    expect(passCovered.shouldOpenPaymentSelector).toBe(false);
    expect(paymentRequired.shouldOpenPaymentSelector).toBe(true);
    expect(paymentRequired.availableMethods).toEqual(["pass", "monthly", "one_time"]);
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

  test("인증된 유료 기능은 잔액과 무관하게 requires_purchase 이어야 한다", () => {
    const decision = utils.buildAccessDecision({
      pricing: { featureKey: "premium_pdf_ziwei", cost: 590 },
      authenticated: true,
      balance: 100,
      unlockMap: {},
      subscription: { isActive: false, freeLimit: 0 },
    });

    expect(decision.allowed).toBe(false);
    expect(decision.reason).toBe(utils.ACCESS_DECISION_REASONS.REQUIRES_PURCHASE);
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
  test("returns temporary_unavailable instead of payment_required when pass lookup is unavailable", async () => {
    const decision = await utils.resolvePaidContentAccess({}, {
      userId: "507f1f77bcf86cd799439011",
      profileId: "profile-1",
      pricing: {
        featureKey: "saju_ai_prompt_generator",
        cost: 200,
        coinPrice: 200,
      },
      requestId: "req-pass-lookup-unavailable",
      requestedPaymentMode: "membership_pass",
    });

    expect(decision.accessGranted).toBe(false);
    expect(decision.reason).toBe("temporary_unavailable");
    expect(decision.temporaryUnavailable).toBe(true);
    expect(decision.shouldOpenPaymentSelector).toBe(false);
    expect(decision.errorCode).toBe("PASS_STATUS_TEMPORARILY_UNAVAILABLE");
    expect(decision.paymentOptions).toBeTruthy();
  });
});
