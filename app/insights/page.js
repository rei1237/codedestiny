import InsightsCosmicRouteClient from "./InsightsCosmicRouteClient";
import { FEATURE_GUIDES } from "./feature-guides";
import { INSIGHT_SEED_ARTICLES } from "./seed-articles";
import { buildSeoMetadata } from "../../lib/seo";
import { createHreflangFromRoutes } from "../../lib/seo/createHreflang";
import { getAlternatesByRouteKey } from "../../lib/i18n/routes";
import { buildBreadcrumbJsonLd, buildWebPageJsonLd } from "../../lib/structured-data";
import { publishedCelebritySajuSeeds } from "../../lib/famous-saju/celebrity-saju-service";
import { getPexelsSectionImage, resolvePexelsInsightImageRequest } from "../../lib/server/pexels";

const pageTitle = "운세 인사이트 허브 | 사주·자미두수·숙요점·타로 가이드 | Code Destiny";
const pageDescription =
  "사주, 자미두수, 숙요점, 타로, 점성술, 베다점성술을 처음 접하는 사람도 흐름을 읽을 수 있도록 정리한 운세 인사이트 아카이브입니다.";

function toClientInsightItem(item) {
  return {
    id: String(item?.id || item?.slug || "").trim(),
    slug: String(item?.slug || "").trim(),
    title: String(item?.title || "").trim(),
    subtitle: String(item?.subtitle || "").trim(),
    excerpt: String(item?.excerpt || item?.description || item?.subtitle || "").trim(),
    body: String(item?.body || item?.contentHtml || "").trim(),
    category: String(item?.category || "").trim(),
    categoryLabel: String(item?.categoryLabel || item?.category || "").trim(),
    tags: Array.isArray(item?.tags)
      ? item.tags.map((tag) => String(tag || "").trim()).filter(Boolean).slice(0, 12)
      : [],
    coverImage: String(item?.coverImage || item?.featuredImage?.url || item?.thumbnailUrl || "").trim(),
    coverImageAlt: String(item?.coverImageAlt || item?.featuredImage?.alt || item?.title || "").trim(),
    serviceLink: String(item?.serviceLink || item?.ctaServiceRoute || item?.targetRoute || "").trim(),
    ctaLabel: String(item?.ctaLabel || item?.cta?.title || "").trim(),
    seoTitle: String(item?.seoTitle || item?.metaTitle || item?.title || "").trim(),
    seoDescription: String(item?.seoDescription || item?.metaDescription || item?.excerpt || item?.description || "").trim(),
    isPublished: item?.isPublished === undefined ? true : Boolean(item.isPublished),
    isFeatured: Boolean(item?.isFeatured),
    publishedAt: String(item?.publishedAt || "").trim(),
    updatedAt: String(item?.updatedAt || "").trim(),
    viewCount: Math.max(0, Number(item?.viewCount || 0) || 0),
    readingTime: Math.max(1, Number(item?.readingTime || 0) || 1),
  };
}

// /ja/insights·/zh/insights·/zh-tw/insights·/en/insights 가 이 페이지를 ko alternate 로
// 지목하는데 정작 이쪽은 페이지 태그를 내지 않았다(사이트맵 xhtml:link 로만 선언됨).
export const metadata = buildSeoMetadata({
  path: "/insights",
  title: pageTitle,
  description: pageDescription,
  keywords: ["운세 인사이트", "사주 공부", "자미두수 보는 법", "숙요점 보는 법", "타로 해석", "점성술 가이드"],
  hreflang: createHreflangFromRoutes(getAlternatesByRouteKey("insights")),
});

function getInsightFilters(items) {
  return {
    categories: Array.from(new Set(items.map((article) => article.category).filter(Boolean))),
    tags: Array.from(new Set(items.flatMap((article) => article.tags || article.keywords || []).filter(Boolean))).slice(0, 120),
  };
}

