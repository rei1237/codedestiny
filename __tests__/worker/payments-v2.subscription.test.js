/**
 * @jest-environment node
 *
 * 이용권(구독) 컷오버 — POST /subscription/prepare · /subscription/confirm.
 *
 * 구 핸들러(payments.js handleSubscriptionPrepare/Confirm)의 검증 순서·오류 코드·응답 키를
 * V2(passes.js + confirmOrder) 위에서 승계했는지 실행으로 확인한다. 가격 리터럴은 셸
 * goldenPackages 와 3중 미러라 여기서 대조한다(구 payments.subscription-purchase.test.js 와
 * 같은 기법). PG 는 전부 모킹 — 실결제·실 DB 없음.
 *
 * 핵심 회귀 방지 3종:
 *   · 활성화는 lastPassOrderId 가드로 멱등 — 같은 주문 재confirm 이 만료를 이중 연장하면 안 된다
 *   · webhook(무인증 confirmOrder)도 같은 활성화를 탄다 — grantOrderEntitlement 의 이용권 분기가
 *     없으면 이용권 결제 웹훅이 카탈로그 지급 경로에 빠져 활성화 없이 실패로 남는다
 *   · 구 billing 재작성 승계: 이용권형 바디가 제네릭 /prepare 로 와도 이용권 경로로 위임된다
 */
import { readFileSync } from "node:fs";
import { handlePaymentsContext, __paymentsContextTestUtils } from "../../worker/payments/index.js";
import { __passesTestUtils, buildPassCustomerUid } from "../../worker/payments/passes.js";
import { makeFakePaymentDb } from "../fixtures/fake-payment-db.mjs";

const USER = "64b000000000000000000001";
const OTHER_USER = "64b000000000000000000002";
const ENV = {
  JWT_ACCESS_SECRET: "test-access-secret-value-0123456789",
  PORTONE_STORE_ID: "store-test-1",
  PORTONE_CHANNEL_KEY: "channel-test-1",
  PORTONE_API_SECRET: "portone-secret-test",
};
const DAY_MS = 86_400_000;

const originalFetch = global.fetch;
afterEach(() => { global.fetch = originalFetch; });

async function tokenFor(userId) {
  const { signAuthToken } = await import("../../worker/lib/auth.js");
  return signAuthToken({ _id: userId, email: "t@e.st", role: "user", name: "t" }, ENV);
}

function seedUser(db, profileSubscription = { tier: "free", expiresAt: null }) {
  const user = {
    _id: USER,
    email: "buyer@example.com",
    name: "테스터",
    phoneNumber: "01012345678",
    points: 0,
    profileSubscription,
  };
  db.rows.push(user);
  return user;
}

function passBody(tier, overrides = {}) {
  return {
    tier,
    planId: `${tier}_1m`,
    durationMonths: 1,
    durationDays: 30,
    amount: __passesTestUtils.PASS_MONTHLY_WON[tier],
    currency: "KRW",
    productType: "membership_pass",
    paymentMethod: "card_general",
    ...overrides,
  };
}

async function post(db, path, body, { asUser = USER, headers = {} } = {}) {
  const request = new Request(`https://code-destiny.com${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${await tokenFor(asUser)}`,
      ...headers,
    },
    body: JSON.stringify(body),
  });
  const response = await handlePaymentsContext(request, ENV, {
    prefix: "/api/payments",
    withDb: (_env, _ctx, fn) => fn(db),
  });
  return { response, payload: await response.json() };
}

/** PortOne 실 API 응답 형태 그대로 모킹 — normalizePortOnePayment 를 실제로 통과시킨다. */
function mockPortOnePayment({ paymentId, status = "PAID", amount, currency = "KRW" }) {
  global.fetch = async () => ({
    ok: true,
    status: 200,
    statusText: "OK",
    json: async () => ({
      id: paymentId,
      paymentId,
      status,
      currency,
      amount: { total: amount, paid: amount, currency },
      paidAt: new Date().toISOString(),
      method: { type: "PaymentMethodCard" },
    }),
  });
}

async function prepareOrder(db, tier, idempotencyKey) {
  const { response, payload } = await post(db, "/api/payments/subscription/prepare", passBody(tier), {
    headers: { "Idempotency-Key": idempotencyKey },
  });
  expect(response.status).toBe(201);
  return payload.order;
}

