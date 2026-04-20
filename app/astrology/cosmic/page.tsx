import FeatureLandingPage from "../../components/FeatureLandingPage";
import { withUniqueRouteMetadata } from "../../../lib/generate-page-metadata";

const SERVICE = {
  h1: "점성술 코즈믹 차트",
  description:
    "서양 점성술의 태양궁, 달궁, 상승궁을 중심으로 성향과 관계 패턴을 읽는 코즈믹 차트 서비스입니다.",
  ogImage: "https://code-destiny.com/fuctionassets/jumsung.webp",
  landingPoints: ["태양궁·달궁·상승궁 해석", "코즈믹 스타일 차트", "관계 패턴 파악"],
  seoText:
    "점성술 코즈믹 차트는 출생 정보를 기반으로 태양, 달, 상승궁을 해석해 성향과 감정 패턴, 표현 방식을 이해하도록 돕습니다.",
};

export const metadata = withUniqueRouteMetadata("/astrology/cosmic", {
  title: "점성술 코즈믹 차트 - 태양·달·상승궁 분석 | Code Destiny",
  description:
    "서양 점성술의 태양궁, 달궁, 상승궁을 중심으로 성향과 관계 패턴을 읽는 코즈믹 차트 서비스.",
});

export default function AstroCosmicLandingPage() {
  return <FeatureLandingPage service={SERVICE} />;
}
