import { getCurrentLoadingLocale, normalizeLoadingLocale, type LoadingLocale } from "@/constants/loadingMessages";

export const MAYA_CORRELATION = 584283;

const MAYA_CALENDAR_TEXT_TRANSLATIONS = {
  ko: {
    dateFormat: "날짜 형식이 올바르지 않습니다.",
    birthDateRequired: "생년월일을 입력해 주세요.",
    futureBirthDate: "아직 오지 않은 날짜는 생년월일로 사용할 수 없습니다.",
  },
  en: {
    dateFormat: "Please enter a valid date.",
    birthDateRequired: "Please enter your birth date.",
    futureBirthDate: "A future date cannot be used as a birth date.",
  },
  ja: {
    dateFormat: "正しい日付形式で入力してください。",
    birthDateRequired: "生年月日を入力してください。",
    futureBirthDate: "未来の日付は生年月日として使用できません。",
  },
} as const;

function getMayaCalendarCopy(locale?: LoadingLocale | string | null) {
  const activeLocale = locale ? normalizeLoadingLocale(locale) : getCurrentLoadingLocale();
  return MAYA_CALENDAR_TEXT_TRANSLATIONS[activeLocale as "ko" | "en" | "ja"] || MAYA_CALENDAR_TEXT_TRANSLATIONS.ko;
}

export type DateOnlyParts = {
  year: number;
  month: number;
  day: number;
};

export type MayaCalendarResult = {
  gregorianDate: string;
  julianDayNumber: number;
  mayaDayNumber: number;
  correlation: number;
  longCount: {
    baktun: number;
    katun: number;
    tun: number;
    uinal: number;
    kin: number;
    label: string;
  };
  tzolkin: {
    number: number;
    signIndex: number;
    signName: string;
    koreanName: string;
    label: string;
  };
  haab: {
    day: number;
    monthIndex: number;
    monthName: string;
    label: string;
  };
};

export const MAYA_TZOLKIN_DAY_SIGNS = [
  "Imix",
  "Ik’",
  "Ak’bal",
  "K’an",
  "Chikchan",
  "Kimi",
  "Manik’",
  "Lamat",
  "Muluk",
  "Ok",
  "Chuwen",
  "Eb’",
  "B’en",
  "Ix",
  "Men",
  "Kib’",
  "Kab’an",
  "Etz’nab’",
  "Kawak",
  "Ajaw",
] as const;

export const MAYA_TZOLKIN_KOREAN_NAMES = [
  "이믹스",
  "익",
  "악발",
  "칸",
  "칙찬",
  "키미",
  "마닉",
  "라마트",
  "물룩",
  "옥",
  "추웬",
  "엡",
  "벤",
  "이쉬",
  "멘",
  "킵",
  "카반",
  "에츠납",
  "카왁",
  "아하우",
] as const;

export const MAYA_HAAB_MONTHS = [
  "Pop",
  "Wo’",
  "Sip",
  "Sotz’",
  "Sek",
  "Xul",
  "Yaxk’in",
  "Mol",
  "Ch’en",
  "Yax",
  "Sak’",
  "Keh",
  "Mak",
  "K’ank’in",
  "Muwan",
  "Pax",
  "K’ayab",
  "Kumk’u",
  "Wayeb’",
] as const;

function positiveMod(value: number, divisor: number) {
  return ((value % divisor) + divisor) % divisor;
}

function pad2(value: number) {
  return String(value).padStart(2, "0");
}

