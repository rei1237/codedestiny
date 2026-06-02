import InsightsCosmicClient from "./InsightsCosmicClient";
import { INSIGHT_ARTICLES } from "./articles";
import { buildSeoMetadata } from "../../lib/seo";
import { buildBreadcrumbJsonLd, buildWebPageJsonLd } from "../../lib/structured-data";

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

export default function InsightsPage() {
  const initialAllItems = INSIGHT_ARTICLES;
  const initialItems = initialAllItems.slice(0, 12);
  const initialRecommended = initialAllItems.filter((article) => article.isFeatured).slice(0, 6);
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
      />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webPage) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
    </>
  );
}
