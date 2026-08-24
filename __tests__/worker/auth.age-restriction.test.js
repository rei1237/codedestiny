/** @jest-environment node */

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
    // 2026-08-19 정책: 가입 페이로드에 휴대폰 번호가 없으면 검증을 통과하지 못한다.
    phoneNumber: "010-1234-5678",
    birthYear: "1990",
    termsAccepted: true,
    privacyAccepted: true,
    ...overrides,
  };
}

beforeAll(async () => {
  const validation = await import("../../worker/lib/validation.js");
  validateBirthDateWithAge = validation.validateBirthDateWithAge;
  validateRegisterPayload = validation.validateRegisterPayload;
  MIN_SELF_CONSENT_AGE = validation.MIN_SELF_CONSENT_AGE;
  const tickets = await import("../../worker/lib/social-signup-ticket.js");
  signSocialSignupTicket = tickets.signSocialSignupTicket;
  verifySocialSignupTicket = tickets.verifySocialSignupTicket;
  socialProfileFromSignupTicket = tickets.socialProfileFromSignupTicket;
  buildSocialSignupRedirectUrl = tickets.buildSocialSignupRedirectUrl;
});

describe("age policy helpers", () => {
  test("keeps the Korean self-consent threshold at 14", () => {
    expect(MIN_SELF_CONSENT_AGE).toBe(14);
  });

  test("keeps birth-date validation for profile and legacy consumers", () => {
    expect(validateBirthDateWithAge("2020-01-01").isValid).toBe(false);
    expect(validateBirthDateWithAge("1990-01-01").isValid).toBe(true);
    expect(validateBirthDateWithAge("1990-02-30").isValid).toBe(false);
  });

  test("uses KST for the exact fourteenth birthday", () => {
    const now = new Date("2026-07-29T00:00:00Z");
    expect(validateBirthDateWithAge("2012-07-29", now).isValid).toBe(true);
    expect(validateBirthDateWithAge("2012-07-30", now).isValid).toBe(false);
  });
});

describe("minimal signup validation", () => {
  // 🔴 2026-08-25: 체크박스(ageAttested) 대신 **생년**으로 판정한다. 체크박스는 눌러서 지나가는
  // 것이라 만 14세 미만을 실제로 걸러내지 못했다. 아래 두 단언이 그 전환을 고정한다.
  test("만 14세 미만 생년은 거절한다", () => {
    const underage = validateRegisterPayload(baseSignupPayload({ birthYear: "2020" }));
    expect(underage.isValid).toBe(false);
    expect(underage.isUnderage).toBe(true);
    expect(underage.errors.join(" ")).toContain(`만 ${MIN_SELF_CONSENT_AGE}세 미만`);
  });

  test("생년이 없거나 형식이 틀리면 거절하되 미성년으로 분류하지 않는다", () => {
    for (const birthYear of [undefined, "", "20", "abcd"]) {
      const result = validateRegisterPayload(baseSignupPayload({ birthYear }));
      expect(result.isValid).toBe(false);
      // 화면이 "다시 입력"과 "가입 불가"를 다르게 말할 수 있어야 한다.
      expect(result.isUnderage).toBe(false);
    }
  });

  test("requires terms and privacy consent", () => {
    expect(validateRegisterPayload(baseSignupPayload({ termsAccepted: false })).isValid).toBe(false);
    expect(validateRegisterPayload(baseSignupPayload({ privacyAccepted: false })).isValid).toBe(false);
  });

  test("does not require fortune profile fields at account creation", () => {
    const result = validateRegisterPayload(baseSignupPayload());
    expect(result.isValid).toBe(true);
    // 생년을 실제로 받아 통과했다는 사실이 곧 만 14세 이상 확인이다(제22조 입증 기록).
    expect(result.sanitized.ageAttested).toBe(true);
    expect(result.sanitized.birthYear).toBe(1990);
    expect(result.sanitized.birthDate).toBeUndefined();
    expect(result.sanitized.gender).toBeUndefined();
  });

  // 🔴 번호는 생년월일과 달리 가입 시점에 필수다(카카오 개인정보 동의항목 심사 대응).
  // 프론트를 우회해도 막히는지가 이 단언의 요점이다.
  test("requires a Korean mobile number", () => {
    for (const value of [undefined, "", "   ", "02-123-4567", "0101234", "abcd"]) {
      const result = validateRegisterPayload(baseSignupPayload({ phoneNumber: value }));
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Phone number is invalid.");
    }
  });

  test("normalizes the stored number the same way the server does", () => {
    expect(validateRegisterPayload(baseSignupPayload({ phoneNumber: "+82 10-1234-5678" })).sanitized.phoneNumber)
      .toBe("01012345678");
    // 구버전 앱은 phone 키로 보낸다.
    const legacy = validateRegisterPayload({ ...baseSignupPayload(), phoneNumber: undefined, phone: "010 1234 5678" });
    expect(legacy.isValid).toBe(true);
    expect(legacy.sanitized.phoneNumber).toBe("01012345678");
  });
});

describe("social signup ticket", () => {
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

  test("is signed, verified, and tamper resistant", async () => {
    const ticket = await signSocialSignupTicket(profile, TICKET_SECRET, TICKET_ISSUER);
    const verified = await verifySocialSignupTicket(ticket, TICKET_SECRET, TICKET_ISSUER);
    expect(verified.providerId).toBe(profile.providerId);
    await expect(verifySocialSignupTicket(`${ticket}x`, TICKET_SECRET, TICKET_ISSUER)).rejects.toThrow();
  });

  test("preserves verified, unverified, and unknown email states", async () => {
    const ticket = await signSocialSignupTicket(profile, TICKET_SECRET, TICKET_ISSUER);
    const verified = await verifySocialSignupTicket(ticket, TICKET_SECRET, TICKET_ISSUER);
    expect(socialProfileFromSignupTicket(verified).emailVerified).toBe(false);
    expect(socialProfileFromSignupTicket({ ...verified, emailVerified: true }).emailVerified).toBe(true);
    expect(socialProfileFromSignupTicket({ providerId: "x" }).emailVerified).toBeNull();
  });

  test("rejects missing provider identity and builds an internal completion URL", async () => {
    const invalid = await signSocialSignupTicket({ ...profile, providerId: "" }, TICKET_SECRET, TICKET_ISSUER);
    await expect(verifySocialSignupTicket(invalid, TICKET_SECRET, TICKET_ISSUER)).rejects.toThrow("invalid_social_signup_ticket");
    const url = buildSocialSignupRedirectUrl("https://code-destiny.com/", "TICKET", { nextPath: "/saju", flow: "signup" });
    expect(url).toContain("/signup?");
    expect(url).toContain("next=%2Fsaju");
  });
});
