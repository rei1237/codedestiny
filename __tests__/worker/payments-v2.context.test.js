/**
 * @jest-environment node
 *
 * 합성 루트 — 라우트 표와 확정 오케스트레이션.
 *
 * 여기서 확인하는 것은 개별 부품이 아니라 **부품을 잇는 순서**다. PG 검증 없이 주문이 PAID 가
 * 되는 지름길이 없는지, 지급 실패가 결제 실패로 둔갑하지 않는지, PG 에 닿지 못한 것과 사실이
 * 어긋난 것이 주문 상태에 서로 다르게 반영되는지 — 돈이 걸린 판단이 전부 이 층에 있다.
 */
import { __paymentsContextTestUtils, handlePaymentsContext } from "../../worker/payments/index.js";
import { PaymentError, classify } from "../../worker/payments/errors.js";
import { createPaymentContext } from "../../worker/payments/db.js";
import { createOrder, markOrderPaid, toOrderStatus } from "../../worker/payments/orders.js";
import { makeFakePaymentDb } from "../fixtures/fake-payment-db.mjs";

const { ROUTES, matchRoute, presentOrder, confirmOrder } = __paymentsContextTestUtils;

const ENV = { PORTONE_API_SECRET: "s", PORTONE_STORE_ID: "st" };
const USER = "507f1f77bcf86cd799439011";
const OTHER = "507f1f77bcf86cd799439012";
const PRODUCT = {
  productId: "master-love-codex",
  featureKey: "master-love-codex",
  billingType: "per-use",
  priceKRW: 30000,
  priceCoins: 300,
  monthlyCost: 3000,
};

function pgReply(overrides = {}) {
  return {
    paymentId: "", status: "paid", amount: 30000, currency: "KRW",
    pay_method: "card", paid_at: 1786000000, receipt_url: null, ...overrides,
  };
}

function ctxOf() { return createPaymentContext({ requestId: "r1", route: "POST /confirm" }); }

async function seedPending(db, key = "idem-1") {
  return createOrder(db, { userId: USER, product: PRODUCT, idempotencyKey: key });
}

describe("라우트 표", () => {
  test("표를 읽으면 전체 표면이 보인다", () => {
    expect(Object.keys(ROUTES).sort()).toEqual([
      // 결제 공개 설정 컷오버 어댑터 — 구 GET /api/payments/config 가 여기로 온다.
      "GET /config",
      "GET /features",
      "GET /orders/:id",
      // 월정석 컷오버 어댑터 — 구 coin-gate 의 MOONLIGHT_STONE 분기(재작성)가 여기로 온다.
      "POST /coin-gate/moonstone",
      // 확정 컷오버 어댑터 — 구 /api/billing/confirm(재작성)이 여기로 온다.
      "POST /confirm",
      "POST /moonstone/spend",
      "POST /orders",
      "POST /orders/:id/confirm",
      // 주문 발급 컷오버 어댑터 — 구 /api/payments/prepare · /api/billing/checkout(재작성)이 여기로 온다.
      "POST /prepare",
      // 이용권(구독) 컷오버 — 구 /api/payments/subscription/prepare|confirm(재작성)이 여기로 온다.
      "POST /subscription/confirm",
      "POST /subscription/prepare",
      "POST /webhook",
    ]);
  });

  test(":id 를 뽑아낸다", () => {
    expect(matchRoute("GET", "/orders/cd123")).toMatchObject({ params: { id: "cd123" } });
    expect(matchRoute("POST", "/orders/cd123/confirm")).toMatchObject({ params: { id: "cd123" } });
    expect(matchRoute("GET", "/orders")).toBeNull();
    expect(matchRoute("DELETE", "/orders/cd123")).toBeNull();
  });

  test("🔴 카탈로그·결제 설정·webhook 만 신원을 보지 않는다", () => {
    const anonymous = Object.entries(ROUTES).filter(([, r]) => r.auth === "none").map(([k]) => k).sort();
    expect(anonymous).toEqual(["GET /config", "GET /features", "POST /webhook"]);
  });

  test("🔴 webhook 만 원문 본문을 읽는다 — 재직렬화하면 서명이 깨진다", () => {
    const raw = Object.entries(ROUTES).filter(([, r]) => r.rawBody).map(([k]) => k);
    expect(raw).toEqual(["POST /webhook"]);
  });

  test("GET /features 는 Mongo 를 열지 않는다", async () => {
    const ctx = ctxOf();
    const response = await ROUTES["GET /features"].handle({ ctx });
    expect(response.status).toBe(200);
    expect(ctx.mongoOps).toBe(0);
    const payload = await response.json();
    expect(payload.products.length).toBeGreaterThan(20);
  });
});

