/**
 * @jest-environment node
 *
 * 소셜 로그인 OAuth scope 에 전화번호 동의항목을 붙일지 말지를 고정한다.
 *
 * 🔴 이 스위치가 존재하는 이유: 카카오는 앱에 등록·승인되지 않은 scope 를 요청하면 authorize
 * 단계에서 KOE205 로 거절한다. 즉 phone_number 를 코드에 박아 두면 검수 승인이 날 때까지
 * **카카오 로그인이 전면 중단**된다. 그래서 요청 여부만 env 로 뺐고, 여기서 두 가지를 고정한다.
 *   1) 기본값(env 미설정)은 **요청하지 않음** — 잘못 배포해도 로그인이 죽지 않는다.
 *   2) 켰을 때는 정확히 그 공급자에게만, 정확한 scope 문자열이 붙는다.
 */

jest.unstable_mockModule("../../worker/lib/db.js", () => ({
  connectDb: jest.fn(async () => undefined),
  mongoose: { connection: { name: "test" }, Types: { ObjectId: class {} } },
  resetMongooseConnection: jest.fn(async () => undefined),
  requestPoolRecovery: jest.fn(async () => undefined),
  resolveMongoDbName: jest.fn(() => "test"),
  withMongoRetry: jest.fn(async (env, fn) => fn()),
  isTransientMongoError: jest.fn(() => false),
}));

// ESM 명명 export 는 정적으로 해석되므로 Proxy 로 뭉뚱그릴 수 없다 — auth.js 가 import 하는 이름을
// 그대로 나열한다(auth.signup-phone-backfill.test.js 와 같은 목록).
jest.unstable_mockModule("../../worker/lib/models.js", () => ({
  AbuseScore: {}, RefreshTokenSession: {}, User: {}, PointHistory: {}, MonthlyCreditLedger: {},
  ProfileCard: {}, Payment: {}, Insight: {}, ContentOverride: {}, DailyFortuneSubscription: {},
  DestinyBiasCard: {}, KarmaDestinyAiConsultation: {}, LifeBookAiConsultation: {}, LlmResponseCache: {},
  LoveSecretAiConsultation: {}, NewYearAiConsultation: {}, PaidExecutionRecord: {},
  ServiceExecutionTransaction: {}, SukuyoCompatibilityAiConsultation: {}, ZiweiAiConsultation: {},
  CONTENT_ENTITLEMENT_SOURCES: {}, CONTENT_ENTITLEMENT_STATUSES: {}, RECENT_CONSUME_REQUEST_ID_CAP: 200,
}));

const BASE_ENV = {
  JWT_ACCESS_SECRET: "test-access-secret",
  AUTH_SECRET: "test-auth-secret",
  GOOGLE_OAUTH_CLIENT_ID: "g", GOOGLE_OAUTH_CLIENT_SECRET: "gs",
  NAVER_OAUTH_CLIENT_ID: "n", NAVER_OAUTH_CLIENT_SECRET: "ns",
  KAKAO_OAUTH_CLIENT_ID: "k", KAKAO_OAUTH_CLIENT_SECRET: "ks",
  AUTH_FRONTEND_BASE_URL: "https://code-destiny.com",
};

const request = new Request("https://code-destiny.com/api/auth/oauth/kakao/start");

let buildProviderConfig;

beforeAll(async () => {
  ({ buildProviderConfig } = (await import("../../worker/routes/auth.js")).__authTestUtils);
});

const scopeFor = (provider, env) => buildProviderConfig(provider, request, { ...BASE_ENV, ...env }).scope;

describe("전화번호 scope 스위치", () => {
  test("기본값은 요청하지 않는다 — 미승인 앱에서도 로그인이 살아 있어야 한다", () => {
    expect(scopeFor("kakao", {})).toBe("profile_nickname account_email");
    expect(scopeFor("naver", {})).toBe("name email");
    expect(scopeFor("google", {})).toBe("openid email profile");
  });

  test("빈 문자열·공백만 들어와도 요청하지 않는다", () => {
    for (const value of ["", "   ", ",", " , ,"]) {
      expect(scopeFor("kakao", { SOCIAL_PHONE_SCOPE_PROVIDERS: value })).toBe("profile_nickname account_email");
    }
  });

  test("공급자별로 따로 켤 수 있다 — 승인이 동시에 나지 않는다", () => {
    const kakaoOnly = { SOCIAL_PHONE_SCOPE_PROVIDERS: "kakao" };
    expect(scopeFor("kakao", kakaoOnly)).toBe("profile_nickname account_email phone_number");
    expect(scopeFor("naver", kakaoOnly)).toBe("name email");

    const naverOnly = { SOCIAL_PHONE_SCOPE_PROVIDERS: "naver" };
    expect(scopeFor("kakao", naverOnly)).toBe("profile_nickname account_email");
    expect(scopeFor("naver", naverOnly)).toBe("name email mobile");
  });

  test("둘 다 켜면 둘 다 붙는다 (공백·대문자 허용)", () => {
    const both = { SOCIAL_PHONE_SCOPE_PROVIDERS: " Kakao , NAVER " };
    expect(scopeFor("kakao", both)).toBe("profile_nickname account_email phone_number");
    expect(scopeFor("naver", both)).toBe("name email mobile");
  });

  test("구글은 어떤 값을 넣어도 scope 가 그대로다 — People API·추가 scope 를 붙이지 않는다", () => {
    for (const value of ["kakao,naver", "google", "google,kakao,naver"]) {
      expect(scopeFor("google", { SOCIAL_PHONE_SCOPE_PROVIDERS: value })).toBe("openid email profile");
    }
  });
});
