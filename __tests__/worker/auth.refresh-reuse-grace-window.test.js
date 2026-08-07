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

describe("refresh-token reuse grace window", () => {
  test("연속된 grace 재생이 revokedAt을 밀어내지 않고 최초 회전 시각으로 고정한다", async () => {
    const refreshToken = await issueTestRefreshToken();
    const tokenHash = tokenHashFor(refreshToken);
    sessionStore.set(tokenHash, {
      userId: new mongoose.Types.ObjectId(TEST_USER_ID),
      tokenHash,
      userAgent: "",
      ip: "",
      expiresAt: new Date(Date.now() + 60_000),
      revokedAt: null,
      replacedByTokenHash: "",
    });

    const env = { ...ENV, AUTH_REFRESH_REUSE_GRACE_MS: "30000" };

    const first = await handleRefresh(buildRefreshRequest(refreshToken), env);
    expect(first.status).toBe(200);
    const originalAfterFirst = sessionStore.get(tokenHash);
    expect(originalAfterFirst.revokedAt).toBeTruthy();
    const firstRotatedAt = new Date(originalAfterFirst.revokedAt).getTime();

    // A second replay of the SAME already-rotated token within the grace window
    // (e.g. a sibling tab racing the same refresh) must not push revokedAt forward.
    const second = await handleRefresh(buildRefreshRequest(refreshToken), env);
    expect(second.status).toBe(200);
    const originalAfterSecond = sessionStore.get(tokenHash);
    expect(new Date(originalAfterSecond.revokedAt).getTime()).toBe(firstRotatedAt);
  });

  test("grace window이 지나면 재생은 재사용 탐지로 거부되고 전 세션이 폐기된다", async () => {
    const refreshToken = await issueTestRefreshToken();
    const tokenHash = tokenHashFor(refreshToken);
    sessionStore.set(tokenHash, {
      userId: new mongoose.Types.ObjectId(TEST_USER_ID),
      tokenHash,
      userAgent: "",
      ip: "",
      expiresAt: new Date(Date.now() + 60_000),
      revokedAt: null,
      replacedByTokenHash: "",
    });

    const shortGraceEnv = { ...ENV, AUTH_REFRESH_REUSE_GRACE_MS: "10" };

    const first = await handleRefresh(buildRefreshRequest(refreshToken), shortGraceEnv);
    expect(first.status).toBe(200);

    await new Promise((resolve) => setTimeout(resolve, 60));

    const second = await handleRefresh(buildRefreshRequest(refreshToken), shortGraceEnv);
    expect(second.status).toBe(401);
    const payload = await second.json();
    expect(payload.message).toMatch(/reuse detected/i);
  });

  test("claim은 됐지만 replacedByTokenHash가 아직 없는 짧은 구간의 재생은 동시 새로고침으로 허용된다", async () => {
    const refreshToken = await issueTestRefreshToken();
    const tokenHash = tokenHashFor(refreshToken);
    // Simulate a sibling request that already claimed the rotation (revokedAt set)
    // but hasn't finished writing replacedByTokenHash yet.
    sessionStore.set(tokenHash, {
      userId: new mongoose.Types.ObjectId(TEST_USER_ID),
      tokenHash,
      userAgent: "",
      ip: "",
      expiresAt: new Date(Date.now() + 60_000),
      revokedAt: new Date(),
      replacedByTokenHash: "",
    });

    const response = await handleRefresh(buildRefreshRequest(refreshToken), ENV);
    expect(response.status).toBe(200);
  });
});
