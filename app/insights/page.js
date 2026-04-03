import dynamic from "next/dynamic";
import { generatePageMetadata } from "../../lib/generate-page-metadata";

const InsightsCosmicClient = dynamic(() => import("./InsightsCosmicClient"), {
  loading: () => (
    <div className="flex min-h-[32vh] items-center justify-center text-sm text-slate-400">
      인사이트 허브를 불러오는 중…
    </div>
  ),
});

const _META = {
  path: "/insights",
  title: "운세 인사이트 아카이브 — 사주·타로·자미두수 핵심 원리 무료 학습 | Code Destiny",
  description: "사주명리학·타로·자미두수·숙요점·베다점성술의 핵심 원리를 무료로 읽는 운세 지식 아카이브. 입문부터 실전까지 13편 이상의 깊이 있는 해설을 지금 바로 확인하세요.",
  keywords: ["사주 基礎", "타로 해석", "자미두수", "숙요점", "베다 점성술", "명리학 아카이브"],
};

export const dynamic = "force-static";

export function generateMetadata() {
  return generatePageMetadata(_META);
}

export default function InsightsIndexPage() {
  const insightsHubJsonLd = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": "https://code-destiny.com/insights#webpage",
    url: "https://code-destiny.com/insights",
    name: "운세 인사이트 허브 — 사주·타로·자미두수 지식 아카이브 | Code Destiny",
    description: "사주명리학·타로·자미두수·숙요점·베다점성술의 핵심 원리를 읽는 운세 지식 아카이브.",
    inLanguage: "ko",
    isPartOf: {
      "@id": "https://code-destiny.com/#website",
    },
  });

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: insightsHubJsonLd }} />
      <InsightsCosmicClient />
    </>
  );
}

