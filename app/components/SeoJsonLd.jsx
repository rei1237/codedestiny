const BRAND_NAME = "Code Destiny";
const BRAND_URL = "https://code-destiny.com";
const DEFAULT_IMAGE = `${BRAND_URL}/og/code-destiny-og.png`;

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

function buildOrganization() {
  return {
    "@type": "Organization",
    "@id": `${BRAND_URL}/#organization`,
    name: BRAND_NAME,
    alternateName: ["CODE DESTINY", "CodeDestiny", "코드데스티니", "코드 데스티니", "꿀꿀운세", "꿀꿀만세력", "꽃돼지 운세"],
    url: BRAND_URL,
    logo: {
      "@type": "ImageObject",
      url: DEFAULT_IMAGE,
      width: 1200,
      height: 630,
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
  const published = toIsoString(datePublished) || toIsoString(dateModified);
  const modified = toIsoString(dateModified) || published;

  const data = {
    "@context": "https://schema.org",
    "@graph": [
      organization,
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
          "@type": "Organization",
          "@id": `${BRAND_URL}/#organization`,
          name: BRAND_NAME,
        },
        publisher: {
          "@id": `${BRAND_URL}/#organization`,
        },
        ...(published ? { datePublished: published } : {}),
        ...(modified ? { dateModified: modified } : {}),
        image: {
          "@type": "ImageObject",
          url: image || DEFAULT_IMAGE,
          width: 1200,
          height: 630,
        },
        ...(Array.isArray(keywords) && keywords.length > 0 ? { keywords: keywords.join(", ") } : {}),
        ...(articleSection ? { articleSection } : {}),
      },
    ],
  };

  return <StructuredDataScript id="jsonld-article" data={data} />;
}

export function BreadcrumbJsonLd({ items = [] }) {
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
  isAccessibleForFree,
  offer,
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
    author: {
      "@id": `${BRAND_URL}/#organization`,
    },
    publisher: {
      "@id": `${BRAND_URL}/#organization`,
    },
    provider: {
      "@id": `${BRAND_URL}/#organization`,
    },
    image: {
      "@type": "ImageObject",
      url: image || DEFAULT_IMAGE,
    },
    ...(typeof isAccessibleForFree === "boolean" ? { isAccessibleForFree } : {}),
    ...(offer && typeof offer === "object" ? { offers: offer } : {}),
    ...(Array.isArray(featureList) && featureList.length > 0
      ? { featureList: featureList.map((item) => String(item).trim()).filter(Boolean) }
      : {}),
    ...(Array.isArray(keywords) && keywords.length > 0 ? { keywords: keywords.join(", ") } : {}),
  };

  return <StructuredDataScript id="jsonld-software-app" data={data} />;
}
