import type { SajuNewYearChapterXFinalRoadmap } from "@/app/_lib/saju/new-year/types";
import { buildOrderedSectionItems } from "./renderHelpers";

type Props = {
  chapter: SajuNewYearChapterXFinalRoadmap | null | undefined;
};

const LABELS: Record<string, string> = {
  yearlyCoreSummary: "연간 핵심 요약",
  mustLeverageOpportunity: "반드시 살릴 기회",
  mustReduceRisk: "반드시 줄일 리스크",
  finalCareerBusinessStrategy: "커리어/사업 최종 전략",
  finalWealthStrategy: "재물 최종 전략",
  finalRelationshipStrategy: "관계 최종 전략",
  finalRomanceFamilyStrategy: "연애/가정 최종 전략",
  finalHealthMentalStrategy: "건강/멘탈 최종 전략",
  firstHalfExecutionPlan: "상반기 실행 계획",
  secondHalfExecutionPlan: "하반기 실행 계획",
  yearEndRecoveryStrategy: "연말 성과 회수 전략",
  issuesNotToCarryOver: "다음 해로 넘기지 않을 과제",
  nextYearFoundationPreparation: "다음 해 기반 준비",
  finalActionGuideline: "최종 행동 가이드",
  oneLineAdvice: "최종 한 줄 조언",
};

export default function NewYearCh10_FinalRoadmap({ chapter }: Props) {
  if (!chapter) {
    return (
      <section>
        <h2>X. 최종 실행 로드맵 - 연말 회수 전략</h2>
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
      <h2>{chapter.title || "X. 최종 실행 로드맵 - 연말 회수 전략"}</h2>
      {rows.map((row) => (
        <p key={row.key}>
          {row.label}: {row.content}
        </p>
      ))}
      {chapter.summary ? <p>{chapter.summary}</p> : null}
    </section>
  );
}
