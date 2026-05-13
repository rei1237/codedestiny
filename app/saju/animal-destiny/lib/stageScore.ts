import type { TwelveStage } from "./types";

export interface StageScore {
  love: number;
  career: number;
  social: number;
  luck: number;
}

export const STAGE_SCORE_PRESETS: Record<TwelveStage, StageScore> = {
  장생: { love: 72, career: 68, social: 78, luck: 82 },
  목욕: { love: 88, career: 64, social: 84, luck: 70 },
  관대: { love: 74, career: 82, social: 80, luck: 76 },
  건록: { love: 76, career: 91, social: 78, luck: 73 },
  제왕: { love: 79, career: 95, social: 86, luck: 81 },
  쇠: { love: 72, career: 84, social: 75, luck: 69 },
  병: { love: 68, career: 70, social: 66, luck: 64 },
  사: { love: 64, career: 76, social: 61, luck: 67 },
  묘: { love: 70, career: 80, social: 63, luck: 72 },
  절: { love: 62, career: 74, social: 60, luck: 71 },
  태: { love: 78, career: 69, social: 76, luck: 84 },
  양: { love: 80, career: 72, social: 82, luck: 79 },
};

export function getStageScore(stage: TwelveStage | null | undefined): StageScore {
  if (!stage) return { love: 70, career: 70, social: 70, luck: 70 };
  return STAGE_SCORE_PRESETS[stage];
}
