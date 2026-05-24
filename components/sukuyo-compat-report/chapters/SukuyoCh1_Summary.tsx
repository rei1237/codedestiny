import type { SukuyoCh01SummaryData } from "../../../types/sukuyo-compat-report/sukuyoCompatibilityReport.types";

function safeText(value: string, fallback: string): string {
  const v = String(value || "").trim();
  if (!v || v === "about:blank" || v.startsWith("{") || v.startsWith("[")) return fallback;
  return v;
}

export function SukuyoCh1_Summary({ chapter }: { chapter: SukuyoCh01SummaryData }) {
  const c = chapter.categories;
  return (
    <section data-sukuyo-chapter="I">
      <h3>{safeText(chapter.headline, "I. 두 사람의 숙요 궁합 총론")}</h3>
      <p>{safeText(c.profileA, "A 기본 정보가 누락되어 요약을 제한적으로 제공합니다.")}</p>
      <p>{safeText(c.profileB, "B 기본 정보가 누락되어 요약을 제한적으로 제공합니다.")}</p>
      <p>{safeText(c.relationTypeSummary, "관계 유형 원시 데이터가 부족합니다.")}</p>
      <p>{safeText(c.distanceSummary, "거리 관계 데이터가 부족합니다.")}</p>
      <p>{safeText(c.totalStrength, "관계 강도 산출값이 부족합니다.")}</p>
      <p>{safeText(c.oneLineReview, "한 줄 총평을 생성할 수 없어 기본 가이드를 제공합니다.")}</p>
    </section>
  );
}
