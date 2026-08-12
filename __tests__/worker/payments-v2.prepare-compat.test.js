/**
 * @jest-environment node
 *
 * 주문 발급 컷오버 어댑터(POST /prepare)의 응답-키 패리티.
 *
 * 컷오버는 서버만 바뀌고 클라이언트는 그대로인 구간을 지난다 — 키가 어긋나면 200 이 오고 파싱도
 * 되는데 값만 undefined 라 **에러 없이 화면이 빈다.** 그래서 여기 단언은 소비자 전수 조사
 * (2026-08-12)에서 나온 실제 소비 키를 그대로 고정한다:
 *   셸/_dp: payload.data.order 에서 merchantUid·paymentAmount(필수) + config 5키 + customer
 *   PointsClient: payload.order 에서 merchantUid·paymentAmount·productName·coinPrice·customer.phoneNumber
 * 그리고 구 prepare 의 두 실패 계약(CLIENT_AMOUNT_MISMATCH 400 · IDEMPOTENCY_CONFLICT 409 — 새 키
 * 재시도의 트리거)을 V2 위에서 승계했는지 실행으로 확인한다. 가짜 드라이버만 사용.
 */
import { handlePaymentsContext } from "../../worker/payments/index.js";
import { listProducts } from "../../worker/payments/catalog.js";
import { makeFakePaymentDb } from "../fixtures/fake-payment-db.mjs";

const USER = "64b000000000000000000001";
const ENV = {
  JWT_ACCESS_SECRET: "test-access-secret-value-0123456789",
  PORTONE_STORE_ID: "store-test-1",
  PORTONE_CHANNEL_KEY: "channel-test-1",
  PORTONE_API_SECRET: "portone-secret-test",
};

const PRODUCT = listProducts()[0]; // 레지스트리 정본에서 뽑는다 — 가격 개정에도 테스트가 흔들리지 않게.

async function tokenFor(userId) {
  const { signAuthToken } = await import("../../worker/lib/auth.js");
  return signAuthToken({ _id: userId, email: "t@e.st", role: "user", name: "t" }, ENV);
}

function seedUser(db) {
  db.rows.push({
    _id: USER,
    email: "buyer@example.com",
    name: "테스터",
    phoneNumber: "01012345678",
    destinyProfilesCurrentId: "profile-current-1",
  });
}

async function postPrepare(db, body, { headers = {}, legacyEnvelope = "prepare", path = "/api/payments/prepare" } = {}) {
  const request = new Request(`https://code-destiny.com${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${await tokenFor(USER)}`,
      ...headers,
    },
    body: JSON.stringify(body),
  });
  const response = await handlePaymentsContext(request, ENV, {
    prefix: "/api/payments",
    legacyEnvelope,
    withDb: (_env, _ctx, fn) => fn(db),
  });
  return { response, payload: await response.json() };
}

// 구 prepare 201 응답 order 의 전체 키(소비자 초집합) — 하나라도 빠지면 "화면만 비는" 부류가 된다.
const LEGACY_PREPARE_ORDER_KEYS = [
  "storeId", "channelKey", "currency", "payMethod", "noticeUrl",
  "merchantUid", "paymentAmount", "amountKRW", "amountKrw", "coinPrice", "costCoins",
  "membershipCreditCost", "featureKey", "accessType", "profileId", "profileCardId",
  "productType", "serviceType", "actionType", "idempotencyKey", "orderId",
  "productName", "customer", "pricing",
];

test("PointsClient 형 바디(멱등키 없음): 201 + 소비 키 전부 + 클릭마다 새 주문", async () => {
  const db = makeFakePaymentDb();
  seedUser(db);
  const body = {
    paymentType: "digital_content",
    productId: PRODUCT.productId,
    featureKey: PRODUCT.featureKey,
    paymentAmount: PRODUCT.priceKRW,
    coinPrice: PRODUCT.priceCoins,
    paymentMethod: "CARD",
    productName: "테스트 상품",
  };
  const first = await postPrepare(db, body);
  expect(first.response.status).toBe(201);
  const order = first.payload.order;
  expect(order).toBeTruthy();
  for (const key of LEGACY_PREPARE_ORDER_KEYS) {
    expect(Object.prototype.hasOwnProperty.call(order, key)).toBe(true);
  }
  expect(order.merchantUid).toMatch(/^cd[0-9a-f]{38}$/);
  expect(order.paymentAmount).toBe(PRODUCT.priceKRW);
  expect(order.coinPrice).toBe(PRODUCT.priceCoins);
  expect(order.productName).toBe("테스트 상품");
  expect(order.storeId).toBe("store-test-1");
  expect(order.channelKey).toBe("channel-test-1");
  expect(order.currency).toBe("CURRENCY_KRW");
  expect(order.customer).toMatchObject({ fullName: "테스터", email: "buyer@example.com", phoneNumber: "01012345678" });
  // 구 계약: 멱등키가 없으면 클릭마다 새 주문(합성 키). 같은 바디 재호출 = 다른 merchantUid.
  const second = await postPrepare(db, body);
  expect(second.payload.order.merchantUid).not.toBe(order.merchantUid);
});

