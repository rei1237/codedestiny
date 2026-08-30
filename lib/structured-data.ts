import { toAbsoluteUrl } from "./seo";
import { siteSeo } from "./seo/siteSeo";
import { FUSION_FORTUNE_PROFILE } from "./seo/entity-registry.mjs";
import { LOCALE_CONFIG } from "./i18n/locales";
import { BUSINESS_IDENTITY, BUSINESS_PHONE_INTL } from "./site-policy-config";

type FaqItem = {
  question: string;
  answer: string;
};

/**
 * 기사 저자. 2026-08-30 운영자 결정으로 필명("네오")을 실명으로 바꿨다 — 대표이자
 * 공개 콘텐츠 최종 검수 책임자(/about "만드는 사람과 책임" 절과 같은 사람).
 *
 * 🔴 여기 적는 경력은 운영자가 직접 밝힌 사실(명리 10년)까지만이다. 검증 가능한 공개 출처
 * (발행일 있는 게시물·기사 링크)가 없는 주장 — 예: 특정 인물 운세 적중 — 은 넣지 않는다.
 * 없는 이력을 붙이는 순간 SEO 요청서 22장의 가짜 저자·가짜 자격 금지에 걸린다.
 * `sameAs` 는 운영자가 준 외부 프로필 링크가 있을 때만 채운다(자기 사이트 URL 금지).
 * `app/insights/seed-articles.js` 의 DEFAULT_AUTHOR 와 name 이 같아야 한다.
 */
export const SITE_AUTHOR = {
  name: "박병하",
  jobTitle: "명리학자",
  description: "10년 경력의 명리학자. Code Destiny 가 공개하는 사주·운세 콘텐츠의 최종 검수 책임자입니다.",
  knowsAbout: ["사주", "명리학", "만세력", "자미두수", "숙요점"],
  sameAs: [] as string[],
} as const;

/**
 * 저자 Person 노드. Article.author 와 /about·/methodology 의 @graph 가 **같은 @id** 로 가리켜
 * 구글이 한 사람으로 합치게 한다.
 */
export function buildAuthorPersonJsonLd() {
  return {
    "@type": "Person",
    "@id": `${siteSeo.siteUrl}/#author`,
    name: SITE_AUTHOR.name,
    jobTitle: SITE_AUTHOR.jobTitle,
    description: SITE_AUTHOR.description,
    knowsAbout: SITE_AUTHOR.knowsAbout,
    url: `${siteSeo.siteUrl}/about`,
    worksFor: {
      "@type": "Organization",
      "@id": `${siteSeo.siteUrl}/#organization`,
      name: siteSeo.organization.name,
    },
    ...(SITE_AUTHOR.sameAs.length ? { sameAs: SITE_AUTHOR.sameAs } : {}),
  };
}

export function buildOrganizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${siteSeo.siteUrl}/#organization`,
    name: siteSeo.organization.name,
    alternateName: siteSeo.alternateName,
    url: siteSeo.siteUrl,
    logo: {
      "@type": "ImageObject",
      url: siteSeo.organization.logo,
      width: 1200,
      height: 630,
    },
    contactPoint: {
      "@type": "ContactPoint",
      email: siteSeo.contact.email,
      contactType: siteSeo.contact.contactType,
      availableLanguage: siteSeo.contact.availableLanguage,
    },
    // 사업자등록증에 적힌 값만 옮긴다. 새 사실을 만들지 않으며 값의 정본은
    // lib/site-policy-config.js 의 BUSINESS_IDENTITY 하나다(verify:business-identity 가 지킨다).
    legalName: BUSINESS_IDENTITY.companyName,
    address: {
      "@type": "PostalAddress",
      addressCountry: "KR",
      streetAddress: BUSINESS_IDENTITY.address,
    },
    telephone: BUSINESS_PHONE_INTL,
    email: BUSINESS_IDENTITY.email,
    taxID: BUSINESS_IDENTITY.registrationNumber,
    founder: {
      "@type": "Person",
      name: BUSINESS_IDENTITY.representative,
    },
    knowsAbout: [
      {
        "@type": "Thing",
        name: FUSION_FORTUNE_PROFILE.primary,
        alternateName: FUSION_FORTUNE_PROFILE.secondary,
        description: "사주, 자미두수, 숙요점, 베다 점성술, 서양 점성술, 타로의 해석 관점을 AI가 종합하는 CODE DESTINY의 초융합 운세 방법론입니다.",
      },
      { "@type": "Thing", name: "사주" },
      { "@type": "Thing", name: "자미두수" },
      { "@type": "Thing", name: "숙요점" },
      { "@type": "Thing", name: "베다 점성술" },
      { "@type": "Thing", name: "서양 점성술" },
      { "@type": "Thing", name: "타로" },
    ],
    sameAs: siteSeo.sameAs,
  };
}

