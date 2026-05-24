import type { SajuNewYearChapterBase } from "../common.types";

export type SajuNewYearChapterVIISections = {
  q1OverallFlow?: string;
  q1ShouldChoose?: string;
  q1ShouldAvoid?: string;
  q2OverallFlow?: string;
  q2ExpansionPotential?: string;
  q2RiskCaution?: string;
  q3OverallFlow?: string;
  q3RelationWealthCareerChange?: string;
  q3EmotionHealthManagement?: string;
  q4OverallFlow?: string;
  q4OutcomeRecoveryStrategy?: string;
  q4IssuesToClose?: string;
  quarterKeywords?: string;
  quarterGoStopJudgement?: string;
  mostImportantDecisionTiming?: string;
};

export type SajuNewYearChapterVIIQuarterDecision = SajuNewYearChapterBase<
  "VII",
  SajuNewYearChapterVIISections
>;
