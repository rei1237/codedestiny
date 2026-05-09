import InsightTopicArchive from "../InsightTopicArchive";
import { buildSeoMetadata } from "../../../lib/seo";
import { buildBreadcrumbJsonLd, buildCollectionPageJsonLd } from "../../../lib/structured-data";

const path = "/insights/ziwei";
const title = "자미두수 인사이트 허브 · 명반·12궁 해석 가이드 | Code Destiny";
const description = "자미두수, 자미두수 명반, 자미두수 12궁, 명궁·재백궁·관록궁 해석을 집중 정리한 자미두수 전용 허브입니다.";

export const metadata = buildSeoMetadata({
  path,
  title,
  description,
  keywords: ["자미두수", "자미두수 명반", "자미두수 12궁", "명궁", "자미두수 보는 법"],
});

export default function InsightsZiweiPage() {
  const collectionPage = buildCollectionPageJsonLd({ title, description, path });
  const breadcrumb = buildBreadcrumbJsonLd([
    { name: "홈", path: "/" },
    { name: "운세 인사이트", path: "/insights" },
    { name: "자미두수 인사이트", path },
  ]);

  return (
    <>
      <InsightTopicArchive
        topic="ziwei"
        title="자미두수 인사이트 허브"
        intro="자미두수 명반, 12궁, 사화, 궁합 해석을 실제 명반 읽기 순서에 맞춰 제공하는 자미두수 SEO 허브입니다."
        serviceCtaPath="/ziwei"
      />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionPage) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
    </>
  );
}
