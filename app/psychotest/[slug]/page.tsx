import PsychotestExperience from "@/src/features/psychotest/PsychotestExperience";
import { notFound } from "next/navigation";
import { buildFortuneJsonLd, generatePageMetadata } from "../../../lib/generate-page-metadata";
import {
  PSYCHOTESTS,
  getPsychotestBySlug,
} from "../../../lib/psychotest-catalog";

type PageProps = {
  params: Promise<{ slug: string }>;
};

const PSYCHOTEST_DETAIL_METADATA_COPY = {
  ko: {
    fallbackTitle: "심리테스트",
    titleSuffix: "심리테스트",
    descriptionSuffix(minutes: number) {
      return `평균 ${minutes}분 내외로 가볍게 확인하고, 결과 해석 포인트까지 정리해 보세요.`;
    },
    freeKeyword: "심리테스트",
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
    titleSuffix: "Psychological Test",
    descriptionSuffix(minutes: number) {
      return `Check it lightly in about ${minutes} minutes and review the key points in your result.`;
    },
    freeKeyword: "psychological test",
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
    titleSuffix: "心理テスト",
    descriptionSuffix(minutes: number) {
      return `平均${minutes}分ほどで気軽に確認し、結果の解釈ポイントまで整理できます。`;
    },
    freeKeyword: "心理テスト",
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
    titleSuffix: "心理测试",
    descriptionSuffix(minutes: number) {
      return `约 ${minutes} 分钟即可轻松确认，并整理结果解读要点。`;
    },
    freeKeyword: "心理测试",
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

export async function generateMetadata({ params }: PageProps) {
  const test = getPsychotestBySlug((await params).slug);
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
    isAccessibleForFree: true,
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

export default async function PsychotestDetailPage({ params }: PageProps) {
  const test = getPsychotestBySlug((await params).slug);
  if (!test) notFound();


  const meta = {
    path: `/psychotest/${test.slug}`,
    title: `${test.title} | ${test.category} 심리테스트`,
    description: `${test.summary}. 평균 ${test.estimatedMinutes}분 내외로 가볍게 확인하고, 결과 해석 포인트까지 정리해 보세요.`,
    keywords: [...test.keywords, "심리테스트", `${test.category} 테스트`, test.title],
    featureList: [
      `평균 소요 ${test.estimatedMinutes}분`,
      `${test.focusPoints.join(" · ")}`,
      "관련 테스트 내부 링크 제공",
    ],
    applicationCategory: "LifestyleApplication",
    isAccessibleForFree: true,
  } as const;

  const baseGraph = JSON.parse(buildFortuneJsonLd(meta));
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
    ],
  });

  return <><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} /><PsychotestExperience testId={test.id} /></>;
}