/**
 * 로케일 → JSON-LD `inLanguage` (BCP 47).
 * LOCALE_CONFIG 의 ogLocale(ko_KR 등)을 재사용한다 — 지역 코드 표를 새로 만들지 않는다.
 * 인자를 생략하면 ko-KR 로, 기존 호출부의 동작이 그대로 유지된다.
 */
export function toInLanguage(locale?: string): string {
  const key = String(locale || "ko").toLowerCase();
  const matched = (Object.keys(LOCALE_CONFIG) as Array<keyof typeof LOCALE_CONFIG>)
    .find((candidate) => candidate === key);
  return (LOCALE_CONFIG[matched || "ko"].ogLocale || "ko_KR").replace("_", "-");
}

export function buildWebsiteJsonLd(locale?: string) {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${siteSeo.siteUrl}/#website`,
    url: siteSeo.siteUrl,
    // 🔴 브랜드 이름이다(꿀꿀 운세). 회사 이름(CODE DESTINY)은 Organization 노드가 갖는다.
    // 정적 셸 index.html 의 #website 노드와 글자 단위로 같아야 한다.
    name: siteSeo.brandName,
    alternateName: siteSeo.alternateName,
    inLanguage: toInLanguage(locale),
    publisher: { "@id": `${siteSeo.siteUrl}/#organization` },
  };
}

export function buildBreadcrumbJsonLd(items: Array<{ name: string; path?: string; url?: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url || toAbsoluteUrl(item.path || "/"),
    })),
  };
}

export function buildWebPageJsonLd(input: {
  title: string;
  description: string;
  path: string;
  locale?: string;
}) {
  const url = toAbsoluteUrl(input.path);
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": `${url}#webpage`,
    name: input.title,
    description: input.description,
    url,
    inLanguage: toInLanguage(input.locale),
    isPartOf: { "@id": `${siteSeo.siteUrl}/#website` },
    about: { "@id": `${siteSeo.siteUrl}/#organization` },
  };
}

export function buildAboutPageJsonLd(input: {
  title: string;
  description: string;
  path: string;
}) {
  return {
    ...buildWebPageJsonLd(input),
    "@type": "AboutPage",
  };
}

export function buildCollectionPageJsonLd(input: {
  title: string;
  description: string;
  path: string;
}) {
  return {
    ...buildWebPageJsonLd(input),
    "@type": "CollectionPage",
  };
}

type ServiceAudience = { country: string; audienceType: string; serviceType: string };

/** 알 수 없는 로케일의 기본값. 한국 서비스가 원본이므로 KR 기준이다. */
const DEFAULT_SERVICE_AUDIENCE: ServiceAudience = {
  country: "KR",
  audienceType: "Korean fortune and self-reflection readers",
  serviceType: "Saju reading service",
};

/** 로케일별 서비스 대상 국가·독자층. */
const SERVICE_AUDIENCE: Record<string, ServiceAudience> = {
  ko: DEFAULT_SERVICE_AUDIENCE,
  ja: { country: "JP", audienceType: "Japanese fortune and self-reflection readers", serviceType: "占い鑑定サービス" },
  zh: { country: "CN", audienceType: "Chinese-speaking fortune and self-reflection readers", serviceType: "运势解读服务" },
  en: { country: "US", audienceType: "English-speaking fortune and self-reflection readers", serviceType: "Fortune reading service" },
};

