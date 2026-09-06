/**
 * @jest-environment node
 */

let testUtils;
let Payment;
let User;
let mongoose;

let originalPaymentFindOne;
let originalPaymentCreate;
let originalUserFindById;
let originalUserCollectionFindOne;
let originalConnectionCollection;

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
  const dbMod = await import("../../worker/lib/db.js");

  // subscription prepare 의 Mongo 호출은 일시적 장애를 흡수하려고 withMongoRetry 로 감싸져 있고,
  // 이 래퍼는 시도마다 connectDb 를 부른다. 실제 Mongo URI 없이 통과시키려면 **건강한 연결**로
  // 보여야 한다 — readyState=1 만으로는 부족하고 건강확인 ping 에도 답해야 한다(2026-08-16).
  // 예전에는 ping 이 실패해도 connectDb 가 연결을 그대로 돌려줬기 때문에 readyState 만으로 충분했는데,
  // 그 관대함이 프로덕션에서 죽은 소켓 위의 쿼리를 7.8초 매다는 원인이라 걷어냈다
  // (worker/lib/db.js connectDb 웜 분기 · __tests__/worker/db.warm-connection-revalidation.test.js).
  // 이 테스트가 보는 것은 결제 멱등성이지 커넥션 수명주기가 아니므로, 진짜 연결과 같은 모양을 준다.
  Object.defineProperty(dbMod.mongoose.connection, "readyState", { value: 1, configurable: true });
  Object.defineProperty(dbMod.mongoose.connection, "db", {
    value: { command: async () => ({ ok: 1 }) },
    configurable: true,
  });

  testUtils = paymentsMod.__paymentsTestUtils;
  Payment = modelsMod.Payment;
  User = modelsMod.User;
  mongoose = dbMod.mongoose;

  originalPaymentFindOne = Payment.findOne;
  originalPaymentCreate = Payment.create;
  originalUserFindById = User.findById;
  originalUserCollectionFindOne = User.collection.findOne;
  originalConnectionCollection = mongoose.connection.collection;
});

afterEach(() => {
  Payment.findOne = originalPaymentFindOne;
  Payment.create = originalPaymentCreate;
  User.findById = originalUserFindById;
  User.collection.findOne = originalUserCollectionFindOne;
  mongoose.connection.collection = originalConnectionCollection;
});

describe("Payments /me 상점 스냅샷", () => {
  const auth = { userId: "64f0a1b2c3d4e5f678901234" };
  test("payments/me: canonical user DB failure returns a degraded snapshot without inventing a balance", async () => {
    User.collection.findOne = jest.fn().mockRejectedValue(Object.assign(new Error("server selection timeout"), {
      name: "MongoServerSelectionError",
    }));

    const response = await testUtils.handleMe(
      { userId: auth.userId },
      { MONGO_OP_RETRIES: "0" },
      new Request("https://example.com/api/payments/me", { headers: { "x-request-id": "payments-me-test" } }),
    );
    const { status, payload } = await readResponse(response);

    expect(status).toBe(200);
    expect(payload).toMatchObject({
      ok: true,
      degraded: true,
      retryable: true,
      code: "PAYMENTS_ME_DEGRADED",
      dbErrorCode: "MONGO_SERVER_SELECTION_TIMEOUT",
      requestId: "payments-me-test",
      source: "token",
      userFound: false,
    });
    expect(payload.data.degradedMonthlyCredits).toBe(true);
    expect(payload.data.monthlyCredits).toBe(0);
    expect(payload.data.historyDeferred).toBe(true);
  });

  test("payments/me: verified token fallback does not issue another Mongo query", async () => {
    User.collection.findOne = jest.fn();

    const response = await testUtils.handleMe(
      { userId: auth.userId, authDbFallback: true },
      { MONGO_OP_RETRIES: "0" },
      new Request("https://example.com/api/payments/me?view=shop"),
    );
    const { status, payload } = await readResponse(response);

    expect(status).toBe(200);
    expect(payload).toMatchObject({ ok: true, degraded: true, source: "token" });
    expect(payload.data.queryBudget).toMatchObject({ dbQueryCount: 0, maxConcurrentDbOps: 1 });
    expect(User.collection.findOne).not.toHaveBeenCalled();
    expect(payload.data.storeSnapshot).toMatchObject({
      schemaVersion: 1,
      source: "token",
      areas: {
        moonstone: { status: "unavailable", balance: null },
        orders: { status: "deferred", hasRecentOrders: null },
      },
    });
  });

  test("payments/me shop summary reuses the authenticated user snapshot without history reads", async () => {
    const collection = jest.fn();
    mongoose.connection.collection = collection;

    const response = await testUtils.handleMe(
      {
        userId: auth.userId,
        authUserDoc: {
          _id: auth.userId,
          name: "Shop user",
          email: "shop@example.com",
          points: 0,
          unlockedFeatures: [],
          profileSubscription: {
            tier: "family",
            isActive: true,
            expiresAt: "2099-01-01T00:00:00.000Z",
            membershipCreditBalance: 80,
          },
        },
      },
      { MONGO_OP_RETRIES: "0" },
      new Request("https://example.com/api/payments/me?view=shop"),
    );
    const { status, payload } = await readResponse(response);

    expect(status).toBe(200);
    expect(payload.data.historyDeferred).toBe(true);
    expect(payload.data.queryBudget).toMatchObject({ dbQueryCount: 0, maxConcurrentDbOps: 1 });
    expect(payload.data.monthlyCredits).toBe(80);
    expect(collection).not.toHaveBeenCalled();
    expect(payload.data.storeSnapshot).toMatchObject({
      schemaVersion: 1,
      source: "db",
      areas: {
        moonstone: { status: "ready", balance: 80 },
        membership: { status: "ready", tier: "family", isActive: true },
        orders: { status: "deferred", hasRecentOrders: null },
      },
    });
    expect(payload.data.storeSnapshot.areas.passes).toBeUndefined();
  });
});
