import type { ZiweiChapterII } from "@/app/_lib/ziwei/premium/types";
import { safeSectionText, uniqueNonEmptyLines } from "./renderHelpers";

type Props = {
  chapter: ZiweiChapterII | null | undefined;
};

const ZIWEI_CHAPTER_2_TEXT_TRANSLATIONS = {
  ko: {
    title: "II. 명궁과 신궁 분석",
    empty: "챕터 데이터가 준비되지 않아 기본 요약 모드로 표시합니다.",
  },
  en: {
    title: "II. Life Palace and Body Palace Analysis",
    empty: "Chapter data is not ready, so the basic summary mode is shown.",
  },
  ja: {
    title: "II. 命宮と身宮の分析",
    empty: "チャプターデータが未準備のため、基本要約モードで表示します。",
  },
} as const;

const LABELS: Array<{ key: keyof ZiweiChapterII["sections"]; label: string }> = [
  { key: "myungGungCore", label: "명궁 핵심" },
  { key: "shinGungDrive", label: "신궁 추진력" },
  { key: "egoVersusAction", label: "내면과 행동의 차이" },
  { key: "growthArc", label: "성장 곡선" },
  { key: "executionAdvice", label: "실행 조언" },
];

export default function Chapter2_MyungShin({ chapter }: Props) {
  if (!chapter) {
    return (
      <section>
        <h2>{ZIWEI_CHAPTER_2_TEXT_TRANSLATIONS.ko.title}</h2>
        <p>{ZIWEI_CHAPTER_2_TEXT_TRANSLATIONS.ko.empty}</p>
      </section>
    );
  }

  const rows = uniqueNonEmptyLines(LABELS.map((item) => `${item.label}: ${safeSectionText(chapter.sections[item.key])}`));

  return (
    <section>
      <h2>{chapter.title || ZIWEI_CHAPTER_2_TEXT_TRANSLATIONS.ko.title}</h2>
      {rows.map((row) => (
        <p key={row}>{row}</p>
      ))}
      {chapter.summary ? <p>{chapter.summary}</p> : null}
    </section>
  );
}
