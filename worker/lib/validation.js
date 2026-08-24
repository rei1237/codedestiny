// 번호 정규화는 저장 경로(worker/lib/pii-crypto.js)와 **같은 규칙**이어야 한다 —
// 여기서 통과시킨 표기를 저장 쪽이 다시 ""로 접으면 검증을 지난 요청이 조용히 번호 없이 저장된다.
import { normalizeKoreanPhoneNumber } from "./pii-crypto.js";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const birthDateRegex = /^\d{4}-\d{2}-\d{2}$/;
const birthTimeRegex = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

// 만 14세 미만은 회원가입·서비스 이용 불가(대한민국 관련 법령).
// 🔴 이 상수는 scripts/verify-adsense-readiness.mjs 가 개인정보 페이지의 "만 14세" 고지 마커를
// 파생시키는 데도 쓴다 — 이름을 바꾸거나 지우면 배포 게이트가 깨진다.
export const MIN_SELF_CONSENT_AGE = 14;

/**
 * 만 나이 계산 (대한민국 법적 기준)
 * 생일이 지났으면 만 나이 = 현재 연도 - 출생 연도
 * 생일이 지나지 않았으면 만 나이 = 현재 연도 - 출생 연도 - 1
 * @param {string} birthDateStr - YYYY-MM-DD 형식
 * @param {Date} [referenceDate] - 기준일 (기본값: 현재)
 * @returns {number} 만 나이
 */
export function calculateKoreanAge(birthDateStr, referenceDate) {
  if (!birthDateRegex.test(birthDateStr)) return -1;

  const [year, month, day] = birthDateStr.split("-").map(Number);
  const birthDate = new Date(Date.UTC(year, month - 1, day));

  // 유효한 날짜인지 확인 (윤년 등)
  if (
    birthDate.getUTCFullYear() !== year ||
    birthDate.getUTCMonth() !== month - 1 ||
    birthDate.getUTCDate() !== day
  ) {
    return -1;
  }

  const today = referenceDate || new Date();
  const todayYear = today.getUTCFullYear();
  const todayMonth = today.getUTCMonth() + 1;
  const todayDay = today.getUTCDate();

  let age = todayYear - year;

  // 생일이 아직 지나지 않았으면 1을 뺀다
  if (
    todayMonth < month ||
    (todayMonth === month && todayDay < day)
  ) {
    age -= 1;
  }

  return age;
}

/**
 * 생년월일 검증 및 만 나이 검증
 * @param {string} birthDateStr - YYYY-MM-DD 형식
 * @param {Date} [now] - 기준일 (기본값: 현재)
 * @returns {{ isValid: boolean, age: number, error: string|null }}
 */
export function validateBirthDateWithAge(birthDateStr, now = null) {
  if (!birthDateStr || typeof birthDateStr !== "string" || !birthDateStr.trim()) {
    return { isValid: false, age: -1, error: "올바른 생년월일을 입력해주세요." };
  }

  const trimmed = birthDateStr.trim();

  if (!birthDateRegex.test(trimmed)) {
    return { isValid: false, age: -1, error: "올바른 생년월일을 입력해주세요." };
  }

  const [year, month, day] = trimmed.split("-").map(Number);
  const birthDate = new Date(Date.UTC(year, month - 1, day));

  // 유효한 날짜인지 확인
  if (
    birthDate.getUTCFullYear() !== year ||
    birthDate.getUTCMonth() !== month - 1 ||
    birthDate.getUTCDate() !== day
  ) {
    return { isValid: false, age: -1, error: "올바른 생년월일을 입력해주세요." };
  }

  const referenceDate = now || new Date();
  const kstMs = referenceDate.getTime() + 9 * 60 * 60 * 1000;
  const kstDate = new Date(kstMs);

  const referenceUtc = new Date(Date.UTC(
    kstDate.getUTCFullYear(),
    kstDate.getUTCMonth(),
    kstDate.getUTCDate(),
  ));

  // 미래 날짜 체크
  if (birthDate.getTime() > referenceUtc.getTime()) {
    return { isValid: false, age: -1, error: "미래 날짜는 입력할 수 없습니다." };
  }

  // 만 나이 계산 (KST 기준)
  const todayYear = kstDate.getUTCFullYear();
  const todayMonth = kstDate.getUTCMonth() + 1;
  const todayDay = kstDate.getUTCDate();

  let age = todayYear - year;
  if (todayMonth < month || (todayMonth === month && todayDay < day)) {
    age -= 1;
  }

  // 만 14세 미만 차단
  if (age < MIN_SELF_CONSENT_AGE) {
    return { isValid: false, age, error: `만 ${MIN_SELF_CONSENT_AGE}세 미만은 대한민국 관련 법령에 따라 가입할 수 없습니다.` };
  }

  return { isValid: true, age, error: null };
}

