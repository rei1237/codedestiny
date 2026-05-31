export const VEDIC_PREMIUM_FEATURE_KEY = "premium_pdf_vedic";
export const VEDIC_SOLO_TARGET_CHARS = 40000;

const rows = [
  ["vedic_soul_map", "I", "제 1장. 베다 차트 전체 총론", "라그나와 문 사인, 행성 배치로 인생 구조를 여는 장", "lotus", [["soul_1", "내 베다 차트의 핵심 한 줄"], ["soul_2", "라그나가 보여주는 삶의 출발점"], ["soul_3", "문 사인이 보여주는 마음의 결"], ["soul_4", "전체 행성 배치가 만드는 인생 분위기"], ["soul_5", "이번 생에서 가장 중요한 배움"]]],
  ["vedic_lagna", "II", "제 2장. 라그나와 타고난 인생 설계", "라그나를 삶의 태도와 생존 전략으로 풀어내는 장", "sun", [["lagna_1", "라그나가 만드는 첫인상과 삶의 태도"], ["lagna_2", "내가 세상을 대하는 방식"], ["lagna_3", "타고난 생존 전략"], ["lagna_4", "몸과 마음의 기본 리듬"], ["lagna_5", "라그나를 잘 쓰는 방법"]]],
  ["vedic_moon_nakshatra", "III", "제 3장. 문 사인과 나크샤트라 심층 해석", "감정과 무의식의 결을 현실 조언으로 연결하는 장", "moon", [["moon_1", "문 사인이 보여주는 감정 구조"], ["moon_2", "나크샤트라가 드러내는 영혼의 결"], ["moon_3", "불안할 때 나타나는 마음의 반응"], ["moon_4", "마음이 편안해지는 조건"], ["moon_5", "감정의 힘을 잘 쓰는 방법"]]],
  ["vedic_sun_self", "IV", "제 4장. 태양과 자아의 방향성", "자존감과 사회적 존재감을 회복하는 장", "star", [["sun_1", "태양이 보여주는 자존감의 방식"], ["sun_2", "사회적으로 인정받고 싶은 모습"], ["sun_3", "권위와 책임을 대하는 태도"], ["sun_4", "나의 중심이 흔들리는 순간"], ["sun_5", "자아의 빛을 회복하는 법"]]],
  ["vedic_planet_talents", "V", "제 5장. 행성들이 말하는 재능과 성향", "수성·금성·화성·목성·토성의 작동을 삶으로 번역하는 장", "karma", [["planet_1", "수성이 보여주는 사고와 말의 방식"], ["planet_2", "금성이 보여주는 사랑과 취향"], ["planet_3", "화성이 보여주는 추진력과 욕망"], ["planet_4", "목성이 보여주는 확장과 복"], ["planet_5", "토성이 보여주는 과제와 성숙"]]],
  ["vedic_bhavas", "VI", "제 6장. 하우스로 보는 인생 영역", "주요 하우스의 실제 작동을 해석하는 장", "heart", [["bhava_1", "1하우스와 자기 자신"], ["bhava_2", "2하우스와 돈·말·가족"], ["bhava_3", "4하우스와 집·마음의 안식처"], ["bhava_4", "7하우스와 관계·배우자"], ["bhava_5", "10하우스와 직업·사회적 역할"]]],
  ["vedic_career_success", "VII", "제 7장. 직업과 사회적 성공운", "일의 구조와 성과 패턴을 구체화하는 장", "dharma", [["career_1", "내 차트가 말하는 직업적 방향"], ["career_2", "사회에서 인정받는 방식"], ["career_3", "돈보다 먼저 쌓아야 할 힘"], ["career_4", "직업적으로 피해야 할 패턴"], ["career_5", "성공을 키우는 현실 전략"]]],
  ["vedic_money_flow", "VIII", "제 8장. 재물과 풍요의 흐름", "수익과 축적의 리듬을 안정시키는 장", "coin", [["money_1", "돈이 들어오는 방식"], ["money_2", "돈이 새기 쉬운 지점"], ["money_3", "축적과 확장의 리듬"], ["money_4", "재물운을 키우는 태도"], ["money_5", "풍요를 안정시키는 방법"]]],
  ["vedic_love_partnership", "IX", "제 9장. 사랑과 배우자운", "관계 패턴과 장기 파트너십을 다루는 장", "home", [["love_1", "사랑할 때 드러나는 나의 모습"], ["love_2", "내가 끌리는 사람의 분위기"], ["love_3", "관계에서 반복되는 과제"], ["love_4", "배우자운과 장기 관계의 조건"], ["love_5", "사랑을 성숙하게 유지하는 법"]]],
  ["vedic_dasha_flow", "X", "제 10장. 다샤로 보는 운의 흐름", "현재와 다음 시기의 과제를 읽는 장", "time", [["dasha_1", "현재 다샤가 여는 인생 주제"], ["dasha_2", "지금 강해지는 기회"], ["dasha_3", "지금 감당해야 할 과제"], ["dasha_4", "다음 흐름을 준비하는 법"], ["dasha_5", "다샤를 현실에서 활용하는 전략"]]],
  ["vedic_karma_growth", "XI", "제 11장. 카르마와 영적 성장의 방향", "라후·케투와 8/9/12하우스 신호를 성숙으로 바꾸는 장", "karma", [["karma_1", "라후가 보여주는 이번 생의 욕망"], ["karma_2", "케투가 보여주는 익숙한 과거의 습관"], ["karma_3", "반복되는 인생의 숙제"], ["karma_4", "관계와 일에서 드러나는 카르마"], ["karma_5", "성숙해질수록 열리는 길"]]],
  ["vedic_master_plan", "XII", "제 12장. 인생을 위한 최종 베다 마스터플랜", "전체 상담을 삶의 실행 계획으로 통합하는 장", "compass", [["master_1", "내 차트의 최종 핵심 메시지"], ["master_2", "반드시 키워야 할 힘"], ["master_3", "내려놓아야 할 삶의 습관"], ["master_4", "앞으로 3년의 방향"], ["master_5", "나를 가장 빛나게 하는 선택"]]],
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
    .replace(/\b(payload|json|localdraft|fallback|seed|skeleton|local|engine|validation|retry|llm|api|debug)\b/gi, "")
    .replace(/chapter\s*1\s*chapter\s*1/gi, "")
    .replace(/데이터가\s*부족합니다/gi, "")
    .replace(/자동\s*복구\s*생성/gi, "")
    .replace(/내부\s*데이터/gi, "")
    .replace(/계산\s*시그니처/gi, "")
    .replace(/생성\s*로직/gi, "")
    .replace(/챕터\s*생성기/gi, "")
    .replace(/카테고리\s*렌더러/gi, "")
    .replace(/PreflightFailed/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}
