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
    ageAttested: true,
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
  test("requires a 14+ attestation", () => {
    const result = validateRegisterPayload(baseSignupPayload({ ageAttested: false }));
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain("Age 14 or older attestation is required.");
  });

  test("requires terms and privacy consent", () => {
    expect(validateRegisterPayload(baseSignupPayload({ termsAccepted: false })).isValid).toBe(false);
    expect(validateRegisterPayload(baseSignupPayload({ privacyAccepted: false })).isValid).toBe(false);
  });

  test("does not require fortune profile fields at account creation", () => {
    const result = validateRegisterPayload(baseSignupPayload());
    expect(result.isValid).toBe(true);
    expect(result.sanitized.ageAttested).toBe(true);
    expect(result.sanitized.birthDate).toBeUndefined();
    expect(result.sanitized.gender).toBeUndefined();
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
