/**
 * @jest-environment node
 *
 * 만 14세 미만 회원가입 차단 회귀 테스트 — 네트워크·DB 접근 없음.
 *
 * 정책: 대한민국 관련 법령에 따라 만 14세 미만은 회원가입·서비스 이용 불가.
 * 이메일 가입과 소셜 가입이 같은 기준을 쓴다 — 소셜은 콜백에서 계정을 만들지 않고
 * 가입 마무리 단계에서 생년월일을 받아 판정한다.
 */

let validateBirthDateWithAge;
let validateRegisterPayload;
let MIN_SELF_CONSENT_AGE;
let signSocialSignupTicket;
let verifySocialSignupTicket;
let socialProfileFromSignupTicket;
let buildSocialSignupRedirectUrl;

const TICKET_SECRET = "social-signup-ticket-secret";
const TICKET_ISSUER = "code-destiny";

function baseSignupPayload(overrides = {}) {
  return {
    name: "테스트",
    email: "user@example.com",
    password: "password123",
    birthTime: "09:00",
    gender: "M",
    ...overrides,
  };
}

beforeAll(async () => {
  const validation = await import("../../worker/lib/validation.js");
  validateBirthDateWithAge = validation.validateBirthDateWithAge;
  validateRegisterPayload = validation.validateRegisterPayload;
  MIN_SELF_CONSENT_AGE = validation.MIN_SELF_CONSENT_AGE;

  const ticketMod = await import("../../worker/lib/social-signup-ticket.js");
  signSocialSignupTicket = ticketMod.signSocialSignupTicket;
  verifySocialSignupTicket = ticketMod.verifySocialSignupTicket;
  socialProfileFromSignupTicket = ticketMod.socialProfileFromSignupTicket;
  buildSocialSignupRedirectUrl = ticketMod.buildSocialSignupRedirectUrl;
});

describe("만 나이 판정", () => {
  test("정책 기준 나이는 14세여야 한다", () => {
    // scripts/verify-adsense-readiness.mjs 가 이 상수로 개인정보 페이지의 고지 마커를 검사한다.
    expect(MIN_SELF_CONSENT_AGE).toBe(14);
  });

  test("만 14세 미만은 가입 불가로 판정돼야 한다", () => {
    const result = validateBirthDateWithAge("2020-01-01");

    expect(result.isValid).toBe(false);
    expect(result.age).toBeGreaterThanOrEqual(0);
    expect(result.age).toBeLessThan(MIN_SELF_CONSENT_AGE);
    expect(result.error).toContain("만 14세 미만");
  });

  test("만 14세 이상은 통과해야 한다", () => {
    const result = validateBirthDateWithAge("1990-01-01");

    expect(result.isValid).toBe(true);
    expect(result.error).toBeNull();
  });

  test("생일 경계는 KST 기준으로 갈려야 한다", () => {
    const now = new Date("2026-07-29T00:00:00Z");

    expect(validateBirthDateWithAge("2012-07-29", now).isValid).toBe(true);
    expect(validateBirthDateWithAge("2012-07-30", now).isValid).toBe(false);
  });

  test("잘못된 생년월일은 거부돼야 한다", () => {
    expect(validateBirthDateWithAge("1990-02-30").isValid).toBe(false);
    expect(validateBirthDateWithAge("2999-01-01").isValid).toBe(false);
    expect(validateBirthDateWithAge("").isValid).toBe(false);
  });
});

