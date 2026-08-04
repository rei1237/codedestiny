/**
 * @jest-environment node
 *
 * 달빛 이용권 상점 구매(= membership pass) 회귀 테스트.
 * PortOne REST(global.fetch)와 Mongo 모델을 전부 모킹하므로 실결제·실 DB 접근이 없다.
 *
 * 검증 대상
 *  - KRW 단건 결제로 이용권을 사는 경로 (`/api/payments/subscription/confirm`)
 *  - 월정석으로 이용권을 사려는 경로가 prepare/confirm 단계에서 차단되는지
 */

let testUtils;
let Payment;
let User;
let PaymentFailureLog;
let originalFetch;
let originals;

const AUTH = { userId: "64f0a1b2c3d4e5f678901234", role: "user" };
const ENV = {
  PORTONE_API_SECRET: "portone-test-secret",
  PORTONE_CHANNEL_KEY: "channel-test-key",
  PORTONE_STORE_ID: "store_test_001",
  PORTONE_WEBHOOK_SECRET: "whsec_test_secret",
};

// index.html 의 달빛 이용권 상점 패키지(goldenPackages)와 동일해야 하는 값.
const WEB_PASS_PRICES = {
  standard: 9900,
  premium: 29900,
  vvip: 59000,
  family: 149000,
};

function chain(result) {
  const self = {
    lean: jest.fn().mockResolvedValue(result),
    select: jest.fn(() => self),
    sort: jest.fn(() => self),
    session: jest.fn(() => self),
    catch: jest.fn(async () => result),
    then: undefined,
  };
  return self;
}

function mockPortOnePayment({ paymentId, status = "PAID", amount, currency = "KRW" }) {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    status: 200,
    statusText: "OK",
    json: async () => ({
      id: paymentId,
      paymentId,
      status,
      currency,
      amount: { total: amount, paid: amount, currency },
      paidAt: "2026-07-28T00:00:00.000Z",
      method: { type: "PaymentMethodCard" },
    }),
  });
}

