import type { AstroPremiumReportData } from "@/types/astro-premium-report";
import { safeSectionText, uniqueNonEmptyLines } from "./renderHelpers";

type Props = {
  chapter: AstroPremiumReportData["chapters"]["II"] | null | undefined;
};

const ASTROLOGY_CHAPTER_2_TEXT_TRANSLATIONS = {
  ko: {
    title: "II. 빅3 해석 — 태양·달·상승궁",
    empty: "챕터 데이터가 준비되지 않아 기본 요약 모드로 표시합니다.",
  },
  en: {
    title: "II. Big Three Reading — Sun, Moon, and Rising Sign",
    empty: "Chapter data is not ready, so the basic summary mode is shown.",
  },
  ja: {
    title: "II. ビッグ3解釈 — 太陽・月・上昇宮",
    empty: "チャプターデータが未準備のため、基本要約モードで表示します。",
  },
} as const;

const LABELS: Array<{ key: keyof AstroPremiumReportData["chapters"]["II"]["sections"]; label: string }> = [
  { key: "sunSign", label: "태양 별자리 해석" },
  { key: "sunHouse", label: "태양 하우스 해석" },
  { key: "moonSign", label: "달 별자리 해석" },
  { key: "moonHouse", label: "달 하우스 해석" },
  { key: "ascendant", label: "상승궁 해석" },
  { key: "ascRuler", label: "상승궁 지배성 해석" },
  { key: "sunMoonRelation", label: "태양과 달의 관계" },
  { key: "moonAscRelation", label: "달과 상승궁의 관계" },
  { key: "outerInnerGap", label: "겉모습과 내면의 차이" },
  { key: "bigThreeDiagnosis", label: "빅3 종합 성격 진단" },
];

export default function Chapter2_BigThree({ chapter }: Props) {
  if (!chapter) {
    return (
      <section>
        <h2>{ASTROLOGY_CHAPTER_2_TEXT_TRANSLATIONS.ko.title}</h2>
        <p>{ASTROLOGY_CHAPTER_2_TEXT_TRANSLATIONS.ko.empty}</p>
      </section>
    );
  }

  const rows = uniqueNonEmptyLines(
    LABELS.map((item) => `${item.label}: ${safeSectionText(chapter.sections[item.key])}`),
  );

  return (
    <section>
      <h2>{chapter.title || ASTROLOGY_CHAPTER_2_TEXT_TRANSLATIONS.ko.title}</h2>
      {rows.map((row) => (
        <p key={row}>{row}</p>
      ))}
      {chapter.summary ? <p>{chapter.summary}</p> : null}
    </section>
  );
}
