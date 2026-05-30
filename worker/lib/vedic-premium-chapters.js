export const VEDIC_PREMIUM_FEATURE_KEY = "premium_pdf_vedic";
export const VEDIC_SOLO_TARGET_CHARS = 30000;

const rows = [
  ["vedic_core_design", "I", "베다 차트의 핵심 설계도 — 라그나·태양·달의 기본 구조", "차트의 핵심 설계도를 읽고 인생 축을 정리하는 장", "lotus", [["core_signals", "핵심 차트 신호"], ["core_strengths", "강점과 기회"], ["core_cautions", "주의할 점"], ["core_actions", "현실 실행 전략"]]],
  ["vedic_lagna_direction", "II", "라그나와 인생 방향 — 내가 세상에 드러나는 방식", "라그나를 기반으로 외부 표현 방식과 방향성을 읽는 장", "sun", [["lagna_signals", "핵심 차트 신호"], ["lagna_strengths", "강점과 기회"], ["lagna_cautions", "주의할 점"], ["lagna_actions", "현실 실행 전략"]]],
  ["vedic_moon_rhythm", "III", "달 별자리와 마음의 리듬 — 감정, 안정감, 무의식의 습관", "달 별자리와 정서 패턴을 다루는 장", "moon", [["moon_signals", "핵심 차트 신호"], ["moon_strengths", "강점과 기회"], ["moon_cautions", "주의할 점"], ["moon_actions", "마음 관리 조언"]]],
  ["vedic_nakshatra_deep", "IV", "나크샤트라 심층 해석 — 영혼의 본능과 타고난 결", "나크샤트라 심층 해석을 통해 영혼의 본능을 읽는 장", "star", [["nakshatra_signals", "핵심 차트 신호"], ["nakshatra_gifts", "강점과 기회"], ["nakshatra_risks", "주의할 점"], ["nakshatra_actions", "관계/마음 관리 조언"]]],
  ["vedic_atmakaraka_task", "V", "아트마카라카와 영혼의 과제 — 이번 생에서 배우는 핵심 주제", "아트마카라카로 영혼 과제를 정리하는 장", "karma", [["atmakaraka_signals", "핵심 차트 신호"], ["atmakaraka_strengths", "강점과 기회"], ["atmakaraka_cautions", "주의할 점"], ["atmakaraka_actions", "성장 실행 전략"]]],
  ["vedic_love_relationship", "VI", "사랑과 관계 — 금성, 7하우스, 배우자 인연", "관계 패턴과 인연 유지법을 다루는 장", "heart", [["love_signals", "핵심 차트 신호"], ["love_opportunity", "강점과 기회"], ["love_risks", "주의할 점"], ["love_actions", "관계 관리 조언"]]],
  ["vedic_career_role", "VII", "직업과 사회적 역할 — 10하우스, 토성, 태양, 라그나 로드", "일과 성취의 방향을 설계하는 장", "dharma", [["career_signals", "핵심 차트 신호"], ["career_opportunity", "강점과 기회"], ["career_risks", "주의할 점"], ["career_actions", "현실 실행 전략"]]],
  ["vedic_money_base", "VIII", "돈과 현실 기반 — 2하우스, 11하우스, 목성의 재물 흐름", "재물 흐름과 현실 기반을 강화하는 장", "coin", [["money_signals", "핵심 차트 신호"], ["money_opportunity", "강점과 기회"], ["money_risks", "주의할 점"], ["money_actions", "재물 관리 조언"]]],
  ["vedic_family_root", "IX", "가족·거처·내면의 뿌리 — 4하우스와 마음의 안전지대", "가족과 거처, 내면 안정 축을 다루는 장", "home", [["family_signals", "핵심 차트 신호"], ["family_strengths", "강점과 기회"], ["family_cautions", "주의할 점"], ["family_actions", "회복 실행 전략"]]],
  ["vedic_karma_growth", "X", "카르마와 성장 과제 — 라후·케투와 반복되는 인생 패턴", "반복 패턴의 원인과 전환법을 다루는 장", "karma", [["karma_signals", "핵심 차트 신호"], ["karma_strengths", "강점과 기회"], ["karma_risks", "주의할 점"], ["karma_actions", "성장 실행 전략"]]],
  ["vedic_dasha_flow", "XI", "다샤와 운의 흐름 — 현재 주기와 앞으로의 전환점", "시기 해석과 전환 타이밍을 다루는 장", "time", [["dasha_signals", "핵심 차트 신호"], ["dasha_opportunity", "강점과 기회"], ["dasha_risks", "주의할 점"], ["dasha_actions", "현실 실행 전략"]]],
  ["vedic_final_strategy", "XII", "종합 실행 전략 — 사랑, 일, 돈, 회복을 위한 현실 조언", "전체 차트를 삶의 운영 전략으로 통합하는 장", "compass", [["final_signals", "핵심 차트 신호"], ["final_priorities", "강점과 기회"], ["final_cautions", "주의할 점"], ["final_actions", "종합 실행 전략"]]],
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
    .replace(/chapter\s*1\s*chapter\s*1/gi, "")
    .replace(/데이터가\s*부족합니다/gi, "")
    .replace(/자동\s*복구\s*생성/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}
