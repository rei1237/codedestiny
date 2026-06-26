import type { SajuNewYearChapterIVRelationship } from "@/app/_lib/saju/new-year/types";
import { buildOrderedSectionItems } from "./renderHelpers";

type Props = {
  chapter: SajuNewYearChapterIVRelationship | null | undefined;
};

const NEW_YEAR_CHAPTER_4_TEXT_TRANSLATIONS = {
  ko: {
    title: "IV. 관계·인맥 - 협업과 거리두기 전략",
    empty: "챕터 데이터가 준비되지 않아 요약 모드로 표시합니다.",
  },
  en: {
    title: "IV. Relationships and Networks - Collaboration and Distance Strategy",
    empty: "Chapter data is not ready, so summary mode is shown.",
  },
  ja: {
    title: "IV. 関係・人脈 - 協業と距離の取り方",
    empty: "チャプターデータが未準備のため、要約モードで表示します。",
  },
} as const;

const LABELS: Record<string, string> = {
  yearlyRelationshipOverview: "올해 관계운 총론",
  friendsColleaguesByBigyeonGeopjae: "비견/겁재로 보는 친구·동료운",
  seniorsOrgByGwansung: "관성으로 보는 상사·조직운",
  mentorsByInseong: "인성으로 보는 멘토·지원운",
  practicalNetworkByJaeseong: "재성으로 보는 실리 인맥",
  communicationBySiksang: "식상으로 보는 소통운",
  helpfulPeopleType: "도움 되는 사람 유형",
  peopleToDistanceFrom: "거리둘 사람 유형",
  collaborationLuck: "협업운",
  businessPartnershipLuck: "비즈니스 파트너십운",
  conflictPotential: "갈등 가능성",
  misunderstandingTiming: "오해가 잦은 시기",
  noblemanTiming: "귀인 시기",
  relationshipResetTiming: "관계 리셋 타이밍",
  oneLineAdvice: "관계운 한 줄 조언",
};

export default function NewYearCh4_Relationship({ chapter }: Props) {
  if (!chapter) {
    return (
      <section>
        <h2>{NEW_YEAR_CHAPTER_4_TEXT_TRANSLATIONS.ko.title}</h2>
        <p>{NEW_YEAR_CHAPTER_4_TEXT_TRANSLATIONS.ko.empty}</p>
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
      <h2>{chapter.title || NEW_YEAR_CHAPTER_4_TEXT_TRANSLATIONS.ko.title}</h2>
      {rows.map((row) => (
        <p key={row.key}>
          {row.label}: {row.content}
        </p>
      ))}
      {chapter.summary ? <p>{chapter.summary}</p> : null}
    </section>
  );
}
