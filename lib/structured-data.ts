import { toAbsoluteUrl } from "./seo";
import { siteSeo } from "./seo/siteSeo";

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

export function buildWebsiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${siteSeo.siteUrl}/#website`,
    url: siteSeo.siteUrl,
    name: siteSeo.siteName,
    alternateName: siteSeo.alternateName,
    inLanguage: "ko-KR",
    publisher: { "@id": `${siteSeo.siteUrl}/#organization` },
    potentialAction: {
      "@type": "SearchAction",
      target: `${siteSeo.siteUrl}/insights?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
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
}) {
  const url = toAbsoluteUrl(input.path);
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": `${url}#webpage`,
    name: input.title,
    description: input.description,
    url,
    inLanguage: "ko-KR",
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

export function buildServiceJsonLd(input: {
  name: string;
  description: string;
  path: string;
  serviceType?: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name: input.name,
    serviceType: input.serviceType || "운세 해석 서비스",
    description: input.description,
    provider: {
      "@type": "Organization",
      "@id": `${siteSeo.siteUrl}/#organization`,
      name: siteSeo.siteName,
    },
    areaServed: {
      "@type": "Country",
      name: "KR",
    },
    audience: {
      "@type": "Audience",
      audienceType: "Korean fortune and self-reflection readers",
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