// 🔴 신규 비밀번호(가입·변경)에만 적용되는 최소 길이다. 로그인 검증기(validateLoginPayload)의
// 8자는 절대 따라 올리지 말 것 — 올리는 순간 이미 8~9자를 쓰는 기존 회원이 전부 로그인 불가가 된다.
export const MIN_NEW_PASSWORD_LENGTH = 10;

/**
 * 신규 비밀번호 자체 검증(길이 + 계정 정보 재사용 금지). 유출 목록 대조는 네트워크가 필요해서
 * 여기 두지 않는다 — worker/lib/password-breach.js 의 checkPasswordBreached 가 담당한다.
 * 가입과 비밀번호 변경이 같은 기준을 쓰도록 두 라우트가 이 함수를 공유한다.
 */
export function validateNewPassword(password, { email = "", name = "" } = {}) {
  const errors = [];
  const value = String(password || "");
  const lowered = value.toLowerCase();

  if (value.length < MIN_NEW_PASSWORD_LENGTH) {
    errors.push(`Password must be at least ${MIN_NEW_PASSWORD_LENGTH} characters.`);
  }
  if (value.length > 200) errors.push("Password must be 200 characters or fewer.");

  const emailLocalPart = String(email || "").trim().toLowerCase().split("@")[0] || "";
  if (emailLocalPart.length >= 3 && lowered.includes(emailLocalPart)) {
    errors.push("Password must not contain your email address.");
  }

  const normalizedName = String(name || "").trim().toLowerCase();
  if (normalizedName.length >= 3 && lowered.includes(normalizedName)) {
    errors.push("Password must not contain your name.");
  }

  return { isValid: errors.length === 0, errors };
}

/**
 * 가입용 **생년(4자리)** 검증. 만 ${MIN_SELF_CONSENT_AGE}세 미만이면 막는다.
 *
 * 왜 생년월일이 아니라 생년인가: 가입 화면의 마찰을 최소로 두려는 제품 결정이다(2026-08-25).
 * 🔴 그 대가를 정확히 적어 둔다 — 이건 **달력 연도 근사**다. 올해 안에 만 ${MIN_SELF_CONSENT_AGE}세가
 * 되는 사람(=생일 전)이 통과할 수 있다. 정확히 막으려면 같은 파일의 validateBirthDateWithAge
 * (YYYY-MM-DD, KST 기준 만 나이)를 대신 쓰면 되고 그쪽은 이미 테스트가 붙어 있다.
 *
 * 카카오 가입은 이 검사를 타지 않는다 — 카카오 로그인 폼이 만 ${MIN_SELF_CONSENT_AGE}세 확인을
 * 자체적으로 받기 때문이다(2026-08-25 사용자 확인). 네이버·구글·이메일 가입에는 그 단계가 없다.
 */