describe("가격 정본 — 3중 미러", () => {
  test("이용권 4등급 가격이 홈 셸 goldenPackages 값과 일치해야 한다", () => {
    const shell = readFileSync("index.html", "utf8");
    for (const [tier, price] of Object.entries(__passesTestUtils.PASS_MONTHLY_WON)) {
      const pattern = new RegExp(`id:\\s*'${tier}'[^}]*?price:\\s*(\\d+)`);
      const match = shell.match(pattern);
      expect(match).not.toBeNull();
      expect(Number(match[1])).toBe(price);
    }
  });
});

describe("prepare — 구 계약 승계", () => {
  test("정상 준비: 201 + 클라이언트 소비 키 전부(merchantUid·customerUid·customer·productName…)", async () => {
    const db = makeFakePaymentDb();
    seedUser(db);
    const order = await prepareOrder(db, "standard", "sub-key-basic");
    // PointsClient 소비 키(4399-4446): merchantUid·productName·paymentAmount·customerUid·customer.phoneNumber
    expect(order.merchantUid).toMatch(/^sub_s1m_[0-9a-f]{28}$/);
    expect(order.customerUid).toBe(buildPassCustomerUid(USER));
    expect(order.customer).toMatchObject({ fullName: "테스터", email: "buyer@example.com", phoneNumber: "01012345678" });
    expect(order.paymentAmount).toBe(9900);
    expect(order.productName).toContain("30일");
    expect(order).toMatchObject({
      tier: "standard", planId: "standard_1m", durationMonths: 1, durationDays: 30,
      productType: "membership_pass", recurring: false,
    });
    expect(order.profileLimit).toBeGreaterThan(0);
  });

  test("같은 멱등키 재호출은 같은 주문, 다른 키는 새 주문", async () => {
    const db = makeFakePaymentDb();
    seedUser(db);
    const first = await prepareOrder(db, "standard", "sub-key-idem");
    const { payload: second } = await post(db, "/api/payments/subscription/prepare", passBody("standard"), {
      headers: { "Idempotency-Key": "sub-key-idem" },
    });
    expect(second.order.merchantUid).toBe(first.merchantUid);
    expect(db.rows.filter((r) => r.paymentType === "membership_pass")).toHaveLength(1);
    const third = await prepareOrder(db, "standard", "sub-key-other");
    expect(third.merchantUid).not.toBe(first.merchantUid);
  });

  test.each(["monthly_credit", "monthly", "membership_credit", "moonlight_stone"])(
    "%s 결제 방식은 DB 를 열기 전에 차단된다 (구 문구 고정)",
    async (paymentMethod) => {
      const db = makeFakePaymentDb();
      seedUser(db);
      const { response, payload } = await post(db, "/api/payments/subscription/prepare", passBody("standard", { paymentMethod }));
      expect(response.status).toBe(400);
      expect(payload.code).toBe("SUBSCRIPTION_MONTHLY_CREDIT_UNSUPPORTED");
      expect(payload.message).toBe("이용권은 단건 결제로만 구매할 수 있습니다. 월정석으로는 이용권을 구매할 수 없습니다.");
      expect(db.ctx.ops).toBe(0);
    },
  );

  test("금액 조작: 400 SUBSCRIPTION_PRICE_MISMATCH (DB 접근 없음)", async () => {
    const db = makeFakePaymentDb();
    const { response, payload } = await post(db, "/api/payments/subscription/prepare", passBody("vvip", { amount: 100 }));
    expect(response.status).toBe(400);
    expect(payload.code).toBe("SUBSCRIPTION_PRICE_MISMATCH");
    expect(db.ctx.ops).toBe(0);
  });

  test("30일권이 아닌 기간: 400 INVALID_SUBSCRIPTION_DURATION (DB 접근 없음)", async () => {
    const db = makeFakePaymentDb();
    const { response, payload } = await post(db, "/api/payments/subscription/prepare", passBody("standard", { durationMonths: 3, durationDays: 90 }));
    expect(response.status).toBe(400);
    expect(payload.code).toBe("INVALID_SUBSCRIPTION_DURATION");
    expect(db.ctx.ops).toBe(0);
  });

  test("활성 상위 이용권 보유 중 하위 등급: 409 SUBSCRIPTION_DOWNGRADE_BLOCKED", async () => {
    const db = makeFakePaymentDb();
    seedUser(db, { tier: "premium", expiresAt: new Date(Date.now() + 10 * DAY_MS) });
    const { response, payload } = await post(db, "/api/payments/subscription/prepare", passBody("standard"));
    expect(response.status).toBe(409);
    expect(payload.code).toBe("SUBSCRIPTION_DOWNGRADE_BLOCKED");
    expect(db.rows.some((r) => r.paymentType === "membership_pass")).toBe(false);
  });

  /* 🔴 2026-08-16 계약 변경. 예전에는 여기서 409 IDEMPOTENCY_CONFLICT 를 고정했다. 지켜야 할 것은
     "옛 주문을 조용히 돌려주지 않는다"이지 "거절한다"가 아니었다 — `/points`(PointsClient)는 그 409 를
     새 키로 재시도하지 않고 토스트만 띄우므로, 사용자는 키가 바뀔 때까지 **이용권을 살 수 없는
     막다른 길**에 갇혔다. 이제 카드 상품과 같이 세대를 올려 요청한 플랜의 새 주문을 발급한다.
     옛 주문은 미결제 그대로 남아 만료되고, 새 merchantUid = 새 PortOne paymentId 다. */
  test("같은 키·다른 등급의 기존 주문: 옛 주문을 돌려주지 않고 요청한 등급의 새 주문을 낸다", async () => {
    const db = makeFakePaymentDb();
    seedUser(db);
    const existingUid = "sub_p1m_existing0000000000000000000";
    db.rows.push({
      userId: USER, idempotencyKey: "sub-key-drift", paymentType: "membership_pass",
      merchantUid: existingUid, paymentAmount: 29900,
      subscriptionTier: "premium", status: "pending", createdAt: new Date(Date.now() - 60_000),
    });
    const { response, payload } = await post(db, "/api/payments/subscription/prepare", passBody("standard"), {
      headers: { "Idempotency-Key": "sub-key-drift" },
    });
    expect(response.status).toBeLessThan(400);
    expect(payload.order.merchantUid).not.toBe(existingUid);
    // 옛 premium 주문은 손대지 않는다 — 조용한 재가격도, 상태 변경도 없다.
    const stale = db.rows.find((row) => row.merchantUid === existingUid);
    expect(stale.subscriptionTier).toBe("premium");
    expect(stale.paymentAmount).toBe(29900);
    expect(stale.status).toBe("pending");
  });

  /* 결제 완료 주문의 merchantUid 를 PortOne 에 다시 넘기면 결제창이 그려지기 전에 거절된다 —
     카드 쪽에서 닫은 형제 결함이 이용권에도 그대로 있었다. */
  test("🔴 같은 키의 기존 주문이 결제 완료면 그 주문을 재사용하지 않는다", async () => {
    const db = makeFakePaymentDb();
    seedUser(db);
    const paidUid = "sub_p1m_paid00000000000000000000000";
    db.rows.push({
      userId: USER, idempotencyKey: "sub-key-paid", paymentType: "membership_pass",
      merchantUid: paidUid, paymentAmount: 9900,
      subscriptionTier: "standard", status: "paid", createdAt: new Date(Date.now() - 60_000),
    });
    const { response, payload } = await post(db, "/api/payments/subscription/prepare", passBody("standard"), {
      headers: { "Idempotency-Key": "sub-key-paid" },
    });
    expect(response.status).toBeLessThan(400);
    expect(payload.order.merchantUid).not.toBe(paidUid);
    expect(db.rows.find((row) => row.merchantUid === paidUid).status).toBe("paid");
  });

  /* 🔴 2026-08-15 회귀 재현. createPassOrder 에도 orders.js createOrder 와 **같은** 11000 catch
     누락이 있었다. 잡지 않으면 lib/http.js 가 MongoServerError 를 /^Mongo/ 로 삼켜 503
     DB_UNAVAILABLE 로 내보내고, 클라이언트의 status>=500 폴백이 결제창을 다시 연다. */
  test("🔴 동시 요청의 패자는 503 이 아니라 승자의 이용권 주문을 받는다", async () => {
    const winnerUid = `sub_s1m_${"a".repeat(28)}`;
    const db = makeFakePaymentDb({
      // 승자가 우리 필터 조회와 insert 사이에 커밋한 상황. upsert 는 11000 으로 진다.
      onDuplicate: () => {
        if (db.rows.some((r) => r.paymentType === "membership_pass")) return false;
        db.rows.push({
          _id: "oid-pass-winner",
          userId: USER, idempotencyKey: "sub-key-race", paymentType: "membership_pass",
          merchantUid: winnerUid, paymentAmount: 9900, subscriptionTier: "standard",
          status: "pending", orderState: "PENDING", createdAt: new Date(),
        });
        return true;
      },
    });
    seedUser(db);
    const { response, payload } = await post(db, "/api/payments/subscription/prepare", passBody("standard"), {
      headers: { "Idempotency-Key": "sub-key-race" },
    });
    expect(response.status).toBe(201);
    expect(payload.order.merchantUid).toBe(winnerUid); // 승자와 같은 문서 = 같은 PG 창
    expect(db.rows.filter((r) => r.paymentType === "membership_pass")).toHaveLength(1);
  });

  test("이용권으로 이용권 구매 시도: 403 PURCHASE_POLICY_DENIED", async () => {
    const db = makeFakePaymentDb();
    seedUser(db);
    const { response, payload } = await post(db, "/api/payments/subscription/prepare", passBody("standard", { paymentMethod: "pass" }));
    expect(response.status).toBe(403);
    expect(payload.code).toBe("PURCHASE_POLICY_DENIED");
    expect(db.rows.some((r) => r.paymentType === "membership_pass")).toBe(false);
  });
});

