export const VEDIC_PERSONAL_CHAPTER_META = Object.freeze([
  { key: "V1", num: 1, mode: "personal", title: "Ch.1 베다 차트 핵심 총론 — 이번 생의 기본 설계", subtitle: "라그나·달·태양 핵심 총론", icon: "vedic" },
  { key: "V2", num: 2, mode: "personal", title: "Ch.2 라그나와 1하우스 — 타고난 기질과 삶의 태도", subtitle: "라그나 중심 자아 구조", icon: "vedic" },
  { key: "V3", num: 3, mode: "personal", title: "Ch.3 달과 나크샤트라 — 감정, 욕구, 내면 안정", subtitle: "달과 나크샤트라 정서 구조", icon: "vedic" },
  { key: "V4", num: 4, mode: "personal", title: "Ch.4 아트마카라카와 영혼의 과제 — 이번 생의 깊은 숙제", subtitle: "아트마카라카 기반 영혼 과제", icon: "vedic" },
  { key: "V5", num: 5, mode: "personal", title: "Ch.5 행성별 카르마 해석 — 9그라하의 작동 방식", subtitle: "태양·달·화성·수성·목성·금성·토성·라후·케투", icon: "vedic" },
  { key: "V6", num: 6, mode: "personal", title: "Ch.6 12하우스 인생 영역 분석 — 삶의 무대별 사건 구조", subtitle: "하우스별 삶의 영역과 반복 패턴", icon: "vedic" },
  { key: "V7", num: 7, mode: "personal", title: "Ch.7 커리어와 사회적 성취 — 10하우스와 라후의 방향", subtitle: "직업, 사회적 역할, 성취 방식", icon: "vedic" },
  { key: "V8", num: 8, mode: "personal", title: "Ch.8 재물과 수익 구조 — 2·11하우스와 다나 요가", subtitle: "수익 구조와 재물 운용", icon: "vedic" },
  { key: "V9", num: 9, mode: "personal", title: "Ch.9 사랑과 관계 — 금성, 5하우스, 7하우스", subtitle: "연애, 결혼, 관계 패턴", icon: "vedic" },
  { key: "V10", num: 10, mode: "personal", title: "Ch.10 건강과 에너지 — 6·8·12하우스의 신호", subtitle: "건강, 소진, 회복 루틴", icon: "vedic" },
  { key: "V11", num: 11, mode: "personal", title: "Ch.11 다샤 흐름 — 현재 시기의 운의 과제", subtitle: "마하다샤·안타르다샤 기반 현재 운의 리듬", icon: "vedic" },
  { key: "V12", num: 12, mode: "personal", title: "Ch.12 최종 인생 전략 — 베다 차트 종합 로드맵", subtitle: "라그나·나크샤트라·다샤·하우스 통합 실행 전략", icon: "vedic" },
]);

export const VEDIC_SOLO_TARGET_CHARS = Object.freeze([4300, 4300, 4200, 4000, 4200, 4100, 4100, 4000, 3900, 3900, 4100, 4300]);

const bind = (requiredData = [], requiredPlanets = [], requiredHouses = []) => {
  const points = [];
  if (requiredData.includes("lagna")) points.push("lagna");
  if (requiredData.includes("moon")) points.push("moon");
  if (requiredData.includes("sun")) points.push("sun");
  const dataBinding = {
    requiredData,
    requiredPlanets,
    requiredHouses,
  };
  if (points.length) dataBinding.points = points;
  if (requiredData.includes("dashas")) dataBinding.dasha = true;
  if (requiredData.includes("atmakaraka")) dataBinding.atmakaraka = true;
  if (requiredData.includes("nakshatra")) dataBinding.nakshatraOf = ["Moon"];
  if (requiredData.includes("yogas")) dataBinding.yogas = true;
  if (requiredPlanets.length) dataBinding.planets = requiredPlanets;
  if (requiredHouses.length) dataBinding.houses = requiredHouses;
  return dataBinding;
};

