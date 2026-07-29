// 개인정보보호법 제22조의2: 만 14세 미만은 법정대리인 동의 대상 (가입 불가가 아님)
export const MIN_SELF_CONSENT_AGE = 14;

export function normalizeBirthDateInput(value: unknown): string {
  const raw = String(value ?? "").trim();
  if (!raw) return "";

  const digits = raw.replace(/\D/g, "");
  if (digits.length === 8) {
    const year = Number(digits.slice(0, 4));
    const month = Number(digits.slice(4, 6));
    const day = Number(digits.slice(6, 8));
    const check = new Date(Date.UTC(year, month - 1, day));
    if (
      check.getUTCFullYear() === year &&
      check.getUTCMonth() === month - 1 &&
      check.getUTCDate() === day
    ) {
      return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    }
    return "";
  }

  const match = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (!match) return "";
  return normalizeBirthDateInput(`${match[1]}${match[2].padStart(2, "0")}${match[3].padStart(2, "0")}`);
}

export function formatBirthDateDigits(value: unknown): string {
  const normalized = normalizeBirthDateInput(value);
  if (normalized) return normalized.replace(/\D/g, "");
  return String(value ?? "").replace(/\D/g, "").slice(0, 8);
}

export function normalizeBirthDateFromDigits(value: unknown): string {
  const digits = formatBirthDateDigits(value);
  return digits.length === 8 ? normalizeBirthDateInput(digits) : digits;
}

/**
 * 만 나이 계산 (대한민국 법적 기준)
 * 생일이 지났으면 만 나이 = 현재 연도 - 출생 연도
 * 생일이 지나지 않았으면 만 나이 = 현재 연도 - 출생 연도 - 1
 * @param birthDateStr - YYYY-MM-DD 형식
 * @param referenceDate - 기준일 (기본값: 현재)
 * @returns 만 나이, 유효하지 않은 날짜면 -1
 */
export function calculateKoreanAge(birthDateStr: string, referenceDate?: Date): number {
  const normalized = normalizeBirthDateInput(birthDateStr);
  if (!normalized) return -1;

  const [year, month, day] = normalized.split("-").map(Number);
  const birthDate = new Date(Date.UTC(year, month - 1, day));

  if (
    birthDate.getUTCFullYear() !== year ||
    birthDate.getUTCMonth() !== month - 1 ||
    birthDate.getUTCDate() !== day
  ) {
    return -1;
  }

  const today = referenceDate || new Date();
  // KST (UTC+9) 기준 날짜 계산
  const kstMs = today.getTime() + 9 * 60 * 60 * 1000;
  const kstDate = new Date(kstMs);
  const todayYear = kstDate.getUTCFullYear();
  const todayMonth = kstDate.getUTCMonth() + 1;
  const todayDay = kstDate.getUTCDate();

  let age = todayYear - year;
  if (todayMonth < month || (todayMonth === month && todayDay < day)) {
    age -= 1;
  }

  return age;
}

/**
 * 생년월일 검증 및 만 나이 검증 (프론트엔드용)
 * 만 14세 미만은 오류가 아니라 법정대리인(보호자) 동의 대상으로 표시한다.
 * 서버 정본: worker/lib/validation.js
 */
export function validateBirthDateWithAge(birthDateStr: string): {
  isValid: boolean;
  age: number;
  requiresGuardianConsent: boolean;
  error: string | null;
} {
  if (!birthDateStr || typeof birthDateStr !== "string" || !birthDateStr.trim()) {
    return { isValid: false, age: -1, requiresGuardianConsent: false, error: "올바른 생년월일을 입력해주세요." };
  }

  const normalized = normalizeBirthDateInput(birthDateStr);
  if (!normalized) {
    return { isValid: false, age: -1, requiresGuardianConsent: false, error: "올바른 생년월일을 입력해주세요." };
  }

  const [year, month, day] = normalized.split("-").map(Number);
  const birthDate = new Date(Date.UTC(year, month - 1, day));

  if (
    birthDate.getUTCFullYear() !== year ||
    birthDate.getUTCMonth() !== month - 1 ||
    birthDate.getUTCDate() !== day
  ) {
    return { isValid: false, age: -1, requiresGuardianConsent: false, error: "올바른 생년월일을 입력해주세요." };
  }

  const now = new Date();
  const kstNowMs = now.getTime() + 9 * 60 * 60 * 1000;
  const kstNowDate = new Date(kstNowMs);
  const todayUtc = new Date(Date.UTC(kstNowDate.getUTCFullYear(), kstNowDate.getUTCMonth(), kstNowDate.getUTCDate()));

  // 미래 날짜 체크
  if (birthDate.getTime() > todayUtc.getTime()) {
    return { isValid: false, age: -1, requiresGuardianConsent: false, error: "미래 날짜는 입력할 수 없습니다." };
  }

  const age = calculateKoreanAge(normalized);
  if (age < MIN_SELF_CONSENT_AGE) {
    return { isValid: true, age, requiresGuardianConsent: true, error: null };
  }

  return { isValid: true, age, requiresGuardianConsent: false, error: null };
}
