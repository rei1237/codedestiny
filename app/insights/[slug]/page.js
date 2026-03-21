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

  // 포스트 언어 → OG locale 코드 변환 맵
  const OG_LOCALE_MAP = {
    ko: 'ko_KR', en: 'en_US', ja: 'ja_JP',
    'zh-Hans': 'zh_CN', hi: 'hi_IN',
    es: 'es_ES', fr: 'fr_FR', de: 'de_DE',
    nl: 'nl_NL', ms: 'ms_MY',
  };
  const postLang = article.lang ?? 'ko';
  const ogLocale = OG_LOCALE_MAP[postLang] ?? 'ko_KR';

  return {
    title: `${article.title} | CODE DESTINY`,
    description: article.description ?? article.sections?.[0]?.body,
    keywords: article.keywords,
    alternates: {
      canonical: `https://code-destiny.com/insights/${article.slug}`,
      languages: postLang !== 'ko'
        ? {
            [postLang]: `https://code-destiny.com/insights/${article.slug}`,
            'x-default': 'https://code-destiny.com/insights',
          }
        : undefined,
    },
    openGraph: {
      type: 'article',
      locale: ogLocale,
      title: article.title,
      description: article.description ?? article.sections?.[0]?.body,
      url: `https://code-destiny.com/insights/${article.slug}`,
      publishedTime: article.publishedAt ?? article.updatedAt,
      modifiedTime: article.updatedAt,
      authors: ['https://code-destiny.com/about'],
      images: article.coverImage
        ? [{ url: article.coverImage, width: 1200, height: 630 }]
        : [],
    },
    twitter: {
      card: 'summary_large_image',
      title: article.title,
      description: article.description ?? article.sections?.[0]?.body,
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
  const articleRichJsonLd = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.description,
    url: `https://code-destiny.com/insights/${article.slug}`,
    author: {
      "@type": "Person",
      name: "연이",
      url: "https://code-destiny.com/about",
      jobTitle: "명리학 연구자 & Code Destiny 운영자",
    },
    publisher: {
      "@type": "Organization",
      name: "Code Destiny",
      "@id": "https://code-destiny.com/#organization",
    },
    datePublished: article.updatedAt,
    dateModified: article.updatedAt,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `https://code-destiny.com/insights/${article.slug}`,
    },
    inLanguage: "ko",
    articleSection: article.category,
  });

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: articleRichJsonLd }} />
      <InsightArticleCosmicClient article={article} topic={topic} relatedArticles={relatedArticles} />
    </>
  );
}
