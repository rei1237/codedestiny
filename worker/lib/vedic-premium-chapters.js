export const VEDIC_PERSONAL_CHAPTER_META = Object.freeze([
  { key: "V1", num: 1, mode: "personal", title: "Ch.1 베다 차트 핵심 총론 — 이번 생의 기본 설계", subtitle: "라그나·달·태양 핵심 총론", icon: "vedic" },
  { key: "V2", num: 2, mode: "personal", title: "Ch.2 라그나와 1하우스 — 타고난 기질과 삶의 태도", subtitle: "라그나 중심 자아 구조", icon: "vedic" },
  { key: "V3", num: 3, mode: "personal", title: "Ch.3 달과 나크샤트라 — 감정, 욕구, 내면 안정", subtitle: "달/나크샤트라 정서 구조", icon: "vedic" },
  { key: "V4", num: 4, mode: "personal", title: "Ch.4 아트마카라카와 영혼의 과제 — 이번 생의 깊은 숙제", subtitle: "아트마카라카 기반 영혼 과제", icon: "vedic" },
  { key: "V5", num: 5, mode: "personal", title: "Ch.5 커리어와 사회적 성취 — 10하우스와 라후의 방향", subtitle: "커리어/사회적 역할", icon: "vedic" },
  { key: "V6", num: 6, mode: "personal", title: "Ch.6 재물과 수익 구조 — 2·11하우스와 다나 요가", subtitle: "수익 구조와 재물 운용", icon: "vedic" },
  { key: "V7", num: 7, mode: "personal", title: "Ch.7 사랑과 관계 — 금성, 5하우스, 7하우스", subtitle: "연애/관계 패턴", icon: "vedic" },
  { key: "V8", num: 8, mode: "personal", title: "Ch.8 건강과 에너지 — 6·8·12하우스의 신호", subtitle: "건강/소진/회복", icon: "vedic" },
  { key: "V9", num: 9, mode: "personal", title: "Ch.9 다샤 흐름 — 현재 시기의 운의 과제", subtitle: "현재 시기 운의 리듬", icon: "vedic" },
  { key: "V10", num: 10, mode: "personal", title: "Ch.10 최종 인생 전략 — 베다 차트 종합 로드맵", subtitle: "종합 실행 로드맵", icon: "vedic" },
]);

export const VEDIC_SOLO_TARGET_CHARS = Object.freeze([4300, 4300, 4200, 4000, 4100, 4000, 3900, 3900, 4100, 4300]);

