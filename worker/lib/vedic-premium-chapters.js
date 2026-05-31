export const VEDIC_PREMIUM_FEATURE_KEY = "premium_pdf_vedic";
export const VEDIC_SOLO_TARGET_CHARS = 40000;

const rows = [
  ["vedic_soul_map", "I", "Chapter I. Vedic Soul Map — 베다 차트 전체 요약", "차트 전체 흐름을 종합해 삶의 방향을 읽는 장", "lotus", [["soul_1", "라그나로 보는 삶의 출발점"], ["soul_2", "달 별자리와 나크샤트라가 말하는 마음"], ["soul_3", "태양과 아트마카라카가 말하는 영혼의 방향"], ["soul_4", "가장 강하게 작동하는 행성"], ["soul_5", "현재 다샤가 열어주는 인생 주제"], ["soul_6", "이 차트의 핵심 한 줄 조언"]]],
  ["vedic_lagna", "II", "Chapter II. Lagna — 라그나와 인생의 기본 설계", "라그나와 1바바를 중심으로 기본 구조를 읽는 장", "sun", [["lagna_1", "라그나 사인의 기본 성향"], ["lagna_2", "라그나 로드의 위치와 의미"], ["lagna_3", "1바바에 놓인 행성이 만드는 인상"], ["lagna_4", "몸과 태도에 드러나는 기질"], ["lagna_5", "라그나가 직업·관계·재물에 주는 영향"], ["lagna_6", "라그나를 강점으로 쓰는 법"]]],
  ["vedic_moon_nakshatra", "III", "Chapter III. Moon & Nakshatra — 마음, 감정, 본능의 리듬", "달과 나크샤트라를 중심으로 정서 흐름을 다루는 장", "moon", [["moon_1", "달 사인으로 보는 감정 패턴"], ["moon_2", "달 바바로 보는 마음의 안식처"], ["moon_3", "달 나크샤트라의 본능"], ["moon_4", "나크샤트라 파다가 만드는 세부 기질"], ["moon_5", "감정적으로 흔들리는 순간"], ["moon_6", "마음을 안정시키는 현실 루틴"]]],
  ["vedic_karakas", "IV", "Chapter IV. Karakas — 아트마카라카·아마티야카라카·다라카라카", "세 카라카를 통해 영혼, 일, 관계 축을 읽는 장", "star", [["karaka_1", "아트마카라카가 말하는 영혼의 숙제"], ["karaka_2", "아마티야카라카가 말하는 직업적 재능"], ["karaka_3", "다라카라카가 말하는 관계와 배우자상"], ["karaka_4", "세 카라카가 만드는 인생의 균형"], ["karaka_5", "카라카가 흔들릴 때 나타나는 문제"], ["karaka_6", "카라카를 현실 전략으로 쓰는 법"]]],
  ["vedic_planetary_strength", "V", "Chapter V. Planetary Strength — 행성의 강약과 운명의 무기", "행성 강약과 라후·케투 축을 전략으로 바꾸는 장", "karma", [["planet_1", "강한 행성이 주는 재능"], ["planet_2", "약하거나 관리가 필요한 행성"], ["planet_3", "Exalted·Own·Neutral 상태의 해석"], ["planet_4", "라후와 케투가 만드는 욕망과 해방의 축"], ["planet_5", "역행 행성이 만드는 내면화된 힘"], ["planet_6", "행성 강약을 인생 전략으로 바꾸는 법"]]],
  ["vedic_bhavas", "VI", "Chapter VI. Bhavas — 12바바로 보는 삶의 영역", "12바바의 의미를 실제 삶 영역과 연결하는 장", "heart", [["bhava_1", "1·2바바: 자기 자신과 재물"], ["bhava_2", "3·4바바: 용기, 표현, 가족, 마음의 기반"], ["bhava_3", "5·6바바: 지성, 창작, 자녀, 일상 과제"], ["bhava_4", "7·8바바: 결혼, 계약, 깊은 변화"], ["bhava_5", "9·10바바: 다르마, 직업, 사회적 성취"], ["bhava_6", "11·12바바: 이익, 네트워크, 해방, 무의식"]]],
  ["vedic_love_partnership", "VII", "Chapter VII. Love, Marriage & Partnership — 사랑과 결혼의 카르마", "7바바와 금성, 다라카라카를 중심으로 관계를 읽는 장", "dharma", [["love_1", "7바바로 보는 배우자운"], ["love_2", "다라카라카와 금성으로 보는 사랑의 방식"], ["love_3", "목성이 관계에 주는 신뢰와 확장"], ["love_4", "결혼에서 반복될 수 있는 패턴"], ["love_5", "관계에서 조심해야 할 카르마 과제"], ["love_6", "오래 가는 파트너십의 조건"]]],
  ["vedic_career_money", "VIII", "Chapter VIII. Career, Karma & Money — 직업과 재물의 카르마", "직업 구조와 재물 흐름을 장기 전략으로 정리하는 장", "coin", [["career_1", "10바바로 보는 직업 방향"], ["career_2", "2바바와 11바바로 보는 재물운"], ["career_3", "아마티야카라카와 직업 재능"], ["career_4", "Lakshmi Yoga와 재물 확장성"], ["career_5", "D-10이 말하는 직업 구조"], ["career_6", "장기적 성공 전략"]]],
  ["vedic_dasha_flow", "IX", "Chapter IX. Dasha Flow — 다샤로 보는 인생의 시기", "현재와 다음 시기의 핵심 과제를 읽는 장", "home", [["dasha_1", "현재 마하 다샤의 핵심 주제"], ["dasha_2", "현재 다샤가 돈과 일에 주는 영향"], ["dasha_3", "현재 다샤가 사랑과 관계에 주는 영향"], ["dasha_4", "현재 다샤가 마음과 건강에 주는 영향"], ["dasha_5", "다음 다샤를 준비하는 법"], ["dasha_6", "다샤를 내 편으로 쓰는 선택 전략"]]],
  ["vedic_yogas_karma", "X", "Chapter X. Yogas & Karmic Signatures — 요가와 카르마 패턴", "요가와 하우스 집중 신호를 현실 전략으로 번역하는 장", "karma", [["yoga_1", "Lakshmi Yoga가 말하는 재물의 문"], ["yoga_2", "직업 요가가 말하는 성공 방식"], ["yoga_3", "라후·케투 축이 만드는 반복 패턴"], ["yoga_4", "행성 집중 하우스가 여는 인생 주제"], ["yoga_5", "보호받는 영역과 시험받는 영역"], ["yoga_6", "요가를 현실 전략으로 바꾸는 법"]]],
  ["vedic_chakra_remedy", "XI", "Chapter XI. Chakra, Remedies & Healing — 차크라·레메디·치유 전략", "차크라 균형과 생활 보완 루틴을 다루는 장", "time", [["chakra_1", "전체 차크라 균형"], ["chakra_2", "과활성 차크라가 만드는 재능과 부담"], ["chakra_3", "저활성 차크라가 말하는 관리 과제"], ["chakra_4", "만트라와 보석 처방의 의미"], ["chakra_5", "도샤 관리와 생활 루틴"], ["chakra_6", "내면의 균형을 되찾는 실천법"]]],
  ["vedic_master_plan", "XII", "Chapter XII. Vedic Master Plan — 나의 베다 운명 전략", "전체 해석을 사랑·일·돈·마음의 실행 계획으로 통합하는 장", "compass", [["master_1", "이 차트의 가장 큰 무기"], ["master_2", "반드시 관리해야 할 카르마 과제"], ["master_3", "사랑과 결혼 전략"], ["master_4", "직업과 재물 전략"], ["master_5", "마음과 건강 전략"], ["master_6", "1년·3년·10년 실행 방향"]]],
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
