import type { NewYearChapterKey } from "./common.types";
import type { SajuNewYearChapterIOverview } from "./chapters/chapterIOverview.types";
import type { SajuNewYearChapterIICareer } from "./chapters/chapterIICareer.types";
import type { SajuNewYearChapterIIIWealth } from "./chapters/chapterIIIWealth.types";
import type { SajuNewYearChapterIVRelationship } from "./chapters/chapterIVRelationship.types";
import type { SajuNewYearChapterVRomanceFamily } from "./chapters/chapterVRomanceFamily.types";
import type { SajuNewYearChapterVIHealthEnergy } from "./chapters/chapterVIHealthEnergy.types";
import type { SajuNewYearChapterVIIQuarterDecision } from "./chapters/chapterVIIQuarterDecision.types";
import type { SajuNewYearChapterVIIIRiskPlan } from "./chapters/chapterVIIIRiskPlan.types";
import type { SajuNewYearChapterIXMonthlyTable } from "./chapters/chapterIXMonthlyTable.types";
import type { SajuNewYearChapterXFinalRoadmap } from "./chapters/chapterXFinalRoadmap.types";

export type SajuNewYearReportData = {
  reportId?: string;
  reportSessionId?: string;
  generatedAt?: string;
  targetYear: number;
  locale?: string;
  chapters: {
    I: SajuNewYearChapterIOverview;
    II: SajuNewYearChapterIICareer;
    III: SajuNewYearChapterIIIWealth;
    IV: SajuNewYearChapterIVRelationship;
    V: SajuNewYearChapterVRomanceFamily;
    VI: SajuNewYearChapterVIHealthEnergy;
    VII: SajuNewYearChapterVIIQuarterDecision;
    VIII: SajuNewYearChapterVIIIRiskPlan;
    IX: SajuNewYearChapterIXMonthlyTable;
    X: SajuNewYearChapterXFinalRoadmap;
  };
  navigationBlueprint: Array<{
    chapterKey: NewYearChapterKey;
    title: string;
    itemLabels: string[];
  }>;
  renderGuards?: {
    missingFields?: string[];
    fallbackReason?: string;
    sourceVersion?: string;
  };
};
