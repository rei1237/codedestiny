import type { SajuNewYearChapterIICareer } from "@/app/_lib/saju/new-year/types";
import { buildOrderedSectionItems } from "./renderHelpers";

type Props = {
  chapter: SajuNewYearChapterIICareer | null | undefined;
};

const LABELS: Record<string, string> = {
  yearlyCareerOverview: "올해 직업운 총론",
  workOrgByGwansung: "관성으로 보는 직장·조직운",
  performanceExpressionBySiksang: "식상으로 보는 성과·표현운",
  profitLinkByJaeseong: "재성으로 보는 실적·수익 연결성",
  learningDocsByInseong: "인성으로 보는 공부·자격·문서운",
  jobChangePotential: "이직 가능성",
  promotionAndEvaluation: "승진·평가운",
  businessExpansionPotential: "사업 확장 가능성",
  workplaceConflictPotential: "직장 내 갈등 가능성",
  highPerformanceTiming: "성과가 잘 나는 시기",
  mistakeRiskTiming: "실수를 조심해야 하는 시기",
  noblemanAndCollabLuck: "귀인과 협업운",
  workStyleToAvoid: "피해야 할 업무 방식",
  coreCareerStrategy: "올해 커리어 핵심 전략",
  oneLineAdvice: "직업운 한 줄 조언",
};

export default function NewYearCh2_Career({ chapter }: Props) {
  if (!chapter) {
    return (
      <section>
        <h2>II. 커리어 전략 - 성과가 나는 월/주의 월</h2>
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
      <h2>{chapter.title || "II. 커리어 전략 - 성과가 나는 월/주의 월"}</h2>
      {rows.map((row) => (
        <p key={row.key}>
          {row.label}: {row.content}
        </p>
      ))}
      {chapter.summary ? <p>{chapter.summary}</p> : null}
    </section>
  );
}
