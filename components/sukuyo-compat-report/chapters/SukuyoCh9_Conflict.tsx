import type { SukuyoPlaceholderChapterData } from "../../../types/sukuyo-compat-report/sukuyoCompatibilityReport.types";
import { renderPlaceholderChapter } from "./_shared";

export function SukuyoCh9_Conflict({ chapter }: { chapter: SukuyoPlaceholderChapterData }) {
  return renderPlaceholderChapter(
    chapter,
    "IX",
    "IX. 갈등 구조 분석",
    "갈등 촉발/완화 포인트 데이터를 준비 중입니다.",
  );
}