function confirmRequest(body) {
  return new Request("https://example.com/api/payments/subscription/confirm", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function krwConfirmBody(tier, overrides = {}) {
  return {
    impUid: `pay_${tier}_001`,
    tier,
    planId: `${tier}_1m`,
    durationMonths: 1,
    durationDays: 30,
    amount: WEB_PASS_PRICES[tier],
    currency: "KRW",
    productType: "membership_pass",
    paymentMethod: "card",
    ...overrides,
  };
}

function freeUser(extraSubscription = {}) {
  return {
    _id: AUTH.userId,
    points: 0,
    profileSubscription: { tier: "free", expiresAt: null, ...extraSubscription },
  };
}

async function readResponse(response) {
  const payload = await response.json();
  return { status: response.status, payload };
}

beforeAll(async () => {
  const paymentsMod = await import("../../worker/routes/payments.js");
  const modelsMod = await import("../../worker/lib/models.js");
  const dbMod = await import("../../worker/lib/db.js");

  testUtils = paymentsMod.__paymentsTestUtils;
  Payment = modelsMod.Payment;
  User = modelsMod.User;
  PaymentFailureLog = modelsMod.PaymentFailureLog;

  originalFetch = global.fetch;
  originals = {
    startSession: dbMod.mongoose.startSession,
    paymentFindOne: Payment.findOne,
    paymentFindById: Payment.findById,
    paymentFindOneAndUpdate: Payment.findOneAndUpdate,
    paymentFindByIdAndUpdate: Payment.findByIdAndUpdate,
    paymentCreate: Payment.create,
    userFindById: User.findById,
    userFindByIdAndUpdate: User.findByIdAndUpdate,
    userFindOneAndUpdate: User.findOneAndUpdate,
    userUpdateOne: User.updateOne,
    failureLogCreate: PaymentFailureLog.create,
  };

  // 테스트 환경엔 replica set 이 없다. 워커도 이 경우 비트랜잭션 경로로 폴백하도록
  // 이미 설계돼 있으므로(isTransactionUnsupported), 동일한 에러를 흉내낸다.
  dbMod.mongoose.startSession = jest.fn().mockRejectedValue(
    new Error("Transaction numbers are only allowed on a replica set member or mongos"),
  );

  // withMongoRetry 는 시도마다 connectDb 를 부른다. 이미 연결된 것으로 보이게 해서(readyState=1)
  // 실제 Mongo URI 없이도 재시도 래퍼를 통과시킨다 — ping 은 실패해도 연결을 그대로 반환하는 설계다.
  Object.defineProperty(dbMod.mongoose.connection, "readyState", { value: 1, configurable: true });
  PaymentFailureLog.create = jest.fn().mockResolvedValue({});
});

afterAll(async () => {
  const dbMod = await import("../../worker/lib/db.js");
  dbMod.mongoose.startSession = originals.startSession;
  PaymentFailureLog.create = originals.failureLogCreate;
  global.fetch = originalFetch;
});

afterEach(() => {
  global.fetch = originalFetch;
  Payment.findOne = originals.paymentFindOne;
  Payment.findById = originals.paymentFindById;
  Payment.findOneAndUpdate = originals.paymentFindOneAndUpdate;
  Payment.findByIdAndUpdate = originals.paymentFindByIdAndUpdate;
  Payment.create = originals.paymentCreate;
  User.findById = originals.userFindById;
  User.findByIdAndUpdate = originals.userFindByIdAndUpdate;
  User.findOneAndUpdate = originals.userFindOneAndUpdate;
  User.updateOne = originals.userUpdateOne;
});

describe("달빛 이용권 상점 — 가격 정본", () => {
  test("이용권 4등급 가격이 홈 셸 goldenPackages 값과 일치해야 한다", async () => {
    const { readFileSync } = await import("node:fs");
    const shell = readFileSync("index.html", "utf8");

    for (const [tier, price] of Object.entries(WEB_PASS_PRICES)) {
      // 셸 패키지 정의: { id: 'standard', ..., price: 9900, ... }
      const pattern = new RegExp(`id:\\s*'${tier}'[^}]*?price:\\s*(\\d+)`);
      const match = shell.match(pattern);
      expect(match).not.toBeNull();
      expect(Number(match[1])).toBe(price);
    }
  });
});

describe("달빛 이용권 상점 — 결제 준비(prepare)", () => {
  function prepareRequest(tier, idempotencyKey, paymentMethod = "card_general") {
    return new Request("https://example.com/api/payments/subscription/prepare", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "idempotency-key": idempotencyKey,
      },
      body: JSON.stringify({
        tier,
        planId: `${tier}_1m`,
        durationMonths: 1,
        durationDays: 30,
        amount: WEB_PASS_PRICES[tier],
        currency: "KRW",
        productType: "membership_pass",
        paymentMethod,
      }),
    });
  }

  test.each(["monthly_credit", "monthly", "membership_credit", "moonlight_stone"])(
    "%s 결제 방식은 이용권 prepare에서 차단되어야 한다",
    async (paymentMethod) => {
      User.findById = jest.fn();
      Payment.findOne = jest.fn();
      Payment.create = jest.fn();

      const response = await testUtils.handleSubscriptionPrepare(
        prepareRequest("standard", `membership-prepare-${paymentMethod}-blocked`, paymentMethod),
        ENV,
        AUTH,
      );
      const { status, payload } = await readResponse(response);

      expect(status).toBe(400);
      expect(payload.code).toBe("SUBSCRIPTION_MONTHLY_CREDIT_UNSUPPORTED");
      expect(User.findById).not.toHaveBeenCalled();
      expect(Payment.findOne).not.toHaveBeenCalled();
      expect(Payment.create).not.toHaveBeenCalled();
    },
  );

  test("같은 멱등키로 두 번 준비하면 같은 주문을 돌려주고 주문을 새로 만들지 않아야 한다", async () => {
    // 모달 오픈 시 프리페치 + 실제 클릭이 같은 키를 쓰는 상황. 주문이 중복 생성되면 안 된다.
    const idempotencyKey = "membership-prepare-standard-card_general-test";
    const createdOrder = {
      _id: "payment-doc-prepare",
      userId: AUTH.userId,
      merchantUid: "sub_test_standard_001",
      idempotencyKey,
      paymentAmount: WEB_PASS_PRICES.standard,
      subscriptionTier: "standard",
      status: "pending",
    };

    User.findById = jest.fn().mockReturnValue(chain(freeUser()));
    Payment.findOne = jest.fn().mockReturnValue(chain(null));
    Payment.create = jest.fn().mockResolvedValue(createdOrder);

    const first = await testUtils.handleSubscriptionPrepare(prepareRequest("standard", idempotencyKey), ENV, AUTH);
    const firstResult = await readResponse(first);
    expect(firstResult.status).toBe(201);
    expect(Payment.create).toHaveBeenCalledTimes(1);
    // merchantUid 는 서버가 생성한다. 재사용 여부는 이 값이 두 번째 호출에서 그대로 나오는지로 본다.
    const issuedMerchantUid = firstResult.payload.order.merchantUid;
    expect(issuedMerchantUid).toBeTruthy();

    // 두 번째 호출: 같은 멱등키의 주문이 이미 있으므로 재사용해야 한다.
    Payment.findOne = jest.fn().mockReturnValue(chain({ ...createdOrder, merchantUid: issuedMerchantUid }));
    Payment.create = jest.fn();

    const second = await testUtils.handleSubscriptionPrepare(prepareRequest("standard", idempotencyKey), ENV, AUTH);
    const secondResult = await readResponse(second);

    expect(secondResult.status).toBe(200);
    expect(secondResult.payload.idempotent).toBe(true);
    expect(secondResult.payload.order.merchantUid).toBe(issuedMerchantUid);
    expect(Payment.create).not.toHaveBeenCalled();
  });

  test("인증이 함께 읽어준 문서가 있으면 User 를 다시 조회하지 않아야 한다", async () => {
    // 결제창 진입 왕복을 줄이는 최적화. authUserDoc 재사용이 깨지면 지연·503 표면적이 다시 늘어난다.
    User.findById = jest.fn();
    Payment.findOne = jest.fn().mockReturnValue(chain(null));
    Payment.create = jest.fn().mockResolvedValue({ _id: "payment-doc-projection", merchantUid: "sub_test_premium_001" });

    const authWithDoc = { ...AUTH, authUserDoc: { _id: AUTH.userId, profileSubscription: { tier: "free", expiresAt: null } } };
    const response = await testUtils.handleSubscriptionPrepare(
      prepareRequest("premium", "membership-prepare-premium-card_general-test"),
      ENV,
      authWithDoc,
    );

    expect(response.status).toBe(201);
    expect(User.findById).not.toHaveBeenCalled();
  });
});