test("셸 형 바디(Idempotency-Key 헤더): 같은 키 재호출은 같은 주문을 돌려준다", async () => {
  const db = makeFakePaymentDb();
  seedUser(db);
  const body = { paymentType: "digital_content", featureKey: PRODUCT.featureKey, requestId: "req-1" };
  const options = { headers: { "Idempotency-Key": "req-1:a1" } };
  const first = await postPrepare(db, body, options);
  const second = await postPrepare(db, body, options);
  expect(first.payload.order.merchantUid).toBe(second.payload.order.merchantUid);
  expect(first.payload.order.idempotencyKey).toBe("req-1:a1");
  // profileId 폴백: 바디에 없으면 user.destinyProfilesCurrentId (구 prepare 계약).
  expect(first.payload.order.profileId).toBe("profile-current-1");
});

test("billing-checkout 봉투: 셸이 읽는 payload.data.order 중첩을 재현한다", async () => {
  const db = makeFakePaymentDb();
  seedUser(db);
  const { response, payload } = await postPrepare(db, {
    paymentType: "digital_content",
    featureKey: PRODUCT.featureKey,
    idempotencyKey: "shell-key-1",
  }, { legacyEnvelope: "billing-checkout" });
  expect(response.status).toBe(200);
  expect(payload.ok).toBe(true);
  // 셸 _cdExtractBillingData → payload.data / _cdFindCheckoutOrder → data.order (id+양수 금액 필수)
  const order = payload.data && payload.data.order;
  expect(order).toBeTruthy();
  expect(String(order.merchantUid || "")).not.toBe("");
  expect(Number(order.paymentAmount)).toBeGreaterThan(0);
  expect(order.customer && typeof order.customer === "object").toBe(true);
});

test("같은 키·다른 가격의 기존 주문: 옛 주문을 조용히 돌려주지 않고 409 IDEMPOTENCY_CONFLICT", async () => {
  const db = makeFakePaymentDb();
  seedUser(db);
  db.rows.push({
    userId: USER,
    idempotencyKey: "stable-key",
    paymentType: "digital_content",
    merchantUid: "cdstaleorder000000000000000000000000000",
    paymentAmount: PRODUCT.priceKRW + 5000, // 가격 개정 이전의 주문
    expectedChargedPoints: PRODUCT.priceCoins + 50,
    featureKey: PRODUCT.featureKey,
    status: "pending",
    createdAt: new Date(Date.now() - 60_000),
  });
  const { response, payload } = await postPrepare(db, {
    paymentType: "digital_content",
    featureKey: PRODUCT.featureKey,
    idempotencyKey: "stable-key",
  });
  expect(response.status).toBe(409);
  expect(payload.code).toBe("IDEMPOTENCY_CONFLICT"); // 클라 새-키 재시도가 이 top-level code 에 걸려 있다
});

test("낡은 가격의 클라이언트 금액: 400 CLIENT_AMOUNT_MISMATCH (주문을 만들지 않는다)", async () => {
  const db = makeFakePaymentDb();
  seedUser(db);
  const { response, payload } = await postPrepare(db, {
    paymentType: "digital_content",
    featureKey: PRODUCT.featureKey,
    idempotencyKey: "amount-key",
    paymentAmount: PRODUCT.priceKRW + 1000,
  });
  expect(response.status).toBe(400);
  expect(payload.code).toBe("CLIENT_AMOUNT_MISMATCH");
  expect(db.rows.some((row) => row.idempotencyKey === "amount-key")).toBe(false);
});

test("비로그인: 401 (주문·User 읽기 없음)", async () => {
  const db = makeFakePaymentDb();
  const request = new Request("https://code-destiny.com/api/payments/prepare", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ featureKey: PRODUCT.featureKey }),
  });
  const response = await handlePaymentsContext(request, ENV, {
    prefix: "/api/payments",
    legacyEnvelope: "prepare",
    withDb: (_env, _ctx, fn) => fn(db),
  });
  expect(response.status).toBe(401);
  expect(db.ctx.ops).toBe(0);
});

test("모르는 상품: 404 PRODUCT_NOT_FOUND", async () => {
  const db = makeFakePaymentDb();
  seedUser(db);
  const { response, payload } = await postPrepare(db, { featureKey: "no-such-feature-key-xyz" });
  expect(response.status).toBe(404);
  expect(payload.code).toBe("PRODUCT_NOT_FOUND");
});
