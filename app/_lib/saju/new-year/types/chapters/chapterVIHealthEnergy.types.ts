import type { SajuNewYearChapterBase } from "../common.types";

export type SajuNewYearChapterVISections = {
  yearlyHealthOverview?: string;
  healthWeakPointsByElement?: string;
  woodLiverNervous?: string;
  fireHeartBlood?: string;
  earthDigestive?: string;
  metalLungRespiratory?: string;
  waterKidneySleepImmune?: string;
  physicalFlowByJohu?: string;
  fatigueAccumulationTiming?: string;
  stressPeakTiming?: string;
  burnoutPotential?: string;
  accidentInjuryCautionFlow?: string;
  recoveryFriendlyRhythm?: string;
  healthPriority?: string;
  oneLineAdvice?: string;
};

export type SajuNewYearChapterVIHealthEnergy = SajuNewYearChapterBase<
  "VI",
  SajuNewYearChapterVISections
>;