describe("confirm — 활성화·멱등·경계", () => {
  test("정상 결제(PortOne paid + 금액 일치): 이용권 30일 활성화 + 구 응답 키", async () => {
    const db = makeFakePaymentDb();
    const user = seedUser(db);
    const order = await prepareOrder(db, "standard", "sub-confirm-fresh");
    mockPortOnePayment({ paymentId: order.merchantUid, amount: 9900 });

    const { response, payload } = await post(db, "/api/payments/subscription/confirm", passBody("standard", {
      impUid: order.merchantUid, merchantUid: order.merchantUid, customerUid: order.customerUid,
    }));
    expect(response.status).toBe(200);
    expect(payload.idempotent).toBe(false);
    // 클라이언트 소비 키(PointsClient 4085-4099): tier·source·isActive·startedAt·expiresAt·profileLimit…
    expect(payload.subscription).toMatchObject({ tier: "standard", source: "pass", isActive: true, cancelAtPeriodEnd: false });
    const expiresInDays = Math.round((new Date(payload.subscription.expiresAt).getTime() - Date.now()) / DAY_MS);
    expect(expiresInDays).toBe(30);
    expect(payload.payment).toMatchObject({ merchantUid: order.merchantUid, paymentType: "membership_pass", paymentAmount: 9900 });
    // DB 반영: 주문 paid + 지급 스탬프 + User.profileSubscription flat $set (중첩 반영)
    const paidOrder = db.rows.find((r) => r.merchantUid === order.merchantUid);
    expect(paidOrder.status).toBe("paid");
    expect(paidOrder.entitlementGrantedAt).toBeTruthy();
    expect(user.profileSubscription.tier).toBe("standard");
    expect(user.profileSubscription.source).toBe("pass");
    expect(user.profileSubscription.lastPassOrderId).toBe(order.merchantUid);
    expect(user.profileSubscription.nextBillingAt).toBeNull(); // 자동갱신 없음(구 동작 동일)
  });

  test("같은 주문 재confirm: 멱등 응답 + 만료 이중 연장 없음 (lastPassOrderId 가드)", async () => {
    const db = makeFakePaymentDb();
    const user = seedUser(db);
    const order = await prepareOrder(db, "standard", "sub-confirm-replay");
    mockPortOnePayment({ paymentId: order.merchantUid, amount: 9900 });
    const body = passBody("standard", { impUid: order.merchantUid, merchantUid: order.merchantUid });

    await post(db, "/api/payments/subscription/confirm", body);
    const firstExpiry = new Date(user.profileSubscription.expiresAt).getTime();
    const { response, payload } = await post(db, "/api/payments/subscription/confirm", body);
    expect(response.status).toBe(200);
    expect(payload.idempotent).toBe(true);
    expect(payload.subscription.isActive).toBe(true);
    expect(new Date(user.profileSubscription.expiresAt).getTime()).toBe(firstExpiry); // 연장 스택 재적용 금지
  });

  test("같은 등급 연장: 기존 만료에 이어 붙는다(스택)", async () => {
    const db = makeFakePaymentDb();
    const user = seedUser(db, {
      tier: "standard", expiresAt: new Date(Date.now() + 10 * DAY_MS), lastPassOrderId: "sub_s1m_prior",
    });
    const order = await prepareOrder(db, "standard", "sub-confirm-extend");
    mockPortOnePayment({ paymentId: order.merchantUid, amount: 9900 });
    await post(db, "/api/payments/subscription/confirm", passBody("standard", {
      impUid: order.merchantUid, merchantUid: order.merchantUid,
    }));
    const expiresInDays = Math.round((new Date(user.profileSubscription.expiresAt).getTime() - Date.now()) / DAY_MS);
    expect(expiresInDays).toBe(40); // 10일 잔여 + 30일
  });

  test("업그레이드: 남은 기간 소멸, 결제 시점부터 30일 (구 정책 그대로)", async () => {
    const db = makeFakePaymentDb();
    const user = seedUser(db, {
      tier: "standard", expiresAt: new Date(Date.now() + 20 * DAY_MS), lastPassOrderId: "sub_s1m_prior",
    });
    const order = await prepareOrder(db, "premium", "sub-confirm-upgrade");
    mockPortOnePayment({ paymentId: order.merchantUid, amount: 29900 });
    await post(db, "/api/payments/subscription/confirm", passBody("premium", {
      impUid: order.merchantUid, merchantUid: order.merchantUid,
    }));
    expect(user.profileSubscription.tier).toBe("premium");
    const expiresInDays = Math.round((new Date(user.profileSubscription.expiresAt).getTime() - Date.now()) / DAY_MS);
    expect(expiresInDays).toBe(30); // 20일 잔여가 50일로 스택되면 안 된다
  });

  test("남의 이용권 주문 confirm: 403", async () => {
    const db = makeFakePaymentDb();
    seedUser(db);
    const order = await prepareOrder(db, "standard", "sub-confirm-owner");
    const { response } = await post(db, "/api/payments/subscription/confirm", passBody("standard", {
      impUid: order.merchantUid, merchantUid: order.merchantUid,
    }), { asUser: OTHER_USER });
    expect(response.status).toBe(403);
  });

  test("주문 등급과 바디 등급 불일치: 400 SUBSCRIPTION_PLAN_MISMATCH", async () => {
    const db = makeFakePaymentDb();
    seedUser(db);
    const order = await prepareOrder(db, "premium", "sub-confirm-tier-drift");
    const { response, payload } = await post(db, "/api/payments/subscription/confirm", passBody("standard", {
      impUid: order.merchantUid, merchantUid: order.merchantUid,
    }));
    expect(response.status).toBe(400);
    expect(payload.code).toBe("SUBSCRIPTION_PLAN_MISMATCH");
  });

  test.each(["monthly_credit", "moonlight_stone"])(
    "%s 결제 방식은 confirm 에서도 차단된다 (구 문구 고정)",
    async (paymentMethod) => {
      const db = makeFakePaymentDb();
      const { response, payload } = await post(db, "/api/payments/subscription/confirm", passBody("premium", {
        impUid: "pay_x", merchantUid: "sub_p1m_x", paymentMethod,
      }));
      expect(response.status).toBe(400);
      expect(payload.code).toBe("SUBSCRIPTION_MONTHLY_CREDIT_UNSUPPORTED");
      expect(payload.message).toBe("이용권은 단건 결제로만 구매할 수 있습니다. 월정석으로는 이용권을 구매할 수 없습니다.");
      expect(db.ctx.ops).toBe(0);
    },
  );
});

