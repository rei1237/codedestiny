import type { VedicPdfChapterDefinition } from "./types";

export const VEDIC_PDF_CHAPTERS: VedicPdfChapterDefinition[] = [
  {
    number: 1,
    id: "core_identity",
    titleKo: "라그나와 핵심 성향",
    subtitleKo: "Lagna 기반 자기 인식",
    icon: "🕉️",
    objective: "라그나, 1하우스, 주요 행성 배치를 바탕으로 성향과 기본 운용 방식을 해석한다.",
  },
  {
    number: 2,
    id: "karma_purpose",
    titleKo: "카르마 과제와 영혼 목적",
    subtitleKo: "Atmakaraka · Dharma",
    icon: "📜",
    objective: "아트마카라카와 다르마 축을 중심으로 반복 과제와 성장 방향을 정리한다.",
  },
  {
    number: 3,
    id: "nakshatra_psyche",
    titleKo: "나크샤트라 심리 지도",
    subtitleKo: "Moon Nakshatra 기반 정서 패턴",
    icon: "🌙",
    objective: "달 나크샤트라와 파다를 기반으로 정서 반응 패턴과 회복 루틴을 제안한다.",
  },
  {
    number: 4,
    id: "dasha_timeline",
    titleKo: "다샤 타임라인",
    subtitleKo: "Maha/Antar Dasha 전략",
    icon: "⏳",
    objective: "현재 대운/세운의 의미와 가까운 시기 행동 우선순위를 제시한다.",
  },
  {
    number: 5,
    id: "wealth_dharma",
    titleKo: "재물과 가치 실현",
    subtitleKo: "2·11하우스 · 목성 · 금성",
    icon: "💰",
    objective: "재물 흐름, 수입 구조, 지출 패턴을 차트 근거로 분석하고 실천안을 제시한다.",
  },
  {
    number: 6,
    id: "career_d10",
    titleKo: "천직과 커리어",
    subtitleKo: "10하우스 · D10 중심",
    icon: "👑",
    objective: "직업 역할, 조직 내 포지션, 성과를 내는 일 방식과 커리어 리스크 관리법을 제시한다.",
  },
  {
    number: 7,
    id: "relationship_karmic",
    titleKo: "관계와 카르믹 패턴",
    subtitleKo: "7하우스 · 금성/화성",
    icon: "💞",
    objective: "관계 패턴, 갈등 트리거, 경계 설정과 소통 루틴을 현실적으로 제시한다.",
  },
  {
    number: 8,
    id: "health_balance",
    titleKo: "건강 균형과 회복",
    subtitleKo: "6·8·12하우스 · 생활 리듬",
    icon: "🌿",
    objective: "건강 리스크를 단정하지 않고 생활 루틴/회복 전략 중심으로 해석한다.",
  },
  {
    number: 9,
    id: "yoga_strengths",
    titleKo: "요가와 강점 증폭",
    subtitleKo: "차트 조합의 장점 활용",
    icon: "✨",
    objective: "검출된 요가 조합을 기반으로 강점 발현 조건과 적용 영역을 정리한다.",
  },
  {
    number: 10,
    id: "transit_12months",
    titleKo: "향후 12개월 전략",
    subtitleKo: "Transit · 일정 기반 실행",
    icon: "🪐",
    objective: "현재 다샤와 차트 기반으로 향후 12개월 행동 계획을 월별로 제안한다.",
  },
  {
    number: 11,
    id: "remedies_upaya",
    titleKo: "우파야 실천 가이드",
    subtitleKo: "현대형 Upaya 루틴",
    icon: "🙏",
    objective: "미신/공포 없이 루틴, 환경, 습관 중심 우파야를 설계한다.",
  },
  {
    number: 12,
    id: "practical_roadmap",
    titleKo: "90일 실행 로드맵",
    subtitleKo: "실행 우선순위와 점검 지표",
    icon: "🧭",
    objective: "핵심 목표를 90일 계획으로 분해해 실행/점검 체계를 제시한다.",
  },
  {
    number: 13,
    id: "final_blueprint",
    titleKo: "최종 카르마 블루프린트",
    subtitleKo: "통합 요약 · 선언문",
    icon: "🌟",
    objective: "전체 해석을 통합해 핵심 메시지와 실천 선언문을 정리한다.",
  },
];

export function getVedicChapterByNumber(chapter: number): VedicPdfChapterDefinition {
  const fallback = VEDIC_PDF_CHAPTERS[0];
  return VEDIC_PDF_CHAPTERS.find((item) => item.number === chapter) || fallback;
}
