import type { SajuNewYearChapterBase } from "../common.types";

export type SajuNewYearChapterVSections = {
  yearlyRomanceOverview?: string;
  singleConnectionLuck?: string;
  existingPartnerFlow?: string;
  marriageAndPromiseLuck?: string;
  spousePalaceAndYearRelation?: string;
  maleChartJaeseongFlow?: string;
  femaleChartGwansungFlow?: string;
  charmLuckDohwaHongyeom?: string;
  familyRelationshipFlow?: string;
  emotionalVolatilityTiming?: string;
  conflictProneTiming?: string;
  deepeningRelationshipTiming?: string;
  breakupDistanceCautionFlow?: string;
  familyStabilityStrategy?: string;
  oneLineAdvice?: string;
};

export type SajuNewYearChapterVRomanceFamily = SajuNewYearChapterBase<
  "V",
  SajuNewYearChapterVSections
>;