function buildFamousSajuInsightItems() {
  const featuredSlugs = ["yi-sun-sin", "iu", "bts-rm", "king-sejong", "son-heung-min", "kim-yuna"];
  const bySlug = new Map(publishedCelebritySajuSeeds.map((item) => [item.slug, item]));
  const featured = featuredSlugs.map((slug) => bySlug.get(slug)).filter(Boolean);
  const remaining = publishedCelebritySajuSeeds.filter((item) => !featuredSlugs.includes(item.slug));

  return [...featured, ...remaining].map((person, index) => ({
    id: `famous-saju-${person.slug}`,
    slug: `famous-saju/${person.slug}`,
    title: `${person.nameKo} 사주 분석`,
    subtitle: person.isBirthTimeKnown ? "사주 엔진 기반 사주팔자 분석" : "출생 시간 미상 / 삼주 기반 분석",
    excerpt: person.shortDescription,
    body: person.shortDescription,
    category: "유명인 사주",
    categoryLabel: "유명인 사주",
    tags: Array.from(new Set(["유명인 사주", person.category, ...person.tags])).slice(0, 6),
    coverImage: "/fuctionassets/%EC%9C%A0%EB%AA%85%EC%9D%B8%20%EC%82%AC%EC%A3%BC%20%EB%B6%84%EC%84%9D.webp",
    coverImageAlt: `${person.nameKo} 사주 분석 대표 이미지`,
    serviceLink: `/insights/famous-saju/${person.slug}`,
    ctaLabel: "유명인 사주 글 보기",
    isPublished: person.published,
    isFeatured: index < featured.length,
    publishedAt: "2026-06-04T00:00:00+09:00",
    updatedAt: "2026-06-04T00:00:00+09:00",
    viewCount: Math.max(0, 900 - index * 7),
    readingTime: person.isBirthTimeKnown ? 7 : 6,
  }));
}

async function enrichInsightImageItems(items) {
  const imageByKey = new Map();

  for (const item of items) {
    const request = resolvePexelsInsightImageRequest(item);
    const key = `${request.section}:${request.query}`;
    if (!imageByKey.has(key)) {
      imageByKey.set(key, await getPexelsSectionImage(request.query, request.section));
    }
  }

  return items.map((item) => {
    const request = resolvePexelsInsightImageRequest(item);
    const image = imageByKey.get(`${request.section}:${request.query}`);
    if (!image?.src) return item;
    return {
      ...item,
      coverImage: image.src,
      coverImageAlt: image.alt || item.coverImageAlt || `${item.title} 대표 이미지`,
      featuredImage: {
        ...(item.featuredImage || {}),
        url: image.src,
        alt: image.alt || item.featuredImage?.alt || item.coverImageAlt || `${item.title} 대표 이미지`,
        width: item.featuredImage?.width || 1200,
        height: item.featuredImage?.height || 630,
      },
    };
  });
}

