/**
 * @jest-environment node
 *
 * 회원 탈퇴(POST /api/auth/withdraw) 계약 가드.
 *
 * 이 커버리지는 원래 __tests__/api/auth/withdraw.test.js 에 있었는데, 대상이던
 * app/api/auth/withdraw/route.js 가 워커(worker/routes/auth.js)로 이관되며 삭제되어
 * 538줄이 통째로 죽은 테스트가 되어 있었다. 워커 구현이 같은 계약을 그대로 들고 있으므로
 * 지우지 않고 여기로 옮긴다.
 *
 * 탈퇴는 되돌릴 수 없으므로 "거부 조건"과 "비식별화 범위" 둘 다 못박는다.
 */

const { createHmac } = require("node:crypto");

const mockUserFindOne = jest.fn();
const mockUserUpdateOne = jest.fn(async () => ({ modifiedCount: 1 }));
const mockVerifyPassword = jest.fn(async () => true);
const mockRevokeSessions = jest.fn(async () => ({}));

// User.db.collection(name) 이 돌려주는 컬렉션 핸들을 이름별로 기록해 호출을 검사한다.
const collectionCalls = new Map();
function collectionHandle(name) {
  if (!collectionCalls.has(name)) {
    collectionCalls.set(name, {
      updateMany: jest.fn(async () => ({ modifiedCount: 1 })),
      deleteMany: jest.fn(async () => ({ deletedCount: 1 })),
      insertOne: jest.fn(async () => ({ insertedId: "log-1" })),
    });
  }
  return collectionCalls.get(name);
}

jest.unstable_mockModule("../../worker/lib/db.js", () => ({
  connectDb: jest.fn(async () => undefined),
  mongoose: {
    connection: { name: "test" },
    Types: {
      ObjectId: class {
        constructor(id) { this.id = String(id); }
        toString() { return this.id; }
        static isValid() { return true; }
      },
    },
  },
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
  RefreshTokenSession: {
    create: jest.fn(async (doc) => doc),
    findOne: jest.fn(async () => null),
    findOneAndUpdate: jest.fn(() => ({ lean: async () => null })),
    updateMany: mockRevokeSessions,
    updateOne: jest.fn(async () => ({})),
  },
  User: {
    collection: {
      findOne: mockUserFindOne,
      updateOne: mockUserUpdateOne,
    },
    db: { collection: collectionHandle },
  },
}));

jest.unstable_mockModule("../../worker/lib/password.js", () => ({
  hashPassword: jest.fn(async () => "hashed-password"),
  verifyPassword: mockVerifyPassword,
  // 레거시 bcrypt 해시를 로그인 시 PBKDF2로 갈아끼우는 경로. 목 해시는 bcrypt가 아니므로 false.
  needsPasswordRehash: jest.fn(() => false),
}));

const ENV = {
  JWT_ACCESS_SECRET: "test-access-secret",
  JWT_REFRESH_SECRET: "test-refresh-secret",
  JWT_ISSUER: "code-destiny-api",
  JWT_AUDIENCE: "code-destiny-web",
};

const USER_ID = "64f0a1b2c3d4e5f678901234";
const CSRF_COOKIE_NAME = "cd_csrf_token";
const CSRF_HEADER_NAME = "x-csrf-token";

let authRoutes;
let signJwt;
let accessToken;
let ipCounter;

/** 워커와 같은 방식으로 CSRF 토큰을 만든다(getCsrfSecret 는 JWT_ACCESS_SECRET 로 폴백). */
function makeCsrfToken(issuedAt = Date.now()) {
  const payload = `${issuedAt.toString(36)}.abcd1234`;
  const sig = createHmac("sha256", ENV.JWT_ACCESS_SECRET).update(payload).digest("hex");
  return `${payload}.${sig}`;
}

