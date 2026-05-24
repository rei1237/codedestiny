import type { SajuNewYearChapterIXMonthlyTable } from "@/app/_lib/saju/new-year/types";
import { buildOrderedSectionItems, safeNewYearText } from "./renderHelpers";

type Props = {
  chapter: SajuNewYearChapterIXMonthlyTable | null | undefined;
};

const LABELS: Record<string, string> = {
  monthlyFortuneAndGoStopPoints: "월별 운세 및 Go/Stop 포인트",
  monthlyCareerCore: "월별 커리어 핵심",
  monthlyWealthCore: "월별 재물 핵심",
  monthlyRelationshipCore: "월별 관계 핵심",
  monthlyHealthCore: "월별 건강 핵심",
  monthlyShouldDo: "월별 해야 할 것",
  monthlyShouldAvoid: "월별 피할 것",
};

export default function NewYearCh9_MonthlyTable({ chapter }: Props) {
  if (!chapter) {
    return (
      <section>
        <h2>IX. 12개월 Go/Stop 월별 테이블</h2>
        <p>챕터 데이터가 준비되지 않아 요약 모드로 표시합니다.</p>
      </section>
    );
  }

  const rows = buildOrderedSectionItems(
    chapter.sectionOrder.map((key) => String(key)),
    chapter.sections,
    LABELS,
  );

  return (
    <section>
      <h2>{chapter.title || "IX. 12개월 Go/Stop 월별 테이블"}</h2>
      {chapter.monthlyRows && chapter.monthlyRows.length ? (
        <div>
          {chapter.monthlyRows.map((row) => (
            <p key={row.month}>
              {row.month}월 [{row.goStop}] - {safeNewYearText(row.monthlyFortuneAndPoint)}
            </p>
          ))}
        </div>
      ) : null}
      {rows.map((row) => (
        <p key={row.key}>
          {row.label}: {row.content}
        </p>
      ))}
      {chapter.summary ? <p>{chapter.summary}</p> : null}
    </section>
  );
}
