import type { SukuyoPlaceholderChapterData } from "../../../types/sukuyo-compat-report/sukuyoCompatibilityReport.types";
import { renderPlaceholderChapter } from "./_shared";

export function SukuyoCh3_RelationType({ chapter }: { chapter: SukuyoPlaceholderChapterData }) {
  return renderPlaceholderChapter(
    chapter,
    "III",
    "III. 숙요 관계 유형 분석",
    "관계 유형 세부 해석 데이터를 준비 중입니다.",
  );
}
