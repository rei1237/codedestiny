import type { SukuyoPlaceholderChapterData } from "../../../types/sukuyo-compat-report/sukuyoCompatibilityReport.types";
import { renderPlaceholderChapter } from "./_shared";

export function SukuyoCh4_Distance({ chapter }: { chapter: SukuyoPlaceholderChapterData }) {
  return renderPlaceholderChapter(
    chapter,
    "IV",
    "IV. 거리 관계 분석",
    "거리 궁합 세부 해석 데이터를 준비 중입니다.",
  );
}
