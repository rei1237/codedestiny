/**
 * @jest-environment node
 */

const mongoose = require("mongoose");

const TEST_USER_ID = "64f0a1b2c3d4e5f678901234";

const sessionStore = new Map();

function cloneDoc(doc) {
  return doc ? { ...doc } : null;
}

const RefreshTokenSessionMock = {
  create: jest.fn(async (doc) => {
    const stored = { ...doc };
    sessionStore.set(doc.tokenHash, stored);
    return stored;
  }),
  findOneAndUpdate: jest.fn((filter, update) => ({
    lean: async () => {
      const existing = sessionStore.get(filter.tokenHash);
      if (!existing) return null;
      if (filter.revokedAt === null && existing.revokedAt != null) return null;
      const before = cloneDoc(existing);
      Object.assign(existing, update?.$set || {});
      return before;
    },
  })),
  findOne: jest.fn((filter) => ({
    lean: async () => cloneDoc(sessionStore.get(filter.tokenHash)),
  })),
  updateOne: jest.fn(async (filter, update) => {
    const existing = sessionStore.get(filter.tokenHash);
    if (existing) Object.assign(existing, update?.$set || {});
    return { acknowledged: true };
  }),
  updateMany: jest.fn(async (filter, update) => {
    for (const doc of sessionStore.values()) {
      if (String(doc.userId) === String(filter.userId)) Object.assign(doc, update?.$set || {});
    }
    return { acknowledged: true };
  }),
};

const TEST_USER_DOC = {
  _id: new mongoose.Types.ObjectId(TEST_USER_ID),
  name: "Tester",
  email: "tester@example.com",
  role: "user",
  points: 0,
  status: "active",
};

// ESM 목은 명명 export 가 정적으로 맞아야 로드된다 — 빠진 이름 하나가 이 파일 전체를
// 로드 실패로 떨어뜨려 리프레시 재사용 탐지 검증이 통째로 죽는다.
// scripts/verify-test-mock-parity.mjs 가 이 목록과 실제 모듈의 export 를 대조한다.
jest.unstable_mockModule("../../worker/lib/db.js", () => ({
  connectDb: jest.fn(async () => undefined),
  mongoose,
  resetMongooseConnection: jest.fn(async () => undefined),
  requestPoolRecovery: jest.fn(async () => undefined),
  resolveMongoDbName: jest.fn(() => "test"),
  withMongoRetry: jest.fn(async (env, fn) => fn()),
  isTransientMongoError: jest.fn(() => false),
}));

jest.unstable_mockModule("../../worker/lib/models.js", () => ({
  IdempotencyKey: {},
  RESTORE_CREDENTIAL_CAP: 10,
  AbuseScore: {},
  CONTENT_ENTITLEMENT_SOURCES: {},
  CONTENT_ENTITLEMENT_STATUSES: {},
  ContentOverride: {},
  DailyFortuneSubscription: {},
  DestinyBiasCard: {},
  Insight: {},
  KarmaDestinyAiConsultation: {},
  LifeBookAiConsultation: {},
  LlmResponseCache: {},
  LoveSecretAiConsultation: {},
  NewYearAiConsultation: {},
  PaidExecutionRecord: {},
  Payment: {},
  ProfileCard: {},
  RECENT_CONSUME_REQUEST_ID_CAP: 200,
  ServiceExecutionTransaction: {},
  SukuyoCompatibilityAiConsultation: {},
  ZiweiAiConsultation: {},
  MonthlyCreditLedger: {},
  PointHistory: {},
  RefreshTokenSession: RefreshTokenSessionMock,
  User: {
    collection: {
      findOne: jest.fn(async () => TEST_USER_DOC),
    },
  },
}));

let handleRefresh;
let signJwt;
let REFRESH_COOKIE_NAME;

const ENV = {
  JWT_ACCESS_SECRET: "test-access-secret",
  JWT_REFRESH_SECRET: "test-refresh-secret",
  JWT_ISSUER: "code-destiny-api",
  JWT_AUDIENCE: "code-destiny-web",
};

beforeAll(async () => {
  const [authRoutes, jwtMod, authLib] = await Promise.all([
    import("../../worker/routes/auth.js"),
    import("../../worker/lib/jwt.js"),
    import("../../worker/lib/auth.js"),
  ]);
  handleRefresh = authRoutes.__authTestUtils.handleRefresh;
  signJwt = jwtMod.signJwt;
  REFRESH_COOKIE_NAME = authLib.REFRESH_COOKIE_NAME;
});

