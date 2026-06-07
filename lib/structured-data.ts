import { SEO_SITE_URL, toAbsoluteUrl } from "./seo";
import { SEO_SITE_CONFIG } from "./seo/siteConfig";

type FaqItem = {
  question: string;
  answer: string;
};

export function buildOrganizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${SEO_SITE_URL}/#organization`,
    name: SEO_SITE_CONFIG.brandName,
    alternateName: SEO_SITE_CONFIG.alternateNames,
    url: SEO_SITE_URL,
    logo: {
      "@type": "ImageObject",
      url: SEO_SITE_CONFIG.defaultOgImage,
    },
    sameAs: [
      `${SEO_SITE_URL}/insights`,
      `${SEO_SITE_URL}/about`,
      `${SEO_SITE_URL}/contact`,
    ],
  };
}

export function buildWebsiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SEO_SITE_URL}/#website`,
    url: SEO_SITE_URL,
    name: SEO_SITE_CONFIG.brandName,
    alternateName: SEO_SITE_CONFIG.alternateNames,
    potentialAction: {
      "@type": "SearchAction",
      target: `${SEO_SITE_URL}/insights?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };
}

export function buildBreadcrumbJsonLd(items: Array<{ name: string; path: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: toAbsoluteUrl(item.path),
    })),
  };
}

export function buildWebPageJsonLd(input: {
  title: string;
  description: string;
  path: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: input.title,
    description: input.description,
    url: toAbsoluteUrl(input.path),
    isPartOf: { "@id": `${SEO_SITE_URL}/#website` },
    about: { "@id": `${SEO_SITE_URL}/#organization` },
  };
}

export function buildCollectionPageJsonLd(input: {
  title: string;
  description: string;
  path: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: input.title,
    description: input.description,
    url: toAbsoluteUrl(input.path),
    isPartOf: { "@id": `${SEO_SITE_URL}/#website` },
    about: { "@id": `${SEO_SITE_URL}/#organization` },
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
      "@id": `${SEO_SITE_URL}/#organization`,
      name: SEO_SITE_CONFIG.brandName,
    },
    areaServed: SEO_SITE_CONFIG.targetMarkets.map((name) => ({
      "@type": "Country",
      name,
    })),
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "KRW",
      url: toAbsoluteUrl(input.path),
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
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: input.title,
    description: input.description,
    image: toAbsoluteUrl(input.image || "/og/code-destiny-og.png"),
    author: {
      "@type": "Person",
      name: input.author || "Code Destiny Editorial Team",
    },
    publisher: {
      "@type": "Organization",
      "@id": `${SEO_SITE_URL}/#organization`,
      name: SEO_SITE_CONFIG.brandName,
    },
    articleSection: input.category || "운세 인사이트",
    keywords: (input.keywords || []).join(", "),
    mainEntityOfPage: toAbsoluteUrl(input.path),
    datePublished: input.datePublished,
    dateModified: input.dateModified || input.datePublished,
  };
}
