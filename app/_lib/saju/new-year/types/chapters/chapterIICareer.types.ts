import type { SajuNewYearChapterBase } from "../common.types";

export type SajuNewYearChapterIISections = {
  yearlyCareerOverview?: string;
  workOrgByGwansung?: string;
  performanceExpressionBySiksang?: string;
  profitLinkByJaeseong?: string;
  learningDocsByInseong?: string;
  jobChangePotential?: string;
  promotionAndEvaluation?: string;
  businessExpansionPotential?: string;
  workplaceConflictPotential?: string;
  highPerformanceTiming?: string;
  mistakeRiskTiming?: string;
  noblemanAndCollabLuck?: string;
  workStyleToAvoid?: string;
  coreCareerStrategy?: string;
  oneLineAdvice?: string;
};

export type SajuNewYearChapterIICareer = SajuNewYearChapterBase<
  "II",
  SajuNewYearChapterIISections
>;
