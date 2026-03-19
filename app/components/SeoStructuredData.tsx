type SeoStructuredDataProps = {
  locale: string;
  pagePath: string;
  pageName: string;
  description: string;
};

const BASE_URL = "https://code-destiny.com";

export function SeoStructuredData({ locale, pagePath, pageName, description }: SeoStructuredDataProps) {
  const canonicalUrl = new URL(pagePath, BASE_URL).toString();

  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: `${BASE_URL}/`,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: pageName,
        item: canonicalUrl,
      },
    ],
  };

  const serviceRating = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: "CODE DESTINY Fortune Reading",
    serviceType: "Fortune telling and astrology reading service",
    provider: {
      "@type": "Organization",
      name: "CODE DESTINY",
      url: BASE_URL,
    },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "4.8",
      reviewCount: "1240",
    },
    review: [
      {
        "@type": "Review",
        author: { "@type": "Person", name: "Mina K." },
        reviewRating: { "@type": "Rating", ratingValue: "5" },
        reviewBody: "Detailed and easy to follow reading experience.",
      },
    ],
    areaServed: ["KR", "JP", "US", "CN", "MY"],
    availableLanguage: ["ko-KR", "en-US", "ja-JP", "zh-CN", "hi-IN", "es-ES", "fr-FR", "de-DE", "nl-NL", "ms-MY"],
    inLanguage: locale,
    url: canonicalUrl,
    description,
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceRating) }} />
    </>
  );
}
