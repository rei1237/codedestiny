/**
 * @jest-environment node
 *
 * 영냥이(SoulCat) 결제 증빙 조회·소비 라우트 — Service Binding 계약.
 *
 * SoulCat 은 결제 경로가 없고 CD `/checkout/` 단건 결제 증빙(Payment 행)만 읽는다. 여기서 고정하는 것:
 *   ① `yeongnyangi-` 접두의 direct_only/direct_or_family 상품 키만 받는다(다른 상품 증빙 노출 금지)
 *   ② GET 은 본인 소유·결제 완료·미소비 행만 돌려준다(GIFT·pending·소비됨 제외)
 *   ③ POST 소비는 원자적이고 같은 requestId 재요청은 멱등, 다른 requestId 는 409 ALREADY_CONSUMED
 * 🔴 mock 은 DB 어댑터뿐이다 — 판정은 실제 라우트가 돌린다.
 */
import { jest } from "@jest/globals";
import mongooseReal from "mongoose";

const USER_ID = "507f1f77bcf86cd799439011";
const OTHER_USER_ID = "507f1f77bcf86cd799439022";
const FEATURE_KEY = "yeongnyangi-saju-mackerel";

let rows = [];
let authResult = { userId: USER_ID };

function readPath(doc, path) {
  return path.split(".").reduce((acc, key) => (acc == null ? undefined : acc[key]), doc);
}

function matchValue(actual, expected) {
  if (expected instanceof RegExp) return expected.test(String(actual ?? ""));
  if (expected && typeof expected === "object" && !(expected instanceof mongooseReal.Types.ObjectId) && !(expected instanceof Date)) {
    return Object.entries(expected).every(([op, value]) => {
      if (op === "$in") return value.some((v) => String(v) === String(actual));
      if (op === "$ne") return String(actual ?? "") !== String(value ?? "");
      if (op === "$exists") return value ? actual !== undefined : actual === undefined;
      throw new Error(`unsupported operator ${op}`);
    });
  }
  return String(actual ?? "") === String(expected ?? "");
}

function matches(doc, query) {
  return Object.entries(query).every(([key, expected]) => {
    if (key === "$or") return expected.some((clause) => matches(doc, clause));
    if (key === "$and") return expected.every((clause) => matches(doc, clause));
    return matchValue(readPath(doc, key), expected);
  });
}

function chain(result) {
  const api = {
    sort: () => api,
    limit: () => api,
    lean: async () => result,
  };
  return api;
}

const Payment = {
  find: (query) => chain(rows.filter((row) => matches(row, query))),
  findOne: (query) => chain(rows.find((row) => matches(row, query)) || null),
  findOneAndUpdate: (query, update) => {
    const row = rows.find((candidate) => matches(candidate, query));
    if (!row) return chain(null);
    Object.entries(update.$set || {}).forEach(([path, value]) => {
      const parts = path.split(".");
      let target = row;
      parts.slice(0, -1).forEach((part) => { target[part] = target[part] || {}; target = target[part]; });
      target[parts[parts.length - 1]] = value;
    });
    return chain(row);
  },
};

let handleRoutes;

beforeAll(async () => {
  await Promise.all([
    jest.unstable_mockModule("../../worker/lib/db.js", () => ({
      connectDb: async () => {},
      mongoose: mongooseReal,
      isTransientMongoError: () => false,
      withMongoRetry: async (_env, fn) => fn(),
    })),
    jest.unstable_mockModule("../../worker/lib/models.js", () => ({ Payment })),
    jest.unstable_mockModule("../../worker/lib/auth.js", () => ({
      requireUserFromRequest: async () => {
        if (!authResult) {
          const { createHttpError } = await import("../../worker/lib/http.js");
          throw createHttpError(401, "Authentication is required.", { code: "UNAUTHORIZED" });
        }
        return authResult;
      },
    })),
  ]);
  ({ handleYeongnyangiEntitlementRoutes: handleRoutes } = await import("../../worker/routes/yeongnyangi-entitlement.js"));
});

function paidRow(overrides = {}) {
  return {
    _id: new mongooseReal.Types.ObjectId(),
    userId: new mongooseReal.Types.ObjectId(USER_ID),
    merchantUid: `cd${Math.random().toString(16).slice(2, 12)}`,
    requestId: "yn-req-1",
    idempotencyKey: "yn-req-1",
    featureKey: FEATURE_KEY,
    paymentType: "digital_content",
    purchaseType: "SELF",
    status: "paid",
    paymentAmount: 1000,
    paidAt: new Date("2026-09-15T00:00:00Z"),
    metadata: {},
    ...overrides,
  };
}

