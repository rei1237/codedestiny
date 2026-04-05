const BRAND_NAME = "Code: Destiny";
const BRAND_URL = "https://code-destiny.com";
const AUTHOR_NAME = "꽃돼지 연이";

function toIsoString(value) {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

function StructuredDataScript({ id, data }) {
  if (!data) return null;
  return (
    <script
      id={id}
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

function buildAuthor() {
  return {
    "@type": "Person",
    "@id": `${BRAND_URL}/about#author`,
    name: AUTHOR_NAME,
    url: `${BRAND_URL}/about`,
    jobTitle: "명리학 연구자 · 운세 콘텐츠 에디터",
    description:
      "사주, 타로, 점성술 콘텐츠를 실제 사례 기반으로 해석하고 검증하는 Code: Destiny 운영자.",
    worksFor: {
      "@type": "Organization",
      "@id": `${BRAND_URL}/#organization`,
      name: BRAND_NAME,
    },
    knowsAbout: ["사주", "명리학", "타로", "운세", "점성술", "심리 테스트"],
  };
}

function buildOrganization() {
  return {
    "@type": "Organization",
    "@id": `${BRAND_URL}/#organization`,
    name: BRAND_NAME,
    url: BRAND_URL,
    logo: {
      "@type": "ImageObject",
      url: `${BRAND_URL}/icons/honeypig.webp`,
      width: 512,
      height: 512,
    },
  };
}

export function ArticleJsonLd({
  url,
  title,
  description,
  datePublished,
  dateModified,
  image,
  keywords = [],
  articleSection,
  inLanguage = "ko-KR",
}) {
  const organization = buildOrganization();
  const author = buildAuthor();
  const published = toIsoString(datePublished) || toIsoString(dateModified);
  const modified = toIsoString(dateModified) || published;

  const data = {
    "@context": "https://schema.org",
    "@graph": [
      organization,
      author,
      {
        "@type": "Article",
        "@id": `${url}#article`,
        mainEntityOfPage: {
          "@type": "WebPage",
          "@id": `${url}#webpage`,
        },
        headline: title,
        description,
        url,
        inLanguage,
        author: {
          "@id": `${BRAND_URL}/about#author`,
        },
        publisher: {
          "@id": `${BRAND_URL}/#organization`,
        },
        ...(published ? { datePublished: published } : {}),
        ...(modified ? { dateModified: modified } : {}),
        ...(image
          ? {
              image: {
                "@type": "ImageObject",
                url: image,
                width: 1200,
                height: 630,
              },
            }
          : {}),
        ...(Array.isArray(keywords) && keywords.length > 0
          ? { keywords: keywords.join(", ") }
          : {}),
        ...(articleSection ? { articleSection } : {}),
      },
    ],
  };

  return <StructuredDataScript id="jsonld-article" data={data} />;
}

export function BreadcrumbJsonLd({ items = [] }) {
  // items: [{ name, url }]
  if (!Array.isArray(items) || items.length === 0) return null;
  const data = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  };
  return <StructuredDataScript id="jsonld-breadcrumb" data={data} />;
}

export function FaqJsonLd({ faqs = [] }) {
  const normalizedFaqs = Array.isArray(faqs)
    ? faqs
        .map((item) => ({
          question: String(item?.question || "").trim(),
          answer: String(item?.answer || "").trim(),
        }))
        .filter((item) => item.question && item.answer)
    : [];

  if (normalizedFaqs.length === 0) return null;

  const data = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: normalizedFaqs.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
    publisher: {
      "@id": `${BRAND_URL}/#organization`,
    },
  };

  return <StructuredDataScript id="jsonld-faq" data={data} />;
}

export function SoftwareApplicationJsonLd({
  name,
  description,
  url,
  image,
  keywords = [],
  featureList = [],
  applicationCategory = "LifestyleApplication",
  inLanguage = "ko-KR",
}) {
  if (!name || !description || !url) return null;

  const data = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "@id": `${url}#app`,
    name,
    description,
    url,
    applicationCategory,
    operatingSystem: "Web",
    inLanguage,
    isAccessibleForFree: true,
    author: {
      "@id": `${BRAND_URL}/about#author`,
    },
    publisher: {
      "@id": `${BRAND_URL}/#organization`,
    },
    provider: {
      "@id": `${BRAND_URL}/#organization`,
    },
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "KRW",
      availability: "https://schema.org/InStock",
      url,
    },
    ...(image
      ? {
          image: {
            "@type": "ImageObject",
            url: image,
          },
        }
      : {}),
    ...(Array.isArray(featureList) && featureList.length > 0
      ? { featureList: featureList.map((item) => String(item).trim()).filter(Boolean) }
      : {}),
    ...(Array.isArray(keywords) && keywords.length > 0
      ? { keywords: keywords.join(", ") }
      : {}),
  };

  return <StructuredDataScript id="jsonld-software-app" data={data} />;
}
