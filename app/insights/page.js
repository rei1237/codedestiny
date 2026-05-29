import InsightsCosmicClient from "./InsightsCosmicClient";
import { buildSeoMetadata } from "../../lib/seo";
import { buildBreadcrumbJsonLd, buildWebPageJsonLd } from "../../lib/structured-data";

function getInsightSeedFilters() {
  return {
    categories: ["사주", "자미두수", "숙요점", "타로", "점성술", "베다점", "궁합", "오늘의 운세", "신년운세", "룬", "오미쿠지"],
    tags: ["사주", "자미두수", "명궁", "숙요점", "궁합", "타로", "점성술", "재물운"],
  };
}

const INITIAL_FALLBACK_ITEMS = [
  { slug: "ziwei-basics", title: "자미두수 입문 가이드", category: "자미두수", excerpt: "명궁과 궁위를 중심으로, 내 삶의 문이 어디에서 열리는지 읽어봅니다.", tags: ["자미두수", "명궁", "궁위"], isFeatured: true },
  { slug: "sukuyo-basics", title: "숙요점 관계 해석", category: "숙요점", excerpt: "안괴와 영친의 리듬을 통해 관계의 거리감과 회복 타이밍을 짚어봅니다.", tags: ["숙요점", "영친", "궁합"], isFeatured: true },
  { slug: "saju-free-guide", title: "사주 흐름 읽기", category: "사주", excerpt: "일간과 월지에서 시작해 돈, 일, 마음의 반복 신호를 현실 언어로 풀어냅니다.", tags: ["사주", "일간", "재물운"], isFeatured: true },
  { slug: "tarot-spread-design-principles", title: "타로 질문 설계", category: "타로", excerpt: "카드 의미 암기보다 질문의 방향을 세워, 지금 필요한 답에 닿는 순서를 알려드립니다.", tags: ["타로", "스프레드", "질문"], isFeatured: true },
];

export const metadata = buildSeoMetadata({
  path: "/insights",
  title: "운세 인사이트 허브 · 사주·자미두수·숙요점·타로 가이드 | Code Destiny",
  description:
    "사주, 자미두수, 숙요점, 타로, 점성술을 처음 공부하는 분도 흐름을 잡을 수 있도록 실제 사례와 함께 풀어쓴 운세 인사이트 허브입니다.",
  keywords: ["운세 인사이트", "사주 공부", "자미두수 보는 법", "숙요점 보는 법", "타로 해석", "점성술 가이드"],
});

export default function InsightsPage() {
  const initialItems = INITIAL_FALLBACK_ITEMS;
  const initialAllItems = INITIAL_FALLBACK_ITEMS;
  const initialRecommended = INITIAL_FALLBACK_ITEMS.filter((article) => article.isFeatured).slice(0, 6);
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
        initialAllItems={initialAllItems}
        initialRecommended={initialRecommended}
        initialCategories={categories}
        initialTags={tags}
        initialTotalCount={INITIAL_FALLBACK_ITEMS.length}
      />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webPage) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
    </>
  );
}
