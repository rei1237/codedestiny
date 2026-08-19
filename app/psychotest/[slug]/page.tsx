import Link from "next/link";
import { notFound } from "next/navigation";
import { buildFortuneJsonLd, generatePageMetadata } from "../../../lib/generate-page-metadata";
import {
  PSYCHOTESTS,
  buildPsychotestExternalUrl,
  getPsychotestBySlug,
} from "../../../lib/psychotest-catalog";
import ContentIntegrityNote from "../../components/ContentIntegrityNote";
import DeferredShareWidget from "../../components/DeferredShareWidget";
import DestinyBiasPromoSection from "../_components/DestinyBiasPromoSection";

type PageProps = {
  params: {
    slug: string;
  };
};

const PSYCHOTEST_DETAIL_METADATA_COPY = {
  ko: {
    fallbackTitle: "심리테스트",
    titleSuffix: "무료 심리테스트",
    descriptionSuffix(minutes: number) {
      return `평균 ${minutes}분 내외로 가볍게 확인하고, 결과 해석 포인트까지 정리해 보세요.`;
    },
    freeKeyword: "무료 심리테스트",
    categoryKeyword(category: string) {
      return `${category} 테스트`;
    },
    durationFeature(minutes: number) {
      return `평균 소요 ${minutes}분`;
    },
    relatedLinksFeature: "관련 테스트 내부 링크 제공",
  },
  en: {
    fallbackTitle: "Psychological Test",
    titleSuffix: "Free Psychological Test",
    descriptionSuffix(minutes: number) {
      return `Check it lightly in about ${minutes} minutes and review the key points in your result.`;
    },
    freeKeyword: "free psychological test",
    categoryKeyword(category: string) {
      return `${category} test`;
    },
    durationFeature(minutes: number) {
      return `Average time: ${minutes} minutes`;
    },
    relatedLinksFeature: "Related internal test links",
  },
  ja: {
    fallbackTitle: "心理テスト",
    titleSuffix: "無料心理テスト",
    descriptionSuffix(minutes: number) {
      return `平均${minutes}分ほどで気軽に確認し、結果の解釈ポイントまで整理できます。`;
    },
    freeKeyword: "無料心理テスト",
    categoryKeyword(category: string) {
      return `${category}テスト`;
    },
    durationFeature(minutes: number) {
      return `平均所要時間 ${minutes}分`;
    },
    relatedLinksFeature: "関連テストの内部リンク",
  },
  zh: {
    fallbackTitle: "心理测试",
    titleSuffix: "免费心理测试",
    descriptionSuffix(minutes: number) {
      return `约 ${minutes} 分钟即可轻松确认，并整理结果解读要点。`;
    },
    freeKeyword: "免费心理测试",
    categoryKeyword(category: string) {
      return `${category}测试`;
    },
    durationFeature(minutes: number) {
      return `平均用时 ${minutes} 分钟`;
    },
    relatedLinksFeature: "相关测试内部链接",
  },
};

export function generateStaticParams() {
  return PSYCHOTESTS.map((item) => ({ slug: item.slug }));
}

export function generateMetadata({ params }: PageProps) {
  const test = getPsychotestBySlug(params.slug);
  if (!test) {
    return {
      title: PSYCHOTEST_DETAIL_METADATA_COPY.ko.fallbackTitle,
      robots: { index: false, follow: false },
    };
  }

  const copy = PSYCHOTEST_DETAIL_METADATA_COPY.ko;
  const metadata = generatePageMetadata({
    path: `/psychotest/${test.slug}`,
    title: `${test.title} | ${test.category} ${copy.titleSuffix}`,
    description: `${test.summary}. ${copy.descriptionSuffix(test.estimatedMinutes)}`,
    keywords: [...test.keywords, copy.freeKeyword, copy.categoryKeyword(test.category), test.title],
    featureList: [
      copy.durationFeature(test.estimatedMinutes),
      `${test.focusPoints.join(" · ")}`,
      copy.relatedLinksFeature,
    ],
    applicationCategory: "LifestyleApplication",
  });

  // 상세 14개는 서로 텍스트의 81.5% 를 공유하는 템플릿 산출물이다(2026-07 실측 —
  // 인사이트 아티클 47.5%, 27수 도감 23.0% 와 비교). 게이트 임계 여유도 200자뿐이다.
  // 테스트 기능·링크는 그대로 두고 색인만 막는다. 허브 /psychotest(3,502자)는 유지.
  return {
    ...metadata,
    robots: {
      index: false,
      follow: true,
      googleBot: { index: false, follow: true },
    },
  };
}

function pickRelatedTests(slug: string, category: string) {
  const sameCategory = PSYCHOTESTS.filter((item) => item.slug !== slug && item.category === category);
  if (sameCategory.length >= 3) return sameCategory.slice(0, 3);

  const fallback = PSYCHOTESTS.filter(
    (item) => item.slug !== slug && !sameCategory.some((picked) => picked.slug === item.slug),
  );
  return [...sameCategory, ...fallback].slice(0, 3);
}

