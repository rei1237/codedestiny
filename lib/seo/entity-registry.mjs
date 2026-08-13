/**
 * Public SEO entity and topic-cluster registry.
 *
 * This registry owns the Korean public-hub intent map. It deliberately keeps
 * brand aliases at the entity layer and assigns a distinct search intent to
 * each feature hub, rather than repeating every service keyword on every URL.
 * Long-tail priorities remain editorial hypotheses until Search Console,
 * Naver, and Bing exports confirm them. Metadata stays focused on the
 * page's primary and secondary intent.
 */
export const SEO_BRAND_ENTITY = {
  canonicalName: "CODE DESTINY",
  displayName: "Code Destiny",
  koreanName: "코드데스티니",
  aliases: [
    "CODE DESTINY",
    "Code Destiny",
    "CodeDestiny",
    "code-destiny",
    "코드데스티니",
    "코드 데스티니",
    "CODEDESTINY",
    "꿀꿀운세",
    "꿀꿀 운세",
    "꿀꿀만세력",
    "꿀꿀 만세력",
  ],
  characterBrand: "꽃돼지",
};

const CORE_ROUTE_PROFILES = [
  {
    path: "/kkul-kkul-unse",
    title: "꿀꿀 운세 브랜드 안내",
    primary: "꿀꿀운세",
    secondary: ["코드데스티니", "꽃돼지 운세 사이트"],
    longTail: ["꿀꿀만세력과 코드데스티니는 같은 서비스인가요"],
    topicSummary: "Code Destiny와 꿀꿀운세, 꽃돼지 캐릭터 브랜드의 관계와 제공 서비스를 안내합니다.",
    relatedPaths: ["/manse", "/saju", "/ziwei", "/sukuyo", "/vedic", "/astrology"],
    schema: ["WebPage", "FAQPage", "BreadcrumbList"],
  },
  {
    path: "/saju",
    title: "사주 해석",
    primary: "무료 사주",
    secondary: ["사주풀이", "사주 분석"],
    longTail: ["오행과 십성으로 사주를 이해하는 방법"],
    topicSummary: "사주의 기초 구조를 중심으로 다른 운세 체계와 비교해 보는 출발점입니다.",
    relatedPaths: ["/manse", "/ziwei", "/sukuyo", "/vedic", "/astrology"],
    schema: ["WebPage", "Service", "FAQPage", "BreadcrumbList"],
  },
  {
    path: "/manse",
    title: "만세력",
    primary: "무료 만세력",
    secondary: ["사주 만세력", "사주팔자"],
    longTail: [
      "생년월일과 출생시간으로 만세력 보는 법",
      "절기 경계에 태어났을 때 연주와 월주 기준",
      "만세력 결과가 사이트마다 다른 이유",
    ],
    topicSummary: "만세력의 입력과 명식 읽기를 사주 해석 및 관계 운세로 연결합니다.",
    relatedPaths: ["/saju", "/ziwei", "/compatibility", "/today"],
    schema: ["WebPage", "Service", "FAQPage", "BreadcrumbList"],
  },
  {
    path: "/ziwei",
    title: "자미두수",
    primary: "자미두수 명반",
    secondary: ["자미두수", "자미두수 12궁"],
    longTail: ["자미두수 명궁과 12궁을 읽는 순서"],
    topicSummary: "자미두수 명반을 중심으로 사주·숙요점·베다 점성술의 해석 축을 구분해 탐색합니다.",
    relatedPaths: ["/saju", "/sukuyo", "/vedic", "/astrology"],
    schema: ["WebPage", "Service", "FAQPage", "BreadcrumbList"],
  },
  {
    path: "/sukuyo",
    title: "숙요점",
    primary: "숙요점 궁합",
    secondary: ["숙요 궁합", "숙요점"],
    longTail: ["본명숙 27수로 관계의 거리를 보는 방법"],
    topicSummary: "숙요점의 관계 해석을 자미두수·베다 점성술과 혼동하지 않고 이어서 살펴봅니다.",
    relatedPaths: ["/ziwei", "/vedic", "/astrology", "/compatibility"],
    schema: ["WebPage", "Service", "FAQPage", "BreadcrumbList"],
  },
  {
    path: "/vedic",
    title: "베다 점성술",
    primary: "베다 점성술",
    secondary: ["인도 점성술", "Jyotish"],
    longTail: ["조티쉬 라그나와 다샤 흐름을 함께 보는 방법"],
    topicSummary: "베다 점성술의 조티쉬 해석을 서양 점성술 및 숙요점과 구분해 탐색합니다.",
    relatedPaths: ["/astrology", "/sukuyo", "/ziwei", "/saju"],
    schema: ["WebPage", "Service", "FAQPage", "BreadcrumbList"],
  },
  {
    path: "/astrology",
    title: "서양 점성술",
    primary: "출생차트",
    secondary: ["점성술", "별자리 운세"],
    longTail: ["태양궁 달궁 상승궁으로 출생차트를 읽는 방법"],
    topicSummary: "서양 출생차트를 중심으로 베다 점성술과 숙요점의 다른 해석 기준을 안내합니다.",
    relatedPaths: ["/vedic", "/sukuyo", "/tarot", "/today"],
    schema: ["WebPage", "Service", "FAQPage", "BreadcrumbList"],
  },
  {
    path: "/tarot",
    title: "타로",
    primary: "무료 타로",
    secondary: ["타로 리딩", "연애 타로"],
    longTail: ["질문을 정리하며 무료 타로 카드를 보는 방법"],
    topicSummary: "타로의 질문형 해석을 오늘의 운세, 궁합, 꿈해몽 콘텐츠와 연결합니다.",
    relatedPaths: ["/compatibility", "/today", "/dream", "/love"],
    schema: ["WebPage", "Service", "FAQPage", "BreadcrumbList"],
  },
  {
    path: "/saju/compatibility",
    title: "사주 궁합",
    primary: "사주 궁합",
    secondary: ["궁합 풀이", "연애 궁합"],
    longTail: ["두 사람의 사주 구조로 관계 리듬을 살피는 방법"],
    topicSummary: "사주 궁합의 관계 해석을 숙요점 궁합과 타로의 질문형 해석으로 이어서 살펴봅니다.",
    relatedPaths: ["/compatibility", "/sukuyo", "/tarot", "/love"],
    schema: ["WebPage", "Service", "FAQPage", "BreadcrumbList"],
  },
  {
    path: "/compatibility",
    title: "궁합",
    primary: "무료 궁합",
    secondary: ["사주 궁합", "AI 궁합"],
    longTail: ["두 사람의 관계 리듬과 소통 방식을 살피는 궁합"],
    topicSummary: "궁합을 사주·숙요점·타로의 서로 다른 관계 해석 관점으로 이어서 살펴봅니다.",
    relatedPaths: ["/saju/compatibility", "/sukuyo", "/tarot", "/love"],
    schema: ["WebPage", "Service", "FAQPage", "BreadcrumbList"],
  },
  {
    path: "/love",
    title: "연애운",
    primary: "연애운",
    secondary: ["연애 운세", "관계 운세"],
    longTail: ["지금의 연애 흐름과 대화 방향을 정리하는 운세"],
    topicSummary: "연애운을 사주 궁합·숙요점·타로의 다른 관계 해석 관점으로 확장합니다.",
    relatedPaths: ["/compatibility", "/saju/compatibility", "/sukuyo", "/tarot"],
    schema: ["WebPage", "Service", "FAQPage", "BreadcrumbList"],
  },
  {
    path: "/today",
    title: "오늘의 운세",
    primary: "오늘의 운세",
    secondary: ["무료 운세", "하루 운세"],
    longTail: ["오늘의 관계와 일정 흐름을 가볍게 점검하는 운세"],
    topicSummary: "하루의 흐름을 사주·점성술·타로 콘텐츠의 실천 질문으로 확장합니다.",
    relatedPaths: ["/manse", "/saju", "/astrology", "/tarot"],
    schema: ["WebPage", "Service", "FAQPage", "BreadcrumbList"],
  },
  {
    path: "/dream",
    title: "꿈해몽",
    primary: "무료 꿈해몽",
    secondary: ["꿈해몽", "꿈 상징"],
    longTail: ["꿈에 남은 감정과 상징을 정리하는 꿈해몽"],
    topicSummary: "꿈의 상징과 감정을 타로·점성술·자기성찰 콘텐츠로 이어서 살펴봅니다.",
    relatedPaths: ["/tarot", "/astrology", "/today", "/insights"],
    schema: ["WebPage", "Service", "FAQPage", "BreadcrumbList"],
  },
  {
    path: "/high-value",
    title: "운세 가이드",
    primary: "운세 가이드",
    secondary: ["사주 보는 법", "명리학 입문"],
    longTail: ["사주와 점성술의 기초를 비교해 이해하는 가이드"],
    topicSummary: "정보성 가이드를 각 운세 기능 허브로 연결하는 콘텐츠 클러스터입니다.",
    relatedPaths: ["/saju", "/ziwei", "/sukuyo", "/vedic", "/astrology", "/insights"],
    schema: ["CollectionPage", "BreadcrumbList"],
  },
  {
    path: "/insights",
    title: "운세 인사이트",
    primary: "운세 인사이트",
    secondary: ["사주 콘텐츠", "점성술 가이드"],
    longTail: ["사주와 타로를 쉽게 설명하는 운세 콘텐츠"],
    topicSummary: "정보성 인사이트를 실제 사주·타로·점성술 서비스 허브로 연결합니다.",
    relatedPaths: ["/high-value", "/saju", "/tarot", "/astrology", "/dream"],
    schema: ["CollectionPage", "BreadcrumbList"],
  },
  {
    path: "/methodology",
    title: "운세 콘텐츠 방법론",
    primary: "운세 해석 방법론",
    secondary: ["명리학 해석", "점성술 해석"],
    longTail: ["운세 콘텐츠를 자기성찰 참고 정보로 읽는 방법"],
    topicSummary: "Code Destiny의 운세 콘텐츠 원칙과 각 체계의 역할을 확인하는 신뢰 정보입니다.",
    relatedPaths: ["/saju", "/ziwei", "/sukuyo", "/vedic", "/astrology"],
    schema: ["WebPage", "BreadcrumbList"],
  },
];

