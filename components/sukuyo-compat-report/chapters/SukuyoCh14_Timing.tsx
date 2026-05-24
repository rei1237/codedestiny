import type { SukuyoPlaceholderChapterData } from "../../../types/sukuyo-compat-report/sukuyoCompatibilityReport.types";
import { renderPlaceholderChapter } from "./_shared";

export function SukuyoCh14_Timing({ chapter }: { chapter: SukuyoPlaceholderChapterData }) {
  return renderPlaceholderChapter(
    chapter,
    "XIV",
    "XIV. 관계의 시기와 흐름",
    "시기별 유리/주의 구간 데이터를 준비 중입니다.",
  );
}
