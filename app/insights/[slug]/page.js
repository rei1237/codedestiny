import {
  INSIGHT_SEED_ARTICLES,
  getInsightSeedBySlug,
  getInsightSeedPrevNext,
  getInsightSeedRelated,
} from "../seed-articles";
import InsightArticleCosmicClient from "./InsightArticleCosmicClient";
import { buildSeoMetadata } from "../../../lib/seo";

export const dynamicParams = false;

export function generateStaticParams() {
  return INSIGHT_SEED_ARTICLES.map((article) => ({ slug: article.slug }));
}

export function generateMetadata({ params }) {
  const slug = String(params?.slug || "");
  const article = getInsightSeedBySlug(slug);

  if (!article) {
    return buildSeoMetadata({
      path: `/insights/${encodeURIComponent(slug)}`,
      title: "운세 인사이트 | Code Destiny",
      description: "Code Destiny 운세 인사이트 상세 페이지입니다.",
      keywords: ["운세 인사이트", "사주", "자미두수", "숙요점", "타로"],
      ogType: "article",
    });
  }

  const path = `/insights/${article.slug}`;

  return buildSeoMetadata({
    path,
    title: article.title,
    description: article.description,
    keywords: Array.isArray(article.tags) ? article.tags : [],
    ogImage: article.ogImage,
    ogType: "article",
    publishedTime: article.publishedAt,
    modifiedTime: article.updatedAt,
  });
}

export default function InsightArticlePage({ params }) {
  const slug = String(params?.slug || "");
  const item = getInsightSeedBySlug(slug);
  const related = getInsightSeedRelated(slug, 6);
  const { previous, next } = getInsightSeedPrevNext(slug);

  return (
    <InsightArticleCosmicClient
      slug={slug}
      initialItem={item}
      initialRelated={related}
      initialPrevious={previous}
      initialNext={next}
    />
  );
}