function buildWithdrawRequest(overrides = {}) {
  const {
    csrfCookie = makeCsrfToken(),
    csrfHeader = csrfCookie,
    token = accessToken,
    body = { agreeIrreversible: true, confirmText: "회원탈퇴", password: "correct-horse" },
    ip,
  } = overrides;

  const cookies = [];
  if (token) cookies.push(`fortune_auth_token=${token}`);
  if (csrfCookie) cookies.push(`${CSRF_COOKIE_NAME}=${csrfCookie}`);

  const headers = new Headers({ "content-type": "application/json" });
  if (cookies.length) headers.set("cookie", cookies.join("; "));
  if (csrfHeader) headers.set(CSRF_HEADER_NAME, csrfHeader);
  if (token) headers.set("authorization", `Bearer ${token}`);
  // 레이트리밋은 IP 기준이다. 케이스마다 다른 IP 를 써야 서로를 오염시키지 않는다.
  headers.set("cf-connecting-ip", ip || `203.0.113.${(ipCounter += 1)}`);

  return new Request("https://code-destiny.com/api/auth/withdraw", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

async function callWithdraw(overrides) {
  const response = await authRoutes.__authTestUtils.handleWithdraw(buildWithdrawRequest(overrides), ENV);
  const payload = await response.json().catch(() => ({}));
  return { status: response.status, payload, headers: response.headers };
}

const LOCAL_USER_DOC = {
  _id: USER_ID,
  name: "테스터",
  email: "tester@example.com",
  passwordHash: "hashed",
  localAuth: { enabled: true },
  status: "active",
  role: "user",
};

beforeAll(async () => {
  authRoutes = await import("../../worker/routes/auth.js");
  ({ signJwt } = await import("../../worker/lib/jwt.js"));
  accessToken = await signJwt(
    { userId: USER_ID, email: LOCAL_USER_DOC.email, role: "user" },
    ENV.JWT_ACCESS_SECRET,
    { expiresIn: "30m", issuer: ENV.JWT_ISSUER, audience: ENV.JWT_AUDIENCE },
  );
});

// User.collection.findOne 은 두 계층에서 서로 다른 목적으로 불린다.
//   1) 인증(resolveActiveUserAuth) — identity projection, 탈퇴 계정이면 null 취급
//   2) 탈퇴 핸들러 — socialAccounts 를 포함한 projection
// projection 으로 갈라야 "인증은 되는데 핸들러 단계에서 거부되는" 방어 분기를 검사할 수 있다.
let authStageUser;
let handlerStageUser;

beforeEach(() => {
  jest.clearAllMocks();
  collectionCalls.clear();
  ipCounter = 10;
  authRoutes.__authTestUtils.clearWithdrawRateLimitState();
  authStageUser = { ...LOCAL_USER_DOC };
  handlerStageUser = { ...LOCAL_USER_DOC };
  mockUserFindOne.mockImplementation(async (_filter, options) => (
    options?.projection?.socialAccounts ? handlerStageUser : authStageUser
  ));
  mockVerifyPassword.mockResolvedValue(true);
});

describe("탈퇴 거부 조건", () => {
  test("인증 없으면 401", async () => {
    await expect(callWithdraw({ token: "" })).rejects.toMatchObject({ status: 401 });
  });

  test("위조된 JWT 서명이면 401", async () => {
    const forged = `${accessToken.slice(0, -6)}abcdef`;
    await expect(callWithdraw({ token: forged })).rejects.toMatchObject({ status: 401 });
  });

  test("CSRF 헤더가 없으면 403", async () => {
    const { status } = await callWithdraw({ csrfHeader: "" });
    expect(status).toBe(403);
  });

  test("CSRF 쿠키와 헤더가 다르면 403", async () => {
    const { status } = await callWithdraw({ csrfHeader: makeCsrfToken(Date.now() - 1000) });
    expect(status).toBe(403);
  });

  test("만료된 CSRF 토큰이면 403", async () => {
    const expired = makeCsrfToken(Date.now() - (3 * 60 * 60 * 1000));
    const { status } = await callWithdraw({ csrfCookie: expired });
    expect(status).toBe(403);
  });

  test("되돌릴 수 없음에 동의하지 않으면 400", async () => {
    const { status } = await callWithdraw({
      body: { agreeIrreversible: false, confirmText: "회원탈퇴", password: "correct-horse" },
    });
    expect(status).toBe(400);
  });

  test("확인 문구가 '회원탈퇴'가 아니면 400", async () => {
    const { status } = await callWithdraw({
      body: { agreeIrreversible: true, confirmText: "탈퇴", password: "correct-horse" },
    });
    expect(status).toBe(400);
  });

  test("로컬 계정인데 비밀번호가 없으면 400", async () => {
    const { status } = await callWithdraw({
      body: { agreeIrreversible: true, confirmText: "회원탈퇴" },
    });
    expect(status).toBe(400);
  });

  test("비밀번호가 틀리면 403", async () => {
    mockVerifyPassword.mockResolvedValue(false);
    const { status } = await callWithdraw();
    expect(status).toBe(403);
  });

  test("이미 탈퇴한 계정은 인증 단계에서 먼저 막힌다 — 401", async () => {
    // resolveActiveUserAuth 가 isWithdrawnUser 를 보고 null 을 돌려준다.
    // 즉 탈퇴 계정은 재탈퇴 요청 이전에 인증 자체가 성립하지 않는다.
    authStageUser = { ...LOCAL_USER_DOC, status: "withdrawn" };
    await expect(callWithdraw()).rejects.toMatchObject({ status: 401 });
  });

  test("인증 후 조회에서 이미 탈퇴 상태면 409 (경합 방어)", async () => {
    handlerStageUser = { ...LOCAL_USER_DOC, status: "withdrawn" };
    const { status } = await callWithdraw();
    expect(status).toBe(409);
  });

  test("인증 후 조회에서 사용자가 사라졌으면 404 (경합 방어)", async () => {
    handlerStageUser = null;
    const { status } = await callWithdraw();
    expect(status).toBe(404);
  });

  test("같은 IP에서 한도를 넘기면 429", async () => {
    const ip = "198.51.100.7";
    let last = null;
    // 상한 3회. 4번째 요청이 거부되어야 한다.
    for (let i = 0; i < 4; i += 1) last = await callWithdraw({ ip });
    expect(last.status).toBe(429);
  });
});

describe("탈퇴 처리 — 비식별화 범위", () => {
  test("정상 탈퇴는 200 이고 인증 쿠키를 만료시킨다", async () => {
    const { status, payload, headers } = await callWithdraw();
    expect(status).toBe(200);
    expect(payload.partialFailure).toBe(false);
    const setCookie = String(headers.get("set-cookie") || "");
    expect(setCookie).toContain("fortune_auth_token=");
    expect(setCookie).toMatch(/Max-Age=0/i);
  });

  test("User 문서가 비식별화된다 — 이름·이메일·비밀번호·상태", async () => {
    await callWithdraw();
    expect(mockUserUpdateOne).toHaveBeenCalledTimes(1);
    const update = mockUserUpdateOne.mock.calls[0][1].$set;
    expect(update.name).toBe("[탈퇴한 회원]");
    expect(update.email).toMatch(/^withdrawn_.*@withdrawn\.local$/);
    expect(update.email).not.toContain("tester@example.com");
    expect(update.passwordHash).toBe("");
    expect(update.status).toBe("withdrawn");
    expect(update.points).toBe(0);
    expect(update.localAuth.enabled).toBe(false);
    // 소셜 연결 id 가 남으면 재로그인으로 계정이 되살아난다.
    for (const provider of ["google", "naver", "kakao"]) {
      expect(update.socialAccounts[provider].id).toBe("");
    }
  });

  test("Payment 는 삭제가 아니라 익명화된다 — userId 를 떼고 보존", async () => {
    await callWithdraw();
    const payments = collectionCalls.get("payments");
    expect(payments.updateMany).toHaveBeenCalledTimes(1);
    const [, mutation] = payments.updateMany.mock.calls[0];
    expect(mutation.$unset).toHaveProperty("userId");
    expect(mutation.$set._anonymized).toBe(true);
    expect(payments.deleteMany).not.toHaveBeenCalled();
  });

  test("PointHistory 는 삭제된다", async () => {
    await callWithdraw();
    expect(collectionCalls.get("pointhistories").deleteMany).toHaveBeenCalledTimes(1);
  });

  // 🔴 프로필 카드는 생년월일·출생시각·출생지 좌표를 담고 TTL 이 없다. 익명화로는 남는다.
  test("ProfileCard 는 삭제된다 — 탈퇴 후 생년월일·출생지가 서버에 남지 않는다", async () => {
    await callWithdraw();
    const profileCards = collectionCalls.get("profilecards");
    expect(profileCards.deleteMany).toHaveBeenCalledTimes(1);
    const [filter] = profileCards.deleteMany.mock.calls[0];
    expect(String(filter.userId)).toBe(USER_ID);
    expect(profileCards.updateMany).not.toHaveBeenCalled();
  });

  // 레거시 계정은 같은 생년월일을 User.destinyProfiles[] 에도 들고 있다.
  test("User 문서의 프로필 카드 사본도 비워진다", async () => {
    await callWithdraw();
    const update = mockUserUpdateOne.mock.calls[0][1].$set;
    expect(update.destinyProfiles).toEqual([]);
    expect(update.destinyProfilesCurrentId).toBe("");
    expect(update.destinyProfilesLockedCurrentId).toBe("");
  });

  test("감사 로그에 원문 PII 가 들어가지 않는다", async () => {
    await callWithdraw();
    const [entry] = collectionCalls.get("deleted_account_logs").insertOne.mock.calls[0];
    expect(entry.userId).toBe(USER_ID);
    expect(entry.emailHash).toEqual(expect.any(String));
    expect(entry.emailHash).not.toContain("tester@example.com");
    expect(JSON.stringify(entry)).not.toContain("tester@example.com");
    expect(JSON.stringify(entry)).not.toContain("테스터");
  });

  test("탈퇴 후 리프레시 세션이 전부 폐기된다", async () => {
    await callWithdraw();
    expect(mockRevokeSessions).toHaveBeenCalled();
  });

  test("User 비식별화가 실패하면 500 이고 뒷단을 진행하지 않는다", async () => {
    mockUserUpdateOne.mockRejectedValueOnce(new Error("write failed"));
    const { status } = await callWithdraw();
    expect(status).toBe(500);
    expect(collectionCalls.has("pointhistories")).toBe(false);
  });
});
