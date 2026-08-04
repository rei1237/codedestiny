const SITE_SEO_TEXT_TRANSLATIONS = {
  ko: {
    "siteSeo.001": "무료 사주팔자 · 타로 · 오늘의 운세 | Code Destiny",
    "siteSeo.002": "Code Destiny 소개 | 무료 운세 플랫폼",
    "siteSeo.003": "Code Destiny 자주 묻는 질문",
    "siteSeo.004": "운세 콘텐츠 방법론과 면책 고지",
    "siteSeo.005": "무료 만세력 사주 분석 | 오행·십성·대운 해석",
    "siteSeo.006": "무료 사주팔자 분석 | 오행·십성·대운 흐름",
    "siteSeo.007": "사주 만세력 기본 해석 | 오행·십성·명식 분석",
    "siteSeo.008": "사주 궁합 무료 해석 | 관계 흐름과 소통 방식",
    "siteSeo.009": "무료 타로 카드 리딩 | 연애·재회·마음 해석",
    "siteSeo.010": "재회 타로 리딩 | 다시 이어질 가능성과 거리",
    "siteSeo.011": "상대 마음 타로 | 마음 흐름과 관계 신호",
    "siteSeo.012": "자미두수 12궁 명반 | 성향·직업·인연 분석",
    "siteSeo.013": "무료 점성술 출생차트 | 태양·달·상승궁 해석",
    "siteSeo.014": "숙요점 27숙 궁합 | 인연의 거리와 관계 흐름",
    "siteSeo.015": "베다 점성술 무료 해석 | 조티쉬 차트와 다샤 흐름",
    "siteSeo.016": "무료 꿈해몽 | 꿈 상징과 심리 흐름 해석",
    "siteSeo.017": "오늘의 운세 무료 보기 | 하루의 흐름과 선택 가이드",
    "siteSeo.018": "연애운 무료 보기 | 마음 흐름과 관계 방향",
    "siteSeo.019": "프리미엄 운세 리포트 안내 | 사주·연애·신년 PDF",
    "siteSeo.020": "인생의 책 PDF 안내 | 사주 기반 장문 리포트",
    "siteSeo.021": "연애 리포트 PDF 안내 | 관계 흐름 심층 분석",
    "siteSeo.022": "신년운세 PDF 안내 | 새해 흐름과 월별 가이드",
    "siteSeo.023": "운세 인사이트 가이드 | 사주·타로·궁합·점성술",
    "siteSeo.024": "운세 인사이트 아카이브 | 사주·타로·자미두수 가이드",
  },
} as const;

function siteSeoText(key: keyof typeof SITE_SEO_TEXT_TRANSLATIONS.ko) {
  return SITE_SEO_TEXT_TRANSLATIONS.ko[key] || "Translation pending";
}
export const siteSeo = {
  siteName: "Code Destiny",
  alternateName: [
    "CODE DESTINY",
    "CodeDestiny",
    "code-destiny",
    "코드데스티니",
    "코드 데스티니",
    "CODEDESTINY",
    "꿀꿀운세",
    "꿀꿀 운세",
    "꿀꿀만세력",
    "꿀꿀 만세력",
    "꽃돼지 운세",
  ],
  siteUrl: "https://code-destiny.com",
  defaultLocale: "ko",
  supportedLocales: ["ko"],
  defaultTitle: "무료 사주팔자 · 타로 · 오늘의 운세 | Code Destiny",
  titleTemplate: "%s",
  defaultDescription:
    "Code Destiny는 무료 사주팔자, 만세력, 타로, 오늘의 운세, 궁합, 자미두수, 점성술, 숙요점 해석을 한곳에서 제공하는 한국어 운세 플랫폼입니다.",
  defaultOgImage: "https://code-destiny.com/og/code-destiny-og-vvip.png?v=d50dc254ba",
  twitterCard: "summary_large_image",
  organization: {
    name: "Code Destiny",
    legalName: "코드 데스티니",
    url: "https://code-destiny.com",
    logo: "https://code-destiny.com/og/code-destiny-og.png",
  },
  contact: {
    email: "admin@code-destiny.com",
    contactType: "customer support",
    availableLanguage: ["Korean"],
  },
  sameAs: [
    "https://code-destiny.com/about",
    "https://code-destiny.com/insights",
    "https://blog.naver.com/codedestiny",
    "https://www.instagram.com/code_destiny_official/",
  ],
} as const;

