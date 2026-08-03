import {
  GUARDIAN_FORTUNE_LIMITS,
  GUARDIAN_FORTUNE_MODES,
  GUARDIAN_FORTUNE_TOPICS,
} from "./constants";
import type {
  GuardianFortuneBirthPlace,
  GuardianFortuneContext,
  GuardianFortuneInput,
  GuardianFortuneResult,
  SharedGuardianFortuneSnapshot,
} from "./types";

export const GUARDIAN_FORTUNE_FORBIDDEN_FIELDS = [
  "birthDate",
  "birthTime",
  "birthPlace",
  "calendarType",
  "gender",
  "nickname",
  "concern",
  "userId",
  "publicUserId",
  "ip",
  "guestId",
  "rawPrompt",
  "rawResponse",
  "rawLlmResponse",
  "fortuneContext",
  "paymentId",
  "orderId",
  "paymentInfo",
  "creditBalance",
  "entitlementAmount",
] as const;

export type GuardianFortuneValidationIssue = {
  field: string;
  code: string;
  message: string;
};

export type GuardianFortuneValidationResult<T> = {
  ok: boolean;
  value?: T;
  issues: GuardianFortuneValidationIssue[];
};

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^\d{2}:\d{2}$/;
const LOCALE_PATTERN = /^[a-z]{2}(?:-[A-Z]{2})?$/;
const SENSITIVE_TEXT_PATTERNS = [
  /\b\d{6}[- ]?\d{7}\b/,
  /\b\d{2,4}[- ]?\d{3,4}[- ]?\d{4}\b/,
  /[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/,
  /(?:계좌|주민번호|주민등록|카드번호|비밀번호|password)/i,
];

function isValidDate(value: unknown): value is string {
  if (typeof value !== "string" || !DATE_PATTERN.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function isFutureDate(value: string): boolean {
  const today = new Date().toISOString().slice(0, 10);
  return value > today;
}

function isValidTime(value: unknown): value is string {
  if (typeof value !== "string" || !TIME_PATTERN.test(value)) return false;
  const [hour, minute] = value.split(":").map(Number);
  return hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59;
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isValidBirthPlace(value: unknown): value is GuardianFortuneBirthPlace {
  if (!isPlainRecord(value)) return false;
  const latitude = Number(value.latitude);
  const longitude = Number(value.longitude);
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) return false;
  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) return false;
  if (typeof value.timezone !== "string" || value.timezone.trim().length === 0 || value.timezone.length > 80) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value.timezone }).format();
  } catch {
    return false;
  }
  return (value.city === undefined || typeof value.city === "string")
    && (value.country === undefined || typeof value.country === "string");
}

function hasValue(value: unknown): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

export function containsSensitiveText(value: unknown): boolean {
  return typeof value === "string" && SENSITIVE_TEXT_PATTERNS.some((pattern) => pattern.test(value));
}

