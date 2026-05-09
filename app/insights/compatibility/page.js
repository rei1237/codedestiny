import InsightTopicArchive from "../InsightTopicArchive";
import { buildSeoMetadata } from "../../../lib/seo";
import { buildBreadcrumbJsonLd, buildCollectionPageJsonLd } from "../../../lib/structured-data";

const path = "/insights/compatibility";
const title = "궁합 인사이트 허브 · 사주·숙요점·자미두수 관계 가이드 | Code Destiny";
const description = "사주 궁합, 숙요점 궁합, 자미두수 궁합을 비교하고 관계 운영법을 정리한 궁합 인사이트 허브입니다.";

export const metadata = buildSeoMetadata({
  path,
  title,
  description,
  keywords: ["궁합", "사주 궁합", "숙요점 궁합", "자미두수 궁합", "연애운"],
});

export default function InsightsCompatibilityPage() {
  const collectionPage = buildCollectionPageJsonLd({ title, description, path });
  const breadcrumb = buildBreadcrumbJsonLd([
    { name: "홈", path: "/" },
    { name: "운세 인사이트", path: "/insights" },
    { name: "궁합 인사이트", path },
  ]);

  return (
    <>
      <InsightTopicArchive
        topic="compatibility"
        title="궁합 인사이트 허브"
        intro="사주·숙요점·자미두수 관점으로 관계 패턴을 비교하고 실제 소통 규칙을 정리한 궁합 가이드 허브입니다."
        serviceCtaPath="/compatibility"
      />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionPage) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
    </>
  );
}
