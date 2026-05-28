import InsightArticleCosmicClient from "./InsightArticleCosmicClient";
import { buildSeoMetadata } from "../../../lib/seo";

export const dynamicParams = false;

export function generateStaticParams() {
  return [
    { slug: "ziwei-basics" },
    { slug: "sukuyo-basics" },
    { slug: "saju-free-guide" },
    { slug: "tarot-spread-design-principles" },
  ];
}

export function generateMetadata({ params }) {
  const slug = String(params?.slug || "");
  return buildSeoMetadata({
    path: `/insights/${encodeURIComponent(slug)}`,
    title: "운세 인사이트 | Code Destiny",
    description: "Code Destiny 운세 인사이트 상세 페이지입니다.",
    keywords: ["운세 인사이트", "사주", "자미두수", "숙요점", "타로"],
    ogType: "article",
  });
}

export default function InsightArticlePage({ params }) {
  const slug = String(params?.slug || "");
  const item = {
    slug,
    title: "운세 인사이트",
    excerpt: "운세 해석과 활용 팁을 확인해 보세요.",
  };

  return (
    <InsightArticleCosmicClient
      slug={slug}
      initialItem={item}
      initialRelated={[]}
      initialPrevious={null}
      initialNext={null}
    />
  );
}