export default async function InsightsPage() {
  const initialFamousSajuItems = (await enrichInsightImageItems(buildFamousSajuInsightItems())).map(toClientInsightItem);
  const initialInsightItems = (await enrichInsightImageItems(INSIGHT_SEED_ARTICLES)).map(toClientInsightItem);
  const initialAllItems = [...initialFamousSajuItems, ...initialInsightItems];
  const initialItems = initialAllItems.slice(0, 12);
  const initialRecommended = initialInsightItems.filter((article) => article.isFeatured).slice(0, 6);
  const { categories, tags } = getInsightFilters(initialAllItems);
  const webPage = buildWebPageJsonLd({
    title: pageTitle,
    description: pageDescription,
    path: "/insights",
  });
  const breadcrumb = buildBreadcrumbJsonLd([
    { name: "꿀꿀 운세 홈", path: "/" },
    { name: "운세 인사이트 허브", path: "/insights" },
  ]);

  const topicHubs = [
    { href: "/insights/saju/", label: "사주 인사이트" },
    { href: "/insights/ziwei/", label: "자미두수 인사이트" },
    { href: "/insights/sukuyo/", label: "숙요점 인사이트" },
    { href: "/insights/tarot/", label: "타로 인사이트" },
    { href: "/insights/astrology/", label: "점성술 인사이트" },
    { href: "/insights/vedic/", label: "베다 점성술 인사이트" },
    { href: "/insights/dream/", label: "꿈해몽 인사이트" },
    { href: "/insights/compatibility/", label: "궁합 인사이트" },
    { href: "/insights/famous-saju/", label: "유명인 사주 아카이브" },
  ];

  // 비교 문서. 🔴 2026-08-20 실측: /compare/ 세 문서 전부 사이트맵에만 있고 인바운드 내부
  // 링크가 0건이었다(git grep, app·index.html·js·lib 전수) — 색인은 되지만 크롤 경로가 없었다.
  // FEATURE_GUIDES 에 섞지 않는다: 그 배열은 verify-adsense-readiness 의 featureGuideRoutes 와
  // 같은 집합이어야 하므로 항목을 더하면 그 가드가 깨진다.
  const compareDocs = [
    { href: "/compare/fortune-apps/", label: "운세 앱마다 답이 다른 이유" },
    { href: "/compare/saju-vs-ziwei/", label: "사주와 자미두수는 무엇이 다른가" },
    { href: "/compare/sukuyo-vs-vedic/", label: "숙요점과 베다 점성술은 같은 27수를 왜 다르게 읽는가" },
  ];

  return (
    <>
      <InsightsCosmicRouteClient
        initialItems={initialItems}
        initialAllItems={initialAllItems}
        initialRecommended={initialRecommended}
        initialCategories={categories}
        initialTags={tags}
        initialTotalCount={initialAllItems.length}
        initialFamousSajuItems={initialFamousSajuItems.slice(0, 6)}
      />
      {/* 인터랙티브 허브는 클라이언트 전용(ssr:false)이라 검색엔진용 정적 목차를 함께 렌더링한다. */}
      <section className="sr-only" aria-label="운세 인사이트 아카이브 목차">
        <h1>운세 인사이트 허브 — 사주·자미두수·숙요점·타로 가이드</h1>
        <p>
          사주팔자의 오행과 십성, 자미두수 12궁 명반, 숙요점 27숙, 타로 카드 해석, 서양·베다
          점성술까지 — 처음 접하는 사람도 흐름을 읽을 수 있도록 정리한 운세 지식 아카이브입니다.
          주제별 허브에서 원하는 분야의 글을 모아 볼 수 있습니다.
        </p>
        <nav aria-label="주제별 인사이트 허브">
          <ul>
            {topicHubs.map((topic) => (
              <li key={topic.href}>
                <a href={topic.href}>{topic.label}</a>
              </li>
            ))}
          </ul>
        </nav>
        <nav aria-label="체계 비교 문서">
          <ul>
            {compareDocs.map((doc) => (
              <li key={doc.href}>
                <a href={doc.href}>{doc.label}</a>
              </li>
            ))}
          </ul>
        </nav>
        {/*
          🔴 유명인 사주 134개(slug 가 `famous-saju/` 로 시작)는 이 목록에서 뺀다.
          상세는 이름·생일만 갈아 끼운 noindex 템플릿인데, 여기 있으면 색인·광고 대상인
          이 허브가 **숨긴 링크로** 134개 전부에 크롤 경로를 열어 준다. 위 sr-only 안내가
          "은닉 텍스트만 늘어난다"고 적어 둔 것과 같은 이유다. 허브 자체로 가는 길은
          바로 위 topicHubs 의 `/insights/famous-saju/` 한 줄로 남는다.
          (제거 후 이 페이지 고유 본문 6,212 → 4,600자대, MIN_UNIQUE_BODY 1,500 대비 여유.)
        */}
        <nav aria-label="전체 인사이트 글 목록">
          <ul>
            {initialAllItems
              .filter((item) => item.isPublished && item.slug && !item.slug.startsWith("famous-saju/"))
              .map((item) => (
                <li key={item.slug}>
                  <a href={`/insights/${item.slug}/`}>{item.title}</a>
                </li>
              ))}
          </ul>
        </nav>
      </section>
      {/*
        기능 가이드 12종은 사이트에서 가장 품질이 높은 자산인데(상호 공통 문장 0개)
        2026-07 실측에서 10개가 내부 링크로 도달 불가능했다. 눈에 보이는 섹션으로
        렌더링해 사용자와 크롤러 양쪽에 경로를 연다 — sr-only 목차에 넣으면
        은닉 텍스트만 늘어난다.
      */}
      <section className="mx-auto w-full max-w-6xl px-4 pb-10 md:px-6">
        <div className="cd-guide-index">
          <h2 className="cd-guide-index__title">기능 가이드</h2>
          <p className="cd-guide-index__lede">
            각 점술 체계를 어떤 근거로 계산하고 어떻게 읽는지, 그리고 무엇까지는 말할 수 없는지를
            정리한 안내입니다. 결과 화면을 보기 전에 읽어 두면 해석의 범위를 가늠하기 쉽습니다.
          </p>
          <ul className="cd-guide-index__grid">
            {FEATURE_GUIDES.map((guide) => (
              <li key={guide.href}>
                <a href={guide.href} className="cd-guide-index__link">
                  {guide.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </section>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webPage) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
    </>
  );
}