describe("달빛 이용권 상점 — KRW 단건 결제 구매", () => {
  test("정상 결제(PortOne paid + 금액 일치)면 이용권이 30일 활성화돼야 한다", async () => {
    const paymentId = "pay_standard_001";
    mockPortOnePayment({ paymentId, amount: WEB_PASS_PRICES.standard });

    Payment.findOne = jest.fn().mockReturnValue(chain({
      _id: "payment-doc-1",
      userId: AUTH.userId,
      merchantUid: paymentId,
      status: "pending",
      productId: "standard_1m",
      paymentAmount: WEB_PASS_PRICES.standard,
    }));
    Payment.findOneAndUpdate = jest.fn().mockReturnValue(chain({ _id: "payment-doc-1", status: "processing" }));
    Payment.findByIdAndUpdate = jest.fn().mockReturnValue(chain({ _id: "payment-doc-1", status: "success" }));
    User.findById = jest.fn().mockReturnValue(chain(freeUser()));

    const activatedExpiresAt = new Date(Date.now() + 30 * 86400000);
    User.findByIdAndUpdate = jest.fn().mockReturnValue(chain({
      _id: AUTH.userId,
      points: 0,
      profileSubscription: { tier: "standard", planId: "standard_1m", expiresAt: activatedExpiresAt },
    }));

    const response = await testUtils.handleSubscriptionConfirm(
      confirmRequest(krwConfirmBody("standard")),
      ENV,
      AUTH,
    );
    const { status, payload } = await readResponse(response);

    expect(status).toBe(200);
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(payload.subscription.tier).toBe("standard");
    expect(payload.subscription.isActive).toBe(true);

    // 이용권 활성 write 에 30일 만료가 실려야 한다.
    const update = User.findByIdAndUpdate.mock.calls[0][1].$set;
    expect(update["profileSubscription.tier"]).toBe("standard");
    expect(update["profileSubscription.planId"]).toBe("standard_1m");
    expect(update["profileSubscription.source"]).toBe("pass");
    const grantedDays = Math.round(
      (update["profileSubscription.expiresAt"].getTime() - Date.now()) / 86400000,
    );
    expect(grantedDays).toBe(30);
  });

  test("클라이언트가 보낸 금액이 조작되면 SUBSCRIPTION_PRICE_MISMATCH 로 거부해야 한다", async () => {
    Payment.findOne = jest.fn();
    User.findByIdAndUpdate = jest.fn();

    const response = await testUtils.handleSubscriptionConfirm(
      confirmRequest(krwConfirmBody("vvip", { amount: 100 })),
      ENV,
      AUTH,
    );
    const { status, payload } = await readResponse(response);

    expect(status).toBe(400);
    expect(payload.code).toBe("SUBSCRIPTION_PRICE_MISMATCH");
    expect(Payment.findOne).not.toHaveBeenCalled();
    expect(User.findByIdAndUpdate).not.toHaveBeenCalled();
  });

  test("PortOne 실제 결제금액이 상품가와 다르면 거부하고 결제를 실패로 기록해야 한다", async () => {
    const paymentId = "pay_premium_underpay";
    mockPortOnePayment({ paymentId, amount: WEB_PASS_PRICES.premium - 20000 });

    Payment.findOne = jest.fn().mockReturnValue(chain({
      _id: "payment-doc-2",
      userId: AUTH.userId,
      merchantUid: paymentId,
      status: "pending",
      productId: "premium_1m",
    }));
    Payment.findByIdAndUpdate = jest.fn().mockReturnValue(chain({}));
    User.findByIdAndUpdate = jest.fn();

    const response = await testUtils.handleSubscriptionConfirm(
      confirmRequest(krwConfirmBody("premium", { impUid: paymentId })),
      ENV,
      AUTH,
    );

    expect(response.status).toBe(400);
    expect(User.findByIdAndUpdate).not.toHaveBeenCalled();
    expect(Payment.findByIdAndUpdate).toHaveBeenCalledWith(
      "payment-doc-2",
      expect.objectContaining({
        $set: expect.objectContaining({
          status: "failed",
          failureCode: "subscription_amount_mismatch",
        }),
      }),
    );
  });

  test("PortOne 상태가 결제완료가 아니면 이용권을 지급하지 않아야 한다", async () => {
    const paymentId = "pay_standard_ready";
    mockPortOnePayment({ paymentId, status: "READY", amount: WEB_PASS_PRICES.standard });

    Payment.findOne = jest.fn().mockReturnValue(chain({
      _id: "payment-doc-3",
      userId: AUTH.userId,
      merchantUid: paymentId,
      status: "pending",
      productId: "standard_1m",
    }));
    Payment.findByIdAndUpdate = jest.fn().mockReturnValue(chain({}));
    User.findByIdAndUpdate = jest.fn();

    const response = await testUtils.handleSubscriptionConfirm(
      confirmRequest(krwConfirmBody("standard", { impUid: paymentId })),
      ENV,
      AUTH,
    );

    expect(response.status).toBe(400);
    expect(User.findByIdAndUpdate).not.toHaveBeenCalled();
  });

  test("이미 성공 처리된 결제를 다시 confirm 하면 멱등 응답만 주고 기간을 중복 연장하지 않아야 한다", async () => {
    const paymentId = "pay_standard_dup";
    mockPortOnePayment({ paymentId, amount: WEB_PASS_PRICES.standard });

    Payment.findOne = jest.fn().mockReturnValue(chain({
      _id: "payment-doc-4",
      userId: AUTH.userId,
      merchantUid: paymentId,
      status: "success",
      productId: "standard_1m",
    }));
    User.findById = jest.fn().mockReturnValue(chain({
      profileSubscription: {
        tier: "standard",
        planId: "standard_1m",
        expiresAt: new Date(Date.now() + 30 * 86400000),
      },
    }));
    User.findByIdAndUpdate = jest.fn();

    const response = await testUtils.handleSubscriptionConfirm(
      confirmRequest(krwConfirmBody("standard", { impUid: paymentId })),
      ENV,
      AUTH,
    );
    const { status, payload } = await readResponse(response);

    expect(status).toBe(200);
    expect(payload.idempotent).toBe(true);
    expect(User.findByIdAndUpdate).not.toHaveBeenCalled();
  });

  test("남의 결제 레코드로 confirm 하면 403 이어야 한다", async () => {
    const paymentId = "pay_standard_other";
    mockPortOnePayment({ paymentId, amount: WEB_PASS_PRICES.standard });

    Payment.findOne = jest.fn().mockReturnValue(chain({
      _id: "payment-doc-5",
      userId: "64f0a1b2c3d4e5f678909999",
      merchantUid: paymentId,
      status: "pending",
      productId: "standard_1m",
    }));
    User.findByIdAndUpdate = jest.fn();

    const response = await testUtils.handleSubscriptionConfirm(
      confirmRequest(krwConfirmBody("standard", { impUid: paymentId })),
      ENV,
      AUTH,
    );

    expect(response.status).toBe(403);
    expect(User.findByIdAndUpdate).not.toHaveBeenCalled();
  });

  test("30일권이 아닌 기간은 INVALID_SUBSCRIPTION_DURATION 으로 거부해야 한다", async () => {
    Payment.findOne = jest.fn();

    const response = await testUtils.handleSubscriptionConfirm(
      confirmRequest(krwConfirmBody("standard", { durationMonths: 3, durationDays: 90 })),
      ENV,
      AUTH,
    );
    const { status, payload } = await readResponse(response);

    expect(status).toBe(400);
    expect(payload.code).toBe("INVALID_SUBSCRIPTION_DURATION");
    expect(Payment.findOne).not.toHaveBeenCalled();
  });
});