function isLeapYear(year: number) {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

function daysInMonth(year: number, month: number) {
  if (month === 2) return isLeapYear(year) ? 29 : 28;
  return [4, 6, 9, 11].includes(month) ? 30 : 31;
}

export function formatDateOnly(parts: DateOnlyParts) {
  return `${String(parts.year).padStart(4, "0")}-${pad2(parts.month)}-${pad2(parts.day)}`;
}

export function parseDateOnly(value: string): DateOnlyParts | null {
  const raw = String(value || "").trim();
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return null;
  if (year < 1 || month < 1 || month > 12 || day < 1) return null;
  if (day > daysInMonth(year, month)) return null;
  return { year, month, day };
}

export function getLocalDateOnly(now = new Date()): DateOnlyParts {
  return {
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    day: now.getDate(),
  };
}

export function gregorianToJulianDayNumber(year: number, month: number, day: number) {
  const a = Math.floor((14 - month) / 12);
  const y = year + 4800 - a;
  const m = month + 12 * a - 3;
  return day
    + Math.floor((153 * m + 2) / 5)
    + 365 * y
    + Math.floor(y / 4)
    - Math.floor(y / 100)
    + Math.floor(y / 400)
    - 32045;
}

export function calculateLongCount(mayaDayNumber: number): MayaCalendarResult["longCount"] {
  if (mayaDayNumber < 0) {
    throw new Error("지원 범위를 벗어난 날짜입니다.");
  }

  let remainder = mayaDayNumber;
  const baktun = Math.floor(remainder / 144000);
  remainder %= 144000;
  const katun = Math.floor(remainder / 7200);
  remainder %= 7200;
  const tun = Math.floor(remainder / 360);
  remainder %= 360;
  const uinal = Math.floor(remainder / 20);
  const kin = remainder % 20;
  return {
    baktun,
    katun,
    tun,
    uinal,
    kin,
    label: `${baktun}.${katun}.${tun}.${uinal}.${kin}`,
  };
}

export function calculateTzolkin(mayaDayNumber: number): MayaCalendarResult["tzolkin"] {
  const number = positiveMod(mayaDayNumber + 3, 13) + 1;
  const signIndex = positiveMod(mayaDayNumber + 19, 20);
  const signName = MAYA_TZOLKIN_DAY_SIGNS[signIndex];
  const koreanName = MAYA_TZOLKIN_KOREAN_NAMES[signIndex];
  return {
    number,
    signIndex,
    signName,
    koreanName,
    label: `${number} ${signName}`,
  };
}

export function calculateHaab(mayaDayNumber: number): MayaCalendarResult["haab"] {
  const haabIndex = positiveMod(mayaDayNumber + 348, 365);
  const monthIndex = haabIndex >= 360 ? 18 : Math.floor(haabIndex / 20);
  const day = haabIndex >= 360 ? haabIndex - 360 : haabIndex % 20;
  const monthName = MAYA_HAAB_MONTHS[monthIndex];
  return {
    day,
    monthIndex,
    monthName,
    label: `${day} ${monthName}`,
  };
}

export function calculateMayaCalendar(
  input: string | DateOnlyParts,
  correlation = MAYA_CORRELATION,
  locale?: LoadingLocale | string | null,
): MayaCalendarResult {
  const parts = typeof input === "string" ? parseDateOnly(input) : input;
  if (!parts) throw new Error(getMayaCalendarCopy(locale).dateFormat);

  const julianDayNumber = gregorianToJulianDayNumber(parts.year, parts.month, parts.day);
  const mayaDayNumber = julianDayNumber - correlation;
  return {
    gregorianDate: formatDateOnly(parts),
    julianDayNumber,
    mayaDayNumber,
    correlation,
    longCount: calculateLongCount(mayaDayNumber),
    tzolkin: calculateTzolkin(mayaDayNumber),
    haab: calculateHaab(mayaDayNumber),
  };
}

export function validateMayaBirthDate(
  value: string,
  today: DateOnlyParts = getLocalDateOnly(),
  locale?: LoadingLocale | string | null,
): { ok: true; parts: DateOnlyParts } | { ok: false; message: string } {
  const copy = getMayaCalendarCopy(locale);
  if (!String(value || "").trim()) {
    return { ok: false, message: copy.birthDateRequired };
  }

  const parts = parseDateOnly(value);
  if (!parts) {
    return { ok: false, message: copy.dateFormat };
  }

  const inputJdn = gregorianToJulianDayNumber(parts.year, parts.month, parts.day);
  const todayJdn = gregorianToJulianDayNumber(today.year, today.month, today.day);
  if (inputJdn > todayJdn) {
    return { ok: false, message: copy.futureBirthDate };
  }

  return { ok: true, parts };
}
