export const VEDIC_PREMIUM_FEATURE_KEY = "premium_pdf_vedic";
export const VEDIC_SOLO_TARGET_CHARS = 52000;

const rows = [
  ["vedic_lagna_gate", "I", "라그나 — 영혼이 선택한 첫 번째 문", "라그나가 여는 삶의 첫 방향", "lotus", [["lagna_nature", "라그나가 보여주는 기본 성향"], ["lagna_presence", "세상에 드러나는 첫인상과 생존 방식"], ["lagna_start", "삶을 시작하는 태도와 핵심 기질"], ["lagna_advice", "라그나 기반 실전 조언"]]],
  ["vedic_moon_mind", "II", "달과 마음 — 내면의 감정 지도", "달이 보여주는 정서 리듬", "moon", [["moon_reaction", "달 별자리로 보는 감정 반응"], ["moon_stability", "안정감을 느끼는 방식"], ["moon_anxiety", "불안과 집착이 생기는 패턴"], ["moon_recovery", "마음을 회복시키는 생활 전략"]]],
  ["vedic_nakshatra_code", "III", "나크샤트라 — 영혼의 별자리 코드", "달의 별자리 습관과 직관", "star", [["nakshatra_symbol", "나크샤트라의 핵심 상징"], ["nakshatra_theme", "반복되는 인생 테마"], ["nakshatra_intuition", "타고난 감각과 직관"], ["nakshatra_relationship", "관계와 선택에서 드러나는 별자리 습관"]]],
  ["vedic_sun_self", "IV", "태양과 자아 — 내가 세상에 증명하려는 것", "태양이 세우는 자존감과 역할", "sun", [["sun_selfworth", "태양이 보여주는 자존감의 방향"], ["sun_role", "사회적 역할과 명예욕"], ["sun_recognition", "인정받고 싶은 방식"], ["sun_balance", "자아를 건강하게 세우는 법"]]],
  ["vedic_graha_council", "V", "행성의 회의 — 그라하들이 말하는 재능과 결핍", "주요 행성의 강점과 과제", "planet", [["graha_strength", "주요 행성의 강점"], ["graha_task", "약하거나 불안정한 행성의 과제"], ["graha_talent", "재능으로 발전시킬 수 있는 에너지"], ["graha_mistake", "조심해야 할 반복 실수"]]],
  ["vedic_twelve_houses", "VI", "12하우스 — 삶의 무대별 운명 구조", "하우스별 삶의 무대와 활성 영역", "chart", [["houses_1_4", "1~4하우스: 나, 자산, 소통, 가족/기반"], ["houses_5_8", "5~8하우스: 창조성, 일, 관계, 변화"], ["houses_9_12", "9~12하우스: 철학, 사회적 성취, 인맥, 해방"], ["houses_activated", "강하게 활성화된 삶의 영역"]]],
  ["vedic_love_marriage", "VII", "사랑과 결혼 — 인연을 맺는 방식", "관계와 장기 인연의 구조", "heart", [["love_attraction", "연애에서 끌리는 사람의 유형"], ["love_pattern", "관계에서 반복되는 감정 패턴"], ["love_marriage_task", "결혼과 장기 관계의 핵심 과제"], ["love_advice", "좋은 인연을 유지하는 실전 조언"]]],
  ["vedic_dharma_work", "VIII", "직업과 소명 — 다르마의 방향", "일의 방식과 사회적 인정 포인트", "dharma", [["work_style", "타고난 일의 방식"], ["work_environment", "잘 맞는 직업적 환경"], ["work_recognition", "사회적으로 인정받는 포인트"], ["work_strategy", "소명을 현실화하는 전략"]]],
  ["vedic_artha_money", "IX", "돈과 현실 감각 — 아르타의 흐름", "재물 운용과 현실 감각", "coin", [["money_style", "돈을 벌고 관리하는 방식"], ["money_strength", "재물운의 강점과 약점"], ["money_pattern", "과소비/불안/집착 패턴"], ["money_growth", "현실적으로 재물 흐름을 키우는 법"]]],
  ["vedic_karma_patterns", "X", "카르마와 반복 패턴 — 넘어서야 할 숙제", "반복되는 선택과 넘어야 할 숙제", "karma", [["karma_problem", "인생에서 반복되는 문제"], ["karma_relationship", "관계와 선택에서 나타나는 카르마"], ["karma_self_sabotage", "피해야 할 자기파괴 패턴"], ["karma_break", "같은 운명을 반복하지 않는 법"]]],
  ["vedic_dasha_timing", "XI", "다샤와 시기 흐름 — 지금 열리는 운명의 문", "현재 시기와 가까운 흐름", "time", [["dasha_current", "현재 시기의 핵심 에너지"], ["dasha_focus", "가까운 흐름에서 집중할 일"], ["dasha_caution", "조심해야 할 선택"], ["dasha_opportunity", "기회를 크게 만드는 행동 전략"]]],
  ["vedic_integrated_advice", "XII", "통합 조언 — 별의 언어를 현실로 바꾸는 법", "차트를 현실 선택으로 바꾸는 마지막 정리", "compass", [["final_summary", "전체 차트의 핵심 요약"], ["final_attitude", "지금 가장 먼저 바꿔야 할 태도"], ["final_priority", "관계·일·돈·마음의 우선순위"], ["final_message", "앞으로의 삶을 위한 최종 조언"]]],
];

export const VEDIC_PDF_CHAPTERS = Object.freeze(rows.map((row, index) => Object.freeze({
  id: row[0],
  key: `C${index + 1}`,
  order: index + 1,
  num: index + 1,
  roman: row[1],
  mode: "personal",
  title: row[2],
  subtitle: row[3],
  icon: row[4],
  categories: Object.freeze(row[5].map((category) => Object.freeze({ id: category[0], title: category[1] }))),
})));

export const VEDIC_PREMIUM_CHAPTERS = VEDIC_PDF_CHAPTERS;

export const VEDIC_PERSONAL_CHAPTER_META = Object.freeze(VEDIC_PDF_CHAPTERS.map((chapter) => Object.freeze({
  key: chapter.key,
  num: chapter.num,
  mode: chapter.mode,
  title: chapter.title,
  subtitle: chapter.subtitle,
  icon: chapter.icon,
})));

const VEDIC_CHAPTER_BY_KEY = new Map(VEDIC_PDF_CHAPTERS.flatMap((chapter) => [
  [chapter.key, chapter],
  [chapter.id, chapter],
  [String(chapter.num), chapter],
]));

export function getVedicPdfChapterConfigByKey(key) {
  const token = String(key || "").trim();
  return VEDIC_CHAPTER_BY_KEY.get(token) || VEDIC_PDF_CHAPTERS[0];
}

export function getVedicPdfSectionTitles(key) {
  const chapter = getVedicPdfChapterConfigByKey(key);
  return Array.isArray(chapter?.categories) ? chapter.categories.map((category) => category.title) : [];
}

export function sanitizeVedicPremiumText(value) {
  return String(value || "")
    .replace(/\b(undefined|null|nan)\b/gi, "")
    .replace(/\b(payload|json|localdraft|fallback|llm|api|debug)\b/gi, "")
    .replace(/자동\s*복구\s*생성/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}
