import type { SajuNewYearChapterIIIWealth } from "@/app/_lib/saju/new-year/types";
import { buildOrderedSectionItems } from "./renderHelpers";

type Props = {
  chapter: SajuNewYearChapterIIIWealth | null | undefined;
};

const LABELS: Record<string, string> = {
  yearlyWealthOverview: "올해 재물운 총론",
  regularWealthAnalysis: "정재 흐름 분석",
  sideWealthAnalysis: "편재 흐름 분석",
  fixedIncomeFlow: "고정 수입 흐름",
  sideIncomeBonusInvestment: "부수입/보너스/투자 운",
  easyIncomeTiming: "수입이 잘 붙는 시기",
  largeExpenseTiming: "큰 지출 주의 시기",
  favorableInvestmentExpansion: "투자/확장 유리 구간",
  lossRiskFlow: "손실 리스크 흐름",
  contractMoneyPromiseCautions: "계약/금전 약속 주의점",
  wealthSupportingElements: "재물을 돕는 오행",
  wealthBlockingElements: "재물을 막는 오행",
  moneySavingMethod: "돈을 모으는 방법",
  moneyHabitToAvoid: "피해야 할 소비 습관",
  oneLineStrategy: "재물운 한 줄 전략",
};

export default function NewYearCh3_Wealth({ chapter }: Props) {
  if (!chapter) {
    return (
      <section>
        <h2>III. 재물 흐름 - 수익/지출 관리 타이밍</h2>
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
      <h2>{chapter.title || "III. 재물 흐름 - 수익/지출 관리 타이밍"}</h2>
      {rows.map((row) => (
        <p key={row.key}>
          {row.label}: {row.content}
        </p>
      ))}
      {chapter.summary ? <p>{chapter.summary}</p> : null}
    </section>
  );
}