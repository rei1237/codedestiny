import InsightTopicArchive from "../InsightTopicArchive";
import { buildSeoMetadata } from "../../../lib/seo";
import { buildBreadcrumbJsonLd, buildCollectionPageJsonLd } from "../../../lib/structured-data";

const path = "/insights/astrology";
const title = "점성술 인사이트 허브 · 출생차트·상승궁 해석 가이드 | Code Destiny";
const description = "점성술 차트, 태양궁·달궁·상승궁, 하우스 해석을 초보자 친화적으로 정리한 점성술 허브입니다.";

export const metadata = buildSeoMetadata({
  path,
  title,
  description,
  keywords: ["점성술 차트", "출생 차트", "상승궁", "달궁", "태양궁", "하우스 해석"],
});

export default function InsightsAstrologyPage() {
  const collectionPage = buildCollectionPageJsonLd({ title, description, path });
  const breadcrumb = buildBreadcrumbJsonLd([
    { name: "홈", path: "/" },
    { name: "운세 인사이트", path: "/insights" },
    { name: "점성술 인사이트", path },
  ]);

  return (
    <>
      <InsightTopicArchive
        topic="astrology"
        title="점성술 인사이트 허브"
        intro="출생차트 구조와 별자리 해석을 실제 생활 계획으로 연결하는 점성술 실전 가이드 모음입니다."
        serviceCtaPath="/astrology"
      />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionPage) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
    </>
  );
}
