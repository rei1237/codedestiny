import InsightTopicArchive from "../InsightTopicArchive";
import { buildSeoMetadata } from "../../../lib/seo";
import { buildBreadcrumbJsonLd, buildCollectionPageJsonLd } from "../../../lib/structured-data";

const path = "/insights/saju";
const title = "사주 인사이트 허브 · 사주팔자와 만세력 해석 가이드 | Code Destiny";
const description = "사주 공부, 사주풀이, 만세력 보는 법, 오행·십성 해석을 깊이 있게 정리한 사주 인사이트 아카이브입니다.";

export const metadata = buildSeoMetadata({
  path,
  title,
  description,
  keywords: ["사주 공부", "사주풀이", "만세력 보는 법", "오행", "십성"],
});

export default function InsightsSajuPage() {
  const collectionPage = buildCollectionPageJsonLd({ title, description, path });
  const breadcrumb = buildBreadcrumbJsonLd([
    { name: "홈", path: "/" },
    { name: "운세 인사이트", path: "/insights" },
    { name: "사주 인사이트", path },
  ]);

  return (
    <>
      <InsightTopicArchive
        topic="saju"
        title="사주 인사이트 허브"
        intro="사주팔자, 만세력, 일간, 십성, 대운 해석을 단계별로 정리한 사주 전용 아카이브입니다."
        serviceCtaPath="/saju"
      />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionPage) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
    </>
  );
}
