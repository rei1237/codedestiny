/**
 * 상담 섹션 → 화면 그룹 매핑.
 *
 * 백엔드 계약은 평평한 `{title, body}[]` 하나다(그룹이 6개든 섹션이 28개든 변하지 않는다).
 * 그래서 프론트는 **제목 정규식으로 그룹핑**한다. 백엔드가 섹션을 더하거나 이름을 바꿔도
 * 렌더러를 다시 쓰지 않기 위한 장치다.
 *
 * 불변 조건 3개:
 *   1. 미매칭 섹션은 절대 버려지지 않는다 — 항상 `insight`(catch-all)로 흡수된다.
 *   2. 그룹 내부 순서는 백엔드가 준 원본 순서를 유지한다.
 *   3. 빈 그룹은 렌더하지 않는다(백엔드가 주제를 줄여도 빈 카드가 남지 않는다).
 */

export type LoveCardVariant =
  | "summary"
  | "insight"
  | "strategy"
  | "practice"
  | "luck"
  | "timing"
  | "caution"
  | "letter";

export type LovePlacement = "flow" | "deck";

export type LoveSectionInput = { title: string; body: string };

export type LoveSectionGroupSpec = {
  id: LoveCardVariant;
  label: string;
  lead: string;
  iconKey: "heart" | "book" | "compass" | "check" | "talisman" | "calendar" | "shield" | "letter";
  variant: LoveCardVariant;
  placement: LovePlacement;
  match: RegExp;
  fallback?: true;
};

export type LoveSectionGroup = {
  spec: LoveSectionGroupSpec;
  sections: LoveSectionInput[];
};

/** 배열 순서 = 화면 표시 순서. 요청한 서사 순서를 그대로 따른다. */
export const LOVE_SECTION_GROUPS: readonly LoveSectionGroupSpec[] = Object.freeze([
  {
    id: "summary",
    label: "한눈에 보는 연애 비책",
    lead: "지금 관계가 어디에 서 있는지부터 짚습니다.",
    iconKey: "heart",
    variant: "summary",
    placement: "flow",
    match: /핵심\s*연애운|현재\s*관계|질문의\s*핵심|요약|한\s*줄\s*진단/,
  },
  {
    id: "insight",
    label: "깊이 읽기",
    lead: "명식이 사랑에서 반복하는 방식과 상대의 결을 길게 풉니다.",
    iconKey: "book",
    variant: "insight",
    placement: "deck",
    match: /반복하는\s*방식|십성|오행|조후|장점|약점|이상형|애정\s*표현|연애\s*심리|기운과\s*감정|끌림|속궁합|원하는\s*연애/,
    fallback: true,
  },
  {
    id: "strategy",
    label: "관계 전략",
    lead: "다가가는 방법과 건네는 말을 구체적으로 좁힙니다.",
    iconKey: "compass",
    variant: "strategy",
    placement: "deck",
    match: /썸|재회|결혼운|대화\s*문장|단계별\s*실행|전략/,
  },
  {
    id: "practice",
    label: "실천 가이드",
    lead: "오늘부터 할 수 있는 행동만 남겼습니다.",
    iconKey: "check",
    variant: "practice",
    placement: "flow",
    match: /실천|7일|30일|흐름\s*처방|가이드|행동/,
  },
  {
    id: "luck",
    label: "행운 포인트",
    lead: "기운을 끌어올리는 이미지와 색, 말투입니다.",
    iconKey: "talisman",
    variant: "luck",
    placement: "flow",
    // "매력적으로 보이는 방법"이 곧 개운(색·이미지·분위기) 카드다 — 전략 덱이 아니라 여기에 둔다.
    match: /행운|개운|부적|색상|방위|아이템|매력적으로/,
  },
  {
    id: "timing",
    label: "좋은 날짜와 시기",
    lead: "계산된 일진에서 고른 날들입니다.",
    iconKey: "calendar",
    variant: "timing",
    placement: "flow",
    match: /좋은\s*날짜|타이밍|올해\s*연애운|시기|길일/,
  },
  {
    id: "caution",
    label: "주의사항",
    lead: "붙잡을 것과 놓을 것을 나눕니다.",
    iconKey: "shield",
    variant: "caution",
    placement: "flow",
    match: /주의|피해야|자기\s*보호|바람기|갈등|흩어지는/,
  },
  {
    id: "letter",
    label: "응원 메시지",
    lead: "",
    iconKey: "letter",
    variant: "letter",
    placement: "flow",
    match: /마지막|한마디|응원|편지|맺음/,
  },
]);

// 구체 → 일반 순으로 시도한다. 배열 순서(표시 순서)와 매칭 우선순위는 다르다.
const MATCH_ORDER: readonly LoveCardVariant[] = Object.freeze([
  "letter",
  "caution",
  "timing",
  "practice",
  "luck",
  "strategy",
  "summary",
  "insight",
]);

const SPEC_BY_ID = new Map(LOVE_SECTION_GROUPS.map((spec) => [spec.id, spec]));
const FALLBACK_SPEC = LOVE_SECTION_GROUPS.find((spec) => spec.fallback) || LOVE_SECTION_GROUPS[1];

function resolveSpec(title: string): LoveSectionGroupSpec {
  const value = String(title || "");
  for (const id of MATCH_ORDER) {
    const spec = SPEC_BY_ID.get(id);
    if (spec && !spec.fallback && spec.match.test(value)) return spec;
  }
  return FALLBACK_SPEC;
}

/** 섹션 목록을 표시 순서의 그룹 배열로 접는다. 빈 그룹은 결과에 담기지 않는다. */
export function groupLoveSections(sections: readonly LoveSectionInput[] = []): LoveSectionGroup[] {
  const buckets = new Map<LoveCardVariant, LoveSectionInput[]>();
  sections.forEach((section) => {
    if (!section?.body) return;
    const spec = resolveSpec(section.title);
    if (!buckets.has(spec.id)) buckets.set(spec.id, []);
    buckets.get(spec.id)!.push(section);
  });
  return LOVE_SECTION_GROUPS
    .filter((spec) => buckets.get(spec.id)?.length)
    .map((spec) => ({ spec, sections: buckets.get(spec.id)! }));
}