describe("주문 표현", () => {
  test("내부 필드를 내보내지 않는다", async () => {
    const db = makeFakePaymentDb();
    const order = await seedPending(db);
    order.rawPortOne = { secret: "x" };
    const view = presentOrder(order);
    expect(Object.keys(view).sort()).toEqual(
      ["amountKRW", "createdAt", "entitlementGranted", "featureKey", "orderId", "paidAt", "productId", "status"],
    );
    expect(JSON.stringify(view)).not.toMatch(/rawPortOne|pricingSnapshot|idempotencyKey/);
  });
});

describe("확정 오케스트레이션", () => {
  test("PENDING → PAID + 지급", async () => {
    const db = makeFakePaymentDb();
    const order = await seedPending(db);
    await db.insertOne({}, { _id: USER });
    db.rows[1]._id = USER;

    const result = await confirmOrder(ENV, db, ctxOf(), { orderId: order.merchantUid, actorUserId: USER }, {
      fetchPayment: async () => pgReply({ paymentId: order.merchantUid }),
    });
    expect(result.replayed).toBe(false);
    expect(result.granted).toBe(true);
    expect(toOrderStatus(db.rows[0])).toBe("PAID");
    expect(db.rows[0].entitlementGrantedAt).toBeInstanceOf(Date);
  });

  test("🔴 이미 PAID 면 PG 를 다시 부르지 않는다", async () => {
    const db = makeFakePaymentDb();
    const order = await seedPending(db);
    await markOrderPaid(db, {
      orderId: order.merchantUid, order,
      pg: { pgTransactionId: "tx", paidAt: new Date(), method: "card", summary: {} },
    });

    let called = 0;
    const result = await confirmOrder(ENV, db, ctxOf(), { orderId: order.merchantUid, actorUserId: USER }, {
      fetchPayment: async () => { called += 1; return pgReply(); },
    });
    expect(called).toBe(0);
    expect(result.replayed).toBe(true);
  });

  test("남의 주문은 확정하지 못한다", async () => {
    const db = makeFakePaymentDb();
    const order = await seedPending(db);
    await expect(
      confirmOrder(ENV, db, ctxOf(), { orderId: order.merchantUid, actorUserId: OTHER }, {
        fetchPayment: async () => pgReply({ paymentId: order.merchantUid }),
      }),
    ).rejects.toThrow(/접근할 수 없습니다/);
  });

  test("없는 주문은 404", async () => {
    const db = makeFakePaymentDb();
    let caught = null;
    try {
      await confirmOrder(ENV, db, ctxOf(), { orderId: "cd-nope" }, { fetchPayment: async () => pgReply() });
    } catch (error) { caught = error; }
    expect(classify(caught).status).toBe(404);
  });

  test("취소된 주문은 409", async () => {
    const db = makeFakePaymentDb();
    const order = await seedPending(db);
    db.rows[0].status = "cancelled";
    let caught = null;
    try {
      await confirmOrder(ENV, db, ctxOf(), { orderId: order.merchantUid }, { fetchPayment: async () => pgReply() });
    } catch (error) { caught = error; }
    expect(classify(caught).status).toBe(409);
  });

  test("🔴 금액이 어긋나면 주문을 실패로 확정한다", async () => {
    const db = makeFakePaymentDb();
    const order = await seedPending(db);
    let caught = null;
    try {
      await confirmOrder(ENV, db, ctxOf(), { orderId: order.merchantUid }, {
        fetchPayment: async () => pgReply({ paymentId: order.merchantUid, amount: 100 }),
      });
    } catch (error) { caught = error; }
    expect(classify(caught).code).toBe("AMOUNT_MISMATCH");
    expect(toOrderStatus(db.rows[0])).toBe("FAILED");
    expect(db.rows[0].failureStage).toBe("pg-verify");
  });

  test("🔴 PG 에 닿지 못하면 주문 상태를 건드리지 않는다 — 살아나면 그대로 확정될 주문이다", async () => {
    const db = makeFakePaymentDb();
    const order = await seedPending(db);
    let caught = null;
    try {
      await confirmOrder(ENV, db, ctxOf(), { orderId: order.merchantUid }, {
        fetchPayment: async () => { throw new Error("PortOne payment lookup failed: request timed out after 8000ms"); },
      });
    } catch (error) { caught = error; }
    expect(classify(caught).code).toBe("PG_UNAVAILABLE");
    expect(toOrderStatus(db.rows[0])).toBe("PENDING");
  });

  test("🔴 지급이 실패해도 결제 실패로 둔갑하지 않는다", async () => {
    // 돈은 이미 받았다. 여기서 오류를 올리면 사용자가 다시 결제한다.
    const db = makeFakePaymentDb();
    const order = await seedPending(db);
    db.rows[0].featureKey = "totally-made-up"; // resolveProduct 가 던지게 만든다
    const result = await confirmOrder(ENV, db, ctxOf(), { orderId: order.merchantUid }, {
      fetchPayment: async () => pgReply({ paymentId: order.merchantUid }),
    });
    expect(result.granted).toBe(false);
    expect(toOrderStatus(db.rows[0])).toBe("PAID"); // 결제는 성공으로 남는다
    expect(db.rows[0].entitlementGrantedAt).toBeFalsy(); // 크론이 찾아 마무리한다
  });

  test("🔴 CAS 를 지면 남의 결과를 그대로 쓴다 — 두 번 확정하지 않는다", async () => {
    const db = makeFakePaymentDb();
    const order = await seedPending(db);
    const ctx = ctxOf();
    const result = await confirmOrder(ENV, db, ctx, { orderId: order.merchantUid }, {
      fetchPayment: async () => {
        // PG 검증 도중 형제가 먼저 확정한 상황을 만든다.
        db.rows[0].status = "paid";
        db.rows[0].entitlementGrantedAt = new Date();
        return pgReply({ paymentId: order.merchantUid });
      },
    });
    expect(result.replayed).toBe(true);
    expect(result.granted).toBe(true);
    expect(db.rows[0].confirmAttempts).toBeFalsy();
  });
});

