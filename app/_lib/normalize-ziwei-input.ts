import { Lunar, Solar } from "lunar-javascript";
import {
  ZiweiCalendarType,
  ZiweiGender,
  ZiweiInputError,
  ZiweiInputWarning,
  ZiweiUserInput,
} from "./ziwei-types";

interface NormalizeZiweiInputArgs {
  name?: string;
  birthYear?: number | string;
  birthMonth?: number | string;
  birthDay?: number | string;
  birthHour?: number | string;
  birthMinute?: number | string;
  unknownHour?: boolean;
  gender?: ZiweiGender | string;
  calendarType?: ZiweiCalendarType | string;
  isLeapMonth?: boolean;
  birthPlace?: string;
  timezone?: string;
}

export interface NormalizeZiweiInputResult {
  input?: ZiweiUserInput;
  warnings: ZiweiInputWarning[];
  errors: ZiweiInputError[];
}

function toSafeNumber(v: unknown, fallback: number): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function isValidDate(y: number, m: number, d: number): boolean {
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return false;
  if (y < 1900 || y > 2099) return false;
  if (m < 1 || m > 12) return false;
  if (d < 1 || d > 31) return false;
  const dt = new Date(y, m - 1, d);
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d;
}

function normalizeGender(raw: unknown): ZiweiGender | null {
  const v = String(raw || "").trim().toUpperCase();
  if (v === "M") return "M";
  if (v === "F") return "F";
  return null;
}

function normalizeCalendarType(raw: unknown): ZiweiCalendarType {
  const v = String(raw || "solar").trim().toLowerCase();
  if (v === "lunar") return "lunar";
  return "solar";
}

function convertLunarToSolar(
  year: number,
  month: number,
  day: number,
  isLeapMonth: boolean,
): { year: number; month: number; day: number } | null {
  try {
    const lunarMonth = isLeapMonth ? -Math.abs(month) : Math.abs(month);
    const lunar = Lunar.fromYmd(year, lunarMonth, day);
    const solar = lunar.getSolar();
    return {
      year: solar.getYear(),
      month: solar.getMonth(),
      day: solar.getDay(),
    };
  } catch (e) {
    return null;
  }
}

function touchSolarLibrary(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
): boolean {
  try {
    const s = Solar.fromYmdHms(year, month, day, hour, minute, 0);
    return !!s;
  } catch (e) {
    return false;
  }
}

export function normalizeZiweiInput(args: NormalizeZiweiInputArgs): NormalizeZiweiInputResult {
  const warnings: ZiweiInputWarning[] = [];
  const errors: ZiweiInputError[] = [];

  const rawYear = toSafeNumber(args.birthYear, NaN);
  const rawMonth = toSafeNumber(args.birthMonth, NaN);
  const rawDay = toSafeNumber(args.birthDay, NaN);
  const rawHour = toSafeNumber(args.birthHour, 12);
  const rawMinute = toSafeNumber(args.birthMinute, 0);
  const unknownHour = Boolean(args.unknownHour);

  if (!Number.isFinite(rawYear) || !Number.isFinite(rawMonth) || !Number.isFinite(rawDay)) {
    errors.push({
      code: "MISSING_BIRTH_DATE",
      message: "생년월일이 누락되어 명반을 계산할 수 없습니다.",
    });
  }

  let gender = normalizeGender(args.gender);
  if (!gender) {
    errors.push({
      code: "MISSING_GENDER",
      message: "성별 정보가 없어 자미두수 계산을 시작할 수 없습니다.",
    });
    gender = "F";
  }

  const calendarType = normalizeCalendarType(args.calendarType);
  const isLeapMonth = Boolean(args.isLeapMonth);

  let year = rawYear;
  let month = rawMonth;
  let day = rawDay;

  if (calendarType === "lunar") {
    const converted = convertLunarToSolar(year, month, day, isLeapMonth);
    if (!converted) {
      errors.push({
        code: "NORMALIZATION_FAILED",
        message: "음력 데이터를 양력으로 변환하지 못했습니다. 입력값을 다시 확인해 주세요.",
      });
    } else {
      year = converted.year;
      month = converted.month;
      day = converted.day;
    }
  }

  if (!isValidDate(year, month, day)) {
    errors.push({
      code: "INVALID_BIRTH_DATE",
      message: "생년월일 형식이 유효하지 않습니다. 월/일 조합을 다시 확인해 주세요.",
    });
  }

  let birthHour = unknownHour ? 12 : rawHour;
  const birthMinute = Math.min(59, Math.max(0, rawMinute));
  if (unknownHour) {
    warnings.push({
      code: "MISSING_BIRTH_TIME",
      message:
        "출생 시간이 없어 신궁과 일부 궁 해석의 정밀도가 제한됩니다. 가능한 범위에서 명궁 중심으로 심화 분석을 제공합니다.",
    });
  }

  if (!Number.isFinite(birthHour) || birthHour < 0 || birthHour > 23) {
    errors.push({
      code: "INVALID_BIRTH_TIME",
      message: "출생 시간은 0시부터 23시 사이여야 합니다.",
    });
    birthHour = 12;
  }

  if (calendarType === "lunar" && isLeapMonth) {
    warnings.push({
      code: "LEAP_MONTH_UNSUPPORTED",
      message: "윤달 정보는 지원 범위 내에서 처리되며 일부 월령 해석은 보수적으로 제공됩니다.",
    });
  }

  if (!touchSolarLibrary(year, month, day, birthHour, birthMinute)) {
    errors.push({
      code: "NORMALIZATION_FAILED",
      message: "명반 계산을 위한 날짜 데이터를 준비하지 못했습니다.",
    });
  }

  if (errors.length) {
    return { warnings, errors };
  }

  return {
    warnings,
    errors,
    input: {
      name: String(args.name || "당신").trim() || "당신",
      birthYear: year,
      birthMonth: month,
      birthDay: day,
      birthHour,
      birthMinute,
      unknownHour,
      gender,
      calendarType,
      isLeapMonth,
      birthPlace: String(args.birthPlace || "").trim() || undefined,
      timezone: String(args.timezone || "Asia/Seoul").trim() || "Asia/Seoul",
    },
  };
}
