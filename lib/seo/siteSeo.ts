import { BRAND_FACTS } from "../brand/brand-facts.mjs";
import { META_NOINDEX_PREFIXES, isMetaNoindexPath } from "./index-policy.mjs";

const SITE_SEO_TEXT_TRANSLATIONS = {
  ko: {
    "siteSeo.001": "무료 만세력 · 타로 · 오늘의 운세 | 꿀꿀 운세",
    "siteSeo.002": "꿀꿀 운세 소개 | 운영자·해석 기준·서비스 안내",
    "siteSeo.003": "꿀꿀 운세 자주 묻는 질문",
    "siteSeo.004": "운세 콘텐츠 방법론과 면책 고지",
    "siteSeo.005": "무료 만세력 보는 법 | 사주팔자 원국·오행 균형 확인",
    "siteSeo.006": "무료 만세력 사주 원국 | 사주팔자 기본 구조 안내",
    "siteSeo.007": "사주 만세력 기본 해석 | 오행·십성·명식 분석",
    "siteSeo.008": "사주 궁합 해석 | 관계 흐름과 소통 방식",
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
    "siteSeo.021": "연애 리포트 PDF 안내 | 관계 흐름 심층 분석",
    "siteSeo.023": "운세 인사이트 가이드 | 사주·타로·궁합·점성술",
    "siteSeo.024": "운세 인사이트 아카이브 | 사주·타로·자미두수 가이드",
    "siteSeo.025": "연이와 네오 — 꿀꿀 운세 캐릭터·세계관 소개",
    "siteSeo.026": "2026년 9월 일간별 운세 | 정유월 사주 흐름",
    "siteSeo.027": "최근 30일 띠별 날짜 운세",
    "siteSeo.028": "사주 원석 추천 | 나에게 좋은 오행 찾기 - 꿀꿀운세",
  },
} as const;

function siteSeoText(key: keyof typeof SITE_SEO_TEXT_TRANSLATIONS.ko) {
  return SITE_SEO_TEXT_TRANSLATIONS.ko[key] || "Translation pending";
}
/**
 * 공식 외부 채널. 정본은 lib/brand/brand-facts.mjs 의 sameAs 이고, 여기는 그 값을 다시 내보낸다.
 * 🔴 schema.org Organization 의 `sameAs` 가 이 목록에서 파생된다.
 *
 * 2026-08-16 이전에는 두 목록이 갈라져 있었고, `sameAs` 쪽이 타인의 블로그
 * (blog.naver.com/codedestiny = "수고했어 오늘도.")와 존재하지 않는 인스타 계정
 * (instagram.com/code_destiny_official)을 공식 계정으로 선언하고 있었다. 그 상태에서는
 * Google 이 브랜드 엔티티를 통합하지 못해 실채널의 신호가 스키마에 실리지 않는다.
 *
 * 🔴 `sameAs` 는 **외부 프로필 전용**이다 — 자기 사이트 URL(/about, /insights)을 넣지 말 것.
 */
export const SOCIAL_PROFILES: ReadonlyArray<{ key: string; url: string }> = BRAND_FACTS.sameAs;

