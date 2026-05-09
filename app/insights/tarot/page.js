import InsightTopicArchive from "../InsightTopicArchive";
import { buildSeoMetadata } from "../../../lib/seo";
import { buildBreadcrumbJsonLd, buildCollectionPageJsonLd } from "../../../lib/structured-data";

const path = "/insights/tarot";
const title = "타로 인사이트 허브 · 무료 타로 질문법과 해석 가이드 | Code Destiny";
const description = "무료 타로, 연애 타로, 재회운 타로, 상대방 속마음 타로 질문 설계와 해석법을 모은 타로 허브입니다.";

export const metadata = buildSeoMetadata({
  path,
  title,
  description,
  keywords: ["무료 타로", "연애 타로", "재회운 타로", "타로 해석", "상대방 속마음 타로"],
});

export default function InsightsTarotPage() {
  const collectionPage = buildCollectionPageJsonLd({ title, description, path });
  const breadcrumb = buildBreadcrumbJsonLd([
    { name: "홈", path: "/" },
    { name: "운세 인사이트", path: "/insights" },
    { name: "타로 인사이트", path },
  ]);

  return (
    <>
      <InsightTopicArchive
        topic="tarot"
        title="타로 인사이트 허브"
        intro="카드 의미 암기보다 질문 설계와 행동 제안에 집중한 타로 실전 해석 아카이브입니다."
        serviceCtaPath="/tarot"
      />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionPage) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
    </>
  );
}
