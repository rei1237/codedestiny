import type { SajuNewYearChapterVIIQuarterDecision } from "@/app/_lib/saju/new-year/types";
import { buildOrderedSectionItems } from "./renderHelpers";

type Props = {
  chapter: SajuNewYearChapterVIIQuarterDecision | null | undefined;
};

const NEW_YEAR_CHAPTER_7_TEXT_TRANSLATIONS = {
  ko: {
    title: "VII. 분기별 핵심 의사결정 포인트",
    empty: "챕터 데이터가 준비되지 않아 요약 모드로 표시합니다.",
  },
  en: {
    title: "VII. Key Decision Points by Quarter",
    empty: "Chapter data is not ready, so summary mode is shown.",
  },
  ja: {
    title: "VII. 四半期別の核心意思決定ポイント",
    empty: "チャプターデータが未準備のため、要約モードで表示します。",
  },
} as const;

const LABELS: Record<string, string> = {
  q1OverallFlow: "1분기 전체 흐름",
  q1ShouldChoose: "1분기 선택할 것",
  q1ShouldAvoid: "1분기 피할 것",
  q2OverallFlow: "2분기 전체 흐름",
  q2ExpansionPotential: "2분기 확장 가능성",
  q2RiskCaution: "2분기 리스크 주의",
  q3OverallFlow: "3분기 전체 흐름",
  q3RelationWealthCareerChange: "3분기 관계/재물/커리어 변화",
  q3EmotionHealthManagement: "3분기 감정/건강 관리",
  q4OverallFlow: "4분기 전체 흐름",
  q4OutcomeRecoveryStrategy: "4분기 성과 회수 전략",
  q4IssuesToClose: "4분기 정리 과제",
  quarterKeywords: "분기 키워드",
  quarterGoStopJudgement: "분기 Go/Stop 판단",
  mostImportantDecisionTiming: "핵심 결정 타이밍",
};

export default function NewYearCh7_QuarterDecision({ chapter }: Props) {
  if (!chapter) {
    return (
      <section>
        <h2>{NEW_YEAR_CHAPTER_7_TEXT_TRANSLATIONS.ko.title}</h2>
        <p>{NEW_YEAR_CHAPTER_7_TEXT_TRANSLATIONS.ko.empty}</p>
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
      <h2>{chapter.title || NEW_YEAR_CHAPTER_7_TEXT_TRANSLATIONS.ko.title}</h2>
      {rows.map((row) => (
        <p key={row.key}>
          {row.label}: {row.content}
        </p>
      ))}
      {chapter.summary ? <p>{chapter.summary}</p> : null}
    </section>
  );
}
