/**
 * @jest-environment node
 */

let testUtils;
let Payment;
let User;

let originalPaymentFindOne;
let originalPaymentCreate;
let originalUserFindById;

function mockPaymentFindOne(result) {
  const lean = jest.fn().mockResolvedValue(result);
  const sort = jest.fn().mockReturnValue({ lean });
  Payment.findOne = jest.fn().mockReturnValue({ sort });
  return { lean, sort };
}

function mockUserFindById(result) {
  const lean = jest.fn().mockResolvedValue(result);
  const select = jest.fn().mockReturnValue({ lean });
  User.findById = jest.fn().mockReturnValue({ select });
  return { lean, select };
}

async function readResponse(response) {
  const payload = await response.json();
  return { status: response.status, payload };
}

beforeAll(async () => {
  const paymentsMod = await import("../../worker/routes/payments.js");
  const modelsMod = await import("../../worker/lib/models.js");

  testUtils = paymentsMod.__paymentsTestUtils;
  Payment = modelsMod.Payment;
  User = modelsMod.User;

  originalPaymentFindOne = Payment.findOne;
  originalPaymentCreate = Payment.create;
  originalUserFindById = User.findById;
});

afterEach(() => {
  Payment.findOne = originalPaymentFindOne;
  Payment.create = originalPaymentCreate;
  User.findById = originalUserFindById;
});

