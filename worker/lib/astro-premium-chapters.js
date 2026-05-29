export const ASTRO_PREMIUM_FEATURE_KEY = "premium-astrology-report";

export const ASTRO_PREMIUM_CHAPTERS = [
  {
    id: "astro_cosmic_blueprint",
    order: 1,
    roman: "I",
    title: "나의 코즈믹 설계도 - 태양·달·상승궁 핵심 해석",
    categories: [
      { id: "core_chart_signals", title: "핵심 차트 신호" },
      { id: "identity_strengths", title: "강점과 기회" },
      { id: "identity_cautions", title: "주의할 점" },
      { id: "identity_actions", title: "현실 실행 전략" },
      { id: "identity_life_rhythm", title: "삶의 리듬 운영" },
    ],
  },
  {
    id: "astro_personality_temperament",
    order: 2,
    roman: "II",
    title: "성격과 기질 - 원소, 모드, 행성 분포가 말하는 나",
    categories: [
      { id: "temperament_signals", title: "핵심 차트 신호" },
      { id: "temperament_strengths", title: "강점과 기회" },
      { id: "temperament_cautions", title: "주의할 점" },
      { id: "temperament_actions", title: "현실 실행 전략" },
      { id: "temperament_relationships", title: "관계/협업 운용법" },
    ],
  },
  {
    id: "astro_emotion_inner_world",
    order: 3,
    roman: "III",
    title: "감정과 내면세계 - 달, 4하우스, 물의 흐름",
    categories: [
      { id: "emotion_signals", title: "핵심 차트 신호" },
      { id: "emotion_strengths", title: "강점과 회복 자원" },
      { id: "emotion_cautions", title: "주의할 점" },
      { id: "emotion_actions", title: "현실 실행 전략" },
      { id: "emotion_ritual", title: "마음 관리 루틴" },
    ],
  },
  {
    id: "astro_love_relationship",
    order: 4,
    roman: "IV",
    title: "사랑과 관계 - 금성, 화성, 7하우스의 인연 패턴",
    categories: [
      { id: "love_signals", title: "핵심 차트 신호" },
      { id: "love_strengths", title: "강점과 기회" },
      { id: "love_cautions", title: "주의할 점" },
      { id: "love_actions", title: "현실 실행 전략" },
      { id: "love_communication", title: "관계 대화 전략" },
    ],
  },
  {
    id: "astro_career_success",
    order: 5,
    roman: "V",
    title: "직업과 사회적 성공 - 태양, 토성, MC, 10하우스",
    categories: [
      { id: "career_signals", title: "핵심 차트 신호" },
      { id: "career_strengths", title: "강점과 기회" },
      { id: "career_cautions", title: "주의할 점" },
      { id: "career_actions", title: "현실 실행 전략" },
      { id: "career_positioning", title: "사회적 포지셔닝" },
    ],
  },
  {
    id: "astro_money_foundation",
    order: 6,
    roman: "VI",
    title: "돈과 현실 기반 - 2하우스, 8하우스, 목성·토성의 재물 리듬",
    categories: [
      { id: "money_signals", title: "핵심 차트 신호" },
      { id: "money_strengths", title: "강점과 기회" },
      { id: "money_cautions", title: "주의할 점" },
      { id: "money_actions", title: "현실 실행 전략" },
      { id: "money_rhythm", title: "재물 리듬 관리" },
    ],
  },
  {
    id: "astro_talent_expression",
    order: 7,
    roman: "VII",
    title: "재능과 자기표현 - 수성, 3하우스, 5하우스의 창조성",
    categories: [
      { id: "talent_signals", title: "핵심 차트 신호" },
      { id: "talent_strengths", title: "강점과 기회" },
      { id: "talent_cautions", title: "주의할 점" },
      { id: "talent_actions", title: "현실 실행 전략" },
      { id: "talent_output", title: "표현력 강화 루틴" },
    ],
  },
  {
    id: "astro_crisis_growth",
    order: 8,
    roman: "VIII",
    title: "위기와 성장 - 토성, 명왕성, 주요 긴장각의 과제",
    categories: [
      { id: "crisis_signals", title: "핵심 차트 신호" },
      { id: "crisis_strengths", title: "강점과 회복력" },
      { id: "crisis_cautions", title: "주의할 점" },
      { id: "crisis_actions", title: "현실 실행 전략" },
      { id: "crisis_transformation", title: "성장 전환 포인트" },
    ],
  },
  {
    id: "astro_timing_turning_points",
    order: 9,
    roman: "IX",
    title: "운의 흐름과 전환점 - 현재 시기와 앞으로의 방향",
    categories: [
      { id: "timing_signals", title: "핵심 차트 신호" },
      { id: "timing_opportunities", title: "기회 구간" },
      { id: "timing_cautions", title: "주의 구간" },
      { id: "timing_actions", title: "현실 실행 전략" },
      { id: "timing_checklist", title: "전환점 체크리스트" },
    ],
  },
  {
    id: "astro_integrated_action_plan",
    order: 10,
    roman: "X",
    title: "종합 실행 전략 - 사랑, 일, 돈, 회복을 위한 현실 조언",
    categories: [
      { id: "final_signals", title: "핵심 차트 신호" },
      { id: "final_love_work_money", title: "사랑/일/돈 통합 전략" },
      { id: "final_cautions", title: "주의할 점" },
      { id: "final_actions", title: "현실 실행 전략" },
      { id: "final_recovery", title: "회복과 지속 전략" },
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