export type PublicSeoPage = {
  path: string;
  title: string;
  description: string;
  h1: string;
  ogImage?: string;
  keywords?: string[];
  changeFrequency?: "daily" | "weekly" | "monthly" | "yearly";
  priority?: number;
  structuredData: Array<"Organization" | "WebSite" | "WebPage" | "AboutPage" | "FAQPage" | "Article" | "BreadcrumbList">;
};

export const publicSeoPages: Record<string, PublicSeoPage> = {
  home: {
    path: "/",
    title: siteSeoText("siteSeo.001"),
    description:
      "사주, 타로, 자미두수, 점성술, 숙요점, 궁합, 오늘의 운세를 한곳에서 확인하세요. Code Destiny는 자기성찰을 돕는 한국어 운세 플랫폼입니다.",
    h1: "무료 사주팔자 · 타로 · 오늘의 운세 통합 플랫폼",
    keywords: ["무료 사주", "무료 타로", "오늘의 운세", "만세력", "궁합"],
    changeFrequency: "daily",
    priority: 1,
    structuredData: ["Organization", "WebSite", "WebPage"],
  },
  about: {
    path: "/about",
    title: siteSeoText("siteSeo.002"),
    description:
      "Code Destiny가 제공하는 무료 사주, 타로, 자미두수, 점성술, 숙요점 서비스와 콘텐츠 운영 원칙을 소개합니다.",
    h1: "Code Destiny 소개",
    changeFrequency: "monthly",
    priority: 0.8,
    structuredData: ["Organization", "AboutPage"],
  },
  faq: {
    path: "/faq",
    title: siteSeoText("siteSeo.003"),
    description:
      "무료 운세 이용, 회원가입, 개인정보, 결제와 환불, 결과 해석 기준에 대한 자주 묻는 질문을 정리했습니다.",
    h1: "Code Destiny 자주 묻는 질문",
    changeFrequency: "monthly",
    priority: 0.72,
    structuredData: ["FAQPage", "BreadcrumbList"],
  },
  methodology: {
    path: "/methodology",
    title: siteSeoText("siteSeo.004"),
    description:
      "Code Destiny의 운세 콘텐츠 작성 원칙, 검수 방식, 업데이트 기준, 오락 및 자기성찰 목적의 면책 고지를 안내합니다.",
    h1: "운세 콘텐츠 방법론과 면책 고지",
    changeFrequency: "monthly",
    priority: 0.78,
    structuredData: ["WebPage", "BreadcrumbList"],
  },
  manse: {
    path: "/manse",
    title: siteSeoText("siteSeo.005"),
    description:
      "생년월일과 시간을 바탕으로 만세력의 사주팔자, 오행, 십성, 대운 흐름을 확인하는 방법을 안내합니다.",
    h1: "무료 만세력 사주 분석",
    keywords: ["무료 만세력", "사주 만세력", "오행", "십성", "대운"],
    changeFrequency: "daily",
    priority: 0.98,
    structuredData: ["WebPage", "BreadcrumbList", "FAQPage"],
  },
  saju: {
    path: "/saju",
    title: siteSeoText("siteSeo.006"),
    description:
      "사주팔자의 기본 구조와 오행 균형, 십성, 대운을 통해 성향과 선택의 흐름을 살펴보는 무료 사주 안내 페이지입니다.",
    h1: "무료 사주팔자 분석",
    keywords: ["무료 사주", "사주팔자", "오행", "십성", "사주 분석"],
    changeFrequency: "daily",
    priority: 0.98,
    structuredData: ["WebPage", "BreadcrumbList", "FAQPage"],
  },
  sajuBasic: {
    path: "/saju/basic",
    title: siteSeoText("siteSeo.007"),
    description:
      "사주 명식의 네 기둥, 오행 균형, 십성의 의미를 초보자도 이해할 수 있도록 단계별로 설명하고 현재 선택에 참고할 해석 포인트와 주의점을 정리합니다.",
    h1: "사주 만세력 기본 해석",
    keywords: ["사주 기본", "사주 명식", "오행 분석", "십성 해석"],
    changeFrequency: "weekly",
    priority: 0.95,
    structuredData: ["WebPage", "BreadcrumbList", "FAQPage"],
  },
  sajuCompatibility: {
    path: "/saju/compatibility",
    title: siteSeoText("siteSeo.008"),
    description:
      "두 사람의 사주 구조를 관계 리듬, 갈등 패턴, 소통 방식 관점에서 읽는 사주 궁합 안내 페이지입니다.",
    h1: "사주 궁합 무료 해석",
    keywords: ["사주 궁합", "무료 궁합", "연애운", "관계 분석"],
    changeFrequency: "weekly",
    priority: 0.94,
    structuredData: ["WebPage", "BreadcrumbList", "FAQPage"],
  },
  tarot: {
    path: "/tarot",
    title: siteSeoText("siteSeo.009"),
    description:
      "타로 카드를 통해 현재의 질문, 연애 흐름, 재회 가능성, 마음의 방향을 차분하게 정리하고 다음 선택을 위한 자기성찰 문장과 실천 힌트를 제공합니다.",
    h1: "무료 타로 카드 리딩",
    keywords: ["무료 타로", "타로 카드", "연애 타로", "재회 타로"],
    changeFrequency: "weekly",
    priority: 0.96,
    structuredData: ["WebPage", "BreadcrumbList", "FAQPage"],
  },
  tarotReunion: {
    path: "/tarot/reunion",
    title: siteSeoText("siteSeo.010"),
    description:
      "재회 타로는 상대와의 현재 거리, 연락 타이밍, 감정의 잔향을 카드 흐름으로 살펴보는 리딩입니다.",
    h1: "재회 타로 리딩",
    keywords: ["재회 타로", "연애 타로", "상대 마음", "연락 타이밍"],
    changeFrequency: "weekly",
    priority: 0.9,
    structuredData: ["WebPage", "BreadcrumbList", "FAQPage"],
  },
  tarotMindscan: {
    path: "/tarot/mindscan",
    title: siteSeoText("siteSeo.011"),
    description:
      "상대 마음 타로는 현재 감정, 말하지 못한 신호, 관계의 다음 선택을 자기성찰 관점에서 정리합니다.",
    h1: "상대 마음 타로",
    keywords: ["상대 마음 타로", "연애 타로", "마음 해석", "관계 신호"],
    changeFrequency: "weekly",
    priority: 0.9,
    structuredData: ["WebPage", "BreadcrumbList", "FAQPage"],
  },
  ziwei: {
    path: "/ziwei",
    title: siteSeoText("siteSeo.012"),
    description:
      "자미두수 명반의 12궁과 주요 별 배치를 바탕으로 성향, 직업, 관계, 시기 흐름을 살펴보고 삶의 영역별 해석 기준과 읽는 순서를 초보자용으로 안내합니다.",
    h1: "자미두수 12궁 명반 분석",
    keywords: ["자미두수", "자미두수 명반", "12궁", "명궁"],
    changeFrequency: "weekly",
    priority: 0.95,
    structuredData: ["WebPage", "BreadcrumbList", "FAQPage"],
  },
  astrology: {
    path: "/astrology",
    title: siteSeoText("siteSeo.013"),
    description:
      "서양 점성술의 태양궁, 달궁, 상승궁과 출생차트 기본 구조를 통해 성향과 관계 리듬을 살펴보고 차트 해석의 출발점과 주의점을 쉽게 안내합니다.",
    h1: "무료 점성술 출생차트",
    keywords: ["무료 점성술", "출생차트", "태양궁", "달궁", "상승궁"],
    changeFrequency: "weekly",
    priority: 0.95,
    structuredData: ["WebPage", "BreadcrumbList", "FAQPage"],
  },
  sukuyo: {
    path: "/sukuyo",
    title: siteSeoText("siteSeo.014"),
    description:
      "숙요점의 27숙과 달의 관계법을 바탕으로 인연의 거리, 갈등 패턴, 회복 흐름을 살펴보고 관계를 읽는 기준과 대화 힌트를 초보자용으로 정리합니다.",
    h1: "숙요점 27숙 궁합",
    keywords: ["숙요점", "숙요 궁합", "27숙", "인연의 거리"],
    changeFrequency: "weekly",
    priority: 0.94,
    structuredData: ["WebPage", "BreadcrumbList", "FAQPage"],
  },
  vedic: {
    path: "/vedic",
    title: siteSeoText("siteSeo.015"),
    description:
      "베다 점성술의 조티쉬 차트, 달 별자리, 다샤 흐름을 초보자도 이해하기 쉽게 안내하고 서양 점성술과 다른 해석 축과 활용법을 실전형으로 정리합니다.",
    h1: "베다 점성술 무료 해석",
    keywords: ["베다 점성술", "조티쉬", "다샤", "달 별자리"],
    changeFrequency: "weekly",
    priority: 0.9,
    structuredData: ["WebPage", "BreadcrumbList", "FAQPage"],
  },
  dream: {
    path: "/dream",
    title: siteSeoText("siteSeo.016"),
    description:
      "꿈에 남은 상징과 감정을 현실의 스트레스, 관계, 선택의 흐름과 연결해 살펴보는 꿈해몽 안내입니다.",
    h1: "무료 꿈해몽",
    keywords: ["무료 꿈해몽", "꿈 해석", "꿈 상징", "심리 해몽"],
    changeFrequency: "weekly",
    priority: 0.88,
    structuredData: ["WebPage", "BreadcrumbList", "FAQPage"],
  },
  today: {
    path: "/today",
    title: siteSeoText("siteSeo.017"),
    description:
      "오늘의 운세는 하루의 컨디션, 관계, 일의 우선순위를 가볍게 점검하고 실천할 선택을 정리하도록 돕습니다.",
    h1: "오늘의 운세 무료 보기",
    keywords: ["오늘의 운세", "무료 운세", "일일 운세", "하루 운세"],
    changeFrequency: "daily",
    priority: 0.97,
    structuredData: ["WebPage", "BreadcrumbList", "FAQPage"],
  },
  love: {
    path: "/love",
    title: siteSeoText("siteSeo.018"),
    description:
      "연애운 페이지에서는 현재 관계의 흐름, 상대와의 거리, 대화의 실마리를 사주와 타로 관점에서 살펴봅니다.",
    h1: "연애운 무료 보기",
    keywords: ["연애운", "무료 연애운", "상대 마음", "재회운"],
    changeFrequency: "weekly",
    priority: 0.9,
    structuredData: ["WebPage", "BreadcrumbList", "FAQPage"],
  },
  premiumReports: {
    path: "/premium-reports",
    title: siteSeoText("siteSeo.019"),
    description:
      "Code Destiny의 프리미엄 운세 리포트는 검증된 입력값을 바탕으로 사주, 연애, 신년 흐름을 문서형으로 정리합니다.",
    h1: "프리미엄 운세 리포트 안내",
    keywords: ["프리미엄 운세", "사주 PDF", "연애 리포트", "신년 운세"],
    changeFrequency: "weekly",
    priority: 0.86,
    structuredData: ["WebPage", "BreadcrumbList"],
  },
  lifeBookPdf: {
    path: "/pdf/life-book",
    title: siteSeoText("siteSeo.020"),
    description:
      "인생의 책 PDF는 결제 권한 확인 후 사용자 입력과 사주 계산 데이터를 검증해 생성되는 프리미엄 리포트입니다.",
    h1: "인생의 책 PDF 안내",
    keywords: ["인생의 책 PDF", "사주 리포트", "프리미엄 PDF"],
    changeFrequency: "monthly",
    priority: 0.8,
    structuredData: ["WebPage", "BreadcrumbList"],
  },
  loveReportPdf: {
    path: "/pdf/love-report",
    title: siteSeoText("siteSeo.021"),
    description:
      "연애 리포트 PDF는 관계 입력과 사주 기반 해석을 검증한 뒤 연애 흐름, 소통 방식, 회복 포인트를 정리합니다.",
    h1: "연애 리포트 PDF 안내",
    keywords: ["연애 리포트 PDF", "궁합 PDF", "관계 분석"],
    changeFrequency: "monthly",
    priority: 0.8,
    structuredData: ["WebPage", "BreadcrumbList"],
  },
  newYearPdf: {
    path: "/new-year-ai-consultation",
    title: siteSeoText("siteSeo.022"),
    description:
      "신년운세 PDF는 새해의 커리어, 재물, 관계, 건강 흐름을 월별로 살펴보는 프리미엄 운세 문서입니다.",
    h1: "신년운세 PDF 안내",
    keywords: ["신년운세 PDF", "새해 운세", "월별 운세"],
    changeFrequency: "monthly",
    priority: 0.8,
    structuredData: ["WebPage", "BreadcrumbList"],
  },
  highValue: {
    path: "/high-value",
    title: siteSeoText("siteSeo.023"),
    description:
      "사주, 타로, 궁합, 점성술을 처음 접하는 분도 쉽게 이해할 수 있도록 핵심 개념과 해석 방법을 정리한 가이드입니다.",
    h1: "운세 인사이트 가이드",
    keywords: ["운세 가이드", "사주 입문", "타로 리딩", "궁합", "점성술"],
    changeFrequency: "weekly",
    priority: 0.88,
    structuredData: ["WebPage", "BreadcrumbList"],
  },
  insights: {
    path: "/insights",
    title: siteSeoText("siteSeo.024"),
    description:
      "사주, 타로, 자미두수, 숙요점, 점성술을 더 안전하고 깊게 이해하기 위한 공개 인사이트 아카이브입니다.",
    h1: "운세 인사이트 아카이브",
    changeFrequency: "weekly",
    priority: 0.9,
    structuredData: ["WebPage", "BreadcrumbList"],
  },
};