describe("webhook·크론 주체 — grantOrderEntitlement 이용권 분기", () => {
  test("무인증 confirmOrder(웹훅 경로)도 이용권을 활성화한다 — 카탈로그 지급 경로로 빠지면 안 된다", async () => {
    const db = makeFakePaymentDb();
    const user = seedUser(db);
    const order = await prepareOrder(db, "vvip", "sub-webhook-actor");

    const { confirmOrder } = __paymentsContextTestUtils;
    const runConfirm = (handle, ctx, input, deps) =>
      confirmOrder(ENV, ctx, input, { withDb: (_env, _ctx, fn) => fn(handle), deps });
    const ctx = { mongoOps: 0 };
    const result = await runConfirm(db, ctx, { orderId: order.merchantUid }, {
      fetchPayment: async () => ({
        paymentId: order.merchantUid, status: "paid", amount: 59000, currency: "KRW",
        pay_method: "card", paid_at: Math.floor(Date.now() / 1000),
      }),
    });
    expect(result.granted).toBe(true);
    expect(user.profileSubscription.tier).toBe("vvip");
    expect(user.profileSubscription.lastPassOrderId).toBe(order.merchantUid);
    const paidOrder = db.rows.find((r) => r.merchantUid === order.merchantUid);
    expect(paidOrder.entitlementGrantedAt).toBeTruthy();
  });

  test("웹훅 선확정 후 클라이언트 confirm: 활성화가 이미 끝났으면 멱등, 미완이면 마무리한다", async () => {
    const db = makeFakePaymentDb();
    const user = seedUser(db);
    const order = await prepareOrder(db, "standard", "sub-webhook-first");
    // 웹훅이 PAID 까지만 만들고 활성화(grant)가 미완인 상태를 시드한다.
    const row = db.rows.find((r) => r.merchantUid === order.merchantUid);
    Object.assign(row, { status: "paid", paidAt: new Date(), entitlementGrantedAt: null });

    const { response, payload } = await post(db, "/api/payments/subscription/confirm", passBody("standard", {
      impUid: order.merchantUid, merchantUid: order.merchantUid,
    }));
    expect(response.status).toBe(200);
    expect(payload.idempotent).toBe(true); // PAID 재생 — PG 를 다시 부르지 않는다(fetch 모킹 없이 통과가 그 증명)
    expect(payload.subscription.isActive).toBe(true);
    expect(user.profileSubscription.tier).toBe("standard");
    expect(row.entitlementGrantedAt).toBeTruthy();
  });

  /* 🔴 카드는 이미 승인됐다. 여기서 503 을 내면 사용자는 결제된 돈에 대해 "실패"를 보고, 재시도해도
     주문이 PAID 라 같은 답만 돌아온다 — confirmOrder 머리주석이 "구 코드의 모순"이라며 제거를 선언한
     그 패턴이 이용권 경로에만 남아 있었다. 마무리는 웹훅 재생과 재조정 크론이 맡는다. */
  test("활성화 쓰기가 실패해도 200 GRANT_PENDING — 결제된 돈에 실패를 답하지 않는다", async () => {
    const db = makeFakePaymentDb();
    seedUser(db);
    const order = await prepareOrder(db, "standard", "sub-grant-fails");
    const row = db.rows.find((r) => r.merchantUid === order.merchantUid);
    Object.assign(row, { status: "paid", paidAt: new Date(), entitlementGrantedAt: null });

    // 활성화 쓰기만 죽인다(다른 읽기·쓰기는 정상) — confirmOrder 안팎의 두 번의 지급 시도가 모두 실패한다.
    const failing = {
      ...db,
      async findOneAndUpdate(Model, filter, update, opts) {
        if (update?.$set?.["profileSubscription.tier"]) throw new Error("connection timed out");
        return db.findOneAndUpdate(Model, filter, update, opts);
      },
    };
    const request = new Request("https://code-destiny.com/api/payments/subscription/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${await tokenFor(USER)}` },
      body: JSON.stringify(passBody("standard", { impUid: order.merchantUid, merchantUid: order.merchantUid })),
    });
    const response = await handlePaymentsContext(request, ENV, {
      prefix: "/api/payments",
      withDb: (_env, _ctx, fn) => fn(failing),
    });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.code).toBe("GRANT_PENDING");
    expect(payload.activationPending).toBe(true);
    expect(payload.pollUrl).toContain(order.merchantUid);
    expect(payload.payment.status).toBe("paid");
    // 주문은 paid + 미지급으로 남아야 크론 regrantUnfulfilledOrders 가 집어간다.
    expect(row.status).toBe("paid");
    expect(row.entitlementGrantedAt).toBeFalsy();
  });
});

describe("구 billing 재작성 승계 — 이용권형 바디 위임", () => {
  test("제네릭 /prepare 로 온 이용권형 바디는 이용권 경로로 위임된다", async () => {
    const db = makeFakePaymentDb();
    seedUser(db);
    // 구 billing.js isSubscription 판별과 동일: 클라이언트의 productType 주장만으로는 이용권으로
    // 보지 않는다(변조 의심 → UNKNOWN). paymentType/subscriptionTier 가 신호다.
    const { response, payload } = await post(db, "/api/payments/prepare", passBody("standard", { paymentType: "subscription" }), {
      headers: { "Idempotency-Key": "sub-delegated-key" },
    });
    expect(response.status).toBe(201);
    expect(payload.order.merchantUid).toMatch(/^sub_s1m_/); // 회당 주문(cd…)이 아니라 이용권 주문
    expect(payload.order.customerUid).toBe(buildPassCustomerUid(USER));
  });
});
