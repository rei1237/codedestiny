import type { SajuNewYearChapterIOverview } from "@/app/_lib/saju/new-year/types";
import { buildOrderedSectionItems } from "./renderHelpers";

type Props = {
  chapter: SajuNewYearChapterIOverview | null | undefined;
};

const LABELS: Record<string, string> = {
  yearlyHeavenlyStemAnalysis: "올해 세운의 천간 분석",
  yearlyEarthlyBranchAnalysis: "올해 세운의 지지 분석",
  natalAndYearRelation: "원국과 세운의 기본 관계",
  strengthenedElements: "올해 강해지는 오행",
  weakenedElements: "올해 약해지는 오행",
  incomingTenGods: "올해 들어오는 십성",
  yongshinHuisinAction: "올해의 용신·희신 작용",
  gisinGushinAction: "올해의 기신·구신 작용",
  hapChungHyungPaHaeStructure: "올해의 합·충·형·파·해 구조",
  overallMood: "올해 운세의 전체 분위기",
  topLifeTheme: "올해 가장 중요한 인생 주제",
  mustCatchOpportunity: "올해 반드시 잡아야 할 기회",
  cautionFlow: "올해 조심해야 할 흐름",
  oneLineKeyword: "올해의 한 줄 운세 키워드",
};

export default function NewYearCh1_Overview({ chapter }: Props) {
  if (!chapter) {
    return (
      <section>
        <h2>I. 연간 파동 총론 - 올해의 기본 기조</h2>
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
      <h2>{chapter.title || "I. 연간 파동 총론 - 올해의 기본 기조"}</h2>
      {rows.map((row) => (
        <p key={row.key}>
          {row.label}: {row.content}
        </p>
      ))}
      {chapter.summary ? <p>{chapter.summary}</p> : null}
    </section>
  );
}
