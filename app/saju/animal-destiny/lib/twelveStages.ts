import type { BranchKo, SajuEngineResult, StemKo, TwelveStage, TwelveStagePillars } from "./types";

const STEM_KO_LIST: StemKo[] = ["갑", "을", "병", "정", "무", "기", "경", "신", "임", "계"];
const BRANCH_KO_LIST: BranchKo[] = ["자", "축", "인", "묘", "진", "사", "오", "미", "신", "유", "술", "해"];

const STEM_HAN_TO_KO: Record<string, StemKo> = {
  甲: "갑",
  乙: "을",
  丙: "병",
  丁: "정",
  戊: "무",
  己: "기",
  庚: "경",
  辛: "신",
  壬: "임",
  癸: "계",
};

const BRANCH_HAN_TO_KO: Record<string, BranchKo> = {
  子: "자",
  丑: "축",
  寅: "인",
  卯: "묘",
  辰: "진",
  巳: "사",
  午: "오",
  未: "미",
  申: "신",
  酉: "유",
  戌: "술",
  亥: "해",
};

const TWELVE_STAGE_TABLE: Record<StemKo, Record<BranchKo, TwelveStage>> = {
  갑: { 해: "장생", 자: "목욕", 축: "관대", 인: "건록", 묘: "제왕", 진: "쇠", 사: "병", 오: "사", 미: "묘", 신: "절", 유: "태", 술: "양" },
  을: { 오: "장생", 사: "목욕", 진: "관대", 묘: "건록", 인: "제왕", 축: "쇠", 자: "병", 해: "사", 술: "묘", 유: "절", 신: "태", 미: "양" },
  병: { 인: "장생", 묘: "목욕", 진: "관대", 사: "건록", 오: "제왕", 미: "쇠", 신: "병", 유: "사", 술: "묘", 해: "절", 자: "태", 축: "양" },
  정: { 유: "장생", 신: "목욕", 미: "관대", 오: "건록", 사: "제왕", 진: "쇠", 묘: "병", 인: "사", 축: "묘", 자: "절", 해: "태", 술: "양" },
  무: { 인: "장생", 묘: "목욕", 진: "관대", 사: "건록", 오: "제왕", 미: "쇠", 신: "병", 유: "사", 술: "묘", 해: "절", 자: "태", 축: "양" },
  기: { 유: "장생", 신: "목욕", 미: "관대", 오: "건록", 사: "제왕", 진: "쇠", 묘: "병", 인: "사", 축: "묘", 자: "절", 해: "태", 술: "양" },
  경: { 사: "장생", 오: "목욕", 미: "관대", 신: "건록", 유: "제왕", 술: "쇠", 해: "병", 자: "사", 축: "묘", 인: "절", 묘: "태", 진: "양" },
  신: { 자: "장생", 해: "목욕", 술: "관대", 유: "건록", 신: "제왕", 미: "쇠", 오: "병", 사: "사", 진: "묘", 묘: "절", 인: "태", 축: "양" },
  임: { 신: "장생", 유: "목욕", 술: "관대", 해: "건록", 자: "제왕", 축: "쇠", 인: "병", 묘: "사", 진: "묘", 사: "절", 오: "태", 미: "양" },
  계: { 묘: "장생", 인: "목욕", 축: "관대", 자: "건록", 해: "제왕", 술: "쇠", 유: "병", 신: "사", 미: "묘", 오: "절", 사: "태", 진: "양" },
};

function pickChar(source: string, list: string[]) {
  for (let i = 0; i < source.length; i += 1) {
    const ch = source[i];
    if (list.includes(ch)) return ch;
  }
  return "";
}

export function normalizeStem(value: unknown): StemKo | null {
  const raw = String(value || "").trim();
  if (!raw) return null;

  const han = pickChar(raw, Object.keys(STEM_HAN_TO_KO));
  if (han) return STEM_HAN_TO_KO[han];

  const ko = pickChar(raw, STEM_KO_LIST);
  if (ko) return ko as StemKo;

  return null;
}

export function normalizeBranch(value: unknown): BranchKo | null {
  const raw = String(value || "").trim();
  if (!raw) return null;

  const han = pickChar(raw, Object.keys(BRANCH_HAN_TO_KO));
  if (han) return BRANCH_HAN_TO_KO[han];

  const ko = pickChar(raw, BRANCH_KO_LIST);
  if (ko) return ko as BranchKo;

  return null;
}

function toRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function extractStemFromPillar(pillar: unknown): StemKo | null {
  const p = toRecord(pillar);
  return (
    normalizeStem(p.stem) ||
    normalizeStem(p.gan) ||
    normalizeStem(p.g) ||
    normalizeStem(p.heavenlyStem) ||
    normalizeStem(p.dayMaster) ||
    normalizeStem(p.ganji) ||
    normalizeStem(p.pillar)
  );
}

function extractBranchFromPillar(pillar: unknown): BranchKo | null {
  const p = toRecord(pillar);
  return (
    normalizeBranch(p.branch) ||
    normalizeBranch(p.zhi) ||
    normalizeBranch(p.z) ||
    normalizeBranch(p.earthlyBranch) ||
    normalizeBranch(p.ganji) ||
    normalizeBranch(p.pillar)
  );
}

