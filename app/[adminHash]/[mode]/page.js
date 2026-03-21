import { notFound } from "next/navigation";
import { getService, SECTION_LABELS } from "../../_lib/serviceMap";
import RelatedServices from "../../components/RelatedServices";
import Breadcrumb from "../../components/Breadcrumb";

const SITE_ORIGIN = "https://code-destiny.com";

/**
 * JSON-LD는 반드시 JSON.stringify로 직렬화해 유효한 JSON만 출력합니다.
 * 키워드·문구는 serviceMap의 고정 문자열만 사용합니다.
 */
function buildServiceJsonLd(slug, service) {
  const url = `${SITE_ORIGIN}/${slug}`;
  const pageId = `${url}#webpage`;
  const serviceId = `${url}#service`;

  const keywordStr =
    Array.isArray(service.keywords) && service.keywords.length > 0
      ? service.keywords.join(", ")
      : undefined;

  const graph = [
    {
      "@type": "WebPage",
      "@id": pageId,
      url,
      name: service.title,
      description: service.description,
      isPartOf: { "@id": `${SITE_ORIGIN}/#website` },
      inLanguage: "ko-KR",
      mainEntity: { "@id": serviceId },
      ...(keywordStr ? { keywords: keywordStr } : {}),
    },
    {
      "@type": "Service",
      "@id": serviceId,
      name: service.h1 || service.title,
      description: service.description,
      url,
      provider: {
        "@type": "Organization",
        name: "Code Destiny",
        url: SITE_ORIGIN,
      },
      ...(keywordStr ? { keywords: keywordStr } : {}),
    },
  ];

  return {
    "@context": "https://schema.org",
    "@graph": graph,
  };
}

export async function generateMetadata({ params }) {
  const slug = `${params.adminHash}/${params.mode}`;
  const service = getService(slug);

  if (!service) {
    return { title: "Code Destiny" };
  }

  return {
    title: `${service.title} | Code Destiny`,
    description: service.description,
    ...(Array.isArray(service.keywords) && service.keywords.length > 0
      ? { keywords: service.keywords }
      : {}),
    alternates: {
      canonical: `https://code-destiny.com/${slug}`,
    },
    openGraph: {
      type: "website",
      siteName: "Code Destiny",
      title: service.title,
      description: service.description,
      url: `https://code-destiny.com/${slug}`,
      images: service.ogImage
        ? [{ url: service.ogImage, width: 1200, height: 630 }]
        : [],
    },
    twitter: {
      card: "summary_large_image",
      title: service.title,
      description: service.description,
      images: service.ogImage ? [service.ogImage] : [],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
      },
    },
  };
}

export default function ServicePage({ params }) {
  const slug = `${params.adminHash}/${params.mode}`;
  const service = getService(slug);

  if (!service) {
    notFound();
  }

  const ServiceComponent = service.component;
  const jsonLd = JSON.stringify(buildServiceJsonLd(slug, service));

  // Breadcrumb items
  const slugParts = slug.split('/');
  const breadcrumbItems = [
    { label: '홈', href: '/' },
    { 
      label: SECTION_LABELS[slugParts[0]] ?? slugParts[0], 
      href: `/` 
    },
    { label: service.cardTitle || service.title, href: `/${slug}` },
  ];

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />
      <Breadcrumb items={breadcrumbItems} />
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          width: "1px",
          height: "1px",
          overflow: "hidden",
          clip: "rect(0,0,0,0)",
          whiteSpace: "nowrap",
        }}
      >
        <h1>{service.h1}</h1>
        <p>{service.seoText}</p>
      </div>

      <ServiceComponent service={service} />
      <RelatedServices currentSlug={slug} />
    </>
  );
}
