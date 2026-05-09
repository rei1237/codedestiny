import InsightsCosmicClient from "./InsightsCosmicClient";
import { getInsightSeedFilters, INSIGHT_SEED_ARTICLES } from "./seed-articles";
import { buildSeoMetadata } from "../../lib/seo";
import { buildBreadcrumbJsonLd, buildWebPageJsonLd } from "../../lib/structured-data";

export const metadata = buildSeoMetadata({
  path: "/insights",
  title: "운세 인사이트 허브 · 사주·자미두수·숙요점·타로 가이드 | Code Destiny",
  description:
    "사주 공부, 자미두수 보는 법, 숙요점 보는 법, 타로 해석, 점성술 가이드를 실제 서비스와 연결한 운세 인사이트 허브입니다.",
  keywords: ["운세 인사이트", "사주 공부", "자미두수 보는 법", "숙요점 보는 법", "타로 해석", "점성술 가이드"],
});

export default function InsightsPage() {
  const initialItems = INSIGHT_SEED_ARTICLES.slice(0, 36);
  const initialRecommended = INSIGHT_SEED_ARTICLES.filter((article) => article.isFeatured).slice(0, 6);
  const { categories, tags } = getInsightSeedFilters();
  const webPage = buildWebPageJsonLd({
    title: "운세 인사이트 허브 · 사주·자미두수·숙요점·타로 가이드 | Code Destiny",
    description:
      "사주 공부, 자미두수 보는 법, 숙요점 보는 법, 타로 해석, 점성술 가이드를 실제 서비스와 연결한 운세 인사이트 허브입니다.",
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
        initialRecommended={initialRecommended}
        initialCategories={categories}
        initialTags={tags}
        initialTotalCount={INSIGHT_SEED_ARTICLES.length}
      />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webPage) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
    </>
  );
}
