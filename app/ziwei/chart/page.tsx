import FeatureLandingPage from "../../components/FeatureLandingPage";

const SERVICE = {
  h1: "자미두수 12궁 명반 분석",
  description:
    "자미두수(紫微斗數) 기반으로 명궁과 주요 성군, 12궁 배치를 해석하는 운명 지도 서비스입니다.",
  ogImage: "https://code-destiny.com/fuctionassets/jami.webp",
  landingPoints: ["12궁 명반 구조 도식", "주요 성군 조합 해석", "성향·관계·진로 흐름 파악"],
  seoText:
    "자미두수 서비스는 생년월일시를 기반으로 12궁 명반 구조를 해석하고 성향, 관계, 진로 등 핵심 흐름을 제공합니다.",
};

export const metadata = {
  title: "자미두수 12궁 명반 분석 - Ziwei Doushu | Code Destiny",
  description:
    "자미두수(紫微斗數) 기반으로 명궁과 주요 성군, 12궁 배치를 해석하는 운명 지도 서비스.",
};

export default function ZiweiChartLandingPage() {
  return <FeatureLandingPage service={SERVICE} />;
}
