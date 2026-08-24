/**
 * @jest-environment node
 *
 * 소셜 전화번호 **추가 동의** 재요청 경로(`/api/auth/oauth/:provider/start?mode=phone-consent`)의
 * 계약 가드.
 *
 * 왜 이 경로가 있는가: 카카오 phone_number 는 **선택 동의**라 사용자가 한 번 거부하면 다음
 * 로그인의 동의 화면에 그 항목이 다시 뜨지 않는다. 로그인 scope 를 켜는 것만으로는 거부한
 * 사용자와 그 전에 가입한 사용자의 번호를 영영 받을 수 없어, 공급자가 그 경우를 위해 두는
 * "추가 항목 동의 받기"(카카오) · `auth_type=reprompt`(네이버) 를 쓴다.
 *
 * 여기서 못박는 것:
 *   ① `mode` 없는 **기존 로그인 시작은 인증을 요구하지 않는다** — 이 분기가 새면 로그인이 전면 중단된다.
 *   ② scope 가 꺼진 공급자로는 열리지 않는다 — 미승인 상태에서 authorize 가 KOE205 로 죽는 창을 보이게 된다.
 *   ③ 구글은 영구 미지원이다.
 *   ④ 🔴 providerId 가 그 계정에 연결된 소셜 id 와 다르면 **저장하지 않는다** — 없으면 남의 카카오
 *      계정으로 내 계정에 그 번호를 붙일 수 있다.
 *   ⑤ 저장은 암호문으로 나가고 동의 기록이 같은 쓰기에 담긴다.
 *   ⑥ 항목만 거부해 번호가 안 와도 조용히 실패하고 세션은 건드리지 않는다.
 */

const ENCRYPTED_PREFIX = "v1:";

const mockUserFindById = jest.fn();
const mockCollectionFindOne = jest.fn();
const mockCollectionFindOneAndUpdate = jest.fn();

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

jest.unstable_mockModule("../../worker/lib/pii-crypto.js", () => ({
  encryptPhoneNumber: jest.fn(async (value) => (value ? `${ENCRYPTED_PREFIX}enc(${value})` : "")),
  decryptPhoneNumber: jest.fn(async (value) => {
    const stored = String(value || "");
    const match = stored.match(/^v1:enc\((\d+)\)$/);
    if (match) return match[1];
    return /^01\d{8,9}$/.test(stored) ? stored : "";
  }),
  normalizeKoreanPhoneNumber: jest.fn((value) => {
    const digits = String(value || "").replace(/\D/g, "");
    const local = digits.startsWith("82") && /^821\d{8,9}$/.test(digits) ? `0${digits.slice(2)}` : digits;
    return /^01\d{8,9}$/.test(local) ? local : "";
  }),
  maskKoreanPhoneNumber: jest.fn((value) => {
    const digits = String(value || "");
    return /^01\d{8,9}$/.test(digits) ? `${digits.slice(0, 3)}-****-${digits.slice(-4)}` : "";
  }),
  isEncryptedPiiValue: jest.fn((value) => String(value || "").startsWith(ENCRYPTED_PREFIX)),
  ENCRYPTED_PII_PATTERN: /^v1:.+$/,
}));

jest.unstable_mockModule("../../worker/lib/password.js", () => ({
  hashPassword: jest.fn(async () => "hashed"),
  verifyPassword: jest.fn(async () => true),
  needsPasswordRehash: jest.fn(() => false),
}));

jest.unstable_mockModule("../../worker/lib/models.js", () => ({
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
    findById: mockUserFindById,
    collection: {
      findOne: mockCollectionFindOne,
      findOneAndUpdate: mockCollectionFindOneAndUpdate,
    },
  },
}));