export const siteSeo = {
  /**
   * 공개 발행처 표기용 이름(`creator`·`publisher`). 등록 상호는 organization.legalName으로 구분한다.
   *
   * 🔴 **`og:site_name` 과 `application-name` 에는 쓰지 말 것 — 그 둘은 brandName 이다.**
   * 예전에는 여기가 og:site_name 이었고, 그 결과 사이트 이름 신호가 다섯 갈래로 갈렸다
   * (2026-08-28 전수 실측): 정적 셸 "CODE DESTINY" 6개 · public/famous "Code Destiny (꿀꿀 만세력)" ·
   * public/fortune "Code Destiny" · app 라우트 "Code Destiny" · WebSite 스키마 "꿀꿀운세".
   * 사이트 이름과 화면의 브랜드 표현을 일관되게 유지한다. 검색 결과의 사이트 이름 채택은
   * 검색엔진이 결정하며, 신호 일치만으로 노출이나 순위를 보장하지 않는다.
   * 가드: `__tests__/ui/site-name-signals.static.test.js`
   */
  siteName: BRAND_FACTS.service.name,
  /**
   * `WebSite` 엔티티의 이름 = 서비스 브랜드.
   *
   * 회사 이름과 다르다: 서비스는 **꿀꿀 운세**(2026-10-15 사용자 결정, 붙여 쓴 "꿀꿀운세"는 별칭),
   * 운영자는 **CODE DESTINY**. WebSite 는 서비스 이름을, Organization 은 운영자 이름을 쓴다.
   * 정본은 lib/brand/brand-facts.mjs 다.
   *
   * 🔴 이 값이 곧 `og:site_name` · `application-name` 이기도 하다(2026-08-28) — 위 siteName 주석 참고.
   *
   * 🔴 이 값은 정적 셸 index.html 의 `#website` 노드 name 과 **글자 단위로 같아야 한다.**
   * 홈 `/` 은 승격된 셸이, 나머지 400여 라우트는 app/layout.js 가 서빙하는데 `@id` 가 같다.
   * 갈리면 Google 이 한 엔티티에 두 이름을 보게 된다.
   * `__tests__/ui/locale-footer.static.test.js` 가 그 일치를 강제한다.
   */
  brandName: BRAND_FACTS.service.name,
  // WebSite 별칭. 과거 이름은 넣지 않는다(이력 설명에만). 운영자 이름 두 가지는 2026-11-13 결정으로 별칭에 넣는다(정본 주석 참고).
  alternateName: BRAND_FACTS.service.alternateNames,
  siteUrl: BRAND_FACTS.service.siteUrl,
  defaultLocale: "ko",
  supportedLocales: ["ko"],
  defaultTitle: "꿀꿀 운세 — 사주·궁합·타로",
  titleTemplate: "%s",
  defaultDescription:
    "꿀꿀 운세에서 사주풀이와 궁합, 타로, 자미두수, 숙요점을 만나보세요. 고양이 영냥이와 꽃돼지 연이가 내 성향과 지금의 고민을 살펴보는 길을 안내합니다.",
  defaultOgImage: "https://code-destiny.com/og/code-destiny-og-vvip.png?v=42dedf5c85",
  twitterCard: "summary_large_image",
  organization: {
    // 운영자 이름. 서비스 이름(brandName)과 섞지 않는다. 등록 상호는 BUSINESS_IDENTITY.companyName으로 별도 출력한다.
    name: BRAND_FACTS.operator.name,
    alternateName: BRAND_FACTS.operator.alternateNames,
    legalName: "코드 데스티니",
    url: "https://code-destiny.com",
    // 로고는 정사각형 앱 아이콘을 쓴다. 1200×630 공유 카드는 검색 로고로 쓰기에 비율이 맞지 않는다.
    logo: "https://code-destiny.com/icons/moonlight-garden-v1-512.png",
  },
  contact: {
    email: "admin@code-destiny.com",
    contactType: "customer support",
    availableLanguage: ["Korean"],
  },
  sameAs: SOCIAL_PROFILES.map((profile) => profile.url),
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
  structuredData: Array<"Organization" | "WebSite" | "WebPage" | "CollectionPage" | "AboutPage" | "FAQPage" | "Article" | "BreadcrumbList">;
};

