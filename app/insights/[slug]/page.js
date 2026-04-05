import dynamic from "next/dynamic";
import { notFound } from "next/navigation";
import { INSIGHT_ARTICLES, INSIGHT_TOPICS, getArticleBySlug, getTopicKey } from "../articles";
import { mergeKeywords, SEO_CORE_KEYWORDS, toAbsoluteUrl } from "../../../lib/seo-metadata";
import { ArticleJsonLd, BreadcrumbJsonLd, FaqJsonLd } from "../../components/SeoJsonLd";

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

  const canonicalUrl = toAbsoluteUrl(`/insights/${article.slug}`);

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
    keywords: mergeKeywords(article.keywords, SEO_CORE_KEYWORDS),
    alternates: {
      canonical: canonicalUrl,
      languages: postLang !== 'ko'
        ? {
            [postLang]: canonicalUrl,
            'x-default': 'https://code-destiny.com/insights',
          }
        : undefined,
    },
    openGraph: {
      type: 'article',
      locale: ogLocale,
      title: article.title,
      description: article.description ?? article.sections?.[0]?.body,
      url: canonicalUrl,
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
  const canonicalUrl = toAbsoluteUrl(`/insights/${article.slug}`);

  const sajuFaqItems = [
    {
      question: "올해 운세는 어떤가요?",
      answer:
        "올해 운세는 사주 원국과 대운·세운의 상호작용으로 해석합니다. Code: Destiny는 월별 흐름과 실천 포인트를 함께 제시해 현실적인 판단에 도움을 줍니다.",
    },
    {
      question: "사주 풀이 결과는 얼마나 자주 확인하면 좋나요?",
      answer:
        "핵심 흐름은 분기 또는 월 단위로 점검하는 것이 좋습니다. 같은 질문을 짧은 간격으로 반복하기보다, 변화한 상황을 반영해 재해석하는 방식이 정확도를 높입니다.",
    },
  ];

  return (
    <>
      <BreadcrumbJsonLd items={[
        { name: "홈", url: "https://code-destiny.com/" },
        { name: "인사이트", url: "https://code-destiny.com/insights" },
        { name: article.title, url: canonicalUrl },
      ]} />
      <ArticleJsonLd
        url={canonicalUrl}
        title={article.title}
        description={article.description}
        datePublished={article.publishedAt ?? article.updatedAt}
        dateModified={article.updatedAt}
        image={article.coverImage}
        keywords={mergeKeywords(article.keywords, SEO_CORE_KEYWORDS)}
        articleSection={article.category}
        inLanguage="ko-KR"
      />
      {topicKey === "saju" ? <FaqJsonLd faqs={sajuFaqItems} /> : null}
      <InsightArticleCosmicClient article={article} topic={topic} relatedArticles={relatedArticles} />
    </>
  );
}
