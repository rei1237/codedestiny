import { generatePageMetadata } from "../../../lib/generate-page-metadata";
import { ZIWEI_CHART_METHOD_COPY } from "../../_content/seo-copy";
import ZiweiChartClientLoader from "./ZiweiChartClientLoader";

export function generateMetadata() {
  return generatePageMetadata({
    path: "/ziwei/chart",
    title: "자미두수 명반 무료 분석 · 12궁 심화 16챕터 | Code Destiny",
    description:
      "자미두수(紫微斗數) 명반을 기반으로 12궁·명궁·신궁·사화·대한 흐름을 16챕터로 정밀 해석하는 무료 자미두수 심화 분석 리포트입니다.",
    keywords: [
      "자미두수",
      "자미두수 명반",
      "자미두수 무료",
      "12궁",
      "명궁",
      "신궁",
      "사화",
      "대한",
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

      <section
        aria-labelledby="ziweiTheoryHeading"
        style={{
          maxWidth: "980px",
          margin: "0 auto",
          padding: "14px 16px 64px",
        }}
      >
        <div
          style={{
            border: "1px solid rgba(148,163,184,0.32)",
            borderRadius: "16px",
            background: "linear-gradient(145deg, rgba(15,23,42,0.9), rgba(30,41,59,0.85))",
            boxShadow: "0 14px 30px rgba(2, 6, 23, 0.42)",
            padding: "18px 16px",
          }}
        >
          <h1 id="ziweiTheoryHeading" style={{ margin: "0 0 8px", fontSize: "1.08rem", fontWeight: 800, lineHeight: 1.45 }}>
            {ZIWEI_CHART_METHOD_COPY.heading}
          </h1>
          <p style={{ margin: "0 0 10px", color: "#cbd5e1", fontSize: "0.92rem", lineHeight: 1.9, wordBreak: "keep-all" }}>
            {ZIWEI_CHART_METHOD_COPY.paragraphs[0]}
          </p>
          <p style={{ margin: 0, color: "#cbd5e1", fontSize: "0.92rem", lineHeight: 1.9, wordBreak: "keep-all" }}>
            {ZIWEI_CHART_METHOD_COPY.paragraphs[1]}
          </p>

          <div
            style={{
              marginTop: "14px",
              borderTop: "1px solid rgba(148,163,184,0.26)",
              paddingTop: "12px",
            }}
          >
            <h2 style={{ margin: "0 0 8px", color: "#f8fafc", fontSize: "0.95rem", fontWeight: 700 }}>
              관련 운세 분석 바로가기
            </h2>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px 12px" }}>
              <a href="/saju/basic" style={{ color: "#c4b5fd", textDecoration: "none", fontSize: "0.86rem" }}>사주 만세력 기본 해석</a>
              <a href="/astrology/cosmic" style={{ color: "#c4b5fd", textDecoration: "none", fontSize: "0.86rem" }}>점성술 코즈믹 차트</a>
              <a href="/insights" style={{ color: "#c4b5fd", textDecoration: "none", fontSize: "0.86rem" }}>운세 인사이트 아카이브</a>
              <a href="/methodology" style={{ color: "#c4b5fd", textDecoration: "none", fontSize: "0.86rem" }}>콘텐츠 방법론</a>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