const BASE_ENV = {
  JWT_ACCESS_SECRET: "test-access-secret",
  JWT_REFRESH_SECRET: "test-refresh-secret",
  AUTH_SECRET: "test-auth-secret",
  JWT_ISSUER: "code-destiny-api",
  JWT_AUDIENCE: "code-destiny-web",
  PII_ENC_KEY: "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
  GOOGLE_OAUTH_CLIENT_ID: "g", GOOGLE_OAUTH_CLIENT_SECRET: "gs",
  NAVER_OAUTH_CLIENT_ID: "n", NAVER_OAUTH_CLIENT_SECRET: "ns",
  KAKAO_OAUTH_CLIENT_ID: "k", KAKAO_OAUTH_CLIENT_SECRET: "ks",
  AUTH_FRONTEND_BASE_URL: "https://code-destiny.com",
  SOCIAL_PHONE_SCOPE_PROVIDERS: "kakao",
};

const USER_ID = "64f0a1b2c3d4e5f678901234";
const KAKAO_ID = "kakao-1234";
const PROVIDER_PHONE = "01055556666";

let authRoutes;
let accessToken;

/** findById(...).select(...).maxTimeMS(...).lean() 체인을 그대로 흉내낸다. */
function findByIdChain(doc) {
  return { select: () => ({ maxTimeMS: () => ({ lean: async () => doc }) }) };
}

function startRequest(provider, query = "", { token = accessToken } = {}) {
  const headers = new Headers();
  if (token) {
    headers.set("cookie", `fortune_auth_token=${token}`);
    headers.set("authorization", `Bearer ${token}`);
  }
  return new Request(`https://code-destiny.com/api/auth/oauth/${provider}/start${query}`, { headers });
}

const callStart = (provider, query, options) =>
  authRoutes.__authTestUtils.handleOAuthStart(startRequest(provider, query, options), BASE_ENV, provider);

beforeAll(async () => {
  authRoutes = await import("../../worker/routes/auth.js");
  const { signJwt } = await import("../../worker/lib/jwt.js");
  accessToken = await signJwt(
    { userId: USER_ID, email: "tester@example.com", role: "user" },
    BASE_ENV.JWT_ACCESS_SECRET,
    { expiresIn: "30m", issuer: BASE_ENV.JWT_ISSUER, audience: BASE_ENV.JWT_AUDIENCE },
  );
});

beforeEach(() => {
  jest.clearAllMocks();
  mockCollectionFindOne.mockResolvedValue({
    _id: USER_ID, email: "tester@example.com", role: "user", status: "active",
  });
  mockUserFindById.mockReturnValue(findByIdChain({
    _id: USER_ID,
    socialAccounts: { kakao: { id: KAKAO_ID } },
  }));
  mockCollectionFindOneAndUpdate.mockResolvedValue({
    value: { _id: USER_ID, phoneNumber: `${ENCRYPTED_PREFIX}enc(${PROVIDER_PHONE})` },
  });
});

describe("기존 로그인 시작 경로는 그대로다", () => {
  // 🔴 이게 깨지면 로그인이 전면 중단된다. 추가 동의 분기가 mode 없는 요청까지 삼키지 않는지 본다.
  test("mode 없는 start 는 인증 없이도 공급자로 리다이렉트한다", async () => {
    const response = await callStart("kakao", "", { token: "" });
    expect(response.status).toBe(302);
    const location = new URL(response.headers.get("location"));
    expect(location.origin + location.pathname).toBe("https://kauth.kakao.com/oauth/authorize");
    expect(location.searchParams.get("scope")).toBe("profile_nickname account_email phone_number");
    expect(location.searchParams.get("prompt")).toBe("login");
    expect(location.searchParams.get("auth_type")).toBeNull();
  });

  test("알 수 없는 mode 값은 무시된다(기존 동작으로 떨어진다)", async () => {
    const response = await callStart("kakao", "?mode=whatever", { token: "" });
    expect(response.status).toBe(302);
    expect(new URL(response.headers.get("location")).searchParams.get("prompt")).toBe("login");
  });
});

