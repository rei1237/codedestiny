import InsightsCosmicClient from "./InsightsCosmicClient";
import { buildSeoMetadata } from "../../lib/seo";
import { buildBreadcrumbJsonLd, buildWebPageJsonLd } from "../../lib/structured-data";

const INSIGHT_SUMMARY_ITEMS = [
  { slug: "ziwei-basics", title: "자미두수 입문 가이드", category: "자미두수", excerpt: "명반을 읽는 기본 순서를 확인해 보세요.", isFeatured: true },
  { slug: "sukuyo-basics", title: "숙요점 관계 해석", category: "숙요점", excerpt: "갈등 패턴과 회복 타이밍을 읽는 법을 정리합니다.", isFeatured: true },
  { slug: "saju-free-guide", title: "무료 사주풀이 보는 법", category: "사주", excerpt: "초보자용 해석 순서를 짧게 정리했습니다.", isFeatured: true },
  { slug: "tarot-spread-design-principles", title: "타로 스프레드 설계", category: "타로", excerpt: "질문을 잘 만드는 법과 카드 배열을 연결합니다.", isFeatured: false },
];

function getInsightSeedFilters() {
  return {
    categories: ["사주", "자미두수", "숙요점", "타로", "점성술", "베다점성술"],
    tags: ["사주", "운세", "궁합", "타로", "점성술", "자미두수"],
  };
}

export const metadata = buildSeoMetadata({
  path: "/insights",
  title: "운세 인사이트 허브 · 사주·자미두수·숙요점·타로 가이드 | Code Destiny",
  description:
    "사주, 자미두수, 숙요점, 타로, 점성술을 처음 공부하는 분도 흐름을 잡을 수 있도록 실제 사례와 함께 풀어쓴 운세 인사이트 허브입니다.",
  keywords: ["운세 인사이트", "사주 공부", "자미두수 보는 법", "숙요점 보는 법", "타로 해석", "점성술 가이드"],
});

export default function InsightsPage() {
  const initialItems = INSIGHT_SUMMARY_ITEMS.slice(0, 36);
  const initialRecommended = INSIGHT_SUMMARY_ITEMS.filter((article) => article.isFeatured).slice(0, 6);
  const { categories, tags } = getInsightSeedFilters();
  const webPage = buildWebPageJsonLd({
    title: "운세 인사이트 허브 · 사주·자미두수·숙요점·타로 가이드 | Code Destiny",
    description:
      "사주, 자미두수, 숙요점, 타로, 점성술을 처음 공부하는 분도 흐름을 잡을 수 있도록 실제 사례와 함께 풀어쓴 운세 인사이트 허브입니다.",
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
        initialTotalCount={INSIGHT_SUMMARY_ITEMS.length}
      />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webPage) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
    </>
  );
}
