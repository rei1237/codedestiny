import { getCurrentLoadingLocale, type LoadingLocale } from "@/constants/loadingMessages";

export type NormalizedBirthDateResult =
  | { ok: true; value: string }
  | { ok: false; reason: string };

export type ParsedBirthDate = {
  value: string;
  year: number;
  month: number;
  day: number;
  timestamp: number;
};

const BIRTH_ENERGY_TEXT_TRANSLATIONS = {
  ko: {
    dateInputError: "생년월일은 8자리 숫자 또는 YYYY-MM-DD 형식으로 입력해 주세요.",
    dateInvalidError: "존재하지 않는 날짜입니다.",
  },
  en: {
    dateInputError: "Enter the birth date as 8 digits or in YYYY-MM-DD format.",
    dateInvalidError: "This date does not exist.",
  },
  ja: {
    dateInputError: "生年月日は8桁の数字、またはYYYY-MM-DD形式で入力してください。",
    dateInvalidError: "存在しない日付です。",
  },
} as const;

function getBirthEnergyCopy(locale: LoadingLocale = getCurrentLoadingLocale()) {
  return BIRTH_ENERGY_TEXT_TRANSLATIONS[locale as "ko" | "en" | "ja"] || BIRTH_ENERGY_TEXT_TRANSLATIONS.ko;
}

function pad2(value: number) {
  return String(value).padStart(2, "0");
}

function toSafeInt(value: string) {
  const num = Number(value);
  return Number.isInteger(num) ? num : NaN;
}

export function normalizeBirthDateInput(value: string): NormalizedBirthDateResult {
  const copy = getBirthEnergyCopy();
  const raw = String(value || "").trim();
  if (!raw) {
    return { ok: false, reason: copy.dateInputError };
  }

  const compact = raw.replace(/[.\/]/g, "-").replace(/\s+/g, "");
  let year = NaN;
  let month = NaN;
  let day = NaN;

  if (/^\d{8}$/.test(compact)) {
    year = toSafeInt(compact.slice(0, 4));
    month = toSafeInt(compact.slice(4, 6));
    day = toSafeInt(compact.slice(6, 8));
  } else {
    const match = compact.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (!match) {
      return { ok: false, reason: copy.dateInputError };
    }
    year = toSafeInt(match[1]);
    month = toSafeInt(match[2]);
    day = toSafeInt(match[3]);
  }

  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return { ok: false, reason: copy.dateInputError };
  }

  if (year < 1900 || year > 2100 || month < 1 || month > 12 || day < 1 || day > 31) {
    return { ok: false, reason: copy.dateInvalidError };
  }

  const candidate = new Date(Date.UTC(year, month - 1, day));
  if (
    candidate.getUTCFullYear() !== year
    || candidate.getUTCMonth() + 1 !== month
    || candidate.getUTCDate() !== day
  ) {
    return { ok: false, reason: copy.dateInvalidError };
  }

  return {
    ok: true,
    value: `${year}-${pad2(month)}-${pad2(day)}`,
  };
}

export function parseBirthDate(input: string): ParsedBirthDate {
  const normalized = normalizeBirthDateInput(input);
  if (!normalized.ok) {
    throw new Error("reason" in normalized ? normalized.reason : getBirthEnergyCopy().dateInputError);
  }

  const [yearText, monthText, dayText] = normalized.value.split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);

  return {
    value: normalized.value,
    year,
    month,
    day,
    timestamp: Date.UTC(year, month - 1, day),
  };
}
