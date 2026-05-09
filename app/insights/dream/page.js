import InsightTopicArchive from "../InsightTopicArchive";
import { buildSeoMetadata } from "../../../lib/seo";
import { buildBreadcrumbJsonLd, buildCollectionPageJsonLd } from "../../../lib/structured-data";

const path = "/insights/dream";
const title = "꿈해몽 인사이트 허브 · 꿈 상징 해석 가이드 | Code Destiny";
const description = "꿈해몽, 무료 꿈해몽, 꿈 상징 해석, 꿈 기록법을 정리한 꿈해몽 인사이트 허브입니다.";

export const metadata = buildSeoMetadata({
  path,
  title,
  description,
  keywords: ["꿈해몽", "무료 꿈해몽", "꿈 상징", "꿈 해석"],
});

export default function InsightsDreamPage() {
  const collectionPage = buildCollectionPageJsonLd({ title, description, path });
  const breadcrumb = buildBreadcrumbJsonLd([
    { name: "홈", path: "/" },
    { name: "운세 인사이트", path: "/insights" },
    { name: "꿈해몽 인사이트", path },
  ]);

  return (
    <>
      <InsightTopicArchive
        topic="dream"
        title="꿈해몽 인사이트 허브"
        intro="꿈 상징을 자기이해와 일상 루틴으로 연결하는 꿈해몽 실전 가이드를 제공합니다."
        serviceCtaPath="/dream"
      />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionPage) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
    </>
  );
}
