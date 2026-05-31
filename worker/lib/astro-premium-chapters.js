export const ASTRO_PREMIUM_FEATURE_KEY = "premium-astrology-report";

export const ASTRO_PREMIUM_CHAPTERS = [
  {
    id: "astro_cosmic_summary",
    order: 1,
    roman: "I",
    title: "Cosmic Summary — 전체 차트의 핵심 분위기",
    categories: [
      { id: "c1_s1", title: "태양·달·상승궁이 만드는 기본 인상" },
      { id: "c1_s2", title: "차트 전체의 기질과 삶의 방향" },
      { id: "c1_s3", title: "원소 분포로 보는 강점과 보완점" },
      { id: "c1_s4", title: "양식 분포로 보는 행동 패턴" },
      { id: "c1_s5", title: "집중 하우스가 말하는 인생 주제" },
      { id: "c1_s6", title: "이 차트의 핵심 한 줄 조언" },
    ],
  },
  {
    id: "astro_sun",
    order: 2,
    roman: "II",
    title: "Sun Sign — 태양이 말하는 삶의 목적",
    categories: [
      { id: "c2_s1", title: "태양 별자리의 핵심 성향" },
      { id: "c2_s2", title: "태양 하우스로 보는 인생 무대" },
      { id: "c2_s3", title: "자아와 목표가 살아나는 방식" },
      { id: "c2_s4", title: "자신감이 흔들리는 순간" },
      { id: "c2_s5", title: "일상·루틴·서비스와 태양의 연결" },
      { id: "c2_s6", title: "태양 에너지를 현실에서 쓰는 법" },
    ],
  },
  {
    id: "astro_moon",
    order: 3,
    roman: "III",
    title: "Moon Sign — 달이 말하는 감정과 안정감",
    categories: [
      { id: "c3_s1", title: "달 별자리의 감정 패턴" },
      { id: "c3_s2", title: "달 하우스로 보는 마음의 집" },
      { id: "c3_s3", title: "안정감을 얻는 방식" },
      { id: "c3_s4", title: "불안과 방어기제" },
      { id: "c3_s5", title: "관계에서 드러나는 감정 습관" },
      { id: "c3_s6", title: "마음을 회복시키는 루틴" },
    ],
  },
  {
    id: "astro_asc_mc",
    order: 4,
    roman: "IV",
    title: "Ascendant & MC — 상승궁과 사회적 방향",
    categories: [
      { id: "c4_s1", title: "상승궁이 만드는 첫인상" },
      { id: "c4_s2", title: "세상에 접근하는 방식" },
      { id: "c4_s3", title: "Desc로 보는 관계의 반대축" },
      { id: "c4_s4", title: "MC로 보는 사회적 방향" },
      { id: "c4_s5", title: "개인 브랜딩과 직업 이미지" },
      { id: "c4_s6", title: "상승궁과 MC를 함께 쓰는 법" },
    ],
  },
  {
    id: "astro_personal_planets",
    order: 5,
    roman: "V",
    title: "Mercury·Venus·Mars — 생각, 사랑, 행동의 작동 방식",
    categories: [
      { id: "c5_s1", title: "수성으로 보는 사고와 말" },
      { id: "c5_s2", title: "금성으로 보는 사랑과 취향" },
      { id: "c5_s3", title: "화성으로 보는 추진력과 분노" },
      { id: "c5_s4", title: "세 행성이 만드는 관계 패턴" },
      { id: "c5_s5", title: "표현과 욕망이 충돌하는 순간" },
      { id: "c5_s6", title: "매력과 행동력을 현실에서 쓰는 법" },
    ],
  },
  {
    id: "astro_jupiter_saturn",
    order: 6,
    roman: "VI",
    title: "Jupiter·Saturn — 확장과 책임의 균형",
    categories: [
      { id: "c6_s1", title: "목성이 열어주는 기회" },
      { id: "c6_s2", title: "토성이 요구하는 책임" },
      { id: "c6_s3", title: "목성 역행이 만드는 내면화된 성장" },
      { id: "c6_s4", title: "목성-토성 충이 만드는 인생의 압력" },
      { id: "c6_s5", title: "성장과 제한이 만나는 지점" },
      { id: "c6_s6", title: "장기 성공 전략" },
    ],
  },
  {
    id: "astro_houses",
    order: 7,
    roman: "VII",
    title: "Houses — 12하우스로 보는 삶의 영역",
    categories: [
      { id: "c7_s1", title: "1·2하우스: 자기 표현과 돈" },
      { id: "c7_s2", title: "3·4하우스: 생각, 가족, 기반" },
      { id: "c7_s3", title: "5·6하우스: 창작, 연애, 일상" },
      { id: "c7_s4", title: "7·8하우스: 관계, 결합, 깊은 변화" },
      { id: "c7_s5", title: "9·10하우스: 철학, 직업, 사회적 성공" },
      { id: "c7_s6", title: "11·12하우스: 공동체, 무의식, 회복" },
    ],
  },
  {
    id: "astro_aspects",
    order: 8,
    roman: "VIII",
    title: "Aspects — 행성 간 긴장과 재능",
    categories: [
      { id: "c8_s1", title: "달-목성 긴장각이 만드는 기대와 과잉" },
      { id: "c8_s2", title: "달-토성 긴장각이 만드는 불안과 자기검열" },
      { id: "c8_s3", title: "화성-목성 육합이 주는 실행 확장성" },
      { id: "c8_s4", title: "목성-토성 충이 만드는 성장의 압력" },
      { id: "c8_s5", title: "긴장각을 재능으로 바꾸는 법" },
      { id: "c8_s6", title: "주요 어스펙트 종합 조언" },
    ],
  },
  {
    id: "astro_love",
    order: 9,
    roman: "IX",
    title: "Love & Relationship — 사랑과 관계의 지도",
    categories: [
      { id: "c9_s1", title: "사랑을 시작하는 방식" },
      { id: "c9_s2", title: "끌리는 사람의 유형" },
      { id: "c9_s3", title: "관계에서 반복되는 패턴" },
      { id: "c9_s4", title: "갈등이 생기는 이유" },
      { id: "c9_s5", title: "오래 가는 관계의 조건" },
      { id: "c9_s6", title: "사랑을 지키는 현실 조언" },
    ],
  },
  {
    id: "astro_career",
    order: 10,
    roman: "X",
    title: "Career & Money — 직업과 재물의 방향",
    categories: [
      { id: "c10_s1", title: "직업 적성과 사회적 역할" },
      { id: "c10_s2", title: "돈이 들어오는 방식" },
      { id: "c10_s3", title: "일에서 인정받는 방식" },
      { id: "c10_s4", title: "창작·기획·상담·기술 적성" },
      { id: "c10_s5", title: "커리어에서 조심할 지점" },
      { id: "c10_s6", title: "장기적인 성공 전략" },
    ],
  },
  {
    id: "astro_timing",
    order: 11,
    roman: "XI",
    title: "Timing & Healing — 현재 시기와 회복 전략",
    categories: [
      { id: "c11_s1", title: "Firdaria 달/달이 말하는 현재 주제" },
      { id: "c11_s2", title: "12하우스 프로펙션의 의미" },
      { id: "c11_s3", title: "목성 트랜싯이 열어주는 회복 방향" },
      { id: "c11_s4", title: "지금 버릴 선택과 잡을 선택" },
      { id: "c11_s5", title: "90일 행동 로드맵" },
      { id: "c11_s6", title: "리스크 완충 전략" },
    ],
  },
  {
    id: "astro_master_plan",
    order: 12,
    roman: "XII",
    title: "Cosmic Master Plan — 나만의 우주 전략",
    categories: [
      { id: "c12_s1", title: "이 차트의 가장 큰 재능" },
      { id: "c12_s2", title: "반드시 관리해야 할 약점" },
      { id: "c12_s3", title: "사랑과 관계 전략" },
      { id: "c12_s4", title: "돈과 일의 전략" },
      { id: "c12_s5", title: "몸과 마음의 전략" },
      { id: "c12_s6", title: "1년·3년·10년 실행 방향" },
    ],
  },
];

export function sanitizeAstroPremiumText(value) {
  return String(value || "")
    .replace(/\b(undefined|null|nan)\b/gi, "")
    .replace(/\b(payload|json|localdraft|fallback|llm|api|raw|schema|debug)\b/gi, "")
    .replace(/\b(preflightfailed|swiss\s*required|chart\s*seed\s*failed)\b/gi, "")
    .replace(/(내부\s*데이터|엔진\s*결과|계산\s*시그니처|데이터\s*정규화|품질\s*검증|재생성|디버그)/gi, "")
    .replace(/chapter\s*1(\s*chapter\s*1)*/gi, "")
    .replace(/자동\s*복구\s*생성/gi, "")
    .replace(/데이터가\s*부족합니다/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export function getAstroChapterTitles() {
  return ASTRO_PREMIUM_CHAPTERS.map((chapter) => chapter.title);
}
