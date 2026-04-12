import { notFound } from "next/navigation";
import { INSIGHT_ARTICLES, INSIGHT_TOPICS, getArticleBySlug, getTopicKey } from "../articles";
import { mergeKeywords, SEO_CORE_KEYWORDS, toAbsoluteUrl } from "../../../lib/seo-metadata";
import { ArticleJsonLd, BreadcrumbJsonLd, FaqJsonLd } from "../../components/SeoJsonLd";
import InsightArticleCosmicClient from "./InsightArticleCosmicClient";

export const dynamicParams = false;

function toMetaDescription(value) {
  const base = String(value || "").replace(/\s+/g, " ").trim();
  if (!base) return "CODE DESTINY 인사이트에서 사주, 타로, 점성술 해석을 실전 중심으로 제공합니다.";
  return base.length > 155 ? `${base.slice(0, 152)}...` : base;
}

function buildFaqItems(article, topicKey) {
  const articleFaqs = Array.isArray(article?.faqItems) ? article.faqItems : [];
  const normalizedArticleFaqs = articleFaqs
    .map((item) => ({
      question: String(item?.question || "").trim(),
      answer: String(item?.answer || "").trim(),
    }))
    .filter((item) => item.question && item.answer)
    .slice(0, 5);

  if (normalizedArticleFaqs.length > 0) return normalizedArticleFaqs;

  if (topicKey === "tarot") {
    return [
      {
        question: "타로 리딩은 얼마나 자주 보는 것이 좋나요?",
        answer:
          "동일 질문을 짧은 간격으로 반복하기보다, 상황 변화가 생겼을 때 재리딩하는 방식이 해석의 선명도를 높입니다.",
      },
      {
        question: "부정 카드가 나오면 결과가 확정된 건가요?",
        answer:
          "부정 카드는 경고 신호에 가깝습니다. 행동 수정 포인트를 찾으면 흐름을 충분히 바꿀 수 있습니다.",
      },
      {
        question: "타로 결과를 실생활에 어떻게 적용하나요?",
        answer:
          "카드 메시지를 한 번에 크게 바꾸기보다, 오늘 실행 가능한 1~2개 행동 계획으로 옮기면 체감 효과가 높습니다.",
      },
    ];
  }

  if (topicKey === "astrology") {
    return [
      {
        question: "점성술 해석은 무엇을 기준으로 보나요?",
        answer:
          "행성, 하우스, 주요 각도를 함께 보며 현재의 기회와 리스크를 균형 있게 해석합니다.",
      },
      {
        question: "출생시간이 부정확하면 해석이 달라지나요?",
        answer:
          "출생시간 오차는 하우스 해석에 영향을 줄 수 있습니다. 가능하면 정확한 시간을 확인해 적용하는 것이 좋습니다.",
      },
      {
        question: "점성술 결과를 의사결정에 써도 되나요?",
        answer:
          "결과는 참고 프레임으로 활용하고, 재무·법률·의료 결정은 반드시 전문 자문과 병행하는 것이 안전합니다.",
      },
    ];
  }

  return [
    {
      question: "이 인사이트는 어떤 방식으로 작성되나요?",
      answer:
        "전통 해석 체계와 편집 가이드를 함께 적용해 핵심 흐름, 실전 포인트, 주의 신호를 구조적으로 정리합니다.",
    },
    {
      question: "결과는 얼마나 자주 확인하면 좋나요?",
      answer:
        "분기 또는 월 단위 점검을 권장합니다. 같은 질문 반복보다 상황 변화 이후 재해석이 더 유의미합니다.",
    },
    {
      question: "운세 결과를 맹신해도 되나요?",
      answer:
        "해석은 자기성찰과 참고 목적이며, 중요한 결정은 각 분야 전문가 검토를 우선해야 합니다.",
    },
  ];
}

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
  const authorName = String(article?.author?.name || "꽃돼지 연이");
  const metaDescription = toMetaDescription(article.description ?? article.sections?.[0]?.body);

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
    title: `${article.title} - ${article.category} 인사이트 | CODE DESTINY`,
    description: metaDescription,
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
      description: metaDescription,
      url: canonicalUrl,
      publishedTime: article.publishedAt ?? article.updatedAt,
      modifiedTime: article.updatedAt,
      authors: [authorName],
      images: article.coverImage
        ? [{ url: article.coverImage, width: 1200, height: 630 }]
        : [],
    },
    twitter: {
      card: 'summary_large_image',
      title: article.title,
      description: metaDescription,
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
  ).slice(0, 5);
  const canonicalUrl = toAbsoluteUrl(`/insights/${article.slug}`);
  const faqItems = buildFaqItems(article, topicKey);

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
        description={toMetaDescription(article.description)}
        datePublished={article.publishedAt ?? article.updatedAt}
        dateModified={article.updatedAt}
        image={article.coverImage}
        keywords={mergeKeywords(article.keywords, SEO_CORE_KEYWORDS)}
        articleSection={article.category}
        inLanguage={article.lang === "ko" ? "ko-KR" : article.lang || "ko-KR"}
      />
      <FaqJsonLd faqs={faqItems} />
      <InsightArticleCosmicClient article={article} topic={topic} relatedArticles={relatedArticles} faqItems={faqItems} />
    </>
  );
}