beforeEach(() => {
  sessionStore.clear();
  jest.clearAllMocks();
});

async function issueTestRefreshToken() {
  return signJwt(
    { userId: TEST_USER_ID, typ: "refresh", sid: "test-sid" },
    ENV.JWT_REFRESH_SECRET,
    { expiresIn: "14d", issuer: ENV.JWT_ISSUER, audience: ENV.JWT_AUDIENCE },
  );
}

function tokenHashFor(refreshToken) {
  // Mirrors worker/routes/auth.js hashRefreshToken(rawToken, env) — sha256(token|pepper),
  // pepper falls back to JWT_ACCESS_SECRET when AUTH_SECRET is unset.
  const { createHash } = require("node:crypto");
  return createHash("sha256").update(`${refreshToken}|${ENV.JWT_ACCESS_SECRET}`).digest("hex");
}

function buildRefreshRequest(refreshToken) {
  return new Request("https://example.com/api/auth/refresh", {
    method: "POST",
    headers: { Cookie: `${REFRESH_COOKIE_NAME}=${refreshToken}` },
  });
}


describe("refresh 쿠키 레거시 경로 마이그레이션", () => {
  /**
   * 왜 이 계약이 필요한가:
   *   refresh 쿠키의 path 는 과거 "/api/auth/refresh" 였고 지금은 "/" 다. 회전 응답이 새 쿠키를
   *   Path=/ 로 심으면서 옛 경로 사본을 지우지 않으면, 브라우저는 같은 이름의 쿠키를 둘 갖는다.
   *   RFC 6265 §5.4 는 **긴 path 를 먼저** 보내고 readCookieFromRequest 는 정규식 첫 매치를
   *   취하므로, 다음 refresh 는 방금 폐기된 레거시 토큰을 읽는다. 그러면 회전 선점이 실패하고
   *   grace window 도 넘겨 reuse 로 판정되어 revokeAllUserRefreshSessions 가 돌아
   *   **모든 기기에서 강제 로그아웃**된다. 세션을 새로 발급하는 그 순간이 유일한 치유 시점이다.
   */
  function seedSession(tokenHash) {
    sessionStore.set(tokenHash, {
      userId: new mongoose.Types.ObjectId(TEST_USER_ID),
      tokenHash,
      userAgent: "",
      ip: "",
      expiresAt: new Date(Date.now() + 60_000),
      revokedAt: null,
      replacedByTokenHash: "",
    });
  }

  function setCookieHeaders(response) {
    if (typeof response.headers.getSetCookie === "function") return response.headers.getSetCookie();
    const raw = response.headers.get("set-cookie");
    return raw ? [raw] : [];
  }

  test("회전 응답이 레거시 경로 사본을 같은 응답에서 만료시킨다", async () => {
    const refreshToken = await issueTestRefreshToken();
    seedSession(tokenHashFor(refreshToken));

    const response = await handleRefresh(buildRefreshRequest(refreshToken), ENV);
    expect(response.status).toBe(200);

    const cookies = setCookieHeaders(response).filter((c) => c.startsWith(`${REFRESH_COOKIE_NAME}=`));

    const legacyClear = cookies.find((c) => /Path=\/api\/auth\/refresh/i.test(c));
    expect(legacyClear).toBeTruthy();
    // 값이 비어 있고 Max-Age=0 이어야 실제로 만료된다.
    expect(legacyClear).toMatch(new RegExp(`^${REFRESH_COOKIE_NAME}=;`));
    expect(legacyClear).toMatch(/Max-Age=0/i);
  });

  test("새 refresh 쿠키는 Path=/ 로 살아 있는 값이 심긴다(마이그레이션이 세션을 죽이지 않는다)", async () => {
    const refreshToken = await issueTestRefreshToken();
    seedSession(tokenHashFor(refreshToken));

    const response = await handleRefresh(buildRefreshRequest(refreshToken), ENV);
    expect(response.status).toBe(200);

    const cookies = setCookieHeaders(response).filter((c) => c.startsWith(`${REFRESH_COOKIE_NAME}=`));
    const primary = cookies.find((c) => /Path=\/(;|$)/i.test(c));

    expect(primary).toBeTruthy();
    // 빈 값이면 로그아웃이다 — 반드시 새 토큰이 실려 있어야 한다.
    expect(primary).not.toMatch(new RegExp(`^${REFRESH_COOKIE_NAME}=;`));
    expect(primary).toMatch(/Max-Age=[1-9]/);
  });
});