export function validateGuardianFortuneInput(input: unknown): GuardianFortuneValidationResult<GuardianFortuneInput> {
  const issues: GuardianFortuneValidationIssue[] = [];
  if (!isPlainRecord(input)) {
    return { ok: false, issues: [{ field: "input", code: "invalid_object", message: "입력 형식이 올바르지 않습니다." }] };
  }

  if (!isValidDate(input.birthDate)) issues.push({ field: "birthDate", code: "invalid_date", message: "생년월일을 확인해 주세요." });
  else if (isFutureDate(input.birthDate)) issues.push({ field: "birthDate", code: "future_date", message: "미래의 생년월일은 입력할 수 없어요." });
  if (input.birthTime !== undefined && input.birthTime !== "" && !isValidTime(input.birthTime)) {
    issues.push({ field: "birthTime", code: "invalid_time", message: "생시 형식을 확인해 주세요." });
  }
  if (input.birthPlace !== undefined && !isValidBirthPlace(input.birthPlace)) {
    issues.push({ field: "birthPlace", code: "invalid_birth_place", message: "출생지 정보를 확인해 주세요." });
  }
  if (!(input.calendarType === "solar" || input.calendarType === "lunar")) issues.push({ field: "calendarType", code: "invalid_enum", message: "양력 또는 음력을 선택해 주세요." });
  if (typeof input.mode !== "string" || !(input.mode in GUARDIAN_FORTUNE_MODES)) issues.push({ field: "mode", code: "invalid_enum", message: "상담 모드를 확인해 주세요." });
  if (typeof input.topic !== "string" || !(input.topic in GUARDIAN_FORTUNE_TOPICS)) issues.push({ field: "topic", code: "invalid_enum", message: "관심 분야를 선택해 주세요." });
  if (input.gender !== undefined && !["female", "male", "unknown"].includes(String(input.gender))) issues.push({ field: "gender", code: "invalid_enum", message: "성별 선택값을 확인해 주세요." });
  const locale = input.locale === undefined ? "ko-KR" : input.locale;
  if (typeof locale !== "string" || !LOCALE_PATTERN.test(locale)) issues.push({ field: "locale", code: "invalid_locale", message: "지원하지 않는 언어 설정입니다." });
  if (!isValidDate(input.targetDate)) issues.push({ field: "targetDate", code: "invalid_date", message: "기준 날짜를 확인해 주세요." });
  if (input.nickname !== undefined && (typeof input.nickname !== "string" || input.nickname.length > GUARDIAN_FORTUNE_LIMITS.nicknameMaxLength)) issues.push({ field: "nickname", code: "too_long", message: "닉네임을 조금 짧게 적어 주세요." });
  if (input.concern !== undefined && (typeof input.concern !== "string" || input.concern.length > GUARDIAN_FORTUNE_LIMITS.concernMaxLength)) issues.push({ field: "concern", code: "too_long", message: "고민을 120자 이내로 적어 주세요." });
  if (containsSensitiveText(input.concern)) issues.push({ field: "concern", code: "sensitive_text", message: "민감한 개인정보는 적지 말아 주세요." });

  if (issues.length > 0) return { ok: false, issues };
  return {
    ok: true,
    issues: [],
    value: {
      birthDate: String(input.birthDate),
      birthTime: input.birthTime ? String(input.birthTime) : undefined,
      birthPlace: input.birthPlace && isValidBirthPlace(input.birthPlace)
        ? {
            city: input.birthPlace.city ? String(input.birthPlace.city) : undefined,
            country: input.birthPlace.country ? String(input.birthPlace.country) : undefined,
            latitude: Number(input.birthPlace.latitude),
            longitude: Number(input.birthPlace.longitude),
            timezone: String(input.birthPlace.timezone),
          }
        : undefined,
      calendarType: input.calendarType as GuardianFortuneInput["calendarType"],
      gender: (input.gender || "unknown") as GuardianFortuneInput["gender"],
      nickname: input.nickname ? String(input.nickname) : undefined,
      concern: input.concern ? String(input.concern) : undefined,
      topic: input.topic as GuardianFortuneInput["topic"],
      mode: input.mode as GuardianFortuneInput["mode"],
      locale: String(locale),
      targetDate: String(input.targetDate),
    },
  };
}

export function assertGuardianFortuneInput(input: unknown): GuardianFortuneInput {
  const result = validateGuardianFortuneInput(input);
  if (!result.ok || !result.value) throw new Error(`GUARDIAN_FORTUNE_INPUT_INVALID:${result.issues.map((issue) => issue.field).join(",")}`);
  return result.value;
}

function hasForbiddenKey(value: unknown, path = ""): string | null {
  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index += 1) {
      const found = hasForbiddenKey(value[index], `${path}[${index}]`);
      if (found) return found;
    }
    return null;
  }
  if (!isPlainRecord(value)) return null;
  for (const [key, child] of Object.entries(value)) {
    if ((GUARDIAN_FORTUNE_FORBIDDEN_FIELDS as readonly string[]).includes(key)) return path ? `${path}.${key}` : key;
    const found = hasForbiddenKey(child, path ? `${path}.${key}` : key);
    if (found) return found;
  }
  return null;
}

function validateTextField(record: Record<string, unknown>, field: string, issues: GuardianFortuneValidationIssue[]) {
  if (!hasValue(record[field])) issues.push({ field, code: "required", message: `${field} is required.` });
}

