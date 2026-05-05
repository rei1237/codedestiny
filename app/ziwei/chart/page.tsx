import { generatePageMetadata } from "../../../lib/generate-page-metadata";
import ZiweiChartClientLoader from "./ZiweiChartClientLoader";

export function generateMetadata() {
  return generatePageMetadata({
    path: "/ziwei/chart",
    title: "자미두수 명반 심화 · 12궁 인터랙티브 14섹션 | Code Destiny",
    description:
      "자미두수(紫微斗數) 명반을 기반으로 12궁·명궁·신궁·사화·대한 흐름을 로컬 계산과 템플릿으로 생성하는 인터랙티브 심화 리포트입니다.",
    keywords: [
      "자미두수",
      "자미두수 명반",
      "자미두수 무료",
      "12궁",
      "명궁",
      "신궁",
      "사화",
      "대한",
      "자미두수 심화",
      "12궁 심층 분석",
      "ziwei chart",
      "zi wei dou shu",
    ],
  });
}

const ZIWEI_FAQ_JSON_LD = JSON.stringify({
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "자미두수 명반은 무엇을 보나요?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "명궁·신궁을 기준으로 12궁에 배치된 주성과 사화, 대한 흐름을 함께 읽어 성향·관계·진로·재물의 작동 방식을 해석합니다.",
      },
    },
    {
      "@type": "Question",
      name: "사주와 자미두수는 어떻게 다른가요?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "사주는 오행 균형과 간지 관계를 중심으로 기질을 읽고, 자미두수는 12궁 공간 배치와 시간축 흐름으로 영역별 변화를 읽는 데 강점이 있습니다.",
      },
    },
  ],
});

export default function ZiweiChartPage() {
  return (
    <main style={{ background: "#040510", color: "#e2e8f0", minHeight: "100vh" }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ZIWEI_FAQ_JSON_LD }} />
      <ZiweiChartClientLoader />
    </main>
  );
}