describe("Payments prepare idempotency", () => {
  const auth = { userId: "64f0a1b2c3d4e5f678901234" };

  test("point prepare: 선불 충전 비활성 정책으로 410 POINT_CHARGE_DISABLED를 반환해야 한다", async () => {
    mockPaymentFindOne({
      merchantUid: "md_existing_001",
      paymentAmount: 3300,
      expectedChargedPoints: 30,
    });
    Payment.create = jest.fn();

    const req = new Request("https://example.com/api/payments/prepare", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "idempotency-key": "idem-point-001",
      },
      body: JSON.stringify({ paymentAmount: 3300, chargePoints: 30 }),
    });

    const response = await testUtils.handlePrepare(req, {}, auth);
    const { status, payload } = await readResponse(response);

    expect(status).toBe(410);
    expect(payload.code).toBe("POINT_CHARGE_DISABLED");
    expect(Payment.create).not.toHaveBeenCalled();
  });

  test("point prepare: 상이 payload 요청도 선불 충전 비활성 정책으로 410을 반환해야 한다", async () => {
    mockPaymentFindOne({
      merchantUid: "md_existing_002",
      paymentAmount: 3300,
      expectedChargedPoints: 30,
    });
    Payment.create = jest.fn();

    const req = new Request("https://example.com/api/payments/prepare", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-idempotency-key": "idem-point-002",
      },
      body: JSON.stringify({ paymentAmount: 9900, chargePoints: 115 }),
    });

    const response = await testUtils.handlePrepare(req, {}, auth);
    const { status, payload } = await readResponse(response);

    expect(status).toBe(410);
    expect(payload.code).toBe("POINT_CHARGE_DISABLED");
    expect(Payment.create).not.toHaveBeenCalled();
  });

  test("point prepare: create race 시나리오도 선불 충전 비활성 정책으로 410을 반환해야 한다", async () => {
    const lean = jest
      .fn()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        merchantUid: "md_existing_003",
        paymentAmount: 3300,
        expectedChargedPoints: 30,
      });
    const sort = jest.fn().mockReturnValue({ lean });
    Payment.findOne = jest.fn().mockReturnValue({ sort });
    Payment.create = jest.fn().mockRejectedValue({ code: 11000 });

    const req = new Request("https://example.com/api/payments/prepare", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "idempotency-key": "idem-point-003",
      },
      body: JSON.stringify({ paymentAmount: 3300, chargePoints: 30 }),
    });

    const response = await testUtils.handlePrepare(req, {}, auth);
    const { status, payload } = await readResponse(response);

    expect(status).toBe(410);
    expect(payload.code).toBe("POINT_CHARGE_DISABLED");
    expect(Payment.create).not.toHaveBeenCalled();
  });

  test("subscription prepare: 동일 idempotency key + 동일 plan이면 idempotent=true를 반환해야 한다", async () => {
    mockUserFindById({
      profileSubscription: { tier: "free", expiresAt: null },
    });
    mockPaymentFindOne({
      merchantUid: "sub_existing_001",
      paymentAmount: 9900,
      subscriptionTier: "standard",
    });
    Payment.create = jest.fn();

    const req = new Request("https://example.com/api/payments/subscription/prepare", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "idempotency-key": "idem-sub-001",
      },
      body: JSON.stringify({ tier: "standard", paymentMethod: "card_general" }),
    });

    const response = await testUtils.handleSubscriptionPrepare(req, auth);
    const { status, payload } = await readResponse(response);

    expect(status).toBe(200);
    expect(payload.idempotent).toBe(true);
    expect(payload.order.merchantUid).toBe("sub_existing_001");
    expect(payload.order.paymentAmount).toBe(9900);
    expect(payload.order.tier).toBe("standard");
    expect(Payment.create).not.toHaveBeenCalled();
  });

  test("subscription prepare: new card order merchantUid should fit Inicis oid limit", async () => {
    for (const tier of ["standard", "premium", "vvip", "family"]) {
      mockUserFindById({
        profileSubscription: { tier: "free", expiresAt: null },
      });
      mockPaymentFindOne(null);
      Payment.create = jest.fn();

      const req = new Request("https://example.com/api/payments/subscription/prepare", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "idempotency-key": `idem-sub-new-${tier}`,
        },
        body: JSON.stringify({ tier, paymentMethod: "card_general" }),
      });

      const response = await testUtils.handleSubscriptionPrepare(req, auth);
      const { status, payload } = await readResponse(response);
      const created = Payment.create.mock.calls[0]?.[0];

      expect(status).toBe(201);
      expect(payload.order.merchantUid).toBe(created.merchantUid);
      expect(created.merchantUid).toMatch(/^[A-Za-z0-9_-]+$/);
      expect(created.merchantUid.length).toBeLessThanOrEqual(40);
    }
  });

  test("subscription prepare: 동일 idempotency key + 상이 plan이면 409 IDEMPOTENCY_CONFLICT여야 한다", async () => {
    mockUserFindById({
      profileSubscription: { tier: "free", expiresAt: null },
    });
    mockPaymentFindOne({
      merchantUid: "sub_existing_002",
      paymentAmount: 29900,
      subscriptionTier: "premium",
    });
    Payment.create = jest.fn();

    const req = new Request("https://example.com/api/payments/subscription/prepare", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ tier: "standard", idempotencyKey: "idem-sub-002", paymentMethod: "card_general" }),
    });

    const response = await testUtils.handleSubscriptionPrepare(req, auth);
    const { status, payload } = await readResponse(response);

    expect(status).toBe(409);
    expect(payload.code).toBe("IDEMPOTENCY_CONFLICT");
    expect(Payment.create).not.toHaveBeenCalled();
  });

  test("subscription prepare: 신규 판매는 30일권이 아니면 거부해야 한다", async () => {
    Payment.create = jest.fn();
    User.findById = jest.fn();

    const req = new Request("https://example.com/api/payments/subscription/prepare", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        tier: "standard",
        durationMonths: 12,
        durationDays: 365,
        paymentMethod: "card_general",
      }),
    });

    const response = await testUtils.handleSubscriptionPrepare(req, auth);
    const { status, payload } = await readResponse(response);

    expect(status).toBe(400);
    expect(payload.code).toBe("INVALID_SUBSCRIPTION_DURATION");
    expect(User.findById).not.toHaveBeenCalled();
    expect(Payment.create).not.toHaveBeenCalled();
  });

  test("subscription prepare: 연간 planId 직접 요청도 거부해야 한다", async () => {
    Payment.create = jest.fn();
    User.findById = jest.fn();

    const req = new Request("https://example.com/api/payments/subscription/prepare", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        tier: "standard",
        planId: "standard_12m",
        paymentMethod: "card_general",
      }),
    });

    const response = await testUtils.handleSubscriptionPrepare(req, auth);
    const { status, payload } = await readResponse(response);

    expect(status).toBe(400);
    expect(payload.code).toBe("SUBSCRIPTION_PLAN_MISMATCH");
    expect(User.findById).not.toHaveBeenCalled();
    expect(Payment.create).not.toHaveBeenCalled();
  });

  test("digital content prepare: duplicate checkout returns existing order for same idempotency key", async () => {
    mockUserFindById({
      profileSubscription: { tier: "free", expiresAt: null },
    });
    mockPaymentFindOne({
      merchantUid: "md_existing_digital_001",
      paymentAmount: 12000,
      expectedChargedPoints: 150,
      featureKey: "usage-pass-saju_unlock-3",
      membershipCreditCost: 15,
      accessType: "single_purchase",
    });
    Payment.create = jest.fn();

    const req = new Request("https://example.com/api/payments/prepare", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "idempotency-key": "idem-digital-001",
      },
      body: JSON.stringify({
        productId: "saju_unlock_3",
        paymentType: "digital_content",
        paymentAmount: 12000,
      }),
    });

    const response = await testUtils.handlePrepare(req, {}, auth);
    const { status, payload } = await readResponse(response);

    expect(status).toBe(200);
    expect(payload.idempotent).toBe(true);
    expect(payload.order.merchantUid).toBe("md_existing_digital_001");
    expect(payload.order.paymentAmount).toBe(12000);
    expect(Payment.create).not.toHaveBeenCalled();
  });
});
