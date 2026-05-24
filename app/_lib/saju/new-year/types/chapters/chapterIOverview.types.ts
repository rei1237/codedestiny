import type { SajuNewYearChapterBase } from "../common.types";

export type SajuNewYearChapterISections = {
  yearlyHeavenlyStemAnalysis?: string;
  yearlyEarthlyBranchAnalysis?: string;
  natalAndYearRelation?: string;
  strengthenedElements?: string;
  weakenedElements?: string;
  incomingTenGods?: string;
  yongshinHuisinAction?: string;
  gisinGushinAction?: string;
  hapChungHyungPaHaeStructure?: string;
  overallMood?: string;
  topLifeTheme?: string;
  mustCatchOpportunity?: string;
  cautionFlow?: string;
  oneLineKeyword?: string;
};

export type SajuNewYearChapterIOverview = SajuNewYearChapterBase<
  "I",
  SajuNewYearChapterISections
>;
