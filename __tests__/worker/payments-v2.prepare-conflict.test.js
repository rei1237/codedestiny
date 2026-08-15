/**
 * @jest-environment node
 *
 * 카드 경로 prepare 의 **멱등키 충돌 계약**. 2026-08-15 에 뒤집힌 지점이라 여기 단언이 정본이다.
 *
 * 사용자 증상은 "PG 결제창이 뜨기 전에 409 가 나면서 안 뜬다"였다. 원인은 하나였다 —
 * `createOrder` 의 upsert 가 (userId, idempotencyKey, paymentType) 만 보고 **주문 상태를 보지
 * 않아서**, 재사용하면 안 되는 주문(결제완료·만료취소·레거시 상태)까지 키가 같다는 이유로 돌려줬다.
 * 그 뒤 의도 불일치를 409 로 거절했기 때문에:
 *   · 가격/기능이 어긋나면 → 409 로 결제창이 막히고
 *   · 어긋나지 않으면 → 죽은 주문의 merchantUid(=PortOne paymentId)로 결제창을 열려다
 *     PortOne 이 중복 paymentId 를 **결제창을 그리기 전에** 거절했다(에러 없이 안 뜨는 부류).
 *
 * 지금은 재사용할 수 없으면 세대를 올려 새 주문을 발급한다. 아래는 그 계약의 전 갈래다.
 *
 * 🔴 409 자체를 지운 것이 아니라 **세대 소진 뒤로 밀어냈다**(fail-closed). 마지막 테스트가 그것을
 * 고정한다 — 셸·독립 정적의 기존 새-키 재시도가 그 코드에 걸려 있으므로 계약이 살아 있어야 한다.
 */
import { handlePaymentsContext } from "../../worker/payments/index.js";
import { listProducts } from "../../worker/payments/catalog.js";
import { MAX_ORDER_GENERATIONS } from "../../worker/payments/orders.js";
import { makeFakePaymentDb } from "../fixtures/fake-payment-db.mjs";

const USER = "64b000000000000000000001";
const ENV = {
  JWT_ACCESS_SECRET: "test-access-secret-value-0123456789",
  PORTONE_STORE_ID: "store-test-1",
  PORTONE_CHANNEL_KEY: "channel-test-1",
  PORTONE_API_SECRET: "portone-secret-test",
};

const PRODUCT = listProducts()[0];
const OTHER_PRODUCT = listProducts().find((p) => p.featureKey !== PRODUCT.featureKey);

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

/** 같은 멱등키로 이미 존재하는 주문(세대 0). status 만 바꿔 가며 전 갈래를 돈다. */
function seedExistingOrder(db, { key, merchantUid, status, product = PRODUCT, priceDelta = 0 }) {
  db.rows.push({
    userId: USER,
    idempotencyKey: key,
    paymentType: "digital_content",
    merchantUid,
    paymentAmount: product.priceKRW + priceDelta,
    expectedChargedPoints: product.priceCoins + (priceDelta ? 50 : 0),
    coinPrice: product.priceCoins + (priceDelta ? 50 : 0),
    featureKey: product.featureKey,
    status,
    pricingSnapshot: {},
    createdAt: new Date(Date.now() - 60_000),
  });
}

async function postPrepare(db, body, { headers = {} } = {}) {
  const request = new Request("https://code-destiny.com/api/payments/prepare", {
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
    legacyEnvelope: "prepare",
    withDb: (_env, _ctx, fn) => fn(db),
  });
  return { response, payload: await response.json() };
}

function orderRows(db) {
  return db.rows.filter((r) => r.paymentType === "digital_content");
}

test("같은 키 · 같은 의도 · 미결제: 같은 주문을 그대로 돌려준다 (멱등 계약 불변)", async () => {
  const db = makeFakePaymentDb();
  seedUser(db);
  const body = { paymentType: "digital_content", featureKey: PRODUCT.featureKey, idempotencyKey: "same-intent" };

  const first = await postPrepare(db, body);
  const second = await postPrepare(db, body);

  expect(first.response.status).toBe(201);
  expect(second.payload.order.merchantUid).toBe(first.payload.order.merchantUid);
  expect(orderRows(db)).toHaveLength(1); // 🔴 연속 클릭이 주문을 두 개 만들지 않는다
});

