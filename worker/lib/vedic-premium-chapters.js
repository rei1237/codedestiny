export const VEDIC_PERSONAL_CHAPTER_META = Object.freeze([
  { key: "V1", num: 1, mode: "personal", title: "영혼의 출발점 — 라그나와 인생의 기본 설계", subtitle: "라그나 기반 인생 기본 구조", icon: "vedic" },
  { key: "V2", num: 2, mode: "personal", title: "마음의 별자리 — 찬드라와 감정의 본질", subtitle: "찬드라 중심 정서 해석", icon: "vedic" },
  { key: "V3", num: 3, mode: "personal", title: "태양과 자아의 빛 — 수리야로 보는 삶의 방향", subtitle: "수리야 중심 자아 전략", icon: "vedic" },
  { key: "V4", num: 4, mode: "personal", title: "나크샤트라의 비밀 — 타고난 기질과 운명의 결", subtitle: "나크샤트라 기질 지도", icon: "vedic" },
  { key: "V5", num: 5, mode: "personal", title: "행성들의 회의 — 그라하 배치와 인생 작동 방식", subtitle: "주요 그라하 작동 원리", icon: "vedic" },
  { key: "V6", num: 6, mode: "personal", title: "하우스 해석 — 삶의 무대와 사건이 일어나는 영역", subtitle: "12하우스 영역 해석", icon: "vedic" },
  { key: "V7", num: 7, mode: "personal", title: "카르마와 성장 과제 — 라후·케투·토성이 보여주는 숙제", subtitle: "카르마 과제 통합", icon: "vedic" },
  { key: "V8", num: 8, mode: "personal", title: "일과 재물 전략 — 다르마, 아르타, 직업적 성취의 흐름", subtitle: "커리어·재정 전략", icon: "vedic" },
  { key: "V9", num: 9, mode: "personal", title: "사랑과 관계 패턴 — 금성, 화성, 달이 보여주는 관계 방식", subtitle: "연애·결혼 구조 분석", icon: "vedic" },
  { key: "V10", num: 10, mode: "personal", title: "다샤와 인생 타이밍 — 시기별 운의 흐름", subtitle: "다샤 기반 타이밍 설계", icon: "vedic" },
  { key: "V11", num: 11, mode: "personal", title: "요가와 숨은 조합 — 차트 안의 특별한 가능성", subtitle: "요가 조합 해석", icon: "vedic" },
  { key: "V12", num: 12, mode: "personal", title: "최종 실행 로드맵 — 베다 차트를 현실에서 쓰는 법", subtitle: "통합 실행 로드맵", icon: "vedic" },
]);

export const VEDIC_SOLO_TARGET_CHARS = Object.freeze([4500, 4300, 4300, 4000, 4600, 4800, 4400, 4500, 3900, 3900, 4200, 4600]);

