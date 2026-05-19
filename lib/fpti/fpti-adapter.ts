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
  return {
    year: Number.isFinite(year) ? year : 1995,
    month: Number.isFinite(month) ? month : 1,
    day: Number.isFinite(day) ? day : 1,
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

export async function analyzeFptiFromBirth(input: FptiFormInput): Promise<FptiAnalysisResult> {
  const parsedDate = parseBirthDate(input.birthDate);
  const parsedTime = parseBirthTime(input);

  const legacy = buildSajuProfile({
    name: input.name || "사용자",
    gender: input.gender || "OTHER",
    birth: {
      calendarType: input.calendarType,
      year: parsedDate.year,
      month: parsedDate.month,
      day: parsedDate.day,
      hour: parsedTime.hour,
      minute: parsedTime.minute,
      unknownTime: parsedTime.unknownTime,
    },
  }) as LegacySajuProfile;

  const source = toSourceData(legacy, parsedTime.unknownTime);
  return analyzeFpti(source);
}
