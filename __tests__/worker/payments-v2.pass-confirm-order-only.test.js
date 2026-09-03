/**
 * @jest-environment node
 *
 * 이용권 confirm 이 **주문번호 하나로** 성립하는지.
 *
 * 왜 필요한가: 모바일은 PortOne 이 상위 프레임을 리다이렉트하므로 확정은 "복귀한 문서가 스스로
 * 재개"하는 경로뿐인데, 카카오페이처럼 다른 앱으로 이탈하는 수단은 안드로이드가 **새 탭으로**
 * 복귀시키는 일이 있어 로컬 대기 정보(tier·planId)가 통째로 빈다. 예전에는 resolvePassRequest 가
 * 바디의 tier 를 필수로 봐서 그 순간 확정을 아예 시도조차 못 했고, 사용자는 "돈은 나갔는데 이용권이
 * 없는" 화면을 최대 20분(재조정 크론 주기) 동안 봤다.
 *
 * 고정하는 성질:
 *   ① tier 가 빈 바디 + 주문번호만으로도 주문에 적힌 등급으로 활성화된다
 *   ② 그렇다고 아무 등급이나 통과하지 않는다 — 바디가 등급을 말했는데 주문과 다르면 여전히 400
 *   ③ 남의 주문번호로는 여전히 403 (등급 보강이 소유자 검사를 우회하지 않는다)
 *
 * PG 는 전부 모킹 — 실결제·실 DB 없음.
 */
import { handlePaymentsContext } from "../../worker/payments/index.js";
import { __passesTestUtils } from "../../worker/payments/passes.js";
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

function seedUser(db, userId = USER) {
  const user = {
    _id: userId,
    email: "buyer@example.com",
    name: "테스터",
    phoneNumber: "01012345678",
    points: 0,
    profileSubscription: { tier: "free", expiresAt: null },
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

/**
 * 복귀 정보를 잃은 클라이언트가 실제로 보내는 바디. PointsClient 의 리다이렉트 확정이
 * `tier: pendingSub?.tier || ""` 로 넘기므로 tier 는 **빈 문자열**이지 undefined 가 아니다.
 * planId·customerUid·paymentMethod·amount 는 아예 없다.
 */
function orderOnlyBody(merchantUid) {
  return {
    impUid: merchantUid,
    merchantUid,
    tier: "",
    durationMonths: 1,
    durationDays: 30,
    productType: "membership_pass",
  };
}

function mockPortOnePayment({ paymentId, amount, currency = "KRW" }) {
  global.fetch = async () => ({
    ok: true,
    status: 200,
    statusText: "OK",
    json: async () => ({
      id: paymentId,
      paymentId,
      status: "PAID",
      currency,
      amount: { total: amount, paid: amount, currency },
      paidAt: new Date().toISOString(),
      method: { type: "PaymentMethodCard" },
    }),
  });
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

async function prepareOrder(db, tier, idempotencyKey) {
  const { response, payload } = await post(db, "/api/payments/subscription/prepare", passBody(tier), {
    headers: { "Idempotency-Key": idempotencyKey },
  });
  expect(response.status).toBe(201);
  return payload.order;
}

describe("이용권 confirm — 주문번호 단독", () => {
  test("tier 가 빈 바디도 주문에 적힌 등급으로 활성화된다", async () => {
    const db = makeFakePaymentDb();
    const user = seedUser(db);
    const order = await prepareOrder(db, "premium", "pass-order-only-fresh");
    mockPortOnePayment({ paymentId: order.merchantUid, amount: order.paymentAmount });

    const { response, payload } = await post(db, "/api/payments/subscription/confirm", orderOnlyBody(order.merchantUid));

    expect(response.status).toBe(200);
    // 🔴 클라이언트가 등급을 못 실었다고 free 로 떨어지면 안 된다 — 주문이 정본이다.
    expect(payload.subscription).toMatchObject({ tier: "premium", source: "pass", isActive: true });
    const expiresInDays = Math.round((new Date(payload.subscription.expiresAt).getTime() - Date.now()) / DAY_MS);
    expect(expiresInDays).toBe(30);
    expect(user.profileSubscription.tier).toBe("premium");
    expect(user.profileSubscription.lastPassOrderId).toBe(order.merchantUid);
    const paidOrder = db.rows.find((r) => r.merchantUid === order.merchantUid);
    expect(paidOrder.status).toBe("paid");
    expect(paidOrder.entitlementGrantedAt).toBeTruthy();
  });

  test("바디가 등급을 말했는데 주문과 다르면 여전히 400 SUBSCRIPTION_PLAN_MISMATCH", async () => {
    const db = makeFakePaymentDb();
    seedUser(db);
    const order = await prepareOrder(db, "premium", "pass-order-only-drift");
    mockPortOnePayment({ paymentId: order.merchantUid, amount: order.paymentAmount });

    const { response, payload } = await post(db, "/api/payments/subscription/confirm", {
      ...orderOnlyBody(order.merchantUid),
      tier: "standard",
    });

    expect(response.status).toBe(400);
    expect(payload.code).toBe("SUBSCRIPTION_PLAN_MISMATCH");
  });

  test("남의 주문번호로는 등급 보강 경로에서도 403", async () => {
    const db = makeFakePaymentDb();
    seedUser(db);
    seedUser(db, OTHER_USER);
    const order = await prepareOrder(db, "standard", "pass-order-only-owner");
    mockPortOnePayment({ paymentId: order.merchantUid, amount: order.paymentAmount });

    const { response } = await post(db, "/api/payments/subscription/confirm", orderOnlyBody(order.merchantUid), {
      asUser: OTHER_USER,
    });

    expect(response.status).toBe(403);
  });
});