async function call(method, { query = "", body } = {}) {
  const request = new Request(`https://code-destiny.com/api/yeongnyangi-entitlement${query}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const response = await handleRoutes(request, {});
  return { response, payload: await response.json() };
}

beforeEach(() => {
  rows = [];
  authResult = { userId: USER_ID };
});

describe("GET — 증빙 조회", () => {
  test("영냥이 키가 아니면 400 — 다른 상품 증빙을 노출하지 않는다", async () => {
    const { response, payload } = await call("GET", { query: "?featureKey=vedic-ai" });
    expect(response.status).toBe(400);
    expect(payload.code).toBe("INVALID_FEATURE_KEY");
  });

  test("미로그인은 401", async () => {
    authResult = null;
    const { response } = await call("GET", { query: `?featureKey=${FEATURE_KEY}` });
    expect(response.status).toBe(401);
  });

  test("본인·결제완료·미소비 행만 돌려준다", async () => {
    const mine = paidRow();
    rows = [
      mine,
      paidRow({ status: "pending" }),
      paidRow({ purchaseType: "GIFT" }),
      paidRow({ userId: new mongooseReal.Types.ObjectId(OTHER_USER_ID) }),
      paidRow({ featureKey: "yeongnyangi-saju-salmon" }),
      paidRow({ metadata: { consumedBy: "yn-other" } }),
    ];
    const { response, payload } = await call("GET", { query: `?featureKey=${FEATURE_KEY}` });
    expect(response.status).toBe(200);
    expect(payload.featureKey).toBe(FEATURE_KEY);
    expect(payload.proofs).toHaveLength(1);
    expect(payload.proofs[0]).toMatchObject({
      source: "direct-payment", id: mine.merchantUid, requestId: "yn-req-1", amountKRW: 1000, consumedBy: null,
    });
  });
});

describe("POST — 증빙 소비", () => {
  test("소비하면 metadata.consumedBy 가 박히고 GET 에서 사라진다", async () => {
    const mine = paidRow();
    rows = [mine];
    const { response, payload } = await call("POST", { body: { paymentId: mine.merchantUid, requestId: "book-1" } });
    expect(response.status).toBe(200);
    expect(payload.idempotent).toBe(false);
    expect(mine.metadata.consumedBy).toBe("book-1");
    expect(mine.metadata.consumedScope).toBe("soulcat-book");
    const listed = await call("GET", { query: `?featureKey=${FEATURE_KEY}` });
    expect(listed.payload.proofs).toHaveLength(0);
  });

  test("같은 requestId 재요청은 멱등 200, 다른 requestId 는 409 ALREADY_CONSUMED", async () => {
    const mine = paidRow();
    rows = [mine];
    await call("POST", { body: { paymentId: mine.merchantUid, requestId: "book-1" } });
    const again = await call("POST", { body: { paymentId: mine.merchantUid, requestId: "book-1" } });
    expect(again.response.status).toBe(200);
    expect(again.payload.idempotent).toBe(true);
    const other = await call("POST", { body: { paymentId: mine.merchantUid, requestId: "book-2" } });
    expect(other.response.status).toBe(409);
    expect(other.payload.code).toBe("ALREADY_CONSUMED");
    expect(mine.metadata.consumedBy).toBe("book-1");
  });

  test("남의 결제·미결제 행은 404 — 소유자 검사 없이 소비되지 않는다", async () => {
    const theirs = paidRow({ userId: new mongooseReal.Types.ObjectId(OTHER_USER_ID) });
    const pending = paidRow({ status: "pending" });
    rows = [theirs, pending];
    for (const row of rows) {
      const { response, payload } = await call("POST", { body: { paymentId: row.merchantUid, requestId: "book-x" } });
      expect(response.status).toBe(404);
      expect(payload.code).toBe("PROOF_NOT_FOUND");
      expect(row.metadata.consumedBy).toBeUndefined();
    }
  });

  test("paymentId·requestId 가 없으면 400", async () => {
    expect((await call("POST", { body: { requestId: "r" } })).response.status).toBe(400);
    expect((await call("POST", { body: { paymentId: "p" } })).response.status).toBe(400);
  });
});
