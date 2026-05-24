import type {
  SajuNewYearChapterBase,
  SajuNewYearMonthlyGoStopRow,
} from "../common.types";

export type SajuNewYearChapterIXSections = {
  monthlyFortuneAndGoStopPoints?: string;
  monthlyCareerCore?: string;
  monthlyWealthCore?: string;
  monthlyRelationshipCore?: string;
  monthlyHealthCore?: string;
  monthlyShouldDo?: string;
  monthlyShouldAvoid?: string;
};

export type SajuNewYearChapterIXMonthlyTable = SajuNewYearChapterBase<
  "IX",
  SajuNewYearChapterIXSections
> & {
  monthlyRows: SajuNewYearMonthlyGoStopRow[];
};
