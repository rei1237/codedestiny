/**
 * @jest-environment node
 *
 * social_grant 1회용 계약(2026-11-20, iOS Phase 5).
 *   ① 같은 grant 를 두 번 교환하면 두 번째는 409 social_grant_used 다.
 *   ② 인프라 실패(503)로 끝난 교환은 소비를 되돌려 같은 grant 로 재시도할 수 있다.
 *   ③ jti 가 없는 grant 는 거부한다.
 */

const consumed = new Set();
const keyOf = (doc) => `${doc.userId}|${doc.endpoint}|${doc.keyHash}`;
const mockIdempotencyCreate = jest.fn(async (doc) => {
  if (consumed.has(keyOf(doc))) throw Object.assign(new Error("E11000 duplicate key"), { code: 11000 });
  consumed.add(keyOf(doc));
  return doc;
});
const mockIdempotencyDeleteOne = jest.fn(async (filter) => {
  consumed.delete(keyOf(filter));
  return { deletedCount: 1 };
});
const mockCollectionFindOne = jest.fn();

jest.unstable_mockModule("../../worker/lib/db.js", () => ({
  connectDb: jest.fn(async () => undefined),
  mongoose: {
    connection: { name: "test" },
    Types: {
      ObjectId: class {
        constructor(id) { this.id = String(id || ""); }
        toString() { return this.id; }
        static isValid(value) { return /^[a-f0-9]{24}$/.test(String(value || "")); }
      },
    },
  },
  resetMongooseConnection: jest.fn(async () => undefined),
  requestPoolRecovery: jest.fn(async () => undefined),
  resolveMongoDbName: jest.fn(() => "test"),
  withMongoRetry: jest.fn(async (env, fn) => fn()),
  isTransientMongoError: jest.fn(() => false),
}));

jest.unstable_mockModule("../../worker/lib/password.js", () => ({
  hashPassword: jest.fn(async () => "hashed"),
  verifyPassword: jest.fn(async () => true),
  needsPasswordRehash: jest.fn(() => false),
}));

jest.unstable_mockModule("../../worker/lib/models.js", () => ({
  IdempotencyKey: { create: mockIdempotencyCreate, deleteOne: mockIdempotencyDeleteOne },
  RESTORE_CREDENTIAL_CAP: 10,
  AbuseScore: {}, ContentOverride: {}, DailyFortuneSubscription: {}, DestinyBiasCard: {},
  Insight: {}, KarmaDestinyAiConsultation: {}, LifeBookAiConsultation: {}, LlmResponseCache: {},
  LoveSecretAiConsultation: {}, NewYearAiConsultation: {}, PaidExecutionRecord: {}, Payment: {},
  ProfileCard: {}, ServiceExecutionTransaction: {}, SukuyoCompatibilityAiConsultation: {},
  ZiweiAiConsultation: {}, MonthlyCreditLedger: {}, PointHistory: {},
  CONTENT_ENTITLEMENT_SOURCES: {}, CONTENT_ENTITLEMENT_STATUSES: {}, RECENT_CONSUME_REQUEST_ID_CAP: 200,
  RefreshTokenSession: {
    create: jest.fn(async (doc) => doc),
    findOne: jest.fn(() => ({ lean: async () => null })),
    findOneAndUpdate: jest.fn(() => ({ lean: async () => null })),
    updateMany: jest.fn(async () => ({})),
    updateOne: jest.fn(async () => ({})),
  },
  User: {
    findById: jest.fn(),
    findOne: jest.fn(),
    updateOne: jest.fn(),
    collection: { findOne: mockCollectionFindOne },
  },
}));

const USER_ID = "64f0a1b2c3d4e5f678901234";
const ENV = {
  JWT_ACCESS_SECRET: "test-access-secret",
  JWT_REFRESH_SECRET: "test-refresh-secret",
  AUTH_SECRET: "test-auth-secret",
  JWT_ISSUER: "code-destiny-api",
  JWT_AUDIENCE: "code-destiny-web",
  AUTH_FRONTEND_BASE_URL: "https://code-destiny.com",
  AUTH_OP_TIMEOUT_MS: "3000",
};

let authRoutes;
let signJwt;

async function grant(extra = {}) {
  return signJwt(
    { purpose: "social-oauth-grant", userId: USER_ID, provider: "google", nextPath: "/", flow: "login", jti: crypto.randomUUID(), ...extra },
    ENV.JWT_ACCESS_SECRET,
    { expiresIn: "180s", issuer: "code-destiny-api" },
  );
}

function complete(socialGrant) {
  return authRoutes.__authTestUtils.handleOAuthComplete(new Request("https://code-destiny.com/api/auth/oauth/complete", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: "capacitor://localhost", "X-Code-Destiny-Runtime": "mobile-app" },
    body: JSON.stringify({ socialGrant }),
  }), ENV);
}

beforeAll(async () => {
  authRoutes = await import("../../worker/routes/auth.js");
  ({ signJwt } = await import("../../worker/lib/jwt.js"));
});

beforeEach(() => {
  consumed.clear();
  jest.clearAllMocks();
  mockCollectionFindOne.mockResolvedValue({
    _id: USER_ID, name: "tester", email: "tester@example.com", role: "user", status: "active",
    birthDate: "1990-01-01", birthTime: "12:00", gender: "F", points: 0,
  });
});

test("the same social grant cannot be exchanged twice", async () => {
  const socialGrant = await grant();
  const first = await complete(socialGrant);
  expect(first.status).toBe(200);
  const firstBody = await first.json();
  expect(firstBody.accessToken).toBeTruthy();

  const second = await complete(socialGrant);
  expect(second.status).toBe(409);
  expect((await second.json()).code).toBe("social_grant_used");
});

test("an infrastructure failure releases the grant so the client can retry it", async () => {
  const socialGrant = await grant();
  mockCollectionFindOne.mockRejectedValue(Object.assign(new Error("connect ECONNRESET"), { name: "MongoNetworkError" }));
  const failed = await complete(socialGrant);
  expect(failed.status).toBe(503);
  expect(mockIdempotencyDeleteOne).toHaveBeenCalledTimes(1);

  mockCollectionFindOne.mockResolvedValue({ _id: USER_ID, name: "tester", email: "tester@example.com", role: "user", status: "active" });
  const retried = await complete(socialGrant);
  expect(retried.status).toBe(200);
});

test("a grant without jti is rejected before touching the store", async () => {
  const socialGrant = await grant({ jti: undefined });
  // signJwt 는 payload 의 jti 를 그대로 둔다. undefined 는 JSON 에서 빠진다.
  const response = await complete(socialGrant);
  expect(response.status).toBe(400);
  expect(mockIdempotencyCreate).not.toHaveBeenCalled();
});
