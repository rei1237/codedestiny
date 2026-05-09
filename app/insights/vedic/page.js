import InsightTopicArchive from "../InsightTopicArchive";
import { buildSeoMetadata } from "../../../lib/seo";
import { buildBreadcrumbJsonLd, buildCollectionPageJsonLd } from "../../../lib/structured-data";

const path = "/insights/vedic";
const title = "베다점성술 인사이트 허브 · 라그나·다샤 해석 가이드 | Code Destiny";
const description = "베다점성술, 베다점, 라그나, 나크샤트라, 다샤 해석을 한국어로 정리한 베다점성술 허브입니다.";

export const metadata = buildSeoMetadata({
  path,
  title,
  description,
  keywords: ["베다점성술", "베다점", "라그나", "나크샤트라", "다샤"],
});

export default function InsightsVedicPage() {
  const collectionPage = buildCollectionPageJsonLd({ title, description, path });
  const breadcrumb = buildBreadcrumbJsonLd([
    { name: "홈", path: "/" },
    { name: "운세 인사이트", path: "/insights" },
    { name: "베다점성술 인사이트", path },
  ]);

  return (
    <>
      <InsightTopicArchive
        topic="vedic"
        title="베다점성술 인사이트 허브"
        intro="라그나, 나크샤트라, 다샤 흐름을 한국어 사용자 기준으로 이해하기 쉽게 정리한 베다점 허브입니다."
        serviceCtaPath="/vedic"
      />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionPage) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
    </>
  );
}