export const noindexPathPrefixes = [
  "/api",
  "/api-hello-test",
  "/admin",
  "/auth",
  "/login",
  "/signup",
  "/profile",
  "/payment",
  "/payments",
  "/checkout",
  "/success",
  "/fail",
  "/debug",
  "/test",
  "/dev-status",
  "/me",
  "/my",
  "/points",
  "/account/delete",
  "/premium-unlock",
  "/result",
  "/results",
  "/report/progress",
  "/animal/physio",
  "/maya",
  "/oracle/royal-tea",
  "/oracle/sikojen-povailu",
  "/palm-reading",
  "/pdf",
  "/premium",
  "/premium-reports",
  "/saju/basic",
  "/saju/sibyl",
  "/saju/destiny-bias",
  "/saju/love-simulation",
  "/saju-fpti",
  "/saju-guardian",
  "/saju-picture",
  "/sukuyo/calendar",
  "/tarot/mingri",
  "/tarot/love",
  "/tarot/reunion",
  "/tarot/self-esteem",
  "/tarot/year",
  "/tarot/healing",
  "/ziwei/chart",
  "/astrology/cosmic",
  "/oracle/sukuyo",
  "/oracle/juyuk",
  "/oracle/hwatu",
  "/neo-operation-room",
  "/tadagochi",
  "/blog",
  "/famous",
  "/fortune/sikojen-povailu",
] as const;

