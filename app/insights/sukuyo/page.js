import InsightTopicArchive from "../InsightTopicArchive";
import { buildSeoMetadata } from "../../../lib/seo";
import { buildBreadcrumbJsonLd, buildCollectionPageJsonLd } from "../../../lib/structured-data";

const path = "/insights/sukuyo";
const title = "숙요점 인사이트 허브 · 27숙·궁합 해석 가이드 | Code Destiny";
const description = "숙요점, 숙요점 궁합, 27숙, 본명숙, 영친관계·업태관계·안괴관계를 집중 해설한 숙요점 전용 허브입니다.";

export const metadata = buildSeoMetadata({
  path,
  title,
  description,
  keywords: ["숙요점", "숙요점 궁합", "27숙", "본명숙", "영친관계", "업태관계", "안괴관계"],
});

export default function InsightsSukuyoPage() {
  const collectionPage = buildCollectionPageJsonLd({ title, description, path });
  const breadcrumb = buildBreadcrumbJsonLd([
    { name: "홈", path: "/" },
    { name: "운세 인사이트", path: "/insights" },
    { name: "숙요점 인사이트", path },
  ]);

  return (
    <>
      <InsightTopicArchive
        topic="sukuyo"
        title="숙요점 인사이트 허브"
        intro="숙요점 27숙 관계 분석, 숙요 궁합, 본명숙과 월명숙 해석을 실전 사례 중심으로 제공하는 숙요점 허브입니다."
        serviceCtaPath="/sukuyo"
      />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionPage) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
    </>
  );
}