test("🔴 같은 키 · 다른 기능: 409 대신 새 주문 (재가격은 하지 않는다)", async () => {
  const db = makeFakePaymentDb();
  seedUser(db);
  seedExistingOrder(db, { key: "k-feature-drift", merchantUid: "cdgen0feature000000000000000000000000000", status: "pending", product: OTHER_PRODUCT });

  const { response, payload } = await postPrepare(db, {
    paymentType: "digital_content", featureKey: PRODUCT.featureKey, idempotencyKey: "k-feature-drift",
  });

  expect(response.status).toBe(201);
  expect(payload.order.merchantUid).not.toBe("cdgen0feature000000000000000000000000000");
  expect(payload.order.featureKey).toBe(PRODUCT.featureKey);
  expect(orderRows(db)).toHaveLength(2);
});

test("🔴 같은 키 · 이미 결제된 주문: 새 주문 (죽은 merchantUid 를 PortOne 에 다시 주지 않는다)", async () => {
  const db = makeFakePaymentDb();
  seedUser(db);
  seedExistingOrder(db, { key: "k-paid", merchantUid: "cdgen0paid00000000000000000000000000000", status: "paid" });

  const { response, payload } = await postPrepare(db, {
    paymentType: "digital_content", featureKey: PRODUCT.featureKey, idempotencyKey: "k-paid",
  });

  expect(response.status).toBe(201);
  expect(payload.order.merchantUid).not.toBe("cdgen0paid00000000000000000000000000000");
  expect(db.rows.find((r) => r.merchantUid === "cdgen0paid00000000000000000000000000000").status).toBe("paid");
});

test("🔴 같은 키 · 만료 크론이 취소한 주문: 새 주문 (30분 뒤 재시도가 막히지 않는다)", async () => {
  const db = makeFakePaymentDb();
  seedUser(db);
  seedExistingOrder(db, { key: "k-cancelled", merchantUid: "cdgen0cancel0000000000000000000000000000", status: "cancelled" });

  const { response, payload } = await postPrepare(db, {
    paymentType: "digital_content", featureKey: PRODUCT.featureKey, idempotencyKey: "k-cancelled",
  });

  expect(response.status).toBe(201);
  expect(payload.order.merchantUid).not.toBe("cdgen0cancel0000000000000000000000000000");
});

test("🔴 같은 키 · 실패한 주문: 새 주문", async () => {
  const db = makeFakePaymentDb();
  seedUser(db);
  seedExistingOrder(db, { key: "k-failed", merchantUid: "cdgen0failed0000000000000000000000000000", status: "failed" });

  const { payload } = await postPrepare(db, {
    paymentType: "digital_content", featureKey: PRODUCT.featureKey, idempotencyKey: "k-failed",
  });

  expect(payload.order.merchantUid).not.toBe("cdgen0failed0000000000000000000000000000");
});

/* 🔴 이 두 상태가 예전의 **영구 409** 였다. 게이트는 toOrderStatus 로 "PENDING" 이라 판정했는데
   재가격 CAS 는 status:"pending" 정확 일치라 빗나가, 클라이언트가 무엇을 해도 풀리지 않았다.
   두 값은 스키마 enum 에 있고 구독 확정 경로가 실제로 쓴다(worker/routes/payments.js:4204·4228). */
test.each(["processing", "retryable"])("🔴 같은 키 · 레거시 상태(%s) · 가격 변동: 영구 409 가 아니라 새 주문", async (status) => {
  const db = makeFakePaymentDb();
  seedUser(db);
  seedExistingOrder(db, { key: `k-${status}`, merchantUid: `cdgen0${status}00000000000000000000000000`, status, priceDelta: 5000 });

  const { response, payload } = await postPrepare(db, {
    paymentType: "digital_content", featureKey: PRODUCT.featureKey, idempotencyKey: `k-${status}`,
  });

  expect(response.status).toBe(201);
  expect(payload.order.merchantUid).not.toBe(`cdgen0${status}00000000000000000000000000`);
  expect(payload.order.paymentAmount).toBe(PRODUCT.priceKRW);
});

