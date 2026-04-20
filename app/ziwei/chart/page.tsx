import { generatePageMetadata } from "../../../lib/generate-page-metadata";
import { ZIWEI_CHART_METHOD_COPY } from "../../_content/seo-copy";
import ZiweiChartClientLoader from "./ZiweiChartClientLoader";

export function generateMetadata() {
  return generatePageMetadata({
    path: "/ziwei/chart",
    title: "자미두수 운세 분석 심화 16챕터 | Code Destiny",
    description:
      "자미두수(紫微斗數) 기반 16챕터 심화 분석으로 12궁·명궁·신궁과 대한 흐름까지 깊이 있게 해석하는 자미두수 운세 분석 리포트입니다.",
    keywords: ["자미두수 운세 분석", "자미두수", "명궁", "12궁", "대한"],
  });
}

export default function ZiweiChartPage() {
  return (
    <main style={{ background: "#040510", color: "#e2e8f0", minHeight: "100vh" }}>
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
        </div>
      </section>
    </main>
  );
}