export const publicSeoPages: Record<string, PublicSeoPage> = {
  home: {
    path: "/",
    title: siteSeoText("siteSeo.001"),
    description:
      "사주, 타로, 자미두수, 점성술, 숙요점, 궁합, 오늘의 운세를 한곳에서 확인하세요. 꿀꿀운세는 자기성찰을 돕는 한국어 운세 플랫폼입니다.",
    h1: "무료 만세력 · 타로 · 오늘의 운세 통합 플랫폼",
    keywords: ["무료 만세력", "무료 타로", "오늘의 운세", "만세력", "궁합"],
    changeFrequency: "daily",
    priority: 1,
    structuredData: ["Organization", "WebSite", "WebPage"],
  },
  about: {
    path: "/about",
    title: siteSeoText("siteSeo.002"),
    description:
      "꿀꿀 운세는 명리학자 박병하(네오)가 운영하는 사주·타로·자미두수 운세 상담 서비스예요. 운영자, 해석 기준, 무료와 유료의 범위, 콘텐츠 운영 원칙을 소개합니다.",
    h1: "꿀꿀 운세 소개",
    changeFrequency: "monthly",
    priority: 0.8,
    structuredData: ["Organization", "AboutPage"],
  },
  faq: {
    path: "/faq",
    title: siteSeoText("siteSeo.003"),
    description:
      "무료 운세 이용, 회원가입, 개인정보, 결제와 환불, 결과 해석 기준에 대한 자주 묻는 질문을 정리했습니다.",
    h1: "꿀꿀 운세 자주 묻는 질문",
    changeFrequency: "monthly",
    priority: 0.72,
    structuredData: ["FAQPage", "BreadcrumbList"],
  },
  methodology: {
    path: "/methodology",
    title: siteSeoText("siteSeo.004"),
    description:
      "꿀꿀운세의 운세 콘텐츠 작성 원칙, 검수 방식, 업데이트 기준, 참고 해석의 한계를 밝힌 면책 고지를 안내합니다.",
    h1: "운세 콘텐츠 방법론과 면책 고지",
    changeFrequency: "monthly",
    priority: 0.78,
    structuredData: ["WebPage", "BreadcrumbList"],
  },
  manse: {
    path: "/manse",
    title: siteSeoText("siteSeo.005"),
    description:
      "생년월일과 시간을 바탕으로 만세력의 사주팔자와 오행 균형을 확인하는 방법을 안내합니다. 십성·대운 풀이는 라이트 사주 풀이에서 이어집니다.",
    h1: "무료 만세력 보는 법",
    keywords: ["무료 만세력", "사주 만세력", "오행", "십성", "대운", "일간별 운세"],
    changeFrequency: "daily",
    priority: 0.98,
    structuredData: ["WebPage", "BreadcrumbList", "FAQPage"],
  },
  saju: {
    path: "/saju",
    title: siteSeoText("siteSeo.006"),
    description:
      "사주팔자의 기본 구조와 오행 균형, 십성, 대운의 개념을 안내하고, 무료 만세력으로 원국과 한 줄 성향을 확인하는 페이지입니다.",
    h1: "무료 만세력 사주 원국",
    keywords: ["무료 만세력", "사주팔자", "오행", "십성", "사주 분석", "일간별 운세"],
    changeFrequency: "daily",
    priority: 0.98,
    structuredData: ["WebPage", "BreadcrumbList", "FAQPage"],
  },
  sajuMonthlyIlgan: {
    path: "/saju/monthly/2026-09",
    title: siteSeoText("siteSeo.026"),
    description:
      "2026년 9월 정유월의 절기와 십성 관계를 기준으로 갑목·을목부터 계수까지 10천간의 일간별 월간 운세를 정리합니다.",
    h1: "2026년 9월 일간별 운세",
    keywords: ["2026년 9월 일간별 운세", "정유월 운세", "10천간 월간 운세", "일간별 사주 운세"],
    changeFrequency: "monthly",
    priority: 0.9,
    structuredData: ["CollectionPage", "WebPage", "BreadcrumbList", "FAQPage"],
  },
  fortuneDateArchive: {
    path: "/fortune/date",
    title: siteSeoText("siteSeo.027"),
    description:
      "최근 30일의 날짜별 띠 운세를 한곳에서 확인하세요. 12띠별 총운·재물운·연애운·직장운·건강운과 일진 근거를 날짜별로 정리합니다.",
    h1: "최근 30일 띠별 날짜 운세",
    keywords: ["날짜별 띠 운세", "띠별 날짜 운세", "최근 30일 띠 운세", "원숭이띠 날짜 운세"],
    changeFrequency: "daily",
    priority: 0.86,
    structuredData: ["CollectionPage", "WebPage", "BreadcrumbList", "FAQPage"],
  },
  sajuCompatibility: {
    path: "/saju/compatibility",
    title: siteSeoText("siteSeo.008"),
    description:
      "두 사람의 사주 구조를 관계 리듬, 갈등 패턴, 소통 방식 관점에서 읽는 사주 궁합 안내 페이지입니다.",
    h1: "사주 궁합 해석",
    keywords: ["사주 궁합", "궁합 보기", "연애운", "관계 분석"],
    changeFrequency: "weekly",
    priority: 0.94,
    structuredData: ["WebPage", "BreadcrumbList", "FAQPage"],
  },
  // 사주 원석 추천 랜딩(2026-11-11). 질문·결과 화면 /saju/crystals/start 는 noindex(색인 원장 hidden).
  sajuCrystals: {
    path: "/saju/crystals",
    title: siteSeoText("siteSeo.028"),
    description:
      "좋았던 해와 힘들었던 해를 사주 흐름과 함께 살펴보세요. 꿀꿀운세가 도움이 되는 오행 후보와 그에 어울리는 원석, 추천 이유를 안내합니다",
    h1: "나에게 좋은 기운을 살펴보고, 어울리는 원석을 찾아보세요",
    ogImage: "/images/saju-crystals/og-1200x630.jpg",
    keywords: ["사주 원석 추천", "오행 원석", "나에게 맞는 원석", "용신 원석", "사주 오행"],
    changeFrequency: "monthly",
    priority: 0.8,
    structuredData: ["WebPage", "BreadcrumbList"],
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
      "우리, 다시 만날 수 있을까? 상대와의 거리, 연락 타이밍, 남은 감정을 카드 흐름으로 살펴보는 재회 타로입니다.",
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
    keywords: ["자미두수", "자미두수 명반", "12궁", "명궁", "신궁", "사화", "재백궁", "관록궁"],
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
    keywords: ["숙요점", "숙요 궁합", "27숙", "숙요점 업태관계", "업태관계 뜻", "영친·안괴·성위"],
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
    keywords: ["베다 점성술", "베다점 운세", "조티쉬", "라그나", "나크샤트라", "다샤", "달 별자리"],
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
  highValue: {
    path: "/guides",
    title: siteSeoText("siteSeo.023"),
    description:
      "사주, 타로, 궁합, 점성술을 처음 접하는 분도 쉽게 이해할 수 있도록 핵심 개념과 해석 방법을 정리한 가이드입니다.",
    h1: "운세 인사이트 가이드",
    keywords: ["운세 가이드", "사주 입문", "타로 리딩", "궁합", "점성술"],
    changeFrequency: "weekly",
    priority: 0.88,
    structuredData: ["WebPage", "BreadcrumbList"],
  },
  world: {
    path: "/world",
    title: siteSeoText("siteSeo.025"),
    description:
      "꿀꿀운세의 상담자 연이와 네오, 섬에서 만난 모카·윤달·루나·청토끼·까마귀, 사주의 강·비겁의 섬 같은 장소를 한자리에 모아 소개합니다. 1부와 2부 초입까지만 다룹니다.",
    h1: "캐릭터와 세계관",
    keywords: ["연이", "네오", "꿀꿀운세 캐릭터", "사주의 강", "운명 세계관", "모카", "윤달", "루나", "청토끼", "까마귀", "거울 속 연이", "검은 호랑이", "흑월", "우주"],
    changeFrequency: "monthly",
    priority: 0.7,
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

// 메타 noindex 접두 목록. 정본은 lib/seo/index-policy.mjs(색인 원장)의 meta:"noindex" 항목이고, 순서까지 예전 배열과 같다.
// 🔴 이 목록은 isNoindexPath → lib/seo.v2.ts isPrivateRoute → ShareWidget 숨김까지 흐른다. /flower·SeoLandingTemplate 계열을
//    여기 넣지 않는 이유, /saju-fpti·/fortune/weekly·monthly 를 다시 넣지 않는 이유는 원장 주석에 있다.
export const noindexPathPrefixes = META_NOINDEX_PREFIXES;

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
  return isMetaNoindexPath(pathOrUrl);
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