export const VEDIC_PDF_CHAPTERS = Object.freeze([
  {
    id: "V1",
    order: 1,
    title: "Ch.1 베다 차트 핵심 총론 — 이번 생의 기본 설계",
    subtitle: "라그나·달·태양 핵심 총론",
    purpose: "라그나/달/태양/요약 신호를 통합해 이번 생의 기본 설계를 정리한다.",
    sections: [
      { id: "V1_S1", title: "1-1. 라그나가 보여주는 인생의 출발점", purpose: "라그나 기반 출발점을 해석한다.", dataBinding: { points: ["lagna"] }, minChars: 800 },
      { id: "V1_S2", title: "1-2. 달 별자리와 나크샤트라가 보여주는 마음의 구조", purpose: "달/나크샤트라 기반 정서 구조를 해석한다.", dataBinding: { points: ["moon"], nakshatraOf: ["Moon"] }, minChars: 800 },
      { id: "V1_S3", title: "1-3. 태양이 보여주는 자아와 삶의 방향", purpose: "태양 기반 자아축을 해석한다.", dataBinding: { points: ["sun"] }, minChars: 800 },
      { id: "V1_S4", title: "1-4. 차트 전체에서 가장 강한 신호", purpose: "핵심 강점 신호를 통합한다.", dataBinding: { points: ["lagna", "moon", "sun"], planets: ["Sun", "Moon", "Jupiter", "Saturn", "Rahu"], dasha: true }, minChars: 800 },
      { id: "V1_S5", title: "1-5. 이번 생의 핵심 키워드", purpose: "핵심 키워드와 실전 방향을 정리한다.", dataBinding: { points: ["lagna", "moon", "sun"], dasha: true, atmakaraka: true }, minChars: 800 },
    ],
  },
  {
    id: "V2",
    order: 2,
    title: "Ch.2 라그나와 1하우스 — 타고난 기질과 삶의 태도",
    subtitle: "라그나 중심 자아 구조",
    purpose: "라그나/1하우스/라그나 로드로 개인의 삶의 태도와 실행 패턴을 해석한다.",
    sections: [
      { id: "V2_S1", title: "2-1. 라그나 별자리의 핵심 성향", purpose: "라그나 성향을 해석한다.", dataBinding: { points: ["lagna"] }, minChars: 800 },
      { id: "V2_S2", title: "2-2. 1하우스 행성이 만드는 첫인상과 존재감", purpose: "1하우스 행성의 작동을 해석한다.", dataBinding: { houses: [1], planets: ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn", "Rahu", "Ketu"] }, minChars: 800 },
      { id: "V2_S3", title: "2-3. 라그나 로드의 위치와 인생 방향", purpose: "라그나 로드 작동 무대를 해석한다.", dataBinding: { points: ["lagna"], planets: ["LagnaLord"] }, minChars: 800 },
      { id: "V2_S4", title: "2-4. 강점이 드러나는 방식", purpose: "라그나 축 강점 발현을 해석한다.", dataBinding: { points: ["lagna"], houses: [1, 5, 10, 11] }, minChars: 800 },
      { id: "V2_S5", title: "2-5. 약점이 반복되는 패턴", purpose: "반복 취약패턴을 해석한다.", dataBinding: { points: ["lagna"], planets: ["Saturn", "Ketu"], houses: [6, 8, 12] }, minChars: 800 },
      { id: "V2_S6", title: "2-6. 라그나 기준 실전 조언", purpose: "실행 조언을 제시한다.", dataBinding: { points: ["lagna"], planets: ["LagnaLord"], dasha: true }, minChars: 800 },
    ],
  },
  {
    id: "V3",
    order: 3,
    title: "Ch.3 달과 나크샤트라 — 감정, 욕구, 내면 안정",
    subtitle: "달/나크샤트라 정서 구조",
    purpose: "달/나크샤트라 기반 감정, 애착, 회복 루틴을 해석한다.",
    sections: [
      { id: "V3_S1", title: "3-1. 달 별자리의 감정 패턴", purpose: "달 별자리 감정 패턴을 해석한다.", dataBinding: { points: ["moon"] }, minChars: 800 },
      { id: "V3_S2", title: "3-2. 나크샤트라가 보여주는 본능적 욕구", purpose: "나크샤트라 욕구를 해석한다.", dataBinding: { points: ["moon"], nakshatraOf: ["Moon"] }, minChars: 800 },
      { id: "V3_S3", title: "3-3. 마음이 흔들리는 순간", purpose: "감정 흔들림 조건을 해석한다.", dataBinding: { points: ["moon"], houses: [4, 8, 12] }, minChars: 800 },
      { id: "V3_S4", title: "3-4. 애착과 안정감의 구조", purpose: "애착/안정 구조를 해석한다.", dataBinding: { points: ["moon"], planets: ["Moon", "Venus"] }, minChars: 800 },
      { id: "V3_S5", title: "3-5. 감정 회복 루틴", purpose: "감정 회복 루틴을 제시한다.", dataBinding: { points: ["moon"], nakshatraOf: ["Moon"], dasha: true }, minChars: 800 },
    ],
  },
  {
    id: "V4",
    order: 4,
    title: "Ch.4 아트마카라카와 영혼의 과제 — 이번 생의 깊은 숙제",
    subtitle: "아트마카라카 기반 영혼 과제",
    purpose: "아트마카라카 중심으로 반복 과제와 성장 전환 지점을 해석한다.",
    sections: [
      { id: "V4_S1", title: "4-1. 아트마카라카 행성의 의미", purpose: "아트마카라카 의미를 해석한다.", dataBinding: { atmakaraka: true }, minChars: 800 },
      { id: "V4_S2", title: "4-2. 영혼이 반복해서 마주하는 과제", purpose: "반복 과제를 해석한다.", dataBinding: { atmakaraka: true, dasha: true }, minChars: 800 },
      { id: "V4_S3", title: "4-3. 고통이 성숙으로 바뀌는 지점", purpose: "성숙 전환 지점을 해석한다.", dataBinding: { atmakaraka: true, planets: ["Saturn", "Ketu"] }, minChars: 800 },
      { id: "V4_S4", title: "4-4. 피하면 반복되는 문제", purpose: "회피 시 반복 문제를 해석한다.", dataBinding: { atmakaraka: true, houses: [8, 12] }, minChars: 800 },
      { id: "V4_S5", title: "4-5. 이번 생에서 반드시 키워야 할 힘", purpose: "핵심 성장 자원을 제시한다.", dataBinding: { atmakaraka: true, houses: [1, 9, 10] }, minChars: 800 },
    ],
  },
  {
    id: "V5",
    order: 5,
    title: "Ch.5 커리어와 사회적 성취 — 10하우스와 라후의 방향",
    subtitle: "커리어/사회적 역할",
    purpose: "10하우스와 라후를 중심으로 커리어 성취 구조를 해석한다.",
    sections: [
      { id: "V5_S1", title: "5-1. 직업적 방향성과 사회적 역할", purpose: "직업/사회 역할을 해석한다.", dataBinding: { houses: [10], points: ["sun", "lagna"] }, minChars: 800 },
      { id: "V5_S2", title: "5-2. 10하우스 행성과 커리어 욕망", purpose: "10하우스 행성 욕망을 해석한다.", dataBinding: { houses: [10], planets: ["Sun", "Saturn", "Jupiter", "Mercury", "Rahu"] }, minChars: 800 },
      { id: "V5_S3", title: "5-3. 라후가 만드는 비정형적 성공 욕구", purpose: "라후 기반 욕구를 해석한다.", dataBinding: { points: ["rahu"], houses: [10], planets: ["Rahu"] }, minChars: 800 },
      { id: "V5_S4", title: "5-4. 조직형/독립형/창작형 적성", purpose: "직업 성향 적합도를 해석한다.", dataBinding: { houses: [10, 11, 5], planets: ["Saturn", "Mercury", "Venus", "Sun"] }, minChars: 800 },
      { id: "V5_S5", title: "5-5. 커리어 리스크와 돌파 전략", purpose: "커리어 리스크 대응을 제시한다.", dataBinding: { houses: [6, 8, 10], planets: ["Saturn", "Mars", "Rahu"], dasha: true }, minChars: 800 },
    ],
  },
  {
    id: "V6",
    order: 6,
    title: "Ch.6 재물과 수익 구조 — 2·11하우스와 다나 요가",
    subtitle: "수익 구조와 재물 운용",
    purpose: "2/11하우스와 다나 요가 기반 재물 구조를 해석한다.",
    sections: [
      { id: "V6_S1", title: "6-1. 돈을 버는 방식", purpose: "수익 생성 방식을 해석한다.", dataBinding: { houses: [2], planets: ["Jupiter", "Venus", "Mercury"] }, minChars: 800 },
      { id: "V6_S2", title: "6-2. 수익이 커지는 구조", purpose: "확장 구조를 해석한다.", dataBinding: { houses: [11], planets: ["Saturn", "Mercury", "Jupiter"] }, minChars: 800 },
      { id: "V6_S3", title: "6-3. 돈이 막히는 습관", purpose: "재정 병목 습관을 해석한다.", dataBinding: { houses: [2, 6, 8, 12], planets: ["Saturn", "Ketu", "Mars"] }, minChars: 800 },
      { id: "V6_S4", title: "6-4. 네트워크와 보상의 연결", purpose: "네트워크 보상 연결을 해석한다.", dataBinding: { houses: [11], planets: ["Saturn", "Mercury"] }, minChars: 800 },
      { id: "V6_S5", title: "6-5. 재물 관리 실전 조언", purpose: "재물 관리 조언을 제시한다.", dataBinding: { houses: [2, 11], planets: ["Saturn", "Mercury"], yogas: ["Dhana Yoga"], dasha: true }, minChars: 800 },
    ],
  },
  {
    id: "V7",
    order: 7,
    title: "Ch.7 사랑과 관계 — 금성, 5하우스, 7하우스",
    subtitle: "연애/관계 패턴",
    purpose: "금성과 5/7하우스를 중심으로 관계 패턴을 해석한다.",
    sections: [
      { id: "V7_S1", title: "7-1. 사랑에서 드러나는 매력", purpose: "사랑의 매력을 해석한다.", dataBinding: { planets: ["Venus"], houses: [5, 7] }, minChars: 800 },
      { id: "V7_S2", title: "7-2. 끌리는 상대의 특징", purpose: "끌림 패턴을 해석한다.", dataBinding: { houses: [7], planets: ["Venus", "Moon"] }, minChars: 800 },
      { id: "V7_S3", title: "7-3. 관계에서 이상화가 생기는 지점", purpose: "이상화 패턴을 해석한다.", dataBinding: { planets: ["Venus", "Moon", "Ketu"], houses: [5, 7, 12] }, minChars: 800 },
      { id: "V7_S4", title: "7-4. 장기 관계에서의 과제", purpose: "장기 관계 과제를 해석한다.", dataBinding: { houses: [7], planets: ["Saturn", "Mars", "Venus"] }, minChars: 800 },
      { id: "V7_S5", title: "7-5. 사랑을 오래 지키는 방법", purpose: "관계 유지 전략을 제시한다.", dataBinding: { houses: [5, 7], planets: ["Venus", "Moon"], dasha: true }, minChars: 800 },
    ],
  },
  {
    id: "V8",
    order: 8,
    title: "Ch.8 건강과 에너지 — 6·8·12하우스의 신호",
    subtitle: "건강/소진/회복",
    purpose: "6/8/12하우스와 화성/토성/케투를 중심으로 건강 신호를 해석한다.",
    sections: [
      { id: "V8_S1", title: "8-1. 몸과 마음의 취약 패턴", purpose: "취약 패턴을 해석한다.", dataBinding: { houses: [6, 8, 12], planets: ["Mars", "Saturn", "Ketu"] }, minChars: 800 },
      { id: "V8_S2", title: "8-2. 스트레스가 쌓이는 방식", purpose: "스트레스 축적 방식을 해석한다.", dataBinding: { houses: [6, 12], planets: ["Saturn", "Moon"] }, minChars: 800 },
      { id: "V8_S3", title: "8-3. 무의식적 소진과 회피", purpose: "소진/회피 패턴을 해석한다.", dataBinding: { houses: [8, 12], planets: ["Ketu", "Saturn", "Mars"] }, minChars: 800 },
      { id: "V8_S4", title: "8-4. 회복이 필요한 생활 습관", purpose: "회복 루틴을 제시한다.", dataBinding: { houses: [6, 8, 12], planets: ["Moon", "Saturn"] }, minChars: 800 },
      { id: "V8_S5", title: "8-5. 건강 관리 조언", purpose: "건강 관리 조언을 제시한다.", dataBinding: { houses: [6, 8, 12], planets: ["Mars", "Saturn", "Ketu"], dasha: true }, minChars: 800 },
    ],
  },
  {
    id: "V9",
    order: 9,
    title: "Ch.9 다샤 흐름 — 현재 시기의 운의 과제",
    subtitle: "현재 시기 운의 리듬",
    purpose: "현재 마하다샤/안타르다샤를 중심으로 시기 전략을 해석한다.",
    sections: [
      { id: "V9_S1", title: "9-1. 현재 마하다샤의 큰 흐름", purpose: "현재 마하다샤 기조를 해석한다.", dataBinding: { dasha: true }, minChars: 800 },
      { id: "V9_S2", title: "9-2. 현재 안타르다샤의 세부 과제", purpose: "현재 안타르다샤 과제를 해석한다.", dataBinding: { dasha: true }, minChars: 800 },
      { id: "V9_S3", title: "9-3. 지금 열리는 기회", purpose: "현재 기회 신호를 해석한다.", dataBinding: { dasha: true, houses: [10, 11], planets: ["Jupiter", "Saturn", "Mercury"] }, minChars: 800 },
      { id: "V9_S4", title: "9-4. 지금 조심해야 할 선택", purpose: "현재 리스크 선택을 해석한다.", dataBinding: { dasha: true, houses: [6, 8, 12], planets: ["Saturn", "Ketu", "Mars"] }, minChars: 800 },
      { id: "V9_S5", title: "9-5. 현재 운을 활용하는 전략", purpose: "현재 운 활용 전략을 제시한다.", dataBinding: { dasha: true, points: ["lagna", "moon"] }, minChars: 800 },
    ],
  },
  {
    id: "V10",
    order: 10,
    title: "Ch.10 최종 인생 전략 — 베다 차트 종합 로드맵",
    subtitle: "종합 실행 로드맵",
    purpose: "차트 전체 신호와 요가/다샤를 통합해 최종 실행 로드맵을 제시한다.",
    sections: [
      { id: "V10_S1", title: "10-1. 차트 전체 핵심 요약", purpose: "전체 핵심을 요약한다.", dataBinding: { points: ["lagna", "moon", "sun"], dasha: true }, minChars: 800 },
      { id: "V10_S2", title: "10-2. 가장 강한 자원", purpose: "핵심 강점을 정리한다.", dataBinding: { points: ["lagna", "moon", "sun"], planets: ["Jupiter", "Venus", "Saturn"], yogas: true }, minChars: 800 },
      { id: "V10_S3", title: "10-3. 가장 반복되는 약점", purpose: "반복 약점을 정리한다.", dataBinding: { houses: [6, 8, 12], planets: ["Saturn", "Ketu", "Mars"] }, minChars: 800 },
      { id: "V10_S4", title: "10-4. 앞으로 강화해야 할 선택", purpose: "강화 선택을 제시한다.", dataBinding: { dasha: true, planets: ["Mercury", "Jupiter", "Saturn"] }, minChars: 800 },
      { id: "V10_S5", title: "10-5. 피해야 할 선택", purpose: "회피 선택을 제시한다.", dataBinding: { dasha: true, houses: [8, 12], planets: ["Ketu", "Mars"] }, minChars: 800 },
      { id: "V10_S6", title: "10-6. 최종 실행 로드맵", purpose: "최종 실행 로드맵을 완성한다.", dataBinding: { points: ["lagna", "moon", "sun"], dasha: true, atmakaraka: true, yogas: true }, minChars: 800 },
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
