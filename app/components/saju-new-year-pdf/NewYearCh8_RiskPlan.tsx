import type { SajuNewYearChapterVIIIRiskPlan } from "@/app/_lib/saju/new-year/types";
import { buildOrderedSectionItems } from "./renderHelpers";

type Props = {
  chapter: SajuNewYearChapterVIIIRiskPlan | null | undefined;
};

const NEW_YEAR_CHAPTER_8_TEXT_TRANSLATIONS = {
  ko: {
    title: "VIII. 리스크 시나리오와 대응 플랜",
    empty: "챕터 데이터가 준비되지 않아 요약 모드로 표시합니다.",
  },
  en: {
    title: "VIII. Risk Scenarios and Response Plan",
    empty: "Chapter data is not ready, so summary mode is shown.",
  },
  ja: {
    title: "VIII. リスクシナリオと対応プラン",
    empty: "チャプターデータが未準備のため、要約モードで表示します。",
  },
} as const;

const LABELS: Record<string, string> = {
  biggestRiskOfYear: "올해 최대 리스크",
  natalAndYearCollisionPoint: "원국-세운 충돌 지점",
  overbrokenCombinationProblem: "과합/과파 문제",
  strongClashAreas: "강한 충돌 영역",
  conflictByHyungPaHae: "형/파/해 충돌",
  financialLossScenario: "금전 손실 시나리오",
  careerIssueScenario: "커리어 이슈 시나리오",
  relationshipIssueScenario: "관계 이슈 시나리오",
  romanceFamilyIssueScenario: "연애/가정 이슈 시나리오",
  healthMentalIssueScenario: "건강/멘탈 이슈 시나리오",
  crisisAmplifyingConditions: "위기 증폭 조건",
  crisisReductionBehaviorRules: "위기 완화 행동 규칙",
  earlyWarningSignals: "조기 경보 신호",
  recoveryPlan: "회복 플랜",
  oneLineStrategy: "리스크 한 줄 전략",
};

export default function NewYearCh8_RiskPlan({ chapter }: Props) {
  if (!chapter) {
    return (
      <section>
        <h2>{NEW_YEAR_CHAPTER_8_TEXT_TRANSLATIONS.ko.title}</h2>
        <p>{NEW_YEAR_CHAPTER_8_TEXT_TRANSLATIONS.ko.empty}</p>
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
      <h2>{chapter.title || NEW_YEAR_CHAPTER_8_TEXT_TRANSLATIONS.ko.title}</h2>
      {rows.map((row) => (
        <p key={row.key}>
          {row.label}: {row.content}
        </p>
      ))}
      {chapter.summary ? <p>{chapter.summary}</p> : null}
    </section>
  );
}
