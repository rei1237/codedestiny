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
  | "nature"
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
  iconKey: "flame" | "heart" | "book" | "compass" | "check" | "talisman" | "calendar" | "shield" | "letter";
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
    // 질문에 답하기 전에 먼저 보여 주는 공감 카드. 예전(6개 그룹) 상담에는 이 제목이 없어 카드가 생기지 않는다.
    id: "nature",
    label: "타고난 연애 기질",
    lead: "질문에 답하기 전에, 당신이 사랑하는 방식부터 비춰 봅니다.",
    iconKey: "flame",
    variant: "nature",
    placement: "flow",
    match: /타고난\s*연애\s*기질|이런\s*순간\s*마음/,
  },
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
  "nature",
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

export type LoveSpeaker = "yeoni" | "hanbi";

// 백엔드 LOVE_SPEAKER_BY_GROUP 의 partner·risk·timing 그룹 고정 제목 14개. 카드 그룹은 백엔드 그룹과
// 1:1이 아니라서(예: 이상형은 insight, 결혼운은 strategy) 섹션 제목 단위로 판정한다.
const HANBI_TITLE = /상대의\s*기운|끌림이\s*살아나는|속궁합|이상형|상대가\s*원하는|갈등|바람기|재회\s*가능성|피해야|자기\s*보호|타이밍|올해\s*연애운|좋은\s*날짜|결혼운|30일/;

/** 그 섹션을 쓴 상담자. 제목만 보므로 화자 정보가 없는 예전 저장 결과에도 그대로 쓴다. */
export function resolveLoveSpeaker(title: string): LoveSpeaker {
  return HANBI_TITLE.test(String(title || "")) ? "hanbi" : "yeoni";
}

// ── 장(章) 메타 ─────────────────────────────────────────────────────────────
// worker/lib/love-secret-ai-prompt.js 의 LOVE_SECRET_AI_GROUPS(V2) 를 그대로 옮긴 표다.
// 제목·순서·화자가 워커와 같은지 __tests__/ui/love-secret-speaker.test.mjs 가 확인한다.
export type LoveChapterGroup = { key: string; label: string; speaker: LoveSpeaker; titles: readonly string[] };

export const LOVE_SECRET_CHAPTER_GROUPS: readonly LoveChapterGroup[] = Object.freeze([
  { key: "nature", label: "타고난 연애 기질", speaker: "yeoni", titles: ["타고난 연애 기질 — 당신이 사랑하는 방식의 원형", "그래서 이런 순간 마음이 먼저 움직여요"] },
  { key: "core", label: "핵심 연애운과 질문의 답", speaker: "yeoni", titles: ["현재 관계의 자리와 질문의 핵심", "핵심 연애운 — 명식이 사랑에서 그리는 큰 결", "오행과 조후로 보는 감정의 온도"] },
  { key: "self", label: "나의 연애 성향 — 장점·약점·심리", speaker: "yeoni", titles: ["나의 명식이 사랑에서 반복하는 방식", "십성으로 보는 애착과 표현 방식", "연애 장점 — 상대가 먼저 알아보는 힘", "연애 약점 — 반복해서 걸려 넘어지는 자리", "애정 표현 스타일과 연애 심리"] },
  { key: "partner", label: "상대·궁합·이상형", speaker: "hanbi", titles: ["상대의 기운과 감정 거리감", "두 사람 사이 끌림이 살아나는 조건", "속궁합과 친밀감 리듬", "이상형 분석 — 내 명식이 끌리는 사람", "상대가 원하는 연애 스타일"] },
  { key: "risk", label: "갈등·바람기·재회·자기 보호", speaker: "hanbi", titles: ["갈등의 뿌리와 회복 방식", "바람기와 마음이 흩어지는 조건", "재회 가능성과 그 조건", "피해야 할 선택과 자기 보호"] },
  { key: "timing", label: "대운·올해·좋은 날짜·결혼운", speaker: "hanbi", titles: ["연락/고백/재회/관계 진전 타이밍", "올해 연애운 — 좋은 달과 조심할 달", "좋은 날짜 — 계산된 일진으로 고른 날", "결혼운과 인연이 굳어지는 시기", "30일 관계 흐름 처방"] },
  { key: "action", label: "썸 전략·대화·매력·실천", speaker: "yeoni", titles: ["썸에서 확신으로 가는 전략", "관계 단계별 실행 비책", "상대에게 다가가는 대화 문장", "매력적으로 보이는 방법 — 이미지·말투·스타일", "7일 실천 가이드", "마지막 상담사의 한마디"] },
].map((group) => Object.freeze({ ...group, titles: Object.freeze(group.titles) as readonly string[] }) as LoveChapterGroup));

/** 현재(V2) 계획의 섹션 제목 30개, 워커 순서 그대로. */
export const LOVE_SECRET_SECTION_TITLES: readonly string[] = Object.freeze(LOVE_SECRET_CHAPTER_GROUPS.flatMap((group) => group.titles));
/** 예전(V1, 6개 그룹) 계획의 제목 28개. 타고난 연애 기질 두 장만 없다. */
export const LOVE_SECRET_SECTION_TITLES_V1: readonly string[] = Object.freeze(LOVE_SECRET_CHAPTER_GROUPS.filter((group) => group.key !== "nature").flatMap((group) => group.titles));

const CHAPTER_GROUP_BY_TITLE = new Map(LOVE_SECRET_CHAPTER_GROUPS.flatMap((group) => group.titles.map((title) => [title, group] as const)));

/** 섹션이 속한 상담 부의 이름(장 머리의 작은 제목). 모르는 제목이면 빈 문자열. */
export function loveChapterKicker(title: string): string {
  return CHAPTER_GROUP_BY_TITLE.get(String(title || "").trim())?.label || "";
}

/**
 * 저장된 상담 본문(answer = "제목\n본문" 을 빈 줄로 이은 것)을 알려진 제목으로 다시 나눈다.
 * 보관함은 llmMeta 를 지우고 messages 만 남기므로 섹션 구조를 여기서 되살린다.
 * 알려진 제목이 빈 줄 뒤에 한 줄로 서 있는 자리에서만 자르고, 첫 제목 앞의 글은 첫 장에 붙여 버리지 않는다.
 */
export function splitLoveSecretAnswerByTitles(text: string): LoveSectionInput[] {
  const lines = String(text || "").replace(/\r\n/g, "\n").split("\n");
  const known = new Set(LOVE_SECRET_SECTION_TITLES);
  const parts: Array<{ title: string; lines: string[] }> = [];
  const preface: string[] = [];
  lines.forEach((line, index) => {
    const title = line.trim();
    if (known.has(title) && (index === 0 || !lines[index - 1].trim())) {
      parts.push({ title, lines: [] });
      return;
    }
    (parts.length ? parts[parts.length - 1].lines : preface).push(line);
  });
  const sections = parts.map((part) => ({ title: part.title, body: part.lines.join("\n").trim() }));
  const lead = preface.join("\n").trim();
  if (lead && sections.length) sections[0] = { ...sections[0], body: `${lead}\n\n${sections[0].body}`.trim() };
  return sections.filter((section) => section.body);
}

