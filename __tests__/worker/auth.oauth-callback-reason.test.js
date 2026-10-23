/**
 * @jest-environment node
 *
 * OAuth 콜백이 실패할 때 `social_error` 쿼리에 실리는 사유 — 드라이버·네트워크 원문(컬렉션명, 호스트,
 * 이메일)은 URL(히스토리·Referer·로그)로 새면 안 되고, 앱 describeSocialError 가 구분하는 슬러그/범주는 남아야 한다.
 */

jest.unstable_mockModule("../../worker/lib/db.js", () => ({
  connectDb: jest.fn(async () => undefined),
  mongoose: { connection: { name: "test" }, Types: { ObjectId: class { static isValid() { return false; } } } },
  resetMongooseConnection: jest.fn(async () => undefined),
  requestPoolRecovery: jest.fn(async () => undefined),
  resolveMongoDbName: jest.fn(() => "test"),
  withMongoRetry: jest.fn(async (env, fn) => fn()),
  isTransientMongoError: jest.fn(() => false),
}));

jest.unstable_mockModule("../../worker/lib/models.js", () => ({
  IdempotencyKey: {},
  RESTORE_CREDENTIAL_CAP: 10,
  AbuseScore: {}, ContentOverride: {}, DailyFortuneSubscription: {}, DestinyBiasCard: {},
  Insight: {}, KarmaDestinyAiConsultation: {}, LifeBookAiConsultation: {}, LlmResponseCache: {},
  LoveSecretAiConsultation: {}, NewYearAiConsultation: {}, PaidExecutionRecord: {}, Payment: {},
  ProfileCard: {}, ServiceExecutionTransaction: {}, SukuyoCompatibilityAiConsultation: {},
  ZiweiAiConsultation: {}, MonthlyCreditLedger: {}, PointHistory: {},
  CONTENT_ENTITLEMENT_SOURCES: {}, CONTENT_ENTITLEMENT_STATUSES: {}, RECENT_CONSUME_REQUEST_ID_CAP: 200,
  RefreshTokenSession: {},
  User: {},
}));

const ENV = {
  JWT_ACCESS_SECRET: "test-access-secret",
  JWT_REFRESH_SECRET: "test-refresh-secret",
  AUTH_SECRET: "test-auth-secret",
  JWT_ISSUER: "code-destiny-api",
  JWT_AUDIENCE: "code-destiny-web",
  GOOGLE_OAUTH_CLIENT_ID: "g", GOOGLE_OAUTH_CLIENT_SECRET: "gs",
  AUTH_FRONTEND_BASE_URL: "https://code-destiny.com",
};

let authRoutes;
const realFetch = global.fetch;

beforeAll(async () => {
  authRoutes = await import("../../worker/routes/auth.js");
});
beforeEach(() => { jest.spyOn(console, "error").mockImplementation(() => {}); });
afterAll(() => { global.fetch = realFetch; });

/** 정상 start 가 발급한 state·바인딩 쿠키로 콜백을 부르고, 리다이렉트에 실린 social_error 를 돌려준다. */
async function failedCallbackReason(fetchImpl) {
  const start = await authRoutes.__authTestUtils.handleOAuthStart(
    new Request("https://code-destiny.com/api/auth/oauth/google/start"), ENV, "google",
  );
  const state = new URL(start.headers.get("location")).searchParams.get("state");
  const cookie = (start.headers.get("set-cookie") || "").split(";")[0];
  global.fetch = jest.fn(fetchImpl);
  const response = await authRoutes.__authTestUtils.handleOAuthCallback(
    new Request(`https://code-destiny.com/api/auth/oauth/google/callback?code=c1&state=${encodeURIComponent(state)}`, { headers: { Cookie: cookie } }),
    ENV, "google",
  );
  expect(response.status).toBe(302);
  return new URL(response.headers.get("location")).searchParams.get("social_error");
}

test.each([
  ["getaddrinfo ENOTFOUND cluster0-shard-00-00.abcde.mongodb.net", "oauth_callback_failed"],
  ['E11000 duplicate key error collection: codedestiny.users index: email_1 dup key: { email: "victim@example.com" }', "oauth_duplicate"],
  ["MongoServerError: database connection pool cleared", "oauth_database_unavailable"],
])("원문 오류 메시지는 social_error 에 실리지 않는다: %s", async (message, expected) => {
  const reason = await failedCallbackReason(async () => { throw new Error(message); });
  expect(reason).toBe(expected);
  expect(reason).not.toMatch(/mongodb|victim|ENOTFOUND|E11000/i);
});

test("우리가 던진 슬러그 사유는 그대로 남는다(앱 describeSocialError 가 의존)", async () => {
  const reason = await failedCallbackReason(async () => new Response(JSON.stringify({ error: "invalid_grant" }), {
    status: 400, headers: { "content-type": "application/json" },
  }));
  expect(reason).toBe("google_token_exchange_failed");
});
