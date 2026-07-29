const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const birthDateRegex = /^\d{4}-\d{2}-\d{2}$/;
const birthTimeRegex = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

// 개인정보보호법 제22조의2: 만 14세 미만 아동은 가입 불가가 아니라 법정대리인 동의 대상이다.
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
 * @returns {{ isValid: boolean, age: number, requiresGuardianConsent: boolean, error: string|null }}
 */
export function validateBirthDateWithAge(birthDateStr, now = null) {
  if (!birthDateStr || typeof birthDateStr !== "string" || !birthDateStr.trim()) {
    return { isValid: false, age: -1, requiresGuardianConsent: false, error: "올바른 생년월일을 입력해주세요." };
  }

  const trimmed = birthDateStr.trim();

  if (!birthDateRegex.test(trimmed)) {
    return { isValid: false, age: -1, requiresGuardianConsent: false, error: "올바른 생년월일을 입력해주세요." };
  }

  const [year, month, day] = trimmed.split("-").map(Number);
  const birthDate = new Date(Date.UTC(year, month - 1, day));

  // 유효한 날짜인지 확인
  if (
    birthDate.getUTCFullYear() !== year ||
    birthDate.getUTCMonth() !== month - 1 ||
    birthDate.getUTCDate() !== day
  ) {
    return { isValid: false, age: -1, requiresGuardianConsent: false, error: "올바른 생년월일을 입력해주세요." };
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
    return { isValid: false, age: -1, requiresGuardianConsent: false, error: "미래 날짜는 입력할 수 없습니다." };
  }

  // 만 나이 계산 (KST 기준)
  const todayYear = kstDate.getUTCFullYear();
  const todayMonth = kstDate.getUTCMonth() + 1;
  const todayDay = kstDate.getUTCDate();

  let age = todayYear - year;
  if (todayMonth < month || (todayMonth === month && todayDay < day)) {
    age -= 1;
  }

  // 만 14세 미만은 가입 자체를 막지 않고 법정대리인(보호자) 동의 절차 대상으로 표시한다.
  if (age < MIN_SELF_CONSENT_AGE) {
    return { isValid: true, age, requiresGuardianConsent: true, error: null };
  }

  return { isValid: true, age, requiresGuardianConsent: false, error: null };
}

export function validateRegisterPayload(payload = {}) {
  const errors = [];

  const name = String(payload.name || "").trim();
  const email = String(payload.email || "").trim().toLowerCase();
  const password = String(payload.password || "");
  const birthDate = String(payload.birthDate || "").trim();
  const birthTime = String(payload.birthTime || "").trim();
  const gender = String(payload.gender || "").trim().toUpperCase();
  const guardianEmail = String(payload.guardianEmail || "").trim().toLowerCase();

  if (!name || name.length < 2) errors.push("Name must be at least 2 characters.");
  if (name.length > 40) errors.push("Name must be 40 characters or fewer.");
  if (!emailRegex.test(email)) errors.push("Email format is invalid.");
  if (password.length < 8) errors.push("Password must be at least 8 characters.");
  if (!birthDateRegex.test(birthDate)) errors.push("birthDate must use YYYY-MM-DD format.");
  if (!birthTimeRegex.test(birthTime)) errors.push("birthTime must use HH:mm format.");
  if (!["M", "F", "OTHER"].includes(gender)) errors.push("gender must be M, F, or OTHER.");

  // 생년월일 유효성 검증 (만 14세 미만은 오류가 아니라 보호자 동의 대상)
  const ageValidation = validateBirthDateWithAge(birthDate);
  if (!ageValidation.isValid) {
    errors.push(ageValidation.error);
  }

  // 보호자 동의 대상이면 법정대리인 이메일이 필수다.
  if (ageValidation.requiresGuardianConsent && !emailRegex.test(guardianEmail)) {
    errors.push("Guardian email is required for users under 14.");
  }

  return {
    isValid: errors.length === 0,
    errors,
    age: ageValidation.age,
    requiresGuardianConsent: ageValidation.requiresGuardianConsent,
    sanitized: {
      name,
      email,
      password,
      birthDate,
      birthTime,
      gender,
      guardianEmail,
    },
  };
}

export function validateLoginPayload(payload = {}) {
  const errors = [];

  const email = String(payload.email || "").trim().toLowerCase();
  const password = String(payload.password || "");

  if (!emailRegex.test(email)) errors.push("Email format is invalid.");
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