export const VEDIC_PREMIUM_FEATURE_KEY = "premium_pdf_vedic";
export const VEDIC_SOLO_TARGET_CHARS = 25000;

const rows = [
  ["vedic_core_design", "I", "베다 차트의 핵심 설계도 — 라그나·태양·달의 기본 구조", "차트의 중심축으로 전체 방향을 읽는 장", "lotus", [["core_signals", "핵심 차트 신호"], ["core_strengths", "강점과 기회"], ["core_cautions", "주의할 점"], ["core_actions", "현실 실행 전략"]]],
  ["vedic_nakshatra_deep", "II", "나크샤트라 심층 해석 — 영혼의 성향과 본능적 리듬", "달 나크샤트라로 감정 리듬을 읽는 장", "star", [["nakshatra_signals", "핵심 차트 신호"], ["nakshatra_gifts", "강점과 기회"], ["nakshatra_risks", "주의할 점"], ["nakshatra_actions", "관계/마음 관리 조언"]]],
  ["vedic_personality_path", "III", "성격과 인생 방향 — 라그나 로드와 주요 행성 배치", "기질과 방향성을 생활 선택으로 연결하는 장", "sun", [["personality_signals", "핵심 차트 신호"], ["personality_growth", "강점과 기회"], ["personality_blocks", "주의할 점"], ["personality_actions", "현실 실행 전략"]]],
  ["vedic_love_relationship", "IV", "사랑과 관계 — 금성, 7하우스, 배우자 인연", "관계 패턴과 인연 유지법을 다루는 장", "heart", [["love_signals", "핵심 차트 신호"], ["love_opportunity", "강점과 기회"], ["love_risks", "주의할 점"], ["love_actions", "관계 관리 조언"]]],
  ["vedic_career_role", "V", "직업과 사회적 역할 — 10하우스, 토성, 태양, 라그나 로드", "일과 성취의 방향을 설계하는 장", "dharma", [["career_signals", "핵심 차트 신호"], ["career_opportunity", "강점과 기회"], ["career_risks", "주의할 점"], ["career_actions", "현실 실행 전략"]]],
  ["vedic_money_base", "VI", "돈과 현실 기반 — 2하우스, 11하우스, 목성의 재물 흐름", "재물 흐름과 습관을 정리하는 장", "coin", [["money_signals", "핵심 차트 신호"], ["money_opportunity", "강점과 기회"], ["money_risks", "주의할 점"], ["money_actions", "재물 관리 조언"]]],
  ["vedic_karma_growth", "VII", "카르마와 성장 과제 — 라후·케투와 반복되는 인생 패턴", "반복 패턴의 원인과 전환법을 다루는 장", "karma", [["karma_signals", "핵심 차트 신호"], ["karma_strengths", "강점과 기회"], ["karma_risks", "주의할 점"], ["karma_actions", "성장 실행 전략"]]],
  ["vedic_health_rhythm", "VIII", "건강과 생활 리듬 — 6하우스, 달, 토성의 관리 포인트", "생활 리듬과 회복 루틴을 다루는 장", "moon", [["health_signals", "핵심 차트 신호"], ["health_strengths", "강점과 기회"], ["health_risks", "주의할 점"], ["health_actions", "마음/생활 관리 조언"]]],
  ["vedic_dasha_flow", "IX", "다샤와 운의 흐름 — 현재 주기와 앞으로의 전환점", "시기 해석과 선택 타이밍을 다루는 장", "time", [["dasha_signals", "핵심 차트 신호"], ["dasha_opportunity", "강점과 기회"], ["dasha_risks", "주의할 점"], ["dasha_actions", "현실 실행 전략"]]],
  ["vedic_final_strategy", "X", "종합 실행 전략 — 사랑, 일, 돈, 회복을 위한 현실 조언", "전체 차트를 삶의 운영 전략으로 통합하는 장", "compass", [["final_signals", "핵심 차트 신호"], ["final_priorities", "강점과 기회"], ["final_cautions", "주의할 점"], ["final_actions", "종합 실행 전략"]]],
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
