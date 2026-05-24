import type { SukuyoPlaceholderChapterData } from "../../../types/sukuyo-compat-report/sukuyoCompatibilityReport.types";
import { renderPlaceholderChapter } from "./_shared";

export function SukuyoCh10_RiskPair({ chapter }: { chapter: SukuyoPlaceholderChapterData }) {
  return renderPlaceholderChapter(
    chapter,
    "X",
    "X. 안괴·위험 관계 집중 분석",
    "위험 관계군 집중 진단 데이터를 준비 중입니다.",
  );
}
