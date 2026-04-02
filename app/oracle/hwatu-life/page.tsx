import FeatureLandingPage from "../../components/FeatureLandingPage";

const SERVICE = {
  h1: "화투 인생 패 테스트",
  description:
    "돈·사랑·위기 상황에서의 선택 패턴을 통해 나를 상징하는 화투 인생 패 아키타입을 찾아주는 심리테스트입니다.",
  ogImage: "https://code-destiny.com/fuctionassets/tazza.webp",
  landingPoints: ["7문항 심리테스트", "화투 인생 패 아키타입 파악", "조건별 선택 패턴 분석"],
  seoText:
    "7문항 심리테스트로 삼광·고도리·청단·똑광 아키타입을 찾아드립니다.",
};

export const metadata = {
  title: "화투 인생 패 테스트 | Code Destiny",
  description:
    "7문항 선택으로 나를 상징하는 화투 인생 패 아키타입을 찾아주는 무료 테스트.",
};

export default function HwatuLifeLandingPage() {
  return <FeatureLandingPage service={SERVICE} />;
}