export function validateBirthYear(birthYearInput, now = null) {
  const raw = String(birthYearInput == null ? "" : birthYearInput).trim();
  if (!/^\d{4}$/.test(raw)) {
    return { isValid: false, age: -1, error: "태어난 연도를 4자리로 입력해 주세요." };
  }

  const birthYear = Number(raw);
  const reference = now || new Date();
  // 기준은 KST 달력 연도다. UTC 로 재면 매년 12/31 09:00~24:00(KST 1/1) 구간에서 한 살이 어긋난다.
  const kstNow = new Date(reference.getTime() + 9 * 60 * 60 * 1000);
  const currentYear = kstNow.getUTCFullYear();

  if (birthYear > currentYear) {
    return { isValid: false, age: -1, error: "미래 연도는 입력할 수 없습니다." };
  }
  // 사람이 살 수 있는 범위를 벗어난 값은 오타로 본다(1900년 이전은 서비스 대상이 아니다).
  if (birthYear < 1900) {
    return { isValid: false, age: -1, error: "태어난 연도를 다시 확인해 주세요." };
  }

  const age = currentYear - birthYear;
  if (age < MIN_SELF_CONSENT_AGE) {
    return {
      isValid: false,
      age,
      error: `만 ${MIN_SELF_CONSENT_AGE}세 미만은 대한민국 관련 법령에 따라 가입할 수 없습니다.`,
    };
  }

  return { isValid: true, age, error: null };
}

export function validateRegisterPayload(payload = {}) {
  const errors = [];

  const name = String(payload.name || "").trim();
  const email = String(payload.email || "").trim().toLowerCase();
  const password = String(payload.password || "");
  // 구버전 앱이 phone 으로 보내던 것을 계속 받는다(현재 웹은 phoneNumber 로 보낸다).
  const phoneNumber = normalizeKoreanPhoneNumber(payload.phoneNumber || payload.phone);
  const termsAccepted = payload.termsAccepted === true;
  const privacyAccepted = payload.privacyAccepted === true;
  // 🔴 만 14세 확인이 체크박스에서 **생년 입력**으로 바뀌었다(2026-08-25). 체크박스는 눌러서
  // 지나가는 것이라 미만 연령을 실제로 걸러내지 못했다 — 이제 서버가 연도로 판정한다.
  const birthYearCheck = validateBirthYear(payload.birthYear);

  if (!name || name.length < 2) errors.push("Name must be at least 2 characters.");
  if (name.length > 40) errors.push("Name must be 40 characters or fewer.");
  if (!emailRegex.test(email)) errors.push("Email format is invalid.");
  // 🔴 휴대폰 번호는 필수다(2026-08-19 정책). 프론트 우회를 막기 위해 서버에서도 판정한다.
  if (!phoneNumber) errors.push("Phone number is invalid.");
  errors.push(...validateNewPassword(password, { email, name }).errors);
  if (!termsAccepted) errors.push("Terms acceptance is required.");
  if (!privacyAccepted) errors.push("Privacy policy acceptance is required.");
  if (!birthYearCheck.isValid) errors.push(birthYearCheck.error);

  return {
    isValid: errors.length === 0,
    errors,
    // 🔴 underage 와 그 밖의 입력 오류를 호출부가 구분할 수 있어야 한다 — 라우트가 다른 코드로
    // 응답해야 화면이 "다시 입력" 과 "가입 불가" 를 다르게 말할 수 있다.
    isUnderage: birthYearCheck.age >= 0 && birthYearCheck.age < MIN_SELF_CONSENT_AGE,
    sanitized: {
      name,
      email,
      password,
      phoneNumber,
      birthYear: birthYearCheck.isValid ? Number(String(payload.birthYear).trim()) : 0,
      // 생년을 실제로 받아 통과했다는 사실이 곧 만 14세 이상 확인이다(제22조 입증 기록).
      ageAttested: birthYearCheck.isValid,
      termsAccepted,
      privacyAccepted,
    },
  };
}

export function validateLoginPayload(payload = {}) {
  const errors = [];

  const email = String(payload.email || "").trim().toLowerCase();
  const password = String(payload.password || "");

  if (!emailRegex.test(email)) errors.push("Email format is invalid.");
  // 🔴 8자를 MIN_NEW_PASSWORD_LENGTH 로 올리지 말 것. 이건 "가입 기준"이 아니라 "이미 존재하는
  // 비밀번호의 하한"이라, 올리면 8~9자로 가입했던 기존 회원이 전부 로그인 불가가 된다.
  if (!password || password.length < 8) errors.push("Please check your password.");

  return {
    isValid: errors.length === 0,
    errors,
    sanitized: {
      email,
      password,
    },
  };
}
