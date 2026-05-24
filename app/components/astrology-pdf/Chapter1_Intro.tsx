import type { AstroPremiumReportData } from "@/types/astro-premium-report";
import { safeSectionText, uniqueNonEmptyLines } from "./renderHelpers";

type Props = {
  chapter: AstroPremiumReportData["chapters"]["I"] | null | undefined;
};

const LABELS: Array<{ key: keyof AstroPremiumReportData["chapters"]["I"]["sections"]; label: string }> = [
  { key: "birthChartBasics", label: "출생 차트 기본 정보" },
  { key: "sunMoonAscSummary", label: "태양·달·상승궁 요약" },
  { key: "planetDistributionSummary", label: "행성 분포 요약" },
  { key: "houseDistributionSummary", label: "하우스 분포 요약" },
  { key: "elementDistribution", label: "원소 분포" },
  { key: "modalityDistribution", label: "양식 분포" },
  { key: "majorAspectSummary", label: "주요 각도 요약" },
  { key: "overallTemperament", label: "차트 전체 기질 요약" },
  { key: "coreLifeTheme", label: "인생 핵심 테마" },
  { key: "strengthWeaknessSummary", label: "강점과 취약점 요약" },
];

export default function Chapter1_Intro({ chapter }: Props) {
  if (!chapter) {
    return (
      <section>
        <h2>I. 출생 차트 총론 — 나의 우주적 설계도</h2>
        <p>챕터 데이터가 준비되지 않아 기본 요약 모드로 표시합니다.</p>
      </section>
    );
  }

  const rows = uniqueNonEmptyLines(
    LABELS.map((item) => `${item.label}: ${safeSectionText(chapter.sections[item.key])}`),
  );

  return (
    <section>
      <h2>{chapter.title || "I. 출생 차트 총론 — 나의 우주적 설계도"}</h2>
      {rows.map((row) => (
        <p key={row}>{row}</p>
      ))}
      {chapter.summary ? <p>{chapter.summary}</p> : null}
    </section>
  );
}