describe("추가 동의 시작", () => {
  test("카카오는 추가 항목만 scope 에 싣고 prompt=login 을 붙이지 않는다", async () => {
    const response = await callStart("kakao", "?mode=phone-consent");
    expect(response.status).toBe(302);
    const location = new URL(response.headers.get("location"));
    // 추가 항목 동의 받기 규격 — 이미 동의한 항목을 다시 싣지 않는다.
    expect(location.searchParams.get("scope")).toBe("phone_number");
    // 🔴 재로그인을 강요하면 추가 동의 화면이 아니라 로그인 화면이 뜬다.
    expect(location.searchParams.get("prompt")).toBeNull();
  });

  test("네이버는 재동의 화면을 명시한다", async () => {
    const response = await callStart("naver", "?mode=phone-consent", {});
    // scope 가 꺼져 있으므로 먼저 400 이어야 한다(아래 테스트와 같은 게이트).
    expect(response.status).toBe(400);

    const withNaver = await authRoutes.__authTestUtils.handleOAuthStart(
      startRequest("naver", "?mode=phone-consent"),
      { ...BASE_ENV, SOCIAL_PHONE_SCOPE_PROVIDERS: "kakao,naver" },
      "naver",
    );
    expect(withNaver.status).toBe(302);
    const location = new URL(withNaver.headers.get("location"));
    expect(location.searchParams.get("auth_type")).toBe("reprompt");
    expect(location.searchParams.get("scope")).toBe("name email mobile");
  });

  test("로그인하지 않았으면 401", async () => {
    const response = await callStart("kakao", "?mode=phone-consent", { token: "" });
    expect(response.status).toBe(401);
    expect((await response.json()).code).toBe("UNAUTHORIZED");
  });

  // 🔴 승인 게이트는 하나다 — scope 가 꺼져 있으면 이 경로도 닫혀 있어야 한다.
  // 열어 두면 사용자가 KOE205 로 죽는 카카오 창을 보게 된다.
  test("scope 가 꺼진 공급자는 400 phone_scope_disabled", async () => {
    const response = await authRoutes.__authTestUtils.handleOAuthStart(
      startRequest("kakao", "?mode=phone-consent"),
      { ...BASE_ENV, SOCIAL_PHONE_SCOPE_PROVIDERS: "" },
      "kakao",
    );
    expect(response.status).toBe(400);
    expect((await response.json()).code).toBe("phone_scope_disabled");
  });

  test("구글은 어떤 설정에서도 400 phone_scope_unsupported", async () => {
    const response = await authRoutes.__authTestUtils.handleOAuthStart(
      startRequest("google", "?mode=phone-consent"),
      { ...BASE_ENV, SOCIAL_PHONE_SCOPE_PROVIDERS: "google,kakao,naver" },
      "google",
    );
    expect(response.status).toBe(400);
    expect((await response.json()).code).toBe("phone_scope_unsupported");
  });
});

