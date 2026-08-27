import { lunarToSolar, solarToLunar } from "@/lib/korean-calendar";
import { getCurrentLoadingLocale, normalizeLoadingLocale, type LoadingLocale } from "@/constants/loadingMessages";
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
  locale?: LoadingLocale | string;
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
  // 🔴 음력→양력은 한국 음양력 코어가 한다. 중국 음력(lunar-javascript)은 3.68% 의 음력 날짜에서
  //    하루 어긋나고(실측 2026-08-27), 자미두수는 음력일로 자미성을 잡으므로 그 하루가
  //    명반 14주성을 통째로 옮긴다. 없는 윤달·지원 범위 밖이면 코어가 null 을 낸다.
  try {
    const solar = lunarToSolar(year, Math.abs(month), day, isLeapMonth);
    if (!solar) return null;
    return { year: solar.year, month: solar.month, day: solar.day };
  } catch (e) {
    return null;
  }
}

// 달력 코어가 이 날짜를 실제로 다룰 수 있는지 확인한다.
// 🔴 이전에는 lunar-javascript 가 객체를 만들 수 있는지만 봤다. 코어는 표 기반이라 이 검사가
//    지원 범위(1900~2100) 확인까지 겸한다 — 범위 밖은 이제 여기서 걸러진다.
function touchSolarLibrary(
  year: number,
  month: number,
  day: number,
): boolean {
  try {
    return solarToLunar(year, month, day) !== null;
  } catch (e) {
    return false;
  }
}

type NormalizeZiweiCopy = {
  missingBirth: string;
  missingGender: string;
  lunarConvertFailed: string;
  invalidDate: string;
  unknownHourWarning: string;
  invalidHour: string;
  leapMonthWarning: string;
  dateDataFailed: string;
  defaultName: string;
};

const NORMALIZE_ZIWEI_INPUT_TEXT_TRANSLATIONS: Partial<Record<LoadingLocale, NormalizeZiweiCopy>> = {
  ko: {
    missingBirth: "생년월일이 누락되어 명반을 계산할 수 없습니다.",
    missingGender: "성별 정보가 없어 자미두수 계산을 시작할 수 없습니다.",
    lunarConvertFailed: "음력 데이터를 양력으로 변환하지 못했습니다. 입력값을 다시 확인해 주세요.",
    invalidDate: "생년월일 형식이 유효하지 않습니다. 월/일 조합을 다시 확인해 주세요.",
    unknownHourWarning: "출생 시간이 없어 신궁과 일부 궁 해석의 정밀도가 제한됩니다. 가능한 범위에서 명궁 중심으로 심화 분석을 제공합니다.",
    invalidHour: "출생 시간은 0시부터 23시 사이여야 합니다.",
    leapMonthWarning: "윤달 정보는 지원 범위 내에서 처리되며 일부 월령 해석은 보수적으로 제공됩니다.",
    dateDataFailed: "명반 계산을 위한 날짜 데이터를 준비하지 못했습니다.",
    defaultName: "당신",
  },
  en: {
    missingBirth: "The birth date is missing, so the chart cannot be calculated.",
    missingGender: "Gender information is missing, so the Zi Wei calculation cannot begin.",
    lunarConvertFailed: "The lunar date could not be converted to a solar date. Please check the input again.",
    invalidDate: "The birth date format is invalid. Please check the month and day combination.",
    unknownHourWarning: "Without a birth time, the body palace and some palace readings are less precise. A deeper reading will proceed around the life palace where possible.",
    invalidHour: "Birth hour must be between 0 and 23.",
    leapMonthWarning: "Leap month information is handled within the supported range, and some lunar-month readings are provided conservatively.",
    dateDataFailed: "Could not prepare the date data needed for chart calculation.",
    defaultName: "You",
  },
  ja: {
    missingBirth: "生年月日が不足しているため、命盤を計算できません。",
    missingGender: "性別情報がないため、紫微斗数の計算を開始できません。",
    lunarConvertFailed: "旧暦データを新暦へ変換できませんでした。入力値をもう一度確認してください。",
    invalidDate: "生年月日の形式が正しくありません。月日組み合わせを確認してください。",
    unknownHourWarning: "出生時間がないため、身宮と一部の宮の解釈精度が制限されます。可能な範囲で命宮中心の深い鑑定を行います。",
    invalidHour: "出生時間は0時から23時の間で入力してください。",
    leapMonthWarning: "閏月情報は対応範囲内で処理され、一部の月齢解釈は慎重に提供されます。",
    dateDataFailed: "命盤計算に必要な日付データを準備できませんでした。",
    defaultName: "あなた",
  },
  "zh-CN": {
    missingBirth: "出生年月日缺失，无法计算命盘。",
    missingGender: "缺少性别信息，无法开始紫微斗数计算。",
    lunarConvertFailed: "无法将农历数据转换为公历。请重新确认输入值。",
    invalidDate: "出生日期格式无效。请重新确认月份和日期组合。",
    unknownHourWarning: "缺少出生时间，身宫和部分宫位解读的精度会受限。将在可行范围内以命宫为中心进行深入分析。",
    invalidHour: "出生时间必须在0点到23点之间。",
    leapMonthWarning: "闰月信息会在支持范围内处理，部分月令解读将保守提供。",
    dateDataFailed: "无法准备命盘计算所需的日期数据。",
    defaultName: "你",
  },
  "zh-TW": {
    missingBirth: "出生年月日缺失，無法計算命盤。",
    missingGender: "缺少性別資訊，無法開始紫微斗數計算。",
    lunarConvertFailed: "無法將農曆資料轉換為國曆。請重新確認輸入值。",
    invalidDate: "出生日期格式無效。請重新確認月份和日期組合。",
    unknownHourWarning: "缺少出生時間，身宮與部分宮位解讀的精度會受限。將在可行範圍內以命宮為中心進行深入分析。",
    invalidHour: "出生時間必須在0點到23點之間。",
    leapMonthWarning: "閏月資訊會在支援範圍內處理，部分月令解讀將保守提供。",
    dateDataFailed: "無法準備命盤計算所需的日期資料。",
    defaultName: "你",
  },
};

