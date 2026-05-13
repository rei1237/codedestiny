export type HeavenlyStem = "甲" | "乙" | "丙" | "丁" | "戊" | "己" | "庚" | "辛" | "壬" | "癸";

export type EarthlyBranch = "子" | "丑" | "寅" | "卯" | "辰" | "巳" | "午" | "未" | "申" | "酉" | "戌" | "亥";

export type TwelveLifeStage =
  | "장생"
  | "목욕"
  | "관대"
  | "건록"
  | "제왕"
  | "쇠"
  | "병"
  | "사"
  | "묘"
  | "절"
  | "태"
  | "양";

export const TWELVE_LIFE_STAGE_TABLE: Record<HeavenlyStem, Record<EarthlyBranch, TwelveLifeStage>> = {
  甲: { 亥: "장생", 子: "목욕", 丑: "관대", 寅: "건록", 卯: "제왕", 辰: "쇠", 巳: "병", 午: "사", 未: "묘", 申: "절", 酉: "태", 戌: "양" },
  乙: { 午: "장생", 巳: "목욕", 辰: "관대", 卯: "건록", 寅: "제왕", 丑: "쇠", 子: "병", 亥: "사", 戌: "묘", 酉: "절", 申: "태", 未: "양" },
  丙: { 寅: "장생", 卯: "목욕", 辰: "관대", 巳: "건록", 午: "제왕", 未: "쇠", 申: "병", 酉: "사", 戌: "묘", 亥: "절", 子: "태", 丑: "양" },
  丁: { 酉: "장생", 申: "목욕", 未: "관대", 午: "건록", 巳: "제왕", 辰: "쇠", 卯: "병", 寅: "사", 丑: "묘", 子: "절", 亥: "태", 戌: "양" },
  戊: { 寅: "장생", 卯: "목욕", 辰: "관대", 巳: "건록", 午: "제왕", 未: "쇠", 申: "병", 酉: "사", 戌: "묘", 亥: "절", 子: "태", 丑: "양" },
  己: { 酉: "장생", 申: "목욕", 未: "관대", 午: "건록", 巳: "제왕", 辰: "쇠", 卯: "병", 寅: "사", 丑: "묘", 子: "절", 亥: "태", 戌: "양" },
  庚: { 巳: "장생", 午: "목욕", 未: "관대", 申: "건록", 酉: "제왕", 戌: "쇠", 亥: "병", 子: "사", 丑: "묘", 寅: "절", 卯: "태", 辰: "양" },
  辛: { 子: "장생", 亥: "목욕", 戌: "관대", 酉: "건록", 申: "제왕", 未: "쇠", 午: "병", 巳: "사", 辰: "묘", 卯: "절", 寅: "태", 丑: "양" },
  壬: { 申: "장생", 酉: "목욕", 戌: "관대", 亥: "건록", 子: "제왕", 丑: "쇠", 寅: "병", 卯: "사", 辰: "묘", 巳: "절", 午: "태", 未: "양" },
  癸: { 卯: "장생", 寅: "목욕", 丑: "관대", 子: "건록", 亥: "제왕", 戌: "쇠", 酉: "병", 申: "사", 未: "묘", 午: "절", 巳: "태", 辰: "양" },
};

export function getTwelveLifeStage(dayStem: HeavenlyStem, targetBranch: EarthlyBranch): TwelveLifeStage {
  const result = TWELVE_LIFE_STAGE_TABLE[dayStem]?.[targetBranch];
  if (!result) {
    throw new Error(`[TwelveLifeStage] Invalid mapping: dayStem=${dayStem}, targetBranch=${targetBranch}`);
  }
  return result;
}

export interface FourPillarsInput {
  year: { stem: HeavenlyStem; branch: EarthlyBranch };
  month: { stem: HeavenlyStem; branch: EarthlyBranch };
  day: { stem: HeavenlyStem; branch: EarthlyBranch };
  hour?: { stem: HeavenlyStem; branch: EarthlyBranch } | null;
}

export function calculateFourPillarTwelveStages(fourPillars: FourPillarsInput) {
  const dayStem = fourPillars.day.stem;

  return {
    year: {
      pillar: "year" as const,
      stem: fourPillars.year.stem,
      branch: fourPillars.year.branch,
      stage: getTwelveLifeStage(dayStem, fourPillars.year.branch),
    },
    month: {
      pillar: "month" as const,
      stem: fourPillars.month.stem,
      branch: fourPillars.month.branch,
      stage: getTwelveLifeStage(dayStem, fourPillars.month.branch),
    },
    day: {
      pillar: "day" as const,
      stem: fourPillars.day.stem,
      branch: fourPillars.day.branch,
      stage: getTwelveLifeStage(dayStem, fourPillars.day.branch),
    },
    hour: fourPillars.hour
      ? {
          pillar: "hour" as const,
          stem: fourPillars.hour.stem,
          branch: fourPillars.hour.branch,
          stage: getTwelveLifeStage(dayStem, fourPillars.hour.branch),
        }
      : null,
  };
}