export default function PsychotestDetailPage({ params }: PageProps) {
  const test = getPsychotestBySlug(params.slug);
  if (!test) notFound();

  const externalUrl = buildPsychotestExternalUrl(test.id);
  const related = pickRelatedTests(test.slug, test.category);

  const meta = {
    path: `/psychotest/${test.slug}`,
    title: `${test.title} | ${test.category} 무료 심리테스트`,
    description: `${test.summary}. 평균 ${test.estimatedMinutes}분 내외로 가볍게 확인하고, 결과 해석 포인트까지 정리해 보세요.`,
    keywords: [...test.keywords, "무료 심리테스트", `${test.category} 테스트`, test.title],
    featureList: [
      `평균 소요 ${test.estimatedMinutes}분`,
      `${test.focusPoints.join(" · ")}`,
      "관련 테스트 내부 링크 제공",
    ],
    applicationCategory: "LifestyleApplication",
  } as const;

  const baseGraph = JSON.parse(buildFortuneJsonLd(meta));
  const faqEntities = [
    {
      "@type": "Question",
      name: `${test.title}는 얼마나 걸리나요?`,
      acceptedAnswer: {
        "@type": "Answer",
        text: `평균 ${test.estimatedMinutes}분 내외로 완료할 수 있습니다. 문항을 빠르게 고르면 더 짧게 끝낼 수 있습니다.`,
      },
    },
    {
      "@type": "Question",
      name: `${test.title} 결과는 진단으로 볼 수 있나요?`,
      acceptedAnswer: {
        "@type": "Answer",
        text: "결과는 자기이해를 돕는 참고용입니다. 임상적 진단이 필요하면 전문가 상담을 함께 권장합니다.",
      },
    },
    {
      "@type": "Question",
      name: `이 테스트와 함께 보면 좋은 주제는 무엇인가요?`,
      acceptedAnswer: {
        "@type": "Answer",
        text: `${test.focusPoints.join(", ")} 관점으로 결과를 다시 읽으면 이해가 더 깊어집니다.`,
      },
    },
  ];
  const jsonLd = JSON.stringify({
    "@context": "https://schema.org",
    "@graph": [
      ...(Array.isArray(baseGraph?.["@graph"]) ? baseGraph["@graph"] : []),
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "심리테스트 허브",
            item: "https://code-destiny.com/psychotest",
          },
          {
            "@type": "ListItem",
            position: 2,
            name: test.title,
            item: `https://code-destiny.com/psychotest/${test.slug}`,
          },
        ],
      },
      {
        "@type": "FAQPage",
        mainEntity: faqEntities,
      },
    ],
  });

  return (
    <main className="mx-auto max-w-4xl px-4 py-10 md:px-6 md:py-14">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />

      <Link
        href="/psychotest"
        className="inline-flex items-center rounded-full border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
      >
        ← 심리테스트 허브로 이동
      </Link>

      <header className="mt-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_10px_30px_rgba(15,23,42,0.06)] md:p-8">
        <p className="mb-2 text-xs font-semibold tracking-[0.12em] text-violet-500">{test.category} PSYCHO TEST</p>
        <h1 className="text-2xl font-black leading-tight text-slate-900 md:text-3xl">{test.title}</h1>
        <p className="mt-3 text-sm leading-7 text-slate-700 md:text-base">{test.summary}</p>

        <div className="mt-5 flex flex-wrap gap-2">
          {test.keywords.slice(0, 5).map((keyword) => (
            <span
              key={keyword}
              className="rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700"
            >
              {keyword}
            </span>
          ))}
        </div>

        <a
          href={externalUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-6 inline-flex items-center justify-center rounded-xl bg-slate-900 px-5 py-3 text-sm font-bold text-white hover:opacity-90"
        >
          테스트 시작하기
        </a>
      </header>

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-bold text-slate-900">이 테스트에서 보는 핵심 포인트</h2>
        <ul className="mt-3 grid gap-2 text-sm leading-7 text-slate-700">
          {test.focusPoints.map((point) => (
            <li key={point} className="rounded-lg bg-slate-50 px-3 py-2">
              {point}
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-bold text-slate-900">연관 심리테스트</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {related.map((item) => (
            <Link
              key={item.slug}
              href={`/psychotest/${item.slug}`}
              className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm font-semibold text-slate-700 hover:bg-slate-100"
            >
              {item.title}
            </Link>
          ))}
        </div>
      </section>

      {/* 카탈로그 항목을 같은 틀에 대입해 만든 페이지다. 한 건씩 검토하지 않으므로
          그렇게 주장하지 않는다(그래서 이 라우트는 noindex 다). */}
      <ContentIntegrityNote contentSource="template" tone="light" />

      <DeferredShareWidget
        title={test.title}
        description={test.summary}
        path={`/psychotest/${test.slug}`}
        contentType="software"
        contentId={test.slug}
      />

      <DestinyBiasPromoSection />
    </main>
  );
}