export function validateGuardianFortuneResult(result: unknown): GuardianFortuneValidationResult<GuardianFortuneResult> {
  const issues: GuardianFortuneValidationIssue[] = [];
  if (!isPlainRecord(result)) return { ok: false, issues: [{ field: "result", code: "invalid_object", message: "결과 형식이 올바르지 않습니다." }] };
  const forbidden = hasForbiddenKey(result);
  if (forbidden) issues.push({ field: forbidden, code: "forbidden_field", message: "결과에 민감한 필드를 포함할 수 없습니다." });
  ["title", "openingLine", "innerState", "coreReading", "topicAdvice", "cautionPattern", "luckyAction", "shareText"].forEach((field) => validateTextField(result, field, issues));
  if (!isPlainRecord(result.premiumCta)) issues.push({ field: "premiumCta", code: "required", message: "CTA 정보가 필요합니다." });
  else {
    ["ctaKey", "label", "targetPath", "reason"].forEach((field) => validateTextField(result.premiumCta as Record<string, unknown>, field, issues));
    if (hasValue(result.premiumCta.targetPath) && !String(result.premiumCta.targetPath).startsWith("/")) issues.push({ field: "premiumCta.targetPath", code: "invalid_path", message: "CTA 경로는 내부 경로여야 합니다." });
  }
  if (issues.length > 0) return { ok: false, issues };
  return { ok: true, issues: [], value: result as unknown as GuardianFortuneResult };
}

export function validateSharedGuardianFortuneSnapshot(snapshot: unknown): GuardianFortuneValidationResult<SharedGuardianFortuneSnapshot> {
  if (!isPlainRecord(snapshot)) return { ok: false, issues: [{ field: "snapshot", code: "invalid_object", message: "공유 결과 형식이 올바르지 않습니다." }] };
  const issues: GuardianFortuneValidationIssue[] = [];
  const forbidden = hasForbiddenKey(snapshot);
  if (forbidden) issues.push({ field: forbidden, code: "forbidden_field", message: "공유 결과에 민감한 필드를 포함할 수 없습니다." });
  ["title", "openingLine", "innerState", "coreReading", "topicAdvice", "cautionPattern", "luckyAction", "shareText", "locale"].forEach((field) => validateTextField(snapshot, field, issues));
  if (snapshot.premiumCta !== undefined) {
    if (!isPlainRecord(snapshot.premiumCta)) issues.push({ field: "premiumCta", code: "invalid_object", message: "CTA 정보가 올바르지 않습니다." });
    else ["ctaKey", "label", "targetPath", "reason"].forEach((field) => validateTextField(snapshot.premiumCta as Record<string, unknown>, field, issues));
  }
  if (!hasValue(snapshot.shareId)) issues.push({ field: "shareId", code: "required", message: "공유 ID가 필요합니다." });
  if (!isValidDate(String(snapshot.createdAt).slice(0, 10))) issues.push({ field: "createdAt", code: "invalid_date", message: "생성일이 올바르지 않습니다." });
  if (snapshot.expiresAt !== undefined && typeof snapshot.expiresAt !== "string") issues.push({ field: "expiresAt", code: "invalid_date", message: "만료일이 올바르지 않습니다." });
  if (typeof snapshot.mode !== "string" || !(snapshot.mode in GUARDIAN_FORTUNE_MODES)) issues.push({ field: "mode", code: "invalid_enum", message: "모드가 올바르지 않습니다." });
  if (typeof snapshot.topic !== "string" || !(snapshot.topic in GUARDIAN_FORTUNE_TOPICS)) issues.push({ field: "topic", code: "invalid_enum", message: "분야가 올바르지 않습니다." });
  if (issues.length > 0) return { ok: false, issues };
  return { ok: true, issues: [], value: snapshot as unknown as SharedGuardianFortuneSnapshot };
}

export function assertGuardianFortuneContextSafe(context: GuardianFortuneContext): GuardianFortuneContext {
  const forbidden = hasForbiddenKey(context);
  if (forbidden) throw new Error(`GUARDIAN_FORTUNE_CONTEXT_FORBIDDEN_FIELD:${forbidden}`);
  return context;
}
