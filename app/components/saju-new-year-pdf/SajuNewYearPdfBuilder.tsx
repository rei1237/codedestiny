import type { SajuNewYearReportData } from "@/app/_lib/saju/new-year/types";
import NewYearCh1_Overview from "./NewYearCh1_Overview";
import NewYearCh2_Career from "./NewYearCh2_Career";
import NewYearCh3_Wealth from "./NewYearCh3_Wealth";
import NewYearCh4_Relationship from "./NewYearCh4_Relationship";
import NewYearCh5_RomanceFamily from "./NewYearCh5_RomanceFamily";
import NewYearCh6_HealthEnergy from "./NewYearCh6_HealthEnergy";
import NewYearCh7_QuarterDecision from "./NewYearCh7_QuarterDecision";
import NewYearCh8_RiskPlan from "./NewYearCh8_RiskPlan";
import NewYearCh9_MonthlyTable from "./NewYearCh9_MonthlyTable";
import NewYearCh10_FinalRoadmap from "./NewYearCh10_FinalRoadmap";

type Props = {
  report: SajuNewYearReportData | null | undefined;
};

export default function SajuNewYearPdfBuilder({ report }: Props) {
  const chapters = report?.chapters;

  return (
    <article>
      <NewYearCh1_Overview chapter={chapters?.I} />
      <NewYearCh2_Career chapter={chapters?.II} />
      <NewYearCh3_Wealth chapter={chapters?.III} />
      <NewYearCh4_Relationship chapter={chapters?.IV} />
      <NewYearCh5_RomanceFamily chapter={chapters?.V} />
      <NewYearCh6_HealthEnergy chapter={chapters?.VI} />
      <NewYearCh7_QuarterDecision chapter={chapters?.VII} />
      <NewYearCh8_RiskPlan chapter={chapters?.VIII} />
      <NewYearCh9_MonthlyTable chapter={chapters?.IX} />
      <NewYearCh10_FinalRoadmap chapter={chapters?.X} />
    </article>
  );
}