export const VEDIC_PDF_CHAPTERS = Object.freeze([
  {
    id: "V1",
    order: 1,
    title: "영혼의 출발점 — 라그나와 인생의 기본 설계",
    subtitle: "라그나 기반 인생 기본 구조",
    purpose: "라그나와 1하우스를 통해 삶의 작동 기본축을 해석한다.",
    sections: [
      { id: "V1_S1", title: "라그나 별자리와 삶의 기본 성향", purpose: "라그나 기질을 파악한다.", dataBinding: { points: ["lagna"] }, minChars: 280 },
      { id: "V1_S2", title: "라그나 로드의 위치와 인생 작동 방식", purpose: "라그나 로드의 작동영역을 해석한다.", dataBinding: { points: ["lagna"], planets: ["LagnaLord"] }, minChars: 280 },
      { id: "V1_S3", title: "1하우스의 강점과 약점", purpose: "1하우스 에너지를 균형 해석한다.", dataBinding: { houses: [1] }, minChars: 280 },
      { id: "V1_S4", title: "외부 이미지와 실제 기질의 차이", purpose: "외적 페르소나와 내적 동기를 비교한다.", dataBinding: { points: ["lagna", "moon", "sun"] }, minChars: 280 },
      { id: "V1_S5", title: "인생 전반의 핵심 방향성", purpose: "라그나 축의 장기 방향을 제시한다.", dataBinding: { points: ["lagna"], houses: [1, 9, 10] }, minChars: 280 },
    ],
  },
  {
    id: "V2",
    order: 2,
    title: "마음의 별자리 — 찬드라와 감정의 본질",
    subtitle: "찬드라 중심 정서 해석",
    purpose: "달과 나크샤트라를 바탕으로 감정 패턴을 해석한다.",
    sections: [
      { id: "V2_S1", title: "달의 라시와 감정 반응", purpose: "달 라시의 반응성을 해석한다.", dataBinding: { points: ["moon"] }, minChars: 280 },
      { id: "V2_S2", title: "달의 하우스와 안정감의 조건", purpose: "정서 안정 조건을 파악한다.", dataBinding: { points: ["moon"], houses: [4] }, minChars: 280 },
      { id: "V2_S3", title: "찬드라 나크샤트라", purpose: "달 나크샤트라 기질을 해석한다.", dataBinding: { points: ["moon"], nakshatraOf: ["Moon"] }, minChars: 280 },
      { id: "V2_S4", title: "정서적 반복 패턴", purpose: "반복되는 감정 루프를 식별한다.", dataBinding: { points: ["moon"], houses: [4, 8, 12] }, minChars: 280 },
      { id: "V2_S5", title: "마음을 안정시키는 생활 전략", purpose: "정서 안정 루틴을 제시한다.", dataBinding: { points: ["moon"], dasha: true }, minChars: 280 },
    ],
  },
  {
    id: "V3",
    order: 3,
    title: "태양과 자아의 빛 — 수리야로 보는 삶의 방향",
    subtitle: "수리야 중심 자아 전략",
    purpose: "태양의 자아축과 사회적 방향성을 해석한다.",
    sections: [
      { id: "V3_S1", title: "태양의 라시와 자아 표현", purpose: "태양 라시의 자아표현 방식을 설명한다.", dataBinding: { points: ["sun"] }, minChars: 280 },
      { id: "V3_S2", title: "태양의 하우스와 사회적 방향성", purpose: "태양 하우스의 사회적 역할을 해석한다.", dataBinding: { points: ["sun"], houses: [10] }, minChars: 280 },
      { id: "V3_S3", title: "권위·명예·자존감의 패턴", purpose: "권위 인식 패턴을 해석한다.", dataBinding: { points: ["sun"], planets: ["Saturn", "Jupiter"] }, minChars: 280 },
      { id: "V3_S4", title: "아버지/권위자와의 상징적 관계", purpose: "권위자 관계의 상징을 해석한다.", dataBinding: { points: ["sun"], houses: [9, 10] }, minChars: 280 },
      { id: "V3_S5", title: "삶의 중심을 회복하는 전략", purpose: "자아축 회복 전략을 제시한다.", dataBinding: { points: ["sun"], dasha: true }, minChars: 280 },
    ],
  },
  {
    id: "V4",
    order: 4,
    title: "나크샤트라의 비밀 — 타고난 기질과 운명의 결",
    subtitle: "나크샤트라 기질 지도",
    purpose: "나크샤트라 기반 성향과 리듬을 해석한다.",
    sections: [
      { id: "V4_S1", title: "출생 나크샤트라", purpose: "핵심 나크샤트라를 제시한다.", dataBinding: { points: ["moon"], nakshatraOf: ["Moon"] }, minChars: 280 },
      { id: "V4_S2", title: "나크샤트라 지배행성", purpose: "나크샤트라 로드의 의미를 해석한다.", dataBinding: { nakshatraOf: ["Moon"] }, minChars: 280 },
      { id: "V4_S3", title: "파다 분석", purpose: "파다별 행동 성향을 해석한다.", dataBinding: { nakshatraOf: ["Moon"] }, minChars: 280 },
      { id: "V4_S4", title: "본능적 재능과 취약점", purpose: "기질의 강약을 제시한다.", dataBinding: { points: ["moon"], planets: ["Moon"] }, minChars: 280 },
      { id: "V4_S5", title: "나크샤트라 기반 삶의 리듬", purpose: "생활 리듬 전략을 제시한다.", dataBinding: { nakshatraOf: ["Moon"], dasha: true }, minChars: 280 },
    ],
  },
  {
    id: "V5",
    order: 5,
    title: "행성들의 회의 — 그라하 배치와 인생 작동 방식",
    subtitle: "주요 그라하 작동 원리",
    purpose: "주요 그라하의 작동 방식을 비교 해석한다.",
    sections: [
      { id: "V5_S1", title: "수성/Budha", purpose: "수성 작동을 해석한다.", dataBinding: { planets: ["Mercury"] }, minChars: 260 },
      { id: "V5_S2", title: "금성/Shukra", purpose: "금성 작동을 해석한다.", dataBinding: { planets: ["Venus"] }, minChars: 260 },
      { id: "V5_S3", title: "화성/Mangala", purpose: "화성 작동을 해석한다.", dataBinding: { planets: ["Mars"] }, minChars: 260 },
      { id: "V5_S4", title: "목성/Guru", purpose: "목성 작동을 해석한다.", dataBinding: { planets: ["Jupiter"] }, minChars: 260 },
      { id: "V5_S5", title: "토성/Shani", purpose: "토성 작동을 해석한다.", dataBinding: { planets: ["Saturn"] }, minChars: 260 },
      { id: "V5_S6", title: "라후/Rahu", purpose: "라후 작동을 해석한다.", dataBinding: { points: ["rahu"], planets: ["Rahu"] }, minChars: 260 },
      { id: "V5_S7", title: "케투/Ketu", purpose: "케투 작동을 해석한다.", dataBinding: { points: ["ketu"], planets: ["Ketu"] }, minChars: 260 },
      { id: "V5_S8", title: "각 행성의 강약과 현실 작동 방식", purpose: "행성 강약을 종합한다.", dataBinding: { planets: ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn", "Rahu", "Ketu"] }, minChars: 320 },
    ],
  },
  {
    id: "V6",
    order: 6,
    title: "하우스 해석 — 삶의 무대와 사건이 일어나는 영역",
    subtitle: "12하우스 영역 해석",
    purpose: "12하우스의 사건 무대를 체계적으로 해석한다.",
    sections: Array.from({ length: 12 }, (_, idx) => ({
      id: `V6_S${idx + 1}`,
      title: `${idx + 1}하우스`,
      purpose: `${idx + 1}하우스의 핵심 주제를 해석한다.`,
      dataBinding: { houses: [idx + 1] },
      minChars: 220,
    })),
  },
  {
    id: "V7",
    order: 7,
    title: "카르마와 성장 과제 — 라후·케투·토성이 보여주는 숙제",
    subtitle: "카르마 과제 통합",
    purpose: "노드 축과 토성 중심의 카르마 과제를 해석한다.",
    sections: [
      { id: "V7_S1", title: "라후의 욕망과 집착 방향", purpose: "라후 욕망축을 설명한다.", dataBinding: { points: ["rahu"], planets: ["Rahu"] }, minChars: 280 },
      { id: "V7_S2", title: "케투의 전생적 익숙함과 분리", purpose: "케투 분리축을 해석한다.", dataBinding: { points: ["ketu"], planets: ["Ketu"] }, minChars: 280 },
      { id: "V7_S3", title: "토성의 지연과 책임 과제", purpose: "토성 책임 축을 설명한다.", dataBinding: { planets: ["Saturn"] }, minChars: 280 },
      { id: "V7_S4", title: "카르마 축의 반복 패턴", purpose: "라후-케투 반복을 해석한다.", dataBinding: { rahuKetuAxis: true, planets: ["Saturn"] }, minChars: 280 },
      { id: "V7_S5", title: "성장을 위한 현실적 처방", purpose: "실행 처방을 제시한다.", dataBinding: { rahuKetuAxis: true, planets: ["Saturn"], dasha: true }, minChars: 280 },
    ],
  },
  {
    id: "V8",
    order: 8,
    title: "일과 재물 전략 — 다르마, 아르타, 직업적 성취의 흐름",
    subtitle: "커리어·재정 전략",
    purpose: "직업/재물 하우스와 관련 행성을 통합 해석한다.",
    sections: [
      { id: "V8_S1", title: "10하우스와 직업성", purpose: "직업성의 중심축을 해석한다.", dataBinding: { houses: [10], planets: ["Saturn", "Sun"] }, minChars: 280 },
      { id: "V8_S2", title: "2하우스와 수입 구조", purpose: "수입 구조를 해석한다.", dataBinding: { houses: [2], planets: ["Jupiter", "Venus"] }, minChars: 280 },
      { id: "V8_S3", title: "6하우스와 노동 방식", purpose: "노동 패턴을 해석한다.", dataBinding: { houses: [6], planets: ["Saturn", "Mars"] }, minChars: 280 },
      { id: "V8_S4", title: "11하우스와 이익 구조", purpose: "이익/네트워크 구조를 해석한다.", dataBinding: { houses: [11], planets: ["Jupiter"] }, minChars: 280 },
      { id: "V8_S5", title: "라그나 로드/10하우스 로드 기반 커리어 전략", purpose: "현실 전략을 제시한다.", dataBinding: { points: ["lagna"], houses: [1, 10], planets: ["Sun", "Saturn", "Jupiter"] }, minChars: 280 },
    ],
  },
  {
    id: "V9",
    order: 9,
    title: "사랑과 관계 패턴 — 금성, 화성, 달이 보여주는 관계 방식",
    subtitle: "연애·결혼 구조 분석",
    purpose: "관계 하우스와 관계 행성 중심으로 관계 패턴을 해석한다.",
    sections: [
      { id: "V9_S1", title: "7하우스와 배우자상", purpose: "배우자상/관계 무대를 해석한다.", dataBinding: { houses: [7], points: ["lagna"] }, minChars: 280 },
      { id: "V9_S2", title: "금성/Shukra의 관계 성향", purpose: "애정 스타일을 해석한다.", dataBinding: { planets: ["Venus"] }, minChars: 280 },
      { id: "V9_S3", title: "화성/Mangala의 욕망과 충돌 패턴", purpose: "충돌/욕망 패턴을 해석한다.", dataBinding: { planets: ["Mars"] }, minChars: 280 },
      { id: "V9_S4", title: "결혼운의 강점과 주의점", purpose: "관계 리스크/강점을 균형 해석한다.", dataBinding: { houses: [7], planets: ["Venus", "Mars", "Moon"] }, minChars: 280 },
      { id: "V9_S5", title: "관계를 안정시키는 실전 전략", purpose: "실행 전략을 제시한다.", dataBinding: { houses: [7], planets: ["Venus", "Moon"], dasha: true }, minChars: 280 },
    ],
  },
  {
    id: "V10",
    order: 10,
    title: "다샤와 인생 타이밍 — 시기별 운의 흐름",
    subtitle: "다샤 기반 타이밍 설계",
    purpose: "현재 다샤를 중심으로 시기 전략을 수립한다.",
    sections: [
      { id: "V10_S1", title: "현재 마하다샤", purpose: "현재 마하다샤의 기조를 해석한다.", dataBinding: { dasha: true }, minChars: 280 },
      { id: "V10_S2", title: "현재 안타르다샤", purpose: "현재 안타르다샤의 세부 흐름을 해석한다.", dataBinding: { dasha: true }, minChars: 280 },
      { id: "V10_S3", title: "다샤 로드의 차트 위치", purpose: "다샤 로드 위치를 해석한다.", dataBinding: { dasha: true, planets: ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn", "Rahu", "Ketu"] }, minChars: 280 },
      { id: "V10_S4", title: "현재 시기의 주요 과제", purpose: "현 시기 핵심 과제를 도출한다.", dataBinding: { dasha: true, houses: [1, 6, 10] }, minChars: 280 },
      { id: "V10_S5", title: "앞으로의 흐름과 준비 전략", purpose: "준비 전략을 제시한다.", dataBinding: { dasha: true }, minChars: 280 },
    ],
  },
  {
    id: "V11",
    order: 11,
    title: "영혼의 핵심 과제 — 아트마카라카와 삶의 사명",
    subtitle: "영혼 과제와 사명 해석",
    purpose: "아트마카라카 중심의 핵심 과제를 해석한다.",
    sections: [
      { id: "V11_S1", title: "아트마카라카 행성", purpose: "아트마카라카를 식별한다.", dataBinding: { atmakaraka: true }, minChars: 280 },
      { id: "V11_S2", title: "아트마카라카의 라시/하우스", purpose: "작동 무대를 설명한다.", dataBinding: { atmakaraka: true }, minChars: 280 },
      { id: "V11_S3", title: "영혼이 반복해서 마주하는 문제", purpose: "반복 과제를 해석한다.", dataBinding: { atmakaraka: true, dasha: true }, minChars: 280 },
      { id: "V11_S4", title: "재능과 고통이 연결되는 지점", purpose: "강점-고통 연결을 해석한다.", dataBinding: { atmakaraka: true, planets: ["Saturn", "Ketu"] }, minChars: 280 },
      { id: "V11_S5", title: "삶의 사명을 현실화하는 방식", purpose: "현실화 전략을 제시한다.", dataBinding: { atmakaraka: true, houses: [1, 9, 10] }, minChars: 280 },
    ],
  },
  {
    id: "V12",
    order: 12,
    title: "최종 실행 로드맵 — 베다 차트를 현실에서 쓰는 법",
    subtitle: "통합 실행 로드맵",
    purpose: "전체 차트를 통합 요약해 실행 로드맵을 제시한다.",
    sections: [
      { id: "V12_S1", title: "전체 차트 핵심 요약", purpose: "핵심 요약을 정리한다.", dataBinding: { points: ["lagna", "moon", "sun"], dasha: true }, minChars: 300 },
      { id: "V12_S2", title: "강점과 취약점", purpose: "강점/취약점을 균형 정리한다.", dataBinding: { planets: ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn", "Rahu", "Ketu"], houses: [1, 6, 8, 10] }, minChars: 300 },
      { id: "V12_S3", title: "사랑·직업·재물·건강 통합 전략", purpose: "영역별 통합 전략을 제시한다.", dataBinding: { houses: [2, 6, 7, 10, 11], planets: ["Venus", "Mars", "Saturn", "Jupiter", "Moon"] }, minChars: 300 },
      { id: "V12_S4", title: "현재 운에서 해야 할 선택", purpose: "현재 운 기반 선택을 제시한다.", dataBinding: { dasha: true }, minChars: 300 },
      { id: "V12_S5", title: "최종 실행 로드맵", purpose: "실행 로드맵을 완성한다.", dataBinding: { points: ["lagna", "moon", "sun"], dasha: true, atmakaraka: true }, minChars: 320 },
    ],
  },
]);

export const VEDIC_PDF_CHAPTERS_BY_KEY = Object.freeze(
  VEDIC_PDF_CHAPTERS.reduce((acc, chapter) => {
    acc[chapter.id] = chapter;
    return acc;
  }, {}),
);

export function getVedicPdfChapterConfigByKey(chapterKey) {
  const key = String(chapterKey || "").trim();
  return VEDIC_PDF_CHAPTERS_BY_KEY[key] || null;
}

export function getVedicPdfSectionTitles(chapterKey) {
  const chapter = getVedicPdfChapterConfigByKey(chapterKey);
  if (!chapter || !Array.isArray(chapter.sections)) return [];
  return chapter.sections.map((section) => String(section?.title || "").trim()).filter(Boolean);
}
