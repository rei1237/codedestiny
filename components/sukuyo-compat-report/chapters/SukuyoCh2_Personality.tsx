import type { SukuyoCh02NatureData } from "../../../types/sukuyo-compat-report/sukuyoCompatibilityReport.types";

function safeText(value: string, fallback: string): string {
  const v = String(value || "").trim();
  if (!v || v === "about:blank" || v.startsWith("{") || v.startsWith("[")) return fallback;
  return v;
}

export function SukuyoCh2_Personality({ chapter }: { chapter: SukuyoCh02NatureData }) {
  const c = chapter.categories;
  return (
    <section data-sukuyo-chapter="II">
      <h3>{safeText(chapter.headline, "II. 27숙 개별 성향 분석")}</h3>
      <p>{safeText(c.personAEssence, "A 성향 데이터가 누락되었습니다.")}</p>
      <p>{safeText(c.personBEssence, "B 성향 데이터가 누락되었습니다.")}</p>
      <p>{safeText(c.temperamentGap, "기질 차이 분석값이 누락되었습니다.")}</p>
      <p>{safeText(c.unfamiliarPoints, "낯설게 느껴지는 지점 분석값이 누락되었습니다.")}</p>
      <p>{safeText(c.attractionPoints, "매력 포인트 분석값이 누락되었습니다.")}</p>
    </section>
  );
}