export const VEDIC_CATEGORY_DATA_MAP = Object.freeze({
  V1_S1: { requiredData: ["lagna"], requiredHouses: [1] },
  V1_S2: { requiredData: ["moon", "nakshatra"] },
  V1_S3: { requiredData: ["sun"] },
  V1_S4: { requiredData: ["lagna", "planets", "houses", "strengths"] },
  V1_S5: { requiredData: ["lagna", "moon", "nakshatra", "atmakaraka"] },

  V2_S1: { requiredData: ["lagna"], requiredHouses: [1] },
  V2_S2: { requiredData: ["houses", "planets"], requiredHouses: [1] },
  V2_S3: { requiredData: ["lagna", "planets"] },
  V2_S4: { requiredData: ["lagna", "strengths"] },
  V2_S5: { requiredData: ["lagna", "houses", "planets"] },
  V2_S6: { requiredData: ["lagna", "houses", "planets"] },

  V3_S1: { requiredData: ["moon"] },
  V3_S2: { requiredData: ["nakshatra"] },
  V3_S3: { requiredData: ["moon", "houses"], requiredHouses: [4, 8, 12] },
  V3_S4: { requiredData: ["moon", "relationship"], requiredHouses: [4, 7] },
  V3_S5: { requiredData: ["moon", "health"], requiredHouses: [6, 12] },

  V4_S1: { requiredData: ["atmakaraka"] },
  V4_S2: { requiredData: ["atmakaraka", "houses"] },
  V4_S3: { requiredData: ["atmakaraka", "spiritual"], requiredHouses: [8, 12] },
  V4_S4: { requiredData: ["atmakaraka", "dashas"] },
  V4_S5: { requiredData: ["atmakaraka", "lagna"] },

  V5_S1: { requiredData: ["planets"], requiredPlanets: ["Sun", "Moon", "Mars", "Mercury"] },
  V5_S2: { requiredData: ["planets"], requiredPlanets: ["Jupiter", "Venus"] },
  V5_S3: { requiredData: ["planets"], requiredPlanets: ["Saturn"] },
  V5_S4: { requiredData: ["planets"], requiredPlanets: ["Rahu", "Ketu"] },
  V5_S5: { requiredData: ["planets", "strengths"] },

  V6_S1: { requiredData: ["houses"], requiredHouses: [1, 4, 7, 10] },
  V6_S2: { requiredData: ["houses", "career", "money"], requiredHouses: [2, 6, 10] },
  V6_S3: { requiredData: ["houses", "relationship"], requiredHouses: [5, 7, 11] },
  V6_S4: { requiredData: ["houses", "spiritual"], requiredHouses: [8, 12] },
  V6_S5: { requiredData: ["houses", "planets"] },

  V7_S1: { requiredData: ["career"], requiredHouses: [10] },
  V7_S2: { requiredData: ["career", "planets"], requiredHouses: [10] },
  V7_S3: { requiredData: ["career"], requiredPlanets: ["Rahu"] },
  V7_S4: { requiredData: ["career", "lagna", "planets"] },
  V7_S5: { requiredData: ["career", "dashas", "planets"] },

  V8_S1: { requiredData: ["money"], requiredHouses: [2] },
  V8_S2: { requiredData: ["money"], requiredHouses: [11] },
  V8_S3: { requiredData: ["money"], requiredHouses: [2, 6, 8, 12] },
  V8_S4: { requiredData: ["money"], requiredHouses: [11] },
  V8_S5: { requiredData: ["money", "yogas"] },

  V9_S1: { requiredData: ["relationship"], requiredPlanets: ["Venus"] },
  V9_S2: { requiredData: ["relationship"], requiredHouses: [5, 7] },
  V9_S3: { requiredData: ["relationship"], requiredPlanets: ["Venus", "Rahu", "Ketu"] },
  V9_S4: { requiredData: ["relationship"], requiredHouses: [7, 8, 12] },
  V9_S5: { requiredData: ["relationship", "moon"] },

  V10_S1: { requiredData: ["health"], requiredHouses: [6, 8, 12] },
  V10_S2: { requiredData: ["health"], requiredPlanets: ["Moon", "Mars", "Saturn"] },
  V10_S3: { requiredData: ["health", "spiritual"], requiredHouses: [8, 12] },
  V10_S4: { requiredData: ["health", "moon"] },
  V10_S5: { requiredData: ["health", "dashas"] },

  V11_S1: { requiredData: ["dashas"] },
  V11_S2: { requiredData: ["dashas"] },
  V11_S3: { requiredData: ["dashas", "career", "money"] },
  V11_S4: { requiredData: ["dashas", "health", "relationship"] },
  V11_S5: { requiredData: ["dashas", "lagna"] },

  V12_S1: { requiredData: ["lagna", "moon", "nakshatra", "atmakaraka", "dashas"] },
  V12_S2: { requiredData: ["strengths", "planets", "houses"] },
  V12_S3: { requiredData: ["houses", "planets", "dashas"] },
  V12_S4: { requiredData: ["career", "money", "relationship", "health"] },
  V12_S5: { requiredData: ["dashas", "atmakaraka"] },
  V12_S6: { requiredData: ["lagna", "moon", "dashas", "yogas"] },
});

