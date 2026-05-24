import type { SukuyoPlaceholderChapterData } from "../../../types/sukuyo-compat-report/sukuyoCompatibilityReport.types";
import { renderPlaceholderChapter } from "./_shared";

export function SukuyoCh5_FirstAttraction({ chapter }: { chapter: SukuyoPlaceholderChapterData }) {
  return renderPlaceholderChapter(
    chapter,
    "V",
    "V. 첫 끌림과 운명적 인연감",
    "첫 끌림/초기 인연감 데이터를 준비 중입니다.",
  );
}
