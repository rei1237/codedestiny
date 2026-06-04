import InsightsCosmicClient from "./InsightsCosmicClient";
import { INSIGHT_ARTICLES } from "./articles";
import { buildSeoMetadata } from "../../lib/seo";
import { buildBreadcrumbJsonLd, buildWebPageJsonLd } from "../../lib/structured-data";
import { publishedCelebritySajuSeeds } from "../../lib/famous-saju/celebrity-saju-service";

const pageTitle = "운세 인사이트 허브 | 사주·자미두수·숙요점·타로 가이드 | Code Destiny";
const pageDescription =
  "사주, 자미두수, 숙요점, 타로, 점성술, 베다점성술을 처음 접하는 사람도 흐름을 읽을 수 있도록 정리한 운세 인사이트 아카이브입니다.";

export const metadata = buildSeoMetadata({
  path: "/insights",
  title: pageTitle,
  description: pageDescription,
  keywords: ["운세 인사이트", "사주 공부", "자미두수 보는 법", "숙요점 보는 법", "타로 해석", "점성술 가이드"],
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

export default function InsightsPage() {
  const initialFamousSajuItems = buildFamousSajuInsightItems();
  const initialAllItems = [...initialFamousSajuItems, ...INSIGHT_ARTICLES];
  const initialItems = initialAllItems.slice(0, 12);
  const initialRecommended = INSIGHT_ARTICLES.filter((article) => article.isFeatured).slice(0, 6);
  const { categories, tags } = getInsightFilters(initialAllItems);
  const webPage = buildWebPageJsonLd({
    title: pageTitle,
    description: pageDescription,
    path: "/insights",
  });
  const breadcrumb = buildBreadcrumbJsonLd([
    { name: "홈", path: "/" },
    { name: "운세 인사이트 허브", path: "/insights" },
  ]);

  return (
    <>
      <InsightsCosmicClient
        initialItems={initialItems}
        initialAllItems={initialAllItems}
        initialRecommended={initialRecommended}
        initialCategories={categories}
        initialTags={tags}
        initialTotalCount={initialAllItems.length}
        initialFamousSajuItems={initialFamousSajuItems.slice(0, 6)}
      />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webPage) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
    </>
  );
}
