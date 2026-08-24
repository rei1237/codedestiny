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
let resolveSocialAutoSignup;

beforeAll(async () => {
  ({ buildProviderConfig, resolveSocialAutoSignup } = (await import("../../worker/routes/auth.js")).__authTestUtils);
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

  test("구글은 전화번호 스위치에 반응하지 않는다 — 구글은 번호를 주지 않는다", () => {
    for (const value of ["kakao,naver", "google", "google,kakao,naver"]) {
      expect(scopeFor("google", { SOCIAL_PHONE_SCOPE_PROVIDERS: value })).toBe("openid email profile");
    }
  });
});

/**
 * 출생연도 스위치. 전화번호와 **같은 이유로** 따로 켠다 — 제공 항목/검증이 공급자마다 따로 나고,
 * 승인 전에 요청하면 그 공급자 로그인이 통째로 죽는다(2026-08-25 카카오 KOE205).
 */
describe("출생연도 scope 스위치", () => {
  test("기본값은 요청하지 않는다", () => {
    expect(scopeFor("naver", {})).toBe("name email");
    expect(scopeFor("google", {})).toBe("openid email profile");
  });

  test("네이버만 켜면 birthyear 만 붙는다", () => {
    const naverOnly = { SOCIAL_BIRTHYEAR_SCOPE_PROVIDERS: "naver" };
    expect(scopeFor("naver", naverOnly)).toBe("name email birthyear");
    expect(scopeFor("google", naverOnly)).toBe("openid email profile");
    expect(scopeFor("kakao", naverOnly)).toBe("profile_nickname account_email");
  });

  // 🔴 구글 생일은 **민감 범위**라 앱 검증 전에는 켜면 안 된다. 그래도 켤 수 있어야 하므로
  // 스위치는 존재하고, 이 단언은 "켰을 때 정확히 그 scope 하나만 붙는다"를 고정한다.
  test("구글을 켜면 People API 생일 범위가 붙는다", () => {
    const googleOnly = { SOCIAL_BIRTHYEAR_SCOPE_PROVIDERS: "google" };
    expect(scopeFor("google", googleOnly)).toBe("openid email profile https://www.googleapis.com/auth/user.birthday.read");
    expect(scopeFor("naver", googleOnly)).toBe("name email");
  });

  test("전화번호와 출생연도는 서로 독립이다", () => {
    const both = { SOCIAL_PHONE_SCOPE_PROVIDERS: "naver", SOCIAL_BIRTHYEAR_SCOPE_PROVIDERS: "naver" };
    // 순서까지 고정한다 — 문자열 조립 순서가 바뀌면 공급자 쪽 동의 화면 항목 순서가 흔들린다.
    expect(scopeFor("naver", both)).toBe("name email birthyear mobile");
  });
});

/**
 * 🔴 소셜 가입이 **화면 없이** 끝나는 조건(2026-08-25).
 *
 * 카카오·네이버는 인증 후 우리 화면을 띄우지 않고 콜백에서 바로 계정을 만든다. 그 판정이 여기다.
 * 이 스위트가 지키는 것 중 가장 중요한 것은 **미성년을 자동으로 가입시키지 않는 것**이다 —
 * canAutoCreate 가 잘못 true 가 되면 네이버가 알려 준 나이를 우리가 스스로 버리는 셈이 된다.
 */
describe("소셜 자동 가입 판정", () => {
  test("카카오는 로그인 폼이 연령을 확인하므로 바로 만든다", () => {
    const verdict = resolveSocialAutoSignup("kakao", { birthYear: "" });
    expect(verdict.canAutoCreate).toBe(true);
    expect(verdict.underage).toBe(false);
  });

  test("네이버는 출생연도를 받았고 만 14세 이상일 때만 만든다", () => {
    expect(resolveSocialAutoSignup("naver", { birthYear: "1990" }).canAutoCreate).toBe(true);
    // 값을 못 받았으면(제공 항목 미설정 등) 화면으로 보낸다 — 추측해서 만들지 않는다.
    expect(resolveSocialAutoSignup("naver", { birthYear: "" }).canAutoCreate).toBe(false);
  });

  // 🔴 이 스위트에서 가장 중요한 단언이다.
  test("공급자가 알려 준 나이가 만 14세 미만이면 만들지 않고 미성년으로 표시한다", () => {
    const verdict = resolveSocialAutoSignup("naver", { birthYear: "2020" });
    expect(verdict.underage).toBe(true);
    expect(verdict.canAutoCreate).toBe(false);
  });

  // 카카오라도 공급자 값이 미성년이면 면제가 이기지 못한다.
  test("카카오여도 출생연도가 미성년이면 면제가 이기지 못한다", () => {
    const verdict = resolveSocialAutoSignup("kakao", { birthYear: "2020" });
    expect(verdict.underage).toBe(true);
    expect(verdict.canAutoCreate).toBe(false);
  });

  test("구글은 연령을 알 수 없으므로 화면으로 보낸다", () => {
    const verdict = resolveSocialAutoSignup("google", { birthYear: "" });
    expect(verdict.canAutoCreate).toBe(false);
    expect(verdict.underage).toBe(false);
  });
});