export function buildServiceJsonLd(input: {
  name: string;
  description: string;
  path: string;
  serviceType?: string;
  locale?: string;
  /**
   * 유료 서비스면 schema.org Offer. 정본은 lib/seo/paid-offer.ts 의 buildKrwOffer 하나이며
   * 가격은 서버 가격표에서 푼다 — 🔴 여기에 숫자를 직접 넣지 말 것(검색결과가 실제 결제
   * 금액과 어긋난 채 색인된다). 통화는 언제나 KRW 다(이니시스 해외카드 특약은 원화 승인).
   * 가격을 못 풀면 buildKrwOffer 가 null 을 주고, 그때는 offers 를 아예 내보내지 않는다.
   */
  offer?: Record<string, unknown> | null;
}) {
  const audience = SERVICE_AUDIENCE[String(input.locale || "ko").toLowerCase()] ?? DEFAULT_SERVICE_AUDIENCE;
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name: input.name,
    serviceType: input.serviceType || audience.serviceType,
    description: input.description,
    inLanguage: toInLanguage(input.locale),
    provider: {
      "@type": "Organization",
      "@id": `${siteSeo.siteUrl}/#organization`,
      // 🔴 같은 @id 의 Organization 이다. 회사 이름(siteSeo.organization.name)을 쓴다 —
      // siteSeo.siteName 은 제목 접미사용 표기라 여기 쓰면 한 엔티티에 두 이름이 생긴다.
      name: siteSeo.organization.name,
    },
    areaServed: {
      "@type": "Country",
      name: audience.country,
    },
    audience: {
      "@type": "Audience",
      audienceType: audience.audienceType,
    },
    url: toAbsoluteUrl(input.path),
    ...(input.offer ? { offers: input.offer } : {}),
  };
}

export function buildFaqPageJsonLd(faqs: FaqItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };
}

export function buildArticleJsonLd(input: {
  title: string;
  description: string;
  path: string;
  image?: string;
  author?: string;
  category?: string;
  keywords?: string[];
  datePublished?: string;
  dateModified?: string;
}) {
  const url = toAbsoluteUrl(input.path);
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    "@id": `${url}#article`,
    headline: input.title,
    description: input.description,
    image: toAbsoluteUrl(input.image || siteSeo.defaultOgImage),
    // 저자는 실명 Person 노드(SITE_AUTHOR, 2026-08-30). 예전에는 조직명으로 폴백돼
    // 모든 기사가 "Code Destiny" 를 저자로 선언했고, 그건 저자 신호가 아니라 발행처 신호였다.
    // 호출부가 다른 저자 문자열을 넘기면(가이드의 "Code Destiny 편집팀") 이름만 선언한다 —
    // 그 표기에 사람의 경력을 붙이면 안 된다.
    author:
      !input.author || input.author === SITE_AUTHOR.name
        ? buildAuthorPersonJsonLd()
        : { "@type": "Person", name: input.author },
    publisher: {
      "@type": "Organization",
      "@id": `${siteSeo.siteUrl}/#organization`,
      // 🔴 같은 @id 의 Organization 이다. 회사 이름(siteSeo.organization.name)을 쓴다 —
      // siteSeo.siteName 은 제목 접미사용 표기라 여기 쓰면 한 엔티티에 두 이름이 생긴다.
      name: siteSeo.organization.name,
      logo: {
        "@type": "ImageObject",
        url: siteSeo.organization.logo,
      },
    },
    // 해석 기준을 공개한 문서를 근거로 건다. 사실 관계를 지어내지 않으면서 만들 수 있는
    // 신뢰 신호이고, /methodology 는 실제로 존재하는 색인 대상 페이지다.
    isBasedOn: toAbsoluteUrl("/methodology"),
    articleSection: input.category || "운세 인사이트",
    keywords: (input.keywords || []).join(", "),
    mainEntityOfPage: url,
    datePublished: input.datePublished,
    dateModified: input.dateModified || input.datePublished,
    inLanguage: "ko-KR",
  };
}
