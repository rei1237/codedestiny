import type {
  SukuyoChapterId,
  SukuyoCompatibilityReportData,
} from "../../types/sukuyo-compat-report/sukuyoCompatibilityReport.types";
import { SukuyoCh1_Summary } from "./chapters/SukuyoCh1_Summary";
import { SukuyoCh2_Personality } from "./chapters/SukuyoCh2_Personality";
import { SukuyoCh3_RelationType } from "./chapters/SukuyoCh3_RelationType";
import { SukuyoCh4_Distance } from "./chapters/SukuyoCh4_Distance";
import { SukuyoCh5_FirstAttraction } from "./chapters/SukuyoCh5_FirstAttraction";
import { SukuyoCh6_Emotion } from "./chapters/SukuyoCh6_Emotion";
import { SukuyoCh7_Love } from "./chapters/SukuyoCh7_Love";
import { SukuyoCh8_Marriage } from "./chapters/SukuyoCh8_Marriage";
import { SukuyoCh9_Conflict } from "./chapters/SukuyoCh9_Conflict";
import { SukuyoCh10_RiskPair } from "./chapters/SukuyoCh10_RiskPair";
import { SukuyoCh11_LongBond } from "./chapters/SukuyoCh11_LongBond";
import { SukuyoCh12_Intimacy } from "./chapters/SukuyoCh12_Intimacy";
import { SukuyoCh13_ReunionBreakup } from "./chapters/SukuyoCh13_ReunionBreakup";
import { SukuyoCh14_Timing } from "./chapters/SukuyoCh14_Timing";
import { SukuyoCh15_Reality } from "./chapters/SukuyoCh15_Reality";
import { SukuyoCh16_Final } from "./chapters/SukuyoCh16_Final";
import { normalizeSukuyoCompatibilityReport } from "./normalizeSukuyoCompatibilityReport";

const CHAPTER_ORDER: readonly SukuyoChapterId[] = [
  "I", "II", "III", "IV", "V", "VI", "VII", "VIII",
  "IX", "X", "XI", "XII", "XIII", "XIV", "XV", "XVI",
];

function dedupeChapterOrder(order: readonly SukuyoChapterId[]): SukuyoChapterId[] {
  const seen = new Set<string>();
  const output: SukuyoChapterId[] = [];
  for (const id of order) {
    if (seen.has(id)) continue;
    seen.add(id);
    output.push(id);
  }
  return output;
}

export function SukuyoCompatibilityReportBuilder({
  report,
}: {
  report: SukuyoCompatibilityReportData;
}) {
  const normalized = normalizeSukuyoCompatibilityReport(report);
  const renderOrder = dedupeChapterOrder(normalized.chapterOrder?.length ? normalized.chapterOrder : CHAPTER_ORDER);

  return (
    <article data-sukuyo-report-mode="compatibility">
      {renderOrder.map((chapterId) => {
        switch (chapterId) {
          case "I":
            return <SukuyoCh1_Summary key={chapterId} chapter={normalized.chapters.I} />;
          case "II":
            return <SukuyoCh2_Personality key={chapterId} chapter={normalized.chapters.II} />;
          case "III":
            return <SukuyoCh3_RelationType key={chapterId} chapter={normalized.chapters.III} />;
          case "IV":
            return <SukuyoCh4_Distance key={chapterId} chapter={normalized.chapters.IV} />;
          case "V":
            return <SukuyoCh5_FirstAttraction key={chapterId} chapter={normalized.chapters.V} />;
          case "VI":
            return <SukuyoCh6_Emotion key={chapterId} chapter={normalized.chapters.VI} />;
          case "VII":
            return <SukuyoCh7_Love key={chapterId} chapter={normalized.chapters.VII} />;
          case "VIII":
            return <SukuyoCh8_Marriage key={chapterId} chapter={normalized.chapters.VIII} />;
          case "IX":
            return <SukuyoCh9_Conflict key={chapterId} chapter={normalized.chapters.IX} />;
          case "X":
            return <SukuyoCh10_RiskPair key={chapterId} chapter={normalized.chapters.X} />;
          case "XI":
            return <SukuyoCh11_LongBond key={chapterId} chapter={normalized.chapters.XI} />;
          case "XII":
            return <SukuyoCh12_Intimacy key={chapterId} chapter={normalized.chapters.XII} />;
          case "XIII":
            return <SukuyoCh13_ReunionBreakup key={chapterId} chapter={normalized.chapters.XIII} />;
          case "XIV":
            return <SukuyoCh14_Timing key={chapterId} chapter={normalized.chapters.XIV} />;
          case "XV":
            return <SukuyoCh15_Reality key={chapterId} chapter={normalized.chapters.XV} />;
          case "XVI":
            return <SukuyoCh16_Final key={chapterId} chapter={normalized.chapters.XVI} />;
          default:
            return null;
        }
      })}
    </article>
  );
}