export const VEDIC_PDF_CHAPTERS = Object.freeze([
  {
    id: "V1",
    order: 1,
    title: "Ch.1 베다 차트 핵심 총론 — 이번 생의 기본 설계",
    subtitle: "라그나·달·태양 핵심 총론",
    purpose: "라그나/달/태양 기반으로 이번 생의 핵심 설계를 통합한다.",
    sections: [
      { id: "V1_S1", title: "1-1. 라그나가 보여주는 인생의 출발점", purpose: "라그나 기반 출발점을 해석한다.", dataBinding: bind(["lagna"], [], [1]), minChars: 800 },
      { id: "V1_S2", title: "1-2. 달 별자리와 나크샤트라가 보여주는 마음의 구조", purpose: "달/나크샤트라 정서 구조를 해석한다.", dataBinding: bind(["moon", "nakshatra"]), minChars: 800 },
      { id: "V1_S3", title: "1-3. 태양이 보여주는 자아와 삶의 방향", purpose: "태양 기반 자아축을 해석한다.", dataBinding: bind(["sun"]), minChars: 800 },
      { id: "V1_S4", title: "1-4. 차트 전체에서 가장 강한 신호", purpose: "핵심 강점 신호를 통합한다.", dataBinding: bind(["lagna", "planets", "houses", "strengths"]), minChars: 800 },
      { id: "V1_S5", title: "1-5. 이번 생의 핵심 키워드", purpose: "핵심 키워드와 실전 방향을 정리한다.", dataBinding: bind(["lagna", "moon", "nakshatra", "atmakaraka"]), minChars: 800 },
    ],
  },
  {
    id: "V2",
    order: 2,
    title: "Ch.2 라그나와 1하우스 — 타고난 기질과 삶의 태도",
    subtitle: "라그나 중심 자아 구조",
    purpose: "라그나/1하우스 기반 자아 패턴을 해석한다.",
    sections: [
      { id: "V2_S1", title: "2-1. 라그나 별자리의 핵심 성향", purpose: "라그나 성향을 해석한다.", dataBinding: bind(["lagna"], [], [1]), minChars: 800 },
      { id: "V2_S2", title: "2-2. 1하우스 행성이 만드는 첫인상과 존재감", purpose: "1하우스 행성 작동을 해석한다.", dataBinding: bind(["houses", "planets"], [], [1]), minChars: 800 },
      { id: "V2_S3", title: "2-3. 라그나 로드의 위치와 인생 방향", purpose: "라그나 로드 작동 무대를 해석한다.", dataBinding: bind(["lagna", "planets"]), minChars: 800 },
      { id: "V2_S4", title: "2-4. 강점이 드러나는 방식", purpose: "강점 발현 구조를 해석한다.", dataBinding: bind(["lagna", "strengths"]), minChars: 800 },
      { id: "V2_S5", title: "2-5. 약점이 반복되는 패턴", purpose: "반복 취약패턴을 해석한다.", dataBinding: bind(["lagna", "houses", "planets"]), minChars: 800 },
      { id: "V2_S6", title: "2-6. 라그나 기준 실전 조언", purpose: "라그나 기반 실행 조언을 제시한다.", dataBinding: bind(["lagna", "houses", "planets"]), minChars: 800 },
    ],
  },
  {
    id: "V3",
    order: 3,
    title: "Ch.3 달과 나크샤트라 — 감정, 욕구, 내면 안정",
    subtitle: "달과 나크샤트라 정서 구조",
    purpose: "달/나크샤트라 기반 감정 구조를 해석한다.",
    sections: [
      { id: "V3_S1", title: "3-1. 달 별자리의 감정 패턴", purpose: "달 별자리 감정 패턴을 해석한다.", dataBinding: bind(["moon"]), minChars: 800 },
      { id: "V3_S2", title: "3-2. 나크샤트라가 보여주는 본능적 욕구", purpose: "나크샤트라 욕구를 해석한다.", dataBinding: bind(["nakshatra"]), minChars: 800 },
      { id: "V3_S3", title: "3-3. 마음이 흔들리는 순간", purpose: "감정 흔들림 조건을 해석한다.", dataBinding: bind(["moon", "houses"], [], [4, 8, 12]), minChars: 800 },
      { id: "V3_S4", title: "3-4. 애착과 안정감의 구조", purpose: "애착/안정 구조를 해석한다.", dataBinding: bind(["moon", "relationship"], [], [4, 7]), minChars: 800 },
      { id: "V3_S5", title: "3-5. 감정 회복 루틴", purpose: "감정 회복 루틴을 제시한다.", dataBinding: bind(["moon", "health"], [], [6, 12]), minChars: 800 },
    ],
  },
  {
    id: "V4",
    order: 4,
    title: "Ch.4 아트마카라카와 영혼의 과제 — 이번 생의 깊은 숙제",
    subtitle: "아트마카라카 기반 영혼 과제",
    purpose: "아트마카라카 중심 반복 과제를 해석한다.",
    sections: [
      { id: "V4_S1", title: "4-1. 아트마카라카 행성의 의미", purpose: "아트마카라카 의미를 해석한다.", dataBinding: bind(["atmakaraka"]), minChars: 800 },
      { id: "V4_S2", title: "4-2. 영혼이 반복해서 마주하는 과제", purpose: "반복 과제를 해석한다.", dataBinding: bind(["atmakaraka", "houses"]), minChars: 800 },
      { id: "V4_S3", title: "4-3. 고통이 성숙으로 바뀌는 지점", purpose: "성숙 전환 지점을 해석한다.", dataBinding: bind(["atmakaraka", "spiritual"], [], [8, 12]), minChars: 800 },
      { id: "V4_S4", title: "4-4. 피하면 반복되는 문제", purpose: "회피 시 반복 문제를 해석한다.", dataBinding: bind(["atmakaraka", "dashas"]), minChars: 800 },
      { id: "V4_S5", title: "4-5. 이번 생에서 반드시 키워야 할 힘", purpose: "핵심 성장 자원을 제시한다.", dataBinding: bind(["atmakaraka", "lagna"]), minChars: 800 },
    ],
  },
  {
    id: "V5",
    order: 5,
    title: "Ch.5 행성별 카르마 해석 — 9그라하의 작동 방식",
    subtitle: "태양·달·화성·수성·목성·금성·토성·라후·케투",
    purpose: "9그라하 작동과 균형을 해석한다.",
    sections: [
      { id: "V5_S1", title: "5-1. 개인 행성이 만드는 성격과 선택", purpose: "개인행성 선택 패턴을 해석한다.", dataBinding: bind(["planets"], ["Sun", "Moon", "Mars", "Mercury"]), minChars: 800 },
      { id: "V5_S2", title: "5-2. 목성과 금성이 주는 확장과 관계성", purpose: "확장/관계성 축을 해석한다.", dataBinding: bind(["planets"], ["Jupiter", "Venus"]), minChars: 800 },
      { id: "V5_S3", title: "5-3. 토성이 만드는 책임과 지연", purpose: "토성 기반 책임 축을 해석한다.", dataBinding: bind(["planets"], ["Saturn"]), minChars: 800 },
      { id: "V5_S4", title: "5-4. 라후와 케투가 만드는 욕망과 해탈", purpose: "라후/케투 축을 해석한다.", dataBinding: bind(["planets"], ["Rahu", "Ketu"]), minChars: 800 },
      { id: "V5_S5", title: "5-5. 행성 전체의 균형과 불균형", purpose: "행성 균형/불균형을 정리한다.", dataBinding: bind(["planets", "strengths"]), minChars: 800 },
    ],
  },
  {
    id: "V6",
    order: 6,
    title: "Ch.6 12하우스 인생 영역 분석 — 삶의 무대별 사건 구조",
    subtitle: "하우스별 삶의 영역과 반복 패턴",
    purpose: "12하우스 무대별 반복 패턴을 해석한다.",
    sections: [
      { id: "V6_S1", title: "6-1. 1·4·7·10하우스 핵심 축", purpose: "기본 축을 해석한다.", dataBinding: bind(["houses"], [], [1, 4, 7, 10]), minChars: 800 },
      { id: "V6_S2", title: "6-2. 2·6·10하우스 현실 성취 축", purpose: "현실 성취 축을 해석한다.", dataBinding: bind(["houses", "career", "money"], [], [2, 6, 10]), minChars: 800 },
      { id: "V6_S3", title: "6-3. 5·7·11하우스 관계와 욕망 축", purpose: "관계/욕망 축을 해석한다.", dataBinding: bind(["houses", "relationship"], [], [5, 7, 11]), minChars: 800 },
      { id: "V6_S4", title: "6-4. 8·12하우스 무의식과 변화 축", purpose: "무의식/변화 축을 해석한다.", dataBinding: bind(["houses", "spiritual"], [], [8, 12]), minChars: 800 },
      { id: "V6_S5", title: "6-5. 하우스 전체에서 반복되는 삶의 패턴", purpose: "하우스 전체 패턴을 통합한다.", dataBinding: bind(["houses", "planets"]), minChars: 800 },
    ],
  },
  {
    id: "V7",
    order: 7,
    title: "Ch.7 커리어와 사회적 성취 — 10하우스와 라후의 방향",
    subtitle: "직업, 사회적 역할, 성취 방식",
    purpose: "커리어와 사회적 역할 축을 해석한다.",
    sections: [
      { id: "V7_S1", title: "7-1. 직업적 방향성과 사회적 역할", purpose: "직업 방향성을 해석한다.", dataBinding: bind(["career"], [], [10]), minChars: 800 },
      { id: "V7_S2", title: "7-2. 10하우스 행성과 커리어 욕망", purpose: "10하우스 커리어 욕망을 해석한다.", dataBinding: bind(["career", "planets"], [], [10]), minChars: 800 },
      { id: "V7_S3", title: "7-3. 라후가 만드는 비정형적 성공 욕구", purpose: "라후 기반 성공 욕구를 해석한다.", dataBinding: bind(["career"], ["Rahu"]), minChars: 800 },
      { id: "V7_S4", title: "7-4. 조직형·독립형·창작형 적성", purpose: "커리어 적성 유형을 해석한다.", dataBinding: bind(["career", "lagna", "planets"]), minChars: 800 },
      { id: "V7_S5", title: "7-5. 커리어 리스크와 돌파 전략", purpose: "커리어 리스크 대응을 제시한다.", dataBinding: bind(["career", "dashas", "planets"]), minChars: 800 },
    ],
  },
  {
    id: "V8",
    order: 8,
    title: "Ch.8 재물과 수익 구조 — 2·11하우스와 다나 요가",
    subtitle: "수익 구조와 재물 운용",
    purpose: "재물/수익 구조를 해석한다.",
    sections: [
      { id: "V8_S1", title: "8-1. 돈을 버는 방식", purpose: "수익 생성 방식을 해석한다.", dataBinding: bind(["money"], [], [2]), minChars: 800 },
      { id: "V8_S2", title: "8-2. 수익이 커지는 구조", purpose: "수익 확장 구조를 해석한다.", dataBinding: bind(["money"], [], [11]), minChars: 800 },
      { id: "V8_S3", title: "8-3. 돈이 막히는 습관", purpose: "재정 병목 습관을 해석한다.", dataBinding: bind(["money"], [], [2, 6, 8, 12]), minChars: 800 },
      { id: "V8_S4", title: "8-4. 네트워크와 보상의 연결", purpose: "네트워크와 보상 연결을 해석한다.", dataBinding: bind(["money"], [], [11]), minChars: 800 },
      { id: "V8_S5", title: "8-5. 재물 관리 실전 조언", purpose: "재물 관리 조언을 제시한다.", dataBinding: bind(["money", "yogas"]), minChars: 800 },
    ],
  },
  {
    id: "V9",
    order: 9,
    title: "Ch.9 사랑과 관계 — 금성, 5하우스, 7하우스",
    subtitle: "연애, 결혼, 관계 패턴",
    purpose: "사랑과 관계 패턴을 해석한다.",
    sections: [
      { id: "V9_S1", title: "9-1. 사랑에서 드러나는 매력", purpose: "사랑 매력을 해석한다.", dataBinding: bind(["relationship"], ["Venus"]), minChars: 800 },
      { id: "V9_S2", title: "9-2. 끌리는 상대의 특징", purpose: "끌림 패턴을 해석한다.", dataBinding: bind(["relationship"], [], [5, 7]), minChars: 800 },
      { id: "V9_S3", title: "9-3. 관계에서 이상화가 생기는 지점", purpose: "이상화 패턴을 해석한다.", dataBinding: bind(["relationship"], ["Venus", "Rahu", "Ketu"]), minChars: 800 },
      { id: "V9_S4", title: "9-4. 장기 관계에서의 과제", purpose: "장기 관계 과제를 해석한다.", dataBinding: bind(["relationship"], [], [7, 8, 12]), minChars: 800 },
      { id: "V9_S5", title: "9-5. 사랑을 오래 지키는 방법", purpose: "관계 유지 전략을 제시한다.", dataBinding: bind(["relationship", "moon"]), minChars: 800 },
    ],
  },
  {
    id: "V10",
    order: 10,
    title: "Ch.10 건강과 에너지 — 6·8·12하우스의 신호",
    subtitle: "건강, 소진, 회복 루틴",
    purpose: "건강/소진/회복 신호를 해석한다.",
    sections: [
      { id: "V10_S1", title: "10-1. 몸과 마음의 취약 패턴", purpose: "취약 패턴을 해석한다.", dataBinding: bind(["health"], [], [6, 8, 12]), minChars: 800 },
      { id: "V10_S2", title: "10-2. 스트레스가 쌓이는 방식", purpose: "스트레스 누적 패턴을 해석한다.", dataBinding: bind(["health"], ["Moon", "Mars", "Saturn"]), minChars: 800 },
      { id: "V10_S3", title: "10-3. 무의식적 소진과 회피", purpose: "소진/회피 패턴을 해석한다.", dataBinding: bind(["health", "spiritual"], [], [8, 12]), minChars: 800 },
      { id: "V10_S4", title: "10-4. 회복이 필요한 생활 습관", purpose: "회복 루틴을 제시한다.", dataBinding: bind(["health", "moon"]), minChars: 800 },
      { id: "V10_S5", title: "10-5. 건강 관리 조언", purpose: "건강 관리 조언을 제시한다.", dataBinding: bind(["health", "dashas"]), minChars: 800 },
    ],
  },
  {
    id: "V11",
    order: 11,
    title: "Ch.11 다샤 흐름 — 현재 시기의 운의 과제",
    subtitle: "마하다샤·안타르다샤 기반 현재 운의 리듬",
    purpose: "현재 다샤 흐름의 기회/리스크를 해석한다.",
    sections: [
      { id: "V11_S1", title: "11-1. 현재 마하다샤의 큰 흐름", purpose: "현재 마하다샤 기조를 해석한다.", dataBinding: bind(["dashas"]), minChars: 800 },
      { id: "V11_S2", title: "11-2. 현재 안타르다샤의 세부 과제", purpose: "현재 안타르다샤 과제를 해석한다.", dataBinding: bind(["dashas"]), minChars: 800 },
      { id: "V11_S3", title: "11-3. 지금 열리는 기회", purpose: "현재 기회 신호를 해석한다.", dataBinding: bind(["dashas", "career", "money"]), minChars: 800 },
      { id: "V11_S4", title: "11-4. 지금 조심해야 할 선택", purpose: "현재 리스크 선택을 해석한다.", dataBinding: bind(["dashas", "health", "relationship"]), minChars: 800 },
      { id: "V11_S5", title: "11-5. 현재 운을 활용하는 전략", purpose: "현재 운 활용 전략을 제시한다.", dataBinding: bind(["dashas", "lagna"]), minChars: 800 },
    ],
  },
  {
    id: "V12",
    order: 12,
    title: "Ch.12 최종 인생 전략 — 베다 차트 종합 로드맵",
    subtitle: "라그나·나크샤트라·다샤·하우스 통합 실행 전략",
    purpose: "차트 전체를 통합해 최종 실행 로드맵을 제시한다.",
    sections: [
      { id: "V12_S1", title: "12-1. 차트 전체 핵심 요약", purpose: "전체 핵심을 요약한다.", dataBinding: bind(["lagna", "moon", "nakshatra", "atmakaraka", "dashas"]), minChars: 800 },
      { id: "V12_S2", title: "12-2. 가장 강한 자원", purpose: "핵심 강점을 정리한다.", dataBinding: bind(["strengths", "planets", "houses"]), minChars: 800 },
      { id: "V12_S3", title: "12-3. 가장 반복되는 약점", purpose: "반복 약점을 정리한다.", dataBinding: bind(["houses", "planets", "dashas"]), minChars: 800 },
      { id: "V12_S4", title: "12-4. 앞으로 강화해야 할 선택", purpose: "강화 선택을 제시한다.", dataBinding: bind(["career", "money", "relationship", "health"]), minChars: 800 },
      { id: "V12_S5", title: "12-5. 피해야 할 선택", purpose: "회피 선택을 제시한다.", dataBinding: bind(["dashas", "atmakaraka"]), minChars: 800 },
      { id: "V12_S6", title: "12-6. 최종 실행 로드맵", purpose: "최종 로드맵을 완성한다.", dataBinding: bind(["lagna", "moon", "dashas", "yogas"]), minChars: 800 },
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
