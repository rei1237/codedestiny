/**
 * @jest-environment node
 *
 * 만 14세 미만 가입 정책 회귀 테스트 — 네트워크·DB 접근 없음.
 *
 * 정책: 개인정보보호법 제22조의2에 따라 만 14세 미만은 "가입 불가"가 아니라
 * 법정대리인(보호자) 동의 대상이다. 동의 전까지 계정은 사용할 수 없고,
 * 동의 후에도 만 14세 미만 계정은 유료 결제를 이용할 수 없다(민법 제5조 취소권 회피).
 */

let validateBirthDateWithAge;
let validateRegisterPayload;
let MIN_SELF_CONSENT_AGE;
let createGuardianConsentToken;
let verifyGuardianConsentToken;
let buildGuardianConsentRequestPage;
let GUARDIAN_CONSENT_TTL_MS;

const ENV = { JWT_SECRET: "guardian-consent-test-secret" };

function baseSignupPayload(overrides = {}) {
  return {
    name: "테스트",
    email: "kid@example.com",
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

  const guardian = await import("../../worker/lib/guardian-consent.js");
  createGuardianConsentToken = guardian.createGuardianConsentToken;
  verifyGuardianConsentToken = guardian.verifyGuardianConsentToken;
  buildGuardianConsentRequestPage = guardian.buildGuardianConsentRequestPage;
  GUARDIAN_CONSENT_TTL_MS = guardian.GUARDIAN_CONSENT_TTL_MS;
});

describe("만 나이 판정", () => {
  test("만 14세 미만은 오류가 아니라 보호자 동의 대상이어야 한다", () => {
    const result = validateBirthDateWithAge("2020-01-01");

    expect(result.isValid).toBe(true);
    expect(result.requiresGuardianConsent).toBe(true);
    expect(result.error).toBeNull();
  });

  test("만 14세 이상은 보호자 동의 없이 통과해야 한다", () => {
    const result = validateBirthDateWithAge("1990-01-01");

    expect(result.isValid).toBe(true);
    expect(result.requiresGuardianConsent).toBe(false);
  });

  test("생일 경계는 KST 기준으로 갈려야 한다", () => {
    const now = new Date("2026-07-29T00:00:00Z");

    expect(validateBirthDateWithAge("2012-07-29", now).requiresGuardianConsent).toBe(false);
    expect(validateBirthDateWithAge("2012-07-30", now).requiresGuardianConsent).toBe(true);
  });

  test("잘못된 생년월일은 여전히 거부돼야 한다", () => {
    expect(validateBirthDateWithAge("1990-02-30").isValid).toBe(false);
    expect(validateBirthDateWithAge("2999-01-01").isValid).toBe(false);
    expect(validateBirthDateWithAge("").isValid).toBe(false);
  });
});

describe("가입 페이로드 검증", () => {
  test("만 14세 미만인데 보호자 이메일이 없으면 거부돼야 한다", () => {
    const result = validateRegisterPayload(baseSignupPayload({ birthDate: "2020-01-01" }));

    expect(result.isValid).toBe(false);
    expect(result.requiresGuardianConsent).toBe(true);
    expect(result.errors.some((message) => message.includes("Guardian"))).toBe(true);
  });

  test("보호자 이메일이 있으면 통과하고 소문자로 정규화돼야 한다", () => {
    const result = validateRegisterPayload(baseSignupPayload({
      birthDate: "2020-01-01",
      guardianEmail: "Parent@Example.COM",
    }));

    expect(result.isValid).toBe(true);
    expect(result.requiresGuardianConsent).toBe(true);
    expect(result.sanitized.guardianEmail).toBe("parent@example.com");
  });

  test("만 14세 이상에게는 보호자 이메일을 요구하지 않아야 한다", () => {
    const result = validateRegisterPayload(baseSignupPayload({ birthDate: "1990-01-01" }));

    expect(result.isValid).toBe(true);
    expect(result.requiresGuardianConsent).toBe(false);
  });
});

describe("보호자 동의 토큰", () => {
  const userId = "64b7f9c2e1a2b3c4d5e6f708";

  test("발급한 토큰은 같은 시크릿으로 검증돼야 한다", () => {
    const token = createGuardianConsentToken(ENV, { userId, guardianEmail: "parent@example.com" });
    const verified = verifyGuardianConsentToken(ENV, token);

    expect(verified.ok).toBe(true);
    expect(verified.payload.uid).toBe(userId);
    expect(verified.payload.gem).toBe("parent@example.com");
  });

  test("서명 변조·다른 시크릿·형식 오류는 거부돼야 한다", () => {
    const token = createGuardianConsentToken(ENV, { userId, guardianEmail: "parent@example.com" });

    expect(verifyGuardianConsentToken(ENV, `${token}x`).ok).toBe(false);
    expect(verifyGuardianConsentToken({ JWT_SECRET: "another-secret" }, token).ok).toBe(false);
    expect(verifyGuardianConsentToken(ENV, "garbage").ok).toBe(false);
    expect(verifyGuardianConsentToken({}, token).ok).toBe(false);
  });

  test("만료된 토큰은 expired 로 거부돼야 한다", () => {
    const token = createGuardianConsentToken(ENV, {
      userId,
      guardianEmail: "parent@example.com",
      issuedAt: Date.now() - GUARDIAN_CONSENT_TTL_MS - 1000,
    });

    expect(verifyGuardianConsentToken(ENV, token).code).toBe("expired");
  });
});

describe("보호자 동의 페이지", () => {
  test("아동 이름은 HTML 이스케이프돼야 한다", () => {
    const page = buildGuardianConsentRequestPage({
      token: "t",
      childName: "<script>alert(1)</script>",
      childEmail: "kid@example.com",
      birthDate: "2020-01-01",
      actionUrl: "https://code-destiny.com/api/auth/guardian-consent",
    });

    expect(page).not.toContain("<script>alert(1)</script>");
    expect(page).toContain("&lt;script&gt;");
  });

  test("동의·거부 버튼과 결제 제한 안내가 모두 있어야 한다", () => {
    const page = buildGuardianConsentRequestPage({
      token: "t",
      childName: "아이",
      childEmail: "kid@example.com",
      birthDate: "2020-01-01",
      actionUrl: "https://code-destiny.com/api/auth/guardian-consent",
    });

    expect(page).toContain('name="action" value="approve"');
    expect(page).toContain('name="action" value="reject"');
    expect(page).toContain(`만 ${MIN_SELF_CONSENT_AGE}세 미만 계정은`);
  });
});