describe("가입 페이로드 검증", () => {
  test("만 14세 미만 페이로드는 거부돼야 한다", () => {
    const result = validateRegisterPayload(baseSignupPayload({ birthDate: "2020-01-01" }));

    expect(result.isValid).toBe(false);
    expect(result.errors.some((message) => message.includes("만 14세 미만"))).toBe(true);
  });

  test("만 14세 이상 페이로드는 통과해야 한다", () => {
    const result = validateRegisterPayload(baseSignupPayload({ birthDate: "1990-01-01" }));

    expect(result.isValid).toBe(true);
    expect(result.sanitized.birthDate).toBe("1990-01-01");
  });

  test("보호자 이메일은 더 이상 수집·요구하지 않는다", () => {
    const result = validateRegisterPayload(baseSignupPayload({
      birthDate: "1990-01-01",
      guardianEmail: "parent@example.com",
    }));

    expect(result.isValid).toBe(true);
    expect(result.sanitized.guardianEmail).toBeUndefined();
  });
});

describe("소셜 가입 티켓", () => {
  const profile = {
    provider: "google",
    providerId: "1234567890",
    email: "user@example.com",
    name: "테스트",
    image: "https://example.com/a.png",
    phoneNumber: "01012345678",
    emailVerified: false,
    nextPath: "/saju",
    flow: "signup",
    appRedirect: "com.codedestiny.app://auth",
  };

  test("발급한 티켓은 같은 시크릿으로 검증되고 필드가 보존돼야 한다", async () => {
    const ticket = await signSocialSignupTicket(profile, TICKET_SECRET, TICKET_ISSUER);
    const verified = await verifySocialSignupTicket(ticket, TICKET_SECRET, TICKET_ISSUER);

    expect(verified.provider).toBe("google");
    expect(verified.providerId).toBe("1234567890");
    expect(verified.appRedirect).toBe("com.codedestiny.app://auth");
    expect(verified.nextPath).toBe("/saju");
  });

  test("다른 시크릿·변조·형식 오류 티켓은 거부돼야 한다", async () => {
    const ticket = await signSocialSignupTicket(profile, TICKET_SECRET, TICKET_ISSUER);

    await expect(verifySocialSignupTicket(ticket, "another-secret", TICKET_ISSUER)).rejects.toThrow();
    await expect(verifySocialSignupTicket(`${ticket}x`, TICKET_SECRET, TICKET_ISSUER)).rejects.toThrow();
    await expect(verifySocialSignupTicket("garbage", TICKET_SECRET, TICKET_ISSUER)).rejects.toThrow();
  });

  test("providerId 가 없는 티켓은 거부돼야 한다", async () => {
    const ticket = await signSocialSignupTicket({ ...profile, providerId: "" }, TICKET_SECRET, TICKET_ISSUER);

    await expect(verifySocialSignupTicket(ticket, TICKET_SECRET, TICKET_ISSUER)).rejects.toThrow("invalid_social_signup_ticket");
  });

  test("티켓에서 복원한 프로필은 emailVerified=false 를 보존해야 한다", async () => {
    // 이 값이 뒤집히면 미인증 이메일이 기존 계정에 연결돼 계정 탈취 경로가 된다.
    const ticket = await signSocialSignupTicket(profile, TICKET_SECRET, TICKET_ISSUER);
    const verified = await verifySocialSignupTicket(ticket, TICKET_SECRET, TICKET_ISSUER);

    expect(socialProfileFromSignupTicket(verified).emailVerified).toBe(false);
    expect(socialProfileFromSignupTicket({ ...verified, emailVerified: true }).emailVerified).toBe(true);
    expect(socialProfileFromSignupTicket({ providerId: "x" }).emailVerified).toBe(true);
  });

  test("가입 마무리 URL 은 /signup 으로 티켓과 next 를 넘겨야 한다", () => {
    const url = buildSocialSignupRedirectUrl("https://code-destiny.com/", "TICKET", { nextPath: "/saju", flow: "signup" });

    expect(url.startsWith("https://code-destiny.com/signup?")).toBe(true);
    expect(url).toContain("social_signup=TICKET");
    expect(url).toContain("next=%2Fsaju");

    const rootUrl = buildSocialSignupRedirectUrl("https://code-destiny.com", "TICKET", { nextPath: "/", flow: "signup" });
    expect(rootUrl).not.toContain("next=");
  });
});
