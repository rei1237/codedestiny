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

function parseBirthDate(birthDate: string) {
  const [year, month, day] = String(birthDate || "").split("-").map((token) => Number(token));
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    return null;
  }
  if (year <= 0 || month < 1 || month > 12 || day < 1 || day > 31) {
    return null;
  }
  return {
    year,
    month,
    day,
  };
}

function parseBirthTime(input: FptiFormInput) {
  if (input.timeUnknown) {
    return { hour: 12, minute: 0, unknownTime: true };
  }

  const [hourRaw, minuteRaw] = String(input.birthTime || "12:00").split(":");
  const hour = Number(hourRaw);
  const minute = Number(minuteRaw);

  return {
    hour: Number.isFinite(hour) ? hour : 12,
    minute: Number.isFinite(minute) ? minute : 0,
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

  const parsedDate = parseBirthDate(input.birthDate);
  if (!parsedDate) {
    throw new Error("생년월일 형식이 올바르지 않습니다.");
  }

  const parsedTime = parseBirthTime(input);
  const legacy = buildSajuProfile({
    name: String(input?.name || "사용자").trim() || "사용자",
    gender: input?.gender || "OTHER",
    birth: {
      calendarType: input?.calendarType,
      year: parsedDate.year,
      month: parsedDate.month,
      day: parsedDate.day,
      hour: parsedTime.hour,
      minute: parsedTime.minute,
      unknownTime: parsedTime.unknownTime,
    },
  }) as LegacySajuProfile;

  return toSourceData(legacy, parsedTime.unknownTime);
}

export function analyzeFptiFromSajuSource(source: FptiSourceData): FptiAnalysisResult {
  return analyzeFpti(source);
}

export async function analyzeFptiFromBirth(input: FptiFormInput): Promise<FptiAnalysisResult> {
  const source = calculateSajuSourceFromBirth(input);
  return analyzeFptiFromSajuSource(source);
}
