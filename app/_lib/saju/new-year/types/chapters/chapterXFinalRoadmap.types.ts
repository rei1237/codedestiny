import type { SajuNewYearChapterBase } from "../common.types";

export type SajuNewYearChapterXSections = {
  yearlyCoreSummary?: string;
  mustLeverageOpportunity?: string;
  mustReduceRisk?: string;
  finalCareerBusinessStrategy?: string;
  finalWealthStrategy?: string;
  finalRelationshipStrategy?: string;
  finalRomanceFamilyStrategy?: string;
  finalHealthMentalStrategy?: string;
  firstHalfExecutionPlan?: string;
  secondHalfExecutionPlan?: string;
  yearEndRecoveryStrategy?: string;
  issuesNotToCarryOver?: string;
  nextYearFoundationPreparation?: string;
  finalActionGuideline?: string;
  oneLineAdvice?: string;
};

export type SajuNewYearChapterXFinalRoadmap = SajuNewYearChapterBase<
  "X",
  SajuNewYearChapterXSections
>;