export function normalizeSeoPath(pathOrUrl: string): string {
  const raw = String(pathOrUrl || "/").trim();
  if (!raw) return "/";
  let pathname = raw;
  try {
    if (/^https?:\/\//i.test(raw)) pathname = new URL(raw).pathname || "/";
  } catch {
    pathname = "/";
  }
  const noQuery = pathname.split("?")[0].split("#")[0] || "/";
  const leading = noQuery.startsWith("/") ? noQuery : `/${noQuery}`;
  const compact = leading.replace(/\/{2,}/g, "/");
  return compact === "/" ? "/" : compact.replace(/\/+$/, "");
}

export function isNoindexPath(pathOrUrl: string): boolean {
  const path = normalizeSeoPath(pathOrUrl);
  return noindexPathPrefixes.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
}

export function toCanonicalUrl(pathOrUrl: string): string {
  const path = normalizeSeoPath(pathOrUrl);
  const canonicalPath = path === "/" ? "/" : `${path}/`;
  return new URL(canonicalPath, siteSeo.siteUrl).toString();
}

export function getPublicSeoPageByPath(pathOrUrl: string): PublicSeoPage | undefined {
  const path = normalizeSeoPath(pathOrUrl);
  return Object.values(publicSeoPages).find((page) => page.path === path);
}

export function isSupportedSeoLocale(locale: string): boolean {
  return (siteSeo.supportedLocales as readonly string[]).includes(String(locale || "").toLowerCase());
}