function pickPillar(source: Record<string, unknown>, key: "year" | "month" | "day" | "hour") {
  const pillars = toRecord(source.pillars);
  const fourPillars = toRecord(source.fourPillars);

  const shortMap: Record<string, string> = {
    year: "y",
    month: "m",
    day: "d",
    hour: "h",
  };

  return (
    pillars[key] ||
    pillars[shortMap[key]] ||
    fourPillars[key] ||
    source[key]
  );
}

function extractDayStem(source: Record<string, unknown>): StemKo | null {
  const dayMaster = toRecord(source.dayMaster);
  const fromDayPillar = extractStemFromPillar(pickPillar(source, "day"));

  return (
    normalizeStem(dayMaster.stem) ||
    normalizeStem(source.dayMasterGanKr) ||
    normalizeStem(source.dayMaster) ||
    normalizeStem(source.dayStem) ||
    fromDayPillar
  );
}

export function validateTwelveStageInput(dayStem: unknown, branch: unknown) {
  const stem = normalizeStem(dayStem);
  const normalizedBranch = normalizeBranch(branch);

  if (!stem || !normalizedBranch) {
    return {
      ok: false,
      error: "잘못된 천간/지지 입력입니다.",
    };
  }

  return {
    ok: true,
    dayStem: stem,
    branch: normalizedBranch,
  };
}

export function getTwelveStage(dayStem: unknown, branch: unknown): TwelveStage | null {
  const validated = validateTwelveStageInput(dayStem, branch);
  if (!validated.ok) return null;
  return TWELVE_STAGE_TABLE[validated.dayStem][validated.branch];
}

export function getTwelveStagesForPillars(sajuResult: SajuEngineResult): TwelveStagePillars {
  const source = toRecord(sajuResult);
  const dayStem = extractDayStem(source);
  if (!dayStem) return {};

  const yearBranch = extractBranchFromPillar(pickPillar(source, "year"));
  const monthBranch = extractBranchFromPillar(pickPillar(source, "month"));
  const dayBranch = extractBranchFromPillar(pickPillar(source, "day"));
  const hourBranch = extractBranchFromPillar(pickPillar(source, "hour"));

  return {
    primary: dayBranch ? getTwelveStage(dayStem, dayBranch) || undefined : undefined,
    year: yearBranch ? getTwelveStage(dayStem, yearBranch) || undefined : undefined,
    month: monthBranch ? getTwelveStage(dayStem, monthBranch) || undefined : undefined,
    day: dayBranch ? getTwelveStage(dayStem, dayBranch) || undefined : undefined,
    hour: hourBranch ? getTwelveStage(dayStem, hourBranch) || undefined : undefined,
  };
}

export function getPrimaryAnimalStage(sajuResult: SajuEngineResult): TwelveStage | null {
  const stages = getTwelveStagesForPillars(sajuResult);
  return stages.primary || null;
}

export function getNormalizedSajuCore(sajuResult: SajuEngineResult) {
  const source = toRecord(sajuResult);
  return {
    dayStem: extractDayStem(source),
    yearBranch: extractBranchFromPillar(pickPillar(source, "year")),
    monthBranch: extractBranchFromPillar(pickPillar(source, "month")),
    dayBranch: extractBranchFromPillar(pickPillar(source, "day")),
    hourBranch: extractBranchFromPillar(pickPillar(source, "hour")),
  };
}

type PillarKey = "year" | "month" | "day" | "hour";

export interface FourPillarStageItem {
  pillar: PillarKey;
  stem: StemKo | null;
  branch: BranchKo | null;
  stage?: TwelveStage;
}

export function getFourPillarStageItems(sajuResult: SajuEngineResult): Record<PillarKey, FourPillarStageItem> {
  const source = toRecord(sajuResult);
  const dayStem = extractDayStem(source);

  const yearPillar = pickPillar(source, "year");
  const monthPillar = pickPillar(source, "month");
  const dayPillar = pickPillar(source, "day");
  const hourPillar = pickPillar(source, "hour");

  const yearStem = extractStemFromPillar(yearPillar);
  const monthStem = extractStemFromPillar(monthPillar);
  const dayPillarStem = extractStemFromPillar(dayPillar);
  const hourStem = extractStemFromPillar(hourPillar);

  const yearBranch = extractBranchFromPillar(yearPillar);
  const monthBranch = extractBranchFromPillar(monthPillar);
  const dayBranch = extractBranchFromPillar(dayPillar);
  const hourBranch = extractBranchFromPillar(hourPillar);

  const calc = (branch: BranchKo | null): TwelveStage | undefined => {
    if (!dayStem || !branch) return undefined;
    return getTwelveStage(dayStem, branch) || undefined;
  };

  return {
    year: {
      pillar: "year",
      stem: yearStem,
      branch: yearBranch,
      stage: calc(yearBranch),
    },
    month: {
      pillar: "month",
      stem: monthStem,
      branch: monthBranch,
      stage: calc(monthBranch),
    },
    day: {
      pillar: "day",
      stem: dayPillarStem || dayStem,
      branch: dayBranch,
      stage: calc(dayBranch),
    },
    hour: {
      pillar: "hour",
      stem: hourStem,
      branch: hourBranch,
      stage: calc(hourBranch),
    },
  };
}

export const __TWELVE_STAGE_TESTING__ = {
  STEM_KO_LIST,
  BRANCH_KO_LIST,
  TWELVE_STAGE_TABLE,
};
