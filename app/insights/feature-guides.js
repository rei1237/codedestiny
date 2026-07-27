// 기능 가이드 12종의 단일 목록.
//
// 이 12개는 scripts/verify-adsense-readiness.mjs 의 featureGuideRoutes(=AdSense 광고
// 게재 대상)와 같은 집합이다. 그런데 2026-07 실측에서 이 중 10개가 홈·/insights·
// /about·/faq·토픽 허브 어디에서도 링크되지 않아 내부 링크로 도달 불가능했다.
// 광고가 붙는 페이지에 내비게이션 경로가 없는 상태는 AdSense 내비게이션 기준
// (기능·정확성) 위반이라, 여기 목록을 여러 진입점에서 함께 렌더링한다.
export const FEATURE_GUIDES = [
  { href: "/saju/guide/", label: "사주 명리학 기본 가이드", topic: "saju" },
  { href: "/saju/ten-gods/", label: "십성 해석 가이드", topic: "saju" },
  { href: "/saju/five-elements/", label: "오행과 균형 가이드", topic: "saju" },
  { href: "/ziwei/guide/", label: "자미두수 명반 읽는 법", topic: "ziwei" },
  { href: "/sukuyo/guide/", label: "숙요 27숙과 궁합 구조", topic: "sukuyo" },
  { href: "/astrology/guide/", label: "서양 점성술 기본 구조", topic: "astrology" },
  { href: "/vedic/guide/", label: "베다 점성술 기본 구조", topic: "vedic" },
  { href: "/tarot/guide/", label: "타로 카드 리딩 입문", topic: "tarot" },
  { href: "/mayan-calendar/guide/", label: "마야 달력과 마야점 이해", topic: "astrology" },
  { href: "/calendar/guide/", label: "운세 달력과 일진 달력 사용법", topic: "saju" },
  { href: "/health-report/guide/", label: "명리 헬스 리포트 사용 시 주의사항", topic: "saju" },
  { href: "/music/guide/", label: "운세·명상 음악 콘텐츠 소개", topic: null },
];

export function getFeatureGuidesByTopic(topic) {
  const key = String(topic || "").toLowerCase();
  if (!key) return [];
  return FEATURE_GUIDES.filter((guide) => guide.topic === key);
}
