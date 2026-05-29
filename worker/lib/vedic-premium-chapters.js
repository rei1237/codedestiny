export const VEDIC_PREMIUM_FEATURE_KEY = "premium_pdf_vedic";
export const VEDIC_SOLO_TARGET_CHARS = 30000;

const rows = [
  ["vedic_lagna_start", "I", "베다 차트의 첫 문 — 라그나와 삶의 출발점", "라그나를 중심으로 삶의 출발점과 전체 구조를 읽는 장", "lotus", [["lagna_start", "라그나가 보여주는 이번 생의 출발점"], ["lagna_lord", "라그나 로드의 위치와 방향"], ["rasi_first_impression", "라시 차트 전체의 첫인상"], ["strong_houses_grahas", "강하게 작동하는 하우스와 그라하"], ["lagna_conclusion", "베다 차트의 첫 결론"]]],
  ["vedic_moon_mind", "II", "달과 마음 — 감정 습관과 내면의 기억", "달 라시와 마음의 리듬을 읽는 장", "moon", [["moon_instinct", "달 라시가 보여주는 마음의 본능"], ["moon_stability", "달 하우스가 말하는 안정감의 조건"], ["moon_instability", "감정이 흔들리는 패턴"], ["moon_relationships", "관계에서 반복되는 정서 반응"], ["moon_regulation", "마음을 다스리는 방법"]]],
  ["vedic_nakshatra_soul", "III", "나크샤트라 — 영혼의 별자리와 기질", "나크샤트라와 파다를 통해 타고난 결을 읽는 장", "star", [["nakshatra_symbol", "나크샤트라의 핵심 상징"], ["nakshatra_pada", "파다가 더하는 세부 기질"], ["nakshatra_desire", "타고난 욕망과 재능"], ["nakshatra_habit", "반복되는 감정 습관"], ["nakshatra_use", "나크샤트라를 삶에 활용하는 법"]]],
  ["vedic_rahu_ketu_axis", "IV", "라후와 케투 — 욕망과 해방의 축", "라후/케투 축을 중심으로 카르마 방향을 읽는 장", "karma", [["rahu_desire", "라후가 끌어당기는 욕망"], ["ketu_pattern", "케투가 보여주는 익숙한 과거 패턴"], ["attachment_zone", "집착이 생기는 영역"], ["release_learn", "놓아야 할 것과 배워야 할 것"], ["axis_growth", "카르마 축을 성장으로 바꾸는 법"]]],
  ["vedic_dasha_timing", "V", "다샤 흐름 — 지금 작동하는 운명의 시간표", "다샤를 통해 현재 시기의 핵심 작동점을 읽는 장", "time", [["dasha_maha", "현재 마하 다샤의 핵심 의미"], ["dasha_antar", "현재 안타르 다샤의 세부 영향"], ["dasha_opportunity", "기회가 열리는 영역"], ["dasha_pressure", "주의해야 할 시기적 압력"], ["dasha_strategy", "다샤를 활용하는 실전 전략"]]],
  ["vedic_love_marriage", "VI", "사랑과 결혼 — 금성·7하우스·배우자 카르마", "금성/7하우스 기반의 관계와 결혼 흐름을 읽는 장", "heart", [["love_venus", "금성이 보여주는 사랑의 방식"], ["love_seventh_house", "7하우스가 말하는 배우자 인연"], ["love_patterns", "관계에서 반복되는 과제"], ["love_long_term", "결혼과 장기 관계의 조건"], ["love_stability", "사랑을 안정시키는 조언"]]],
  ["vedic_career_dharma", "VII", "직업과 소명 — 10하우스·토성·목성", "사회적 역할과 소명 실현을 읽는 장", "dharma", [["career_role", "10하우스가 보여주는 사회적 역할"], ["career_saturn", "토성이 주는 책임과 훈련"], ["career_jupiter", "목성이 여는 성장과 지혜"], ["career_recognition", "직업에서 인정받는 방식"], ["career_realization", "소명을 현실화하는 전략"]]],
  ["vedic_wealth_practice", "VIII", "재물과 현실 능력 — 2하우스·11하우스·금전 흐름", "수입, 이익, 네트워크를 통해 재물 흐름을 읽는 장", "coin", [["wealth_income", "2하우스가 말하는 수입과 가치관"], ["wealth_gain", "11하우스가 보여주는 이익과 네트워크"], ["wealth_flow", "돈이 들어오는 방식"], ["wealth_block", "돈이 막히는 패턴"], ["wealth_growth", "재물운을 키우는 선택"]]],
  ["vedic_family_root", "IX", "가족과 뿌리 — 4하우스와 내면의 기반", "가족, 거처, 내면의 뿌리를 다루는 장", "home", [["family_root", "4하우스가 보여주는 심리적 기반"], ["family_karma", "가족과 집의 카르마"], ["family_rest", "마음의 안식처를 찾는 방식"], ["family_unstable", "안정감을 잃는 조건"], ["family_rebuild", "내면의 토대를 다시 세우는 법"]]],
  ["vedic_crisis_transformation", "X", "질병·위기·변형 — 6·8·12하우스의 비밀", "위기, 극복, 해방의 구조를 읽는 장", "storm", [["crisis_sixth_house", "6하우스가 보여주는 싸움과 극복"], ["crisis_eighth_house", "8하우스가 말하는 변형과 위기"], ["crisis_twelfth_house", "12하우스가 말하는 고독과 해방"], ["crisis_repetition", "반복되는 고통의 구조"], ["crisis_transmute", "위기를 수행으로 바꾸는 법"]]],
  ["vedic_yoga_blessings", "XI", "요가와 특별한 재능 — 차트 속 숨은 축복", "주요 요가와 잠재 재능을 통합하는 장", "sacred", [["yoga_meaning", "주요 요가의 의미"], ["yoga_talent", "강하게 작동하는 재능"], ["yoga_late_blessing", "늦게 열리는 축복"], ["yoga_caution", "조심해야 할 과장과 착각"], ["yoga_realization", "재능을 현실 성취로 바꾸는 법"]]],
  ["vedic_final_karma_strategy", "XII", "최종 카르마 전략 — 이번 생을 완성하는 법", "전체 차트를 삶의 전략으로 통합하는 마지막 장", "compass", [["final_summary", "차트 전체의 최종 요약"], ["final_karma_task", "가장 강한 카르마 과제"], ["final_blessing", "가장 큰 축복과 재능"], ["final_timeline", "앞으로 3년·5년·10년 전략"], ["final_declaration", "최종 조언과 영혼의 선언문"]]],
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
