import { INSIGHT_SEED_ARTICLES, getInsightSeedBySlug } from "../seed-articles";
import InsightArticleCosmicClient from "./InsightArticleCosmicClient";

export const dynamicParams = false;

export function generateStaticParams() {
  return INSIGHT_SEED_ARTICLES.map((article) => ({ slug: article.slug }));
}

export function generateMetadata({ params }) {
  const slug = String(params?.slug || "");
  const article = getInsightSeedBySlug(slug);

  if (!article) {
    return {
      title: "운세 인사이트 | Code Destiny",
      description: "Code Destiny 운세 인사이트 상세 페이지입니다.",
      alternates: {
        canonical: `/insights/${encodeURIComponent(slug)}`,
      },
      robots: {
        index: true,
        follow: true,
      },
    };
  }

  const path = `/insights/${article.slug}`;

  return {
    title: article.title,
    description: article.description,
    alternates: {
      canonical: path,
    },
    openGraph: {
      type: "article",
      title: article.title,
      description: article.description,
      url: `https://code-destiny.com${path}`,
    },
    twitter: {
      card: "summary_large_image",
      title: article.title,
      description: article.description,
    },
  };
}

export default function InsightArticlePage({ params }) {
  const slug = String(params?.slug || "");
  return <InsightArticleCosmicClient slug={slug} />;
}
