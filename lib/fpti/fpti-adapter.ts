import { buildSajuProfile } from "../../worker/lib/destiny-bias-engine.js";
import { analyzeFpti } from "./fpti-engine";
import type { FptiAnalysisResult, FptiFormInput, FptiSourceData } from "./fpti-types";

type LegacySajuProfile = {
  pillars?: {
    year?: { ganji?: string; stem?: string; branch?: string };
    month?: { ganji?: string; stem?: string; branch?: string };
    day?: { ganji?: string; stem?: string; branch?: string };
    hour?: { ganji?: string; stem?: string; branch?: string };
  };
  dayMaster?: {
    stem?: string;
    element?: "wood" | "fire" | "earth" | "metal" | "water";
  };
  fiveElements?: {
    scores?: {
      wood?: number;
      fire?: number;
      earth?: number;
      metal?: number;
      water?: number;
    };
  };
  tenGods?: {
    counts?: {
      비견?: number;
      겁재?: number;
      식신?: number;
      상관?: number;
      정재?: number;
      편재?: number;
      정관?: number;
      편관?: number;
      정인?: number;
      편인?: number;
    };
    dominant?: string;
  };
  usefulGods?: {
    yong?: string;
    hee?: string[];
    gi?: string[];
    strength?: "strong" | "weak" | "balanced";
  };
};

function monthBranchToSeason(branch: string) {
  if (["寅", "卯", "辰"].includes(branch)) return "spring";
  if (["巳", "午", "未"].includes(branch)) return "summer";
  if (["申", "酉", "戌"].includes(branch)) return "autumn";
  return "winter";
}

function normalizeCalendarType(raw: unknown): FptiFormInput["calendarType"] {
  const value = String(raw || "").trim().toLowerCase();
  if (value === "lunar_leap" || value.includes("leap") || value.includes("윤")) return "lunar_leap";
  if (value === "lunar" || value.includes("음")) return "lunar";
  return "solar";
}

function isValidSolarDate(year: number, month: number, day: number) {
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year
    && date.getUTCMonth() + 1 === month
    && date.getUTCDate() === day;
}

function parseBirthDate(
  birthDate: string,
  calendarType: FptiFormInput["calendarType"],
): { year: number; month: number; day: number } | null {
  const raw = String(birthDate || "").trim();
  if (!raw) return null;

  const isoLike = raw.match(/^(\d{4}-\d{1,2}-\d{1,2})T/i);
  const source = isoLike ? isoLike[1] : raw;

  let year = NaN;
  let month = NaN;
  let day = NaN;

  const standard = source.match(/^(\d{4})[-./](\d{1,2})[-./](\d{1,2})$/);
  if (standard) {
    year = Number(standard[1]);
    month = Number(standard[2]);
    day = Number(standard[3]);
  } else {
    const compact = source.match(/^(\d{4})(\d{2})(\d{2})$/);
    if (compact) {
      year = Number(compact[1]);
      month = Number(compact[2]);
      day = Number(compact[3]);
    } else {
      const korean = source.match(/^(\d{4})\s*년\s*(\d{1,2})\s*월\s*(\d{1,2})\s*일$/);
      if (korean) {
        year = Number(korean[1]);
        month = Number(korean[2]);
        day = Number(korean[3]);
      }
    }
  }

  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    return null;
  }

  if (year <= 0 || month < 1 || month > 12 || day < 1 || day > 31) {
    return null;
  }

  if (calendarType === "solar" && !isValidSolarDate(year, month, day)) {
    return null;
  }

  return { year, month, day };
}

function parseHourMinute(hour: number, minute: number): { hour: number; minute: number } | null {
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return {
    hour: Math.trunc(hour),
    minute: Math.trunc(minute),
  };
}

function parseBirthTimeText(raw: string): { hour: number; minute: number } | null {
  const source = String(raw || "").trim();
  if (!source) return null;

  const sourceNoMillis = source.replace(/\.\d+Z?$/i, "");
  const isoLike = sourceNoMillis.match(/T(\d{1,2}:\d{1,2}(?::\d{1,2})?)$/);
  const timeSource = (isoLike ? isoLike[1] : sourceNoMillis).trim();

  const colon = timeSource.match(/^(\d{1,2})\s*:\s*(\d{1,2})(?:\s*:\s*(\d{1,2}))?$/);
  if (colon) return parseHourMinute(Number(colon[1]), Number(colon[2]));

  const compact = timeSource.match(/^(\d{1,2})(\d{2})$/);
  if (compact) return parseHourMinute(Number(compact[1]), Number(compact[2]));

  const normalized = timeSource.replace(/\s+/g, "");
  const hasPm = /오후|pm/i.test(normalized);
  const hasAm = /오전|am/i.test(normalized);
  const cleaned = normalized.replace(/오전|오후|am|pm/gi, "");
  const korean = cleaned.match(/^(\d{1,2})(?:시)?(?:(\d{1,2})분?)?$/);
  if (!korean) return null;

  let hour = Number(korean[1]);
  const minute = Number(korean[2] || "0");
  if (hasPm && hour >= 1 && hour <= 11) hour += 12;
  if (hasAm && hour === 12) hour = 0;

  return parseHourMinute(hour, minute);
}