function getNormalizeZiweiCopy(locale?: LoadingLocale | string): NormalizeZiweiCopy {
  const activeLocale = locale ? normalizeLoadingLocale(locale) : getCurrentLoadingLocale();
  return NORMALIZE_ZIWEI_INPUT_TEXT_TRANSLATIONS[activeLocale] || NORMALIZE_ZIWEI_INPUT_TEXT_TRANSLATIONS.ko!;
}

export function normalizeZiweiInput(args: NormalizeZiweiInputArgs): NormalizeZiweiInputResult {
  const warnings: ZiweiInputWarning[] = [];
  const errors: ZiweiInputError[] = [];
  const copy = getNormalizeZiweiCopy(args.locale);

  const rawYear = toSafeNumber(args.birthYear, NaN);
  const rawMonth = toSafeNumber(args.birthMonth, NaN);
  const rawDay = toSafeNumber(args.birthDay, NaN);
  const rawHour = toSafeNumber(args.birthHour, 12);
  const rawMinute = toSafeNumber(args.birthMinute, 0);
  const unknownHour = Boolean(args.unknownHour);

  if (!Number.isFinite(rawYear) || !Number.isFinite(rawMonth) || !Number.isFinite(rawDay)) {
    errors.push({
      code: "MISSING_BIRTH_DATE",
      message: copy.missingBirth,
    });
  }

  let gender = normalizeGender(args.gender);
  if (!gender) {
    errors.push({
      code: "MISSING_GENDER",
      message: copy.missingGender,
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
        message: copy.lunarConvertFailed,
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
      message: copy.invalidDate,
    });
  }

  let birthHour = unknownHour ? 12 : rawHour;
  const birthMinute = Math.min(59, Math.max(0, rawMinute));
  if (unknownHour) {
    warnings.push({
      code: "MISSING_BIRTH_TIME",
      message: copy.unknownHourWarning,
    });
  }

  if (!Number.isFinite(birthHour) || birthHour < 0 || birthHour > 23) {
    errors.push({
      code: "INVALID_BIRTH_TIME",
      message: copy.invalidHour,
    });
    birthHour = 12;
  }

  if (calendarType === "lunar" && isLeapMonth) {
    warnings.push({
      code: "LEAP_MONTH_UNSUPPORTED",
      message: copy.leapMonthWarning,
    });
  }

  if (!touchSolarLibrary(year, month, day)) {
    errors.push({
      code: "NORMALIZATION_FAILED",
      message: copy.dateDataFailed,
    });
  }

  if (errors.length) {
    return { warnings, errors };
  }

  return {
    warnings,
    errors,
    input: {
      name: String(args.name || copy.defaultName).trim() || copy.defaultName,
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
