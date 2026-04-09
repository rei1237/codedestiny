import ZiweiChartClientLoader from "./ZiweiChartClientLoader";

export const metadata = {
  title: "H 프리미엄 자미두수 인생 총론 | Code Destiny",
  description:
    "자미두수(紫微斗數) 기반 13챕터 심층 분석 — 12궁 완전 풀이, 상하관계 처세술, 마스터플랜 카드. AI 기반 프리미엄 운세 리포트.",
  alternates: {
    canonical: "https://code-destiny.com/ziwei/chart",
  },
};

export default function ZiweiChartPage() {
  return <ZiweiChartClientLoader />;
}
