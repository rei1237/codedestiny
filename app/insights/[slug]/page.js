import dynamic from "next/dynamic";
import { notFound } from "next/navigation";
import { INSIGHT_ARTICLES, INSIGHT_TOPICS, getArticleBySlug, getTopicKey } from "../articles";

const InsightArticleCosmicClient = dynamic(() => import("./InsightArticleCosmicClient"), {
  loading: () => (
    <div className="flex min-h-[40vh] items-center justify-center text-sm text-slate-400">
      글을 불러오는 중…
    </div>
  ),
});

export function generateStaticParams() {
  return INSIGHT_ARTICLES.map((article) => ({ slug: article.slug }));
}

export function generateMetadata({ params }) {
  const article = getArticleBySlug(params?.slug);
  if (!article) {
    return {
      title: "인사이트 글을 찾을 수 없습니다 | CODE DESTINY",
      robots: { index: false, follow: false },
    };
  }

  return {
    title: `${article.title} | CODE DESTINY`,
    description: article.description,
    alternates: {
      canonical: `/insights/${article.slug}`,
    },
  };
}

export default function InsightArticlePage({ params }) {
  const article = getArticleBySlug(params?.slug);
  if (!article) notFound();
  const topicKey = getTopicKey(article);
  const topic = INSIGHT_TOPICS.find((item) => item.key === topicKey);
  const relatedArticles = INSIGHT_ARTICLES.filter(
    (candidate) => candidate.slug !== article.slug && getTopicKey(candidate) === topicKey,
  ).slice(0, 3);

  const jsonLd = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.description,
    dateModified: article.updatedAt,
    datePublished: article.updatedAt,
    author: { "@type": "Organization", name: "CODE DESTINY" },
    publisher: { "@type": "Organization", name: "CODE DESTINY" },
    inLanguage: "ko",
    mainEntityOfPage: `https://code-destiny.com/insights/${article.slug}`,
  });

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />
      <InsightArticleCosmicClient article={article} topic={topic} relatedArticles={relatedArticles} />
    </>
  );
}
