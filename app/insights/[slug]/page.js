import InsightArticleCosmicClient from "./InsightArticleCosmicClient";
import { INSIGHT_ARTICLES } from "../articles";

export const dynamicParams = false;

export function generateStaticParams() {
  return INSIGHT_ARTICLES.map((article) => ({ slug: article.slug }));
}

export const metadata = {
  title: "인사이트 상세 | CODE DESTINY",
  description: "운세 인사이트 상세 글",
};

export default function InsightArticlePage({ params }) {
  const slug = String(params?.slug || "");
  return <InsightArticleCosmicClient slug={slug} />;
}