test("같은 키 · 같은 기능 · 미결제 · 옛 가격: 새 주문이 아니라 재가격 승계 (#497 유지)", async () => {
  const db = makeFakePaymentDb();
  seedUser(db);
  seedExistingOrder(db, { key: "k-reprice", merchantUid: "cdgen0reprice000000000000000000000000000", status: "pending", priceDelta: 5000 });

  const { response, payload } = await postPrepare(db, {
    paymentType: "digital_content", featureKey: PRODUCT.featureKey, idempotencyKey: "k-reprice",
  });

  expect(response.status).toBe(200);
  expect(payload.order.merchantUid).toBe("cdgen0reprice000000000000000000000000000");
  expect(payload.order.paymentAmount).toBe(PRODUCT.priceKRW);
  expect(orderRows(db)).toHaveLength(1); // 승계지 신규 발급이 아니다
});

test("🔴 주문에 requestId 를 저장한다 (verifyPerUsePayment 의 증빙 조회 열쇠)", async () => {
  // nakshatra-paid-access.js findPaidPayment 가 {requestId} 절로 Payment 를 찾는다. 구 prepare 는
  // 저장했고 V2 로 오며 빠졌다 — requestId 와 idempotencyKey 가 다른 클라이언트는 증빙을 잃는다.
  const db = makeFakePaymentDb();
  seedUser(db);

  await postPrepare(db, {
    paymentType: "digital_content",
    featureKey: PRODUCT.featureKey,
    idempotencyKey: "gate-attempt-key:a0",
    requestId: "feature-session-request-id",
  });

  expect(orderRows(db)[0].requestId).toBe("feature-session-request-id");
});

test("정상 경로의 Mongo 왕복은 주문 발급 1회다 (결제창 앞 지연은 이 왕복이 전부다)", async () => {
  const db = makeFakePaymentDb();
  seedUser(db);
  const before = db.ctx.ops;

  await postPrepare(db, {
    paymentType: "digital_content",
    featureKey: PRODUCT.featureKey,
    idempotencyKey: "roundtrip-count",
    profileId: "profile-1", // 바디에 있으면 사용자 읽기와 겹쳐 돈다(직렬화되지 않는다)
  });

  // 사용자 1읽기 + 주문 1발급. 충돌이 없으면 세대 재발급이 붙지 않는다.
  expect(db.ctx.ops - before).toBe(2);
});

test("같은 키로 동시에 두 번 들어와도 주문은 하나다", async () => {
  const db = makeFakePaymentDb();
  seedUser(db);
  const body = { paymentType: "digital_content", featureKey: PRODUCT.featureKey, idempotencyKey: "concurrent" };

  const [a, b] = await Promise.all([postPrepare(db, body), postPrepare(db, body)]);

  expect(a.response.status).toBeLessThan(400);
  expect(b.response.status).toBeLessThan(400);
  expect(a.payload.order.merchantUid).toBe(b.payload.order.merchantUid);
  expect(orderRows(db)).toHaveLength(1);
});

test("🔴 세대를 다 써도 못 얻으면 여전히 409 IDEMPOTENCY_CONFLICT (fail-closed)", async () => {
  // 클라이언트(셸·독립 정적)의 새-키 1회 재시도가 이 top-level code 에 걸려 있다. 세대 발급이
  // 실패하는 상황에서도 그 안전망이 살아 있어야 한다.
  const db = makeFakePaymentDb();
  seedUser(db);
  seedExistingOrder(db, { key: "k-exhaust", merchantUid: "cdgen0exhaust000000000000000000000000000", status: "paid" });
  for (let generation = 1; generation < MAX_ORDER_GENERATIONS; generation += 1) {
    seedExistingOrder(db, {
      key: `k-exhaust#${generation}`,
      merchantUid: `cdgen${generation}exhaust00000000000000000000000000`,
      status: "paid",
    });
  }

  const { response, payload } = await postPrepare(db, {
    paymentType: "digital_content", featureKey: PRODUCT.featureKey, idempotencyKey: "k-exhaust",
  });

  expect(response.status).toBe(409);
  expect(payload.code).toBe("IDEMPOTENCY_CONFLICT");
});
