import { toAbsoluteUrl } from "./seo";
import { siteSeo } from "./seo/siteSeo";
import { LOCALE_CONFIG } from "./i18n/locales";

type FaqItem = {
  question: string;
  answer: string;
};

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
    name: siteSeo.siteName,
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
      name: siteSeo.siteName,
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
    author: {
      "@type": "Organization",
      name: input.author || siteSeo.siteName,
    },
    publisher: {
      "@type": "Organization",
      "@id": `${siteSeo.siteUrl}/#organization`,
      name: siteSeo.siteName,
      logo: {
        "@type": "ImageObject",
        url: siteSeo.organization.logo,
      },
    },
    articleSection: input.category || "운세 인사이트",
    keywords: (input.keywords || []).join(", "),
    mainEntityOfPage: url,
    datePublished: input.datePublished,
    dateModified: input.dateModified || input.datePublished,
    inLanguage: "ko-KR",
  };
}