function parseBirthTime(input: FptiFormInput) {
  if (input.timeUnknown) {
    return { hour: 12, minute: 0, unknownTime: true };
  }

  const parsed = parseBirthTimeText(String(input.birthTime || ""));
  if (!parsed) {
    throw new Error("태어난 시간 형식이 올바르지 않습니다.");
  }

  return {
    hour: parsed.hour,
    minute: parsed.minute,
    unknownTime: false,
  };
}

export function hasRequiredSajuFields(input: FptiFormInput | null | undefined): boolean {
  if (!input?.birthDate || !input?.calendarType) return false;
  if (!input?.timeUnknown && !String(input?.birthTime || "").trim()) return false;
  return true;
}

function strengthToScore(strength?: "strong" | "weak" | "balanced") {
  if (strength === "strong") return 72;
  if (strength === "weak") return 42;
  return 56;
}

function toSourceData(profile: LegacySajuProfile, timeUnknown: boolean): FptiSourceData {
  const pillars = profile.pillars || {};
  const monthBranch = String(pillars.month?.branch || "子");

  return {
    pillars: {
      year: String(pillars.year?.ganji || `${pillars.year?.stem || ""}${pillars.year?.branch || ""}`),
      month: String(pillars.month?.ganji || `${pillars.month?.stem || ""}${pillars.month?.branch || ""}`),
      day: String(pillars.day?.ganji || `${pillars.day?.stem || ""}${pillars.day?.branch || ""}`),
      hour: timeUnknown ? undefined : String(pillars.hour?.ganji || `${pillars.hour?.stem || ""}${pillars.hour?.branch || ""}`),
    },
    dayMaster: String(profile.dayMaster?.stem || "戊"),
    dayMasterElement: profile.dayMaster?.element || "earth",
    fiveElements: {
      wood: Number(profile.fiveElements?.scores?.wood || 0),
      fire: Number(profile.fiveElements?.scores?.fire || 0),
      earth: Number(profile.fiveElements?.scores?.earth || 0),
      metal: Number(profile.fiveElements?.scores?.metal || 0),
      water: Number(profile.fiveElements?.scores?.water || 0),
    },
    tenGods: {
      biGyeon: Number(profile.tenGods?.counts?.비견 || 0),
      geopJae: Number(profile.tenGods?.counts?.겁재 || 0),
      sikSin: Number(profile.tenGods?.counts?.식신 || 0),
      sangGwan: Number(profile.tenGods?.counts?.상관 || 0),
      jeongJae: Number(profile.tenGods?.counts?.정재 || 0),
      pyeonJae: Number(profile.tenGods?.counts?.편재 || 0),
      jeongGwan: Number(profile.tenGods?.counts?.정관 || 0),
      pyeonGwan: Number(profile.tenGods?.counts?.편관 || 0),
      jeongIn: Number(profile.tenGods?.counts?.정인 || 0),
      pyeonIn: Number(profile.tenGods?.counts?.편인 || 0),
    },
    season: monthBranchToSeason(monthBranch),
    monthBranch,
    usefulGods: [profile.usefulGods?.yong, ...(profile.usefulGods?.hee || [])].filter(Boolean) as string[],
    favorableElements: [...(profile.usefulGods?.hee || [])],
    unfavorableElements: [...(profile.usefulGods?.gi || [])],
    strengthScore: strengthToScore(profile.usefulGods?.strength),
    structureType: String(profile.tenGods?.dominant || "").toLowerCase(),
  };
}

export function calculateSajuSourceFromBirth(input: FptiFormInput): FptiSourceData {
  if (!hasRequiredSajuFields(input)) {
    throw new Error("필수 출생 정보가 누락되었습니다.");
  }

  const calendarType = normalizeCalendarType(input.calendarType);
  const parsedDate = parseBirthDate(input.birthDate, calendarType);
  if (!parsedDate) {
    throw new Error("생년월일 형식이 올바르지 않습니다.");
  }

  const parsedTime = parseBirthTime(input);
  let legacy: LegacySajuProfile;
  try {
    const birthRegion = String(input?.birthRegion || "").trim() || "대한민국";
    legacy = buildSajuProfile({
      name: String(input?.name || "사용자").trim() || "사용자",
      gender: input?.gender || "OTHER",
      timezone: "Asia/Seoul",
      location: {
        name: birthRegion,
        timezone: "Asia/Seoul",
      },
      hourPillarTimePolicy: "LOCAL_MEAN_TIME",
      dayChangePolicy: "MIDNIGHT",
      birth: {
        calendarType,
        year: parsedDate.year,
        month: parsedDate.month,
        day: parsedDate.day,
        hour: parsedTime.hour,
        minute: parsedTime.minute,
        timezone: "Asia/Seoul",
        birthPlace: birthRegion,
        unknownTime: parsedTime.unknownTime,
      },
    }) as LegacySajuProfile;
  } catch (e) {
    throw new Error("사주 원국 계산에 실패했습니다. 날짜/시간/양음력 입력을 확인해 주세요.");
  }

  return toSourceData(legacy, parsedTime.unknownTime);
}

export function analyzeFptiFromSajuSource(source: FptiSourceData): FptiAnalysisResult {
  return analyzeFpti(source);
}

export async function analyzeFptiFromBirth(input: FptiFormInput): Promise<FptiAnalysisResult> {
  const source = calculateSajuSourceFromBirth(input);
  return analyzeFptiFromSajuSource(source);
}
