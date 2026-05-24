import type { SajuNewYearChapterVIHealthEnergy } from "@/app/_lib/saju/new-year/types";
import { buildOrderedSectionItems } from "./renderHelpers";

type Props = {
  chapter: SajuNewYearChapterVIHealthEnergy | null | undefined;
};

const LABELS: Record<string, string> = {
  yearlyHealthOverview: "올해 건강운 총론",
  healthWeakPointsByElement: "오행별 취약 포인트",
  woodLiverNervous: "목-간/신경",
  fireHeartBlood: "화-심장/혈류",
  earthDigestive: "토-소화기",
  metalLungRespiratory: "금-호흡기",
  waterKidneySleepImmune: "수-신장/수면/면역",
  physicalFlowByJohu: "조후 기준 신체 흐름",
  fatigueAccumulationTiming: "피로 누적 시기",
  stressPeakTiming: "스트레스 정점 시기",
  burnoutPotential: "번아웃 가능성",
  accidentInjuryCautionFlow: "사고/부상 주의 흐름",
  recoveryFriendlyRhythm: "회복에 유리한 리듬",
  healthPriority: "건강 우선 과제",
  oneLineAdvice: "건강 한 줄 조언",
};

export default function NewYearCh6_HealthEnergy({ chapter }: Props) {
  if (!chapter) {
    return (
      <section>
        <h2>VI. 건강·에너지 - 번아웃 방지 설계</h2>
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
      <h2>{chapter.title || "VI. 건강·에너지 - 번아웃 방지 설계"}</h2>
      {rows.map((row) => (
        <p key={row.key}>
          {row.label}: {row.content}
        </p>
      ))}
      {chapter.summary ? <p>{chapter.summary}</p> : null}
    </section>
  );
}
