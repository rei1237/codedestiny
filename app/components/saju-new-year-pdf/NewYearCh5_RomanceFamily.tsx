import type { SajuNewYearChapterVRomanceFamily } from "@/app/_lib/saju/new-year/types";
import { buildOrderedSectionItems } from "./renderHelpers";

type Props = {
  chapter: SajuNewYearChapterVRomanceFamily | null | undefined;
};

const LABELS: Record<string, string> = {
  yearlyRomanceOverview: "올해 연애/가정 총론",
  singleConnectionLuck: "싱글 인연운",
  existingPartnerFlow: "기존 관계 흐름",
  marriageAndPromiseLuck: "결혼/약속운",
  spousePalaceAndYearRelation: "배우자궁-세운 관계",
  maleChartJaeseongFlow: "남성 명식 재성 흐름",
  femaleChartGwansungFlow: "여성 명식 관성 흐름",
  charmLuckDohwaHongyeom: "도화/홍염 매력운",
  familyRelationshipFlow: "가족 관계 흐름",
  emotionalVolatilityTiming: "감정 기복 시기",
  conflictProneTiming: "갈등 주의 시기",
  deepeningRelationshipTiming: "관계 심화 시기",
  breakupDistanceCautionFlow: "거리/이별 주의 흐름",
  familyStabilityStrategy: "가정 안정 전략",
  oneLineAdvice: "연애·가정 한 줄 조언",
};

export default function NewYearCh5_RomanceFamily({ chapter }: Props) {
  if (!chapter) {
    return (
      <section>
        <h2>V. 연애·가정 - 감정 파동 관리법</h2>
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
      <h2>{chapter.title || "V. 연애·가정 - 감정 파동 관리법"}</h2>
      {rows.map((row) => (
        <p key={row.key}>
          {row.label}: {row.content}
        </p>
      ))}
      {chapter.summary ? <p>{chapter.summary}</p> : null}
    </section>
  );
}
