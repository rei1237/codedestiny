import { notFound } from "next/navigation";
import dynamic from "next/dynamic";
import { getService, SECTION_LABELS } from "../../_lib/serviceMap";
import RelatedServices from "../../components/RelatedServices";
import Breadcrumb from "../../components/Breadcrumb";
import ServiceRenderSkeleton from "../../components/ServiceRenderSkeleton";
import { mergeKeywords, SEO_CORE_KEYWORDS, toAbsoluteUrl } from "../../../lib/seo-metadata";
import { FaqJsonLd, SoftwareApplicationJsonLd } from "../../components/SeoJsonLd";

const SITE_ORIGIN = "https://code-destiny.com";

const SERVICE_COMPONENT_LOADERS = {
  sunHealingTarot: dynamic(() => import("../../components/SunHealingTarot"), {
    loading: () => <ServiceRenderSkeleton />,
  }),
  solarOracleTarot: dynamic(() => import("../../components/SolarOracleTarot"), {
    loading: () => <ServiceRenderSkeleton />,
  }),
  mingriTarot: dynamic(() => import("../../components/MingriTarot"), {
    loading: () => <ServiceRenderSkeleton />,
  }),
  loveRelationshipTarot: dynamic(() => import("../../components/LoveRelationshipTarot"), {
    loading: () => <ServiceRenderSkeleton />,
  }),
  sajuBasicPage: dynamic(() => import("../../components/SajuBasicPage"), {
    loading: () => <ServiceRenderSkeleton />,
  }),
  astrologyCosmicPage: dynamic(() => import("../../components/AstrologyCosmicPage"), {
    loading: () => <ServiceRenderSkeleton />,
  }),
  ziweiChartPage: dynamic(() => import("../../components/ZiweiChartPage"), {
    loading: () => <ServiceRenderSkeleton />,
  }),
  stonehengeRune: dynamic(() => import("../../../StonehengeRune"), {
    loading: () => <ServiceRenderSkeleton />,
  }),
};

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

  const canonicalUrl = toAbsoluteUrl(`/${slug}`);

  return {
    title: `${service.title} | Code Destiny`,
    description: service.description,
    keywords: mergeKeywords(service.keywords, SEO_CORE_KEYWORDS),
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      type: "website",
      siteName: "Code Destiny",
      title: service.title,
      description: service.description,
      url: canonicalUrl,
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

  const ServiceComponent = service.componentKey
    ? SERVICE_COMPONENT_LOADERS[service.componentKey]
    : service.component;

  if (!ServiceComponent) {
    notFound();
  }
  const jsonLd = JSON.stringify(buildServiceJsonLd(slug, service));
  const canonicalUrl = toAbsoluteUrl(`/${slug}`);
  const mergedKeywords = mergeKeywords(service.keywords, SEO_CORE_KEYWORDS);
  const serviceFaqItems = [
    {
      question: "올해 운세는 어떤가요?",
      answer:
        "올해 운세는 기본 흐름(연간)과 월별 변화를 함께 보는 방식이 정확합니다. Code: Destiny는 결과와 함께 행동 포인트를 제공해 해석을 실천으로 연결합니다.",
    },
    {
      question: "타로·화투점 결과는 신뢰해도 되나요?",
      answer:
        "타로와 화투점은 현재 상황을 점검하고 선택지를 정리하는 의사결정 보조 도구로 활용하는 것이 좋습니다. 결과는 절대 예언이 아니라 맥락 기반 인사이트로 해석하세요.",
    },
    {
      question: "사주와 타로를 함께 보면 장점이 있나요?",
      answer:
        "사주는 장기적 구조를, 타로는 현재 이슈와 감정 흐름을 읽는 데 강점이 있습니다. 두 결과를 함께 보면 큰 방향과 즉시 실행 전략을 균형 있게 잡을 수 있습니다.",
    },
  ];

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
      <SoftwareApplicationJsonLd
        name={service.h1 || service.title}
        description={service.description}
        url={canonicalUrl}
        image={service.ogImage}
        keywords={mergedKeywords}
        featureList={service.landingPoints || []}
        applicationCategory="EntertainmentApplication"
        inLanguage="ko-KR"
      />
      <FaqJsonLd faqs={serviceFaqItems} />
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
