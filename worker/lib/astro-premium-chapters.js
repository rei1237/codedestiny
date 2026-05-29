export const ASTRO_PREMIUM_FEATURE_KEY = "premium-astrology-report";

export const ASTRO_PREMIUM_CHAPTERS = [
  {
    id: "astro_star_map",
    order: 1,
    roman: "I",
    title: "나의 별자리 지도 — 태어난 순간의 전체 차트",
    categories: [
      { id: "star_map_first_impression", title: "차트 전체의 첫인상" },
      { id: "star_map_core_triangle", title: "태양·달·ASC의 핵심 삼각형" },
      { id: "star_map_strong_signs", title: "강하게 작동하는 사인과 하우스" },
      { id: "star_map_life_theme", title: "인생 전체를 관통하는 주제" },
      { id: "star_map_final_view", title: "차트가 말하는 첫 결론" },
    ],
  },
  {
    id: "astro_sun_self",
    order: 2,
    roman: "II",
    title: "태양과 자아 — 내가 되어야 할 사람",
    categories: [
      { id: "sun_center_self", title: "태양 사인이 보여주는 중심 자아" },
      { id: "sun_house_stage", title: "태양 하우스가 말하는 삶의 무대" },
      { id: "sun_self_expression", title: "자존감과 자기표현 방식" },
      { id: "sun_light_shadow", title: "빛날 때와 흐려질 때의 차이" },
      { id: "sun_practical_strategy", title: "태양을 살리는 실전 전략" },
    ],
  },
  {
    id: "astro_moon_emotion",
    order: 3,
    roman: "III",
    title: "달과 무의식 — 감정의 뿌리와 안정감",
    categories: [
      { id: "moon_instinct", title: "달 사인이 보여주는 정서 본능" },
      { id: "moon_stability", title: "달 하우스가 말하는 안정감의 조건" },
      { id: "moon_anxiety", title: "불안이 올라오는 순간" },
      { id: "moon_relationship_pattern", title: "사랑과 관계에서 반복되는 감정 패턴" },
      { id: "moon_recovery", title: "마음을 회복하는 방법" },
    ],
  },
  {
    id: "astro_ascendant_first_impression",
    order: 4,
    roman: "IV",
    title: "ASC와 첫인상 — 세상에 드러나는 나",
    categories: [
      { id: "asc_image", title: "ASC가 만드는 외적 이미지" },
      { id: "asc_first_feel", title: "사람들이 처음 느끼는 분위기" },
      { id: "chart_ruler_direction", title: "차트 룰러가 이끄는 삶의 방향" },
      { id: "asc_conflict_style", title: "세상과 부딪히는 방식" },
      { id: "asc_visibility_strategy", title: "나를 더 잘 보여주는 전략" },
    ],
  },
  {
    id: "astro_love_relationship",
    order: 5,
    roman: "V",
    title: "사랑과 관계 — 금성·화성·7하우스",
    categories: [
      { id: "love_venus", title: "금성이 말하는 사랑의 취향" },
      { id: "love_mars", title: "화성이 말하는 욕망과 추진력" },
      { id: "love_seventh_house", title: "7하우스가 보여주는 관계 패턴" },
      { id: "love_attraction_wound", title: "끌리는 사람과 상처받는 방식" },
      { id: "love_stability_strategy", title: "사랑을 안정시키는 조언" },
    ],
  },
  {
    id: "astro_career_calling",
    order: 6,
    roman: "VI",
    title: "직업과 소명 — MC·10하우스·토성",
    categories: [
      { id: "career_midheaven", title: "MC가 보여주는 사회적 방향" },
      { id: "career_tenth_house", title: "10하우스가 말하는 성취 방식" },
      { id: "career_saturn", title: "토성이 주는 과제와 책임" },
      { id: "career_recognition", title: "직업에서 인정받는 조건" },
      { id: "career_realization", title: "커리어를 현실화하는 전략" },
    ],
  },
  {
    id: "astro_money_talent",
    order: 7,
    roman: "VII",
    title: "재물과 능력 — 2하우스·8하우스·목성",
    categories: [
      { id: "money_basic_attitude", title: "돈을 대하는 기본 태도" },
      { id: "money_income_talent", title: "수입과 재능의 연결" },
      { id: "money_eighth_house", title: "8하우스가 말하는 공유 자원과 집착" },
      { id: "money_jupiter", title: "목성이 여는 확장과 기회" },
      { id: "money_growth", title: "재물운을 키우는 방법" },
    ],
  },
  {
    id: "astro_family_root",
    order: 8,
    roman: "VIII",
    title: "가족과 뿌리 — 4하우스와 내면의 기반",
    categories: [
      { id: "family_root", title: "4하우스가 보여주는 심리적 뿌리" },
      { id: "family_history", title: "가족과 어린 시절의 영향" },
      { id: "family_alone", title: "혼자 있을 때의 나" },
      { id: "family_unstable", title: "안정감을 잃는 조건" },
      { id: "family_rebuild", title: "내면의 집을 다시 세우는 법" },
    ],
  },
  {
    id: "astro_shadow_healing",
    order: 9,
    roman: "IX",
    title: "그림자와 치유 — 12하우스·8하우스·명왕성",
    categories: [
      { id: "shadow_hidden_wound", title: "숨겨진 상처와 무의식" },
      { id: "shadow_fear_cycle", title: "반복되는 두려움" },
      { id: "shadow_attachment", title: "집착과 변형의 구조" },
      { id: "shadow_loss_strength", title: "상실을 통과해 강해지는 방식" },
      { id: "shadow_transmute", title: "그림자를 재능으로 바꾸는 법" },
    ],
  },
  {
    id: "astro_aspect_turning_points",
    order: 10,
    roman: "X",
    title: "인생의 전환점 — 주요 어스펙트와 행성 패턴",
    categories: [
      { id: "aspect_important", title: "가장 중요한 어스펙트" },
      { id: "aspect_tension", title: "긴장 어스펙트가 만드는 시험" },
      { id: "aspect_harmony", title: "조화 어스펙트가 여는 재능" },
      { id: "aspect_pattern", title: "반복되는 선택의 패턴" },
      { id: "aspect_turning_point", title: "전환점을 활용하는 법" },
    ],
  },
  {
    id: "astro_nodes_growth",
    order: 11,
    roman: "XI",
    title: "운명의 방향 — 노드축과 성장 과제",
    categories: [
      { id: "nodes_south", title: "남쪽 노드가 보여주는 익숙한 습관" },
      { id: "nodes_north", title: "북쪽 노드가 말하는 성장 방향" },
      { id: "nodes_repetition", title: "피하면 반복되는 과제" },
      { id: "nodes_relationship_career", title: "관계와 직업에서의 성장 훈련" },
      { id: "nodes_direction", title: "이번 생의 방향성" },
    ],
  },
  {
    id: "astro_final_strategy",
    order: 12,
    roman: "XII",
    title: "최종 별의 전략 — 차트를 살아내는 법",
    categories: [
      { id: "final_overview", title: "차트 전체의 최종 요약" },
      { id: "final_strength", title: "가장 강한 재능" },
      { id: "final_caution", title: "가장 조심해야 할 약점" },
      { id: "final_timeline", title: "앞으로 3년·5년·10년 전략" },
      { id: "final_declaration", title: "최종 조언과 별의 선언문" },
    ],
  },
];

export function sanitizeAstroPremiumText(value) {
  return String(value || "")
    .replace(/\b(undefined|null|nan)\b/gi, "")
    .replace(/\b(payload|json|localdraft|fallback|llm|debug)\b/gi, "")
    .replace(/chapter\s*1(\s*chapter\s*1)*/gi, "")
    .replace(/자동\s*복구\s*생성/gi, "")
    .replace(/데이터가\s*부족합니다/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export function getAstroChapterTitles() {
  return ASTRO_PREMIUM_CHAPTERS.map((chapter) => chapter.title);
}