describe("달빛 이용권 상점 — 월정석 구매 차단", () => {
  function monthlyBody(tier, paymentMethod) {
    return {
      impUid: `pay_monthly_${tier}_blocked`,
      merchantUid: `sub_monthly_${tier}_blocked`,
      requestId: `sub_monthly_${tier}_blocked`,
      tier,
      planId: `${tier}_1m`,
      durationMonths: 1,
      durationDays: 30,
      amount: WEB_PASS_PRICES[tier],
      currency: "KRW",
      productType: "membership_pass",
      paymentMethod,
    };
  }

  test.each(["monthly_credit", "monthly", "membership_credit", "moonlight_stone"])(
    "%s 결제 방식은 이용권 confirm에서 차단되어야 한다",
    async (paymentMethod) => {
      global.fetch = jest.fn();
      Payment.findOne = jest.fn();
      Payment.create = jest.fn();
      Payment.findByIdAndUpdate = jest.fn();
      Payment.findById = jest.fn();
      User.findById = jest.fn();
      User.findByIdAndUpdate = jest.fn();
      User.findOneAndUpdate = jest.fn();

      const response = await testUtils.handleSubscriptionConfirm(
        confirmRequest(monthlyBody("premium", paymentMethod)),
        ENV,
        AUTH,
      );
      const { status, payload } = await readResponse(response);

      expect(status).toBe(400);
      expect(payload.code).toBe("SUBSCRIPTION_MONTHLY_CREDIT_UNSUPPORTED");
      expect(payload.message).toBe("이용권은 단건 결제로만 구매할 수 있습니다. 월정석으로는 이용권을 구매할 수 없습니다.");
      expect(Payment.findOne).not.toHaveBeenCalled();
      expect(Payment.create).not.toHaveBeenCalled();
      expect(Payment.findByIdAndUpdate).not.toHaveBeenCalled();
      expect(Payment.findById).not.toHaveBeenCalled();
      expect(User.findById).not.toHaveBeenCalled();
      expect(User.findByIdAndUpdate).not.toHaveBeenCalled();
      expect(User.findOneAndUpdate).not.toHaveBeenCalled();
      expect(global.fetch).not.toHaveBeenCalled();
    },
  );
});