export const FUSION_FORTUNE_PROFILE = Object.freeze({
  path: "/fusion-fortune",
  publicationState: "published",
  title: "초융합 운세",
  primary: "초융합 운세",
  secondary: ["AI 초융합 운세", "통합 운세", "AI 운세"],
  longTail: [
    "AI가 여러 운세를 동시에 분석하는 서비스",
    "사주와 자미두수를 함께 보는 운세",
    "베다점과 점성술을 동시에 보는 운세",
  ],
  topicSummary:
    "사주, 자미두수, 숙요점, 베다 점성술, 서양 점성술, 타로를 각 체계의 기준으로 읽고 AI가 공통점과 차이를 한 리포트로 정리합니다.",
  relatedPaths: ["/saju", "/ziwei", "/sukuyo", "/vedic", "/astrology", "/tarot"],
  schema: ["WebPage", "Service", "FAQPage", "BreadcrumbList"],
});

export const SEO_ROUTE_PROFILES = Object.freeze(
  Object.fromEntries(
    [...CORE_ROUTE_PROFILES, FUSION_FORTUNE_PROFILE].map((profile) => [profile.path, Object.freeze(profile)]),
  ),
);

export function getSeoRouteProfile(path) {
  return SEO_ROUTE_PROFILES[path] || null;
}

export function getSeoProfileKeywords(path) {
  const profile = getSeoRouteProfile(path);
  if (!profile) return [];

  return [profile.primary, ...profile.secondary];
}

export function getTopicClusterLinks(path) {
  const profile = getSeoRouteProfile(path);
  if (!profile) return [];

  const relatedPaths = [
    ...profile.relatedPaths,
    ...(profile.path === FUSION_FORTUNE_PROFILE.path ? [] : [FUSION_FORTUNE_PROFILE.path]),
  ];

  return [...new Set(relatedPaths)]
    .map((relatedPath) => getSeoRouteProfile(relatedPath))
    .filter(Boolean)
    .map((relatedProfile) => ({
      href: relatedProfile.path,
      label: relatedProfile.title,
    }));
}
