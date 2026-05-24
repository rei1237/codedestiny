import type { ZiweiChapterI } from "@/app/_lib/ziwei/premium/types";
import { safeSectionText, uniqueNonEmptyLines } from "./renderHelpers";

type Props = {
  chapter: ZiweiChapterI | null | undefined;
};

const LABELS: Array<{ key: keyof ZiweiChapterI["sections"]; label: string }> = [
  { key: "chartSnapshot", label: "명반 전체 스냅샷" },
  { key: "destinyAxis", label: "운명 축 요약" },
  { key: "lifeTheme", label: "핵심 인생 테마" },
  { key: "strengths", label: "선천 강점" },
  { key: "risks", label: "주의 리스크" },
  { key: "practicalSummary", label: "실전 요약" },
];

export default function Chapter1_MyungpanOverview({ chapter }: Props) {
  if (!chapter) {
    return (
      <section>
        <h2>I. 자미 명반 총론</h2>
        <p>챕터 데이터가 준비되지 않아 기본 요약 모드로 표시합니다.</p>
      </section>
    );
  }

  const rows = uniqueNonEmptyLines(LABELS.map((item) => `${item.label}: ${safeSectionText(chapter.sections[item.key])}`));

  return (
    <section>
      <h2>{chapter.title || "I. 자미 명반 총론"}</h2>
      {rows.map((row) => (
        <p key={row}>{row}</p>
      ))}
      {chapter.summary ? <p>{chapter.summary}</p> : null}
    </section>
  );
}
