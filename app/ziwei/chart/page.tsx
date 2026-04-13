import ZiweiChartClientLoader from "./ZiweiChartClientLoader";

export const metadata = {
  title: "자미두수 심화 16챕터 | Code Destiny",
  description:
    "자미두수(紫微斗數) 기반 16챕터 심화 분석 — 12궁 완전 풀이, 명궁/신궁 해석, 대한·소한 전략까지 담은 자미두수 심화 리포트.",
  alternates: {
    canonical: "https://code-destiny.com/ziwei/chart",
  },
};

export default function ZiweiChartPage() {
  return <ZiweiChartClientLoader />;
}