describe("추가 동의 콜백", () => {
  const CALLBACK_ORIGIN = "https://code-destiny.com";

  /** start 가 발급한 state 를 그대로 받아 콜백 요청을 만든다(서명 검증을 우회하지 않는다). */
  async function stateFromStart(provider = "kakao") {
    const response = await callStart(provider, "?mode=phone-consent");
    return new URL(response.headers.get("location")).searchParams.get("state");
  }

  async function callCallback(state, { code = "auth-code-1", provider = "kakao" } = {}) {
    const request = new Request(
      `${CALLBACK_ORIGIN}/api/auth/oauth/${provider}/callback?code=${code}&state=${encodeURIComponent(state)}`,
    );
    return authRoutes.__authTestUtils.handleOAuthCallback(request, BASE_ENV, provider);
  }

  function stubProvider({ providerId = KAKAO_ID, phone = "+82 10-5555-6666" } = {}) {
    global.fetch = jest.fn(async (url) => {
      const target = String(url?.url || url);
      if (target.includes("kauth.kakao.com/oauth/token")) {
        return new Response(JSON.stringify({ access_token: "provider-access-token" }), {
          status: 200, headers: { "content-type": "application/json" },
        });
      }
      if (target.includes("kapi.kakao.com/v2/user/me")) {
        return new Response(JSON.stringify({
          id: providerId,
          kakao_account: { email: "tester@example.com", phone_number: phone, profile: { nickname: "tester" } },
        }), { status: 200, headers: { "content-type": "application/json" } });
      }
      throw new Error(`unexpected fetch: ${target}`);
    });
  }

  test("동의하면 번호가 암호문으로 저장되고 동의 기록이 같은 쓰기에 담긴다", async () => {
    const state = await stateFromStart();
    stubProvider();

    const response = await callCallback(state);
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/html");

    const html = await response.text();
    expect(html).toContain("cd-phone-consent");
    // 🔴 번호를 페이지에 싣지 않는다 — 부모 창은 /api/me/payment-phone 로 다시 묻는다.
    expect(html).not.toContain(PROVIDER_PHONE);

    expect(mockCollectionFindOneAndUpdate).toHaveBeenCalledTimes(1);
    const [, update] = mockCollectionFindOneAndUpdate.mock.calls[0];
    expect(update.$set.phoneNumber).toBe(`${ENCRYPTED_PREFIX}enc(${PROVIDER_PHONE})`);
    expect(update.$set.phoneNumber).not.toBe(PROVIDER_PHONE);
    expect(update.$set.phoneSource).toBe("social");
    expect(update.$set["legalConsents.phoneAcceptedAt"]).toBeInstanceOf(Date);
  });

  // 🔴 이게 없으면 남의 카카오 계정으로 로그인해 내 계정에 그 번호를 붙일 수 있다.
  test("providerId 가 연결된 소셜 id 와 다르면 저장하지 않는다", async () => {
    const state = await stateFromStart();
    stubProvider({ providerId: "kakao-someone-else" });

    const response = await callCallback(state);
    expect(response.status).toBe(200);
    expect(await response.text()).toContain("account_mismatch");
    expect(mockCollectionFindOneAndUpdate).not.toHaveBeenCalled();
  });

  test("계정에 그 소셜이 연결돼 있지 않아도 저장하지 않는다", async () => {
    const state = await stateFromStart();
    mockUserFindById.mockReturnValue(findByIdChain({ _id: USER_ID, socialAccounts: {} }));
    stubProvider();

    expect(await (await callCallback(state)).text()).toContain("account_mismatch");
    expect(mockCollectionFindOneAndUpdate).not.toHaveBeenCalled();
  });

  test("항목만 거부해 번호가 안 오면 조용히 실패한다", async () => {
    const state = await stateFromStart();
    stubProvider({ phone: "" });

    const html = await (await callCallback(state)).text();
    expect(html).toContain("declined");
    expect(mockCollectionFindOneAndUpdate).not.toHaveBeenCalled();
  });

  test("이미 번호가 있으면 덮어쓰지 않는다", async () => {
    const state = await stateFromStart();
    mockUserFindById
      .mockReturnValueOnce(findByIdChain({ _id: USER_ID, socialAccounts: { kakao: { id: KAKAO_ID } } }))
      .mockReturnValue(findByIdChain({ _id: USER_ID, phoneNumber: `${ENCRYPTED_PREFIX}enc(01011112222)` }));
    stubProvider();

    const html = await (await callCallback(state)).text();
    expect(html).toContain("already_set");
    expect(mockCollectionFindOneAndUpdate).not.toHaveBeenCalled();
  });

  // 콜백은 세션 발급 경로가 아니다 — 쿠키를 새로 굽지 않는다.
  test("세션 쿠키를 발급하지 않는다", async () => {
    const state = await stateFromStart();
    stubProvider();

    const response = await callCallback(state);
    expect(response.headers.get("set-cookie")).toBeNull();
  });
});