describe("전 경로 — 실행기를 주입해 Mongo 없이 돌린다", () => {
  const AUTH_ENV = { ...ENV, JWT_ACCESS_SECRET: "test-access-secret-value-0123456789" };

  async function tokenFor(userId) {
    const { signAuthToken } = await import("../../worker/lib/auth.js");
    return signAuthToken({ _id: userId, email: "t@e.st", role: "user", name: "t" }, AUTH_ENV);
  }

  function call(path, { method = "GET", token = "", body, env = AUTH_ENV, db } = {}) {
    const headers = { "Content-Type": "application/json" };
    if (token) headers.Authorization = `Bearer ${token}`;
    const request = new Request(`https://x.test/api/payments${path}`, {
      method,
      headers,
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    return handlePaymentsContext(request, env, {
      withDb: db ? (_e, ctx, fn) => fn(makeCountingProxy(db, ctx)) : undefined,
    });
  }

  // withPaymentDb 가 하던 왕복 계수를 그대로 흉내낸다 — 예산 단언이 의미를 가지려면 필요하다.
  function makeCountingProxy(db, ctx) {
    return new Proxy(db, {
      get(target, key) {
        const value = target[key];
        if (typeof value !== "function") return value;
        return (...args) => { ctx.mongoOps += 1; return value.apply(target, args); };
      },
    });
  }

  test("🔴 지급이 남았어도 200 GRANT_PENDING 이다", async () => {
    // 503 + retryable:false 는 "나중에 오라"와 "오지 마라"를 동시에 보내는 모순이었다.
    const db = makeFakePaymentDb();
    const order = await seedPending(db);
    db.rows[0].status = "paid"; // 이미 확정, 지급만 남은 상태
    const response = await call(`/orders/${order.merchantUid}/confirm`, {
      method: "POST", token: await tokenFor(USER), body: {}, db,
    });
    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload).toMatchObject({ ok: true, entitlementStatus: "pending", code: "GRANT_PENDING" });
    expect(payload.pollUrl).toContain(order.merchantUid);
    expect(response.headers.get("Retry-After")).toBeNull();
  });

  test("토큰이 없으면 401 이고 Mongo 를 열지 않는다", async () => {
    const db = makeFakePaymentDb();
    const response = await call("/orders/cd1", { db });
    expect(response.status).toBe(401);
    expect(db.ctx.ops).toBe(0);
    expect((await response.json()).code).toBe("UNAUTHORIZED");
  });

  test("🔴 인증은 Mongo 를 읽지 않는다 — 주문 조회 1회가 전부다", async () => {
    const db = makeFakePaymentDb();
    const order = await seedPending(db);
    const before = db.ctx.ops;
    const response = await call(`/orders/${order.merchantUid}`, { token: await tokenFor(USER), db });
    expect(response.status).toBe(200);
    expect(db.ctx.ops - before).toBe(1);
  });

  test("🔴 구 경로로 마운트되면 구 응답 형태로 답한다", async () => {
    // 컷오버 구간에서 키가 어긋나면 200 이 오고 파싱도 되는데 값만 undefined 라 화면이 조용히 빈다.
    const db = makeFakePaymentDb();
    const order = await seedPending(db);
    const request = new Request(`https://x.test/api/payments/orders/${order.merchantUid}`, {
      headers: { Authorization: `Bearer ${await tokenFor(USER)}` },
    });
    const response = await handlePaymentsContext(request, AUTH_ENV, {
      prefix: "/api/payments",
      legacyShape: true,
      withDb: (_e, _c, fn) => fn(db),
    });
    const payload = await response.json();
    // PointHistoryClient 는 data.data.order 로 읽는다.
    expect(payload.data.order.id).toBe(order.merchantUid);
    expect(payload.data.order.paymentAmount).toBe(30000);
    expect(payload.data.order.orderNumberMasked).toMatch(/^••••/);
    // 섀도 경로는 신규 형태 그대로다.
    expect(payload.order).toBeUndefined();
  });

  test("남의 주문 조회는 403", async () => {
    const db = makeFakePaymentDb();
    const order = await seedPending(db);
    const response = await call(`/orders/${order.merchantUid}`, { token: await tokenFor(OTHER), db });
    expect(response.status).toBe(403);
  });

  test("없는 라우트는 404, 알 수 없는 상품은 404", async () => {
    expect((await call("/nope")).status).toBe(404);
    const response = await call("/orders", {
      method: "POST", token: await tokenFor(USER), body: { featureKey: "nope", idempotencyKey: "k" },
      db: makeFakePaymentDb(),
    });
    expect(response.status).toBe(404);
    expect((await response.json()).code).toBe("PRODUCT_NOT_FOUND");
  });

  test("주문 생성은 왕복 1회", async () => {
    const db = makeFakePaymentDb();
    const response = await call("/orders", {
      method: "POST", token: await tokenFor(USER),
      body: { featureKey: "master-love-codex", idempotencyKey: "k1" }, db,
    });
    expect(response.status).toBe(200);
    expect(db.ctx.ops).toBe(1);
    const payload = await response.json();
    expect(payload.amountKRW).toBe(30000);
    expect(payload.order.status).toBe("PENDING");
  });

  test("🔴 GET /features 는 인증도 Mongo 도 없이 응답한다", async () => {
    const db = makeFakePaymentDb();
    const response = await call("/features", { db });
    expect(response.status).toBe(200);
    expect(db.ctx.ops).toBe(0);
  });

  test("🔴 503 응답에만 stage 헤더와 Retry-After 가 붙는다", async () => {
    const db = makeFakePaymentDb();
    const failing = { ...db, async findOne() { throw Object.assign(new Error("pool cleared"), { name: "MongoPoolClearedError" }); } };
    const response = await call("/orders/cd1", { token: await tokenFor(USER), db: failing });
    expect(response.status).toBe(503);
    expect(response.headers.get("X-CD-Error-Stage")).toBe("db");
    expect(response.headers.get("Retry-After")).toBe("2");
    expect((await response.json()).retryable).toBe(true);
  });

  test("본문이 JSON 이 아니면 400", async () => {
    const request = new Request("https://x.test/api/payments/orders", {
      method: "POST",
      headers: { Authorization: `Bearer ${await tokenFor(USER)}` },
      body: "not json",
    });
    const response = await handlePaymentsContext(request, AUTH_ENV, { withDb: (_e, _c, fn) => fn(makeFakePaymentDb()) });
    expect(response.status).toBe(400);
  });

  test("🔴 성공이든 실패든 로그는 정확히 한 줄이다", async () => {
    const lines = [];
    const original = console.log;
    console.log = (...args) => { if (args[0] === "[pay]") lines.push(JSON.parse(args[1])); };
    try {
      const db = makeFakePaymentDb();
      await call("/features", { db });
      await call("/orders/cd1", { db }); // 401
    } finally {
      console.log = original;
    }
    expect(lines).toHaveLength(2);
    expect(lines[0]).toMatchObject({ route: "GET /api/payments/features", status: 200, mongoOps: 0 });
    expect(lines[1]).toMatchObject({ status: 401, errorCode: "UNAUTHORIZED" });
    // 개인정보는 어떤 줄에도 실리지 않는다.
    expect(JSON.stringify(lines)).not.toMatch(/t@e\.st/);
  });
});

describe("코드 계약", () => {
  test("GRANT_PENDING 은 오류 코드가 아니다", () => {
    // errors.js 표에 없다 = 오류로 분류될 수 없다. 성공 본문의 라벨일 뿐이다.
    expect(new PaymentError("GRANT_PENDING").code).toBe("INTERNAL_ERROR");
  });
});
