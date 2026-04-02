import FeatureLandingPage from "../../components/FeatureLandingPage";

const SERVICE = {
  h1: "사주 만세력 기본 해석",
  description:
    "생년월일시 기반 사주 명식으로 오행 균형과 십성 흐름을 분석하는 Code Destiny의 사주 서비스입니다.",
  ogImage: "https://code-destiny.com/fuctionassets/saju.webp",
  landingPoints: ["사주팔자 명식 생성", "오행 균형 분석", "십성 흐름 해석"],
  seoText:
    "사주 서비스는 년월일시와 출생지 정보를 바탕으로 오행 균형, 십성 관계, 해석 포인트를 제공하는 개인 맞춤 운세 분석 기능입니다.",
};

export const metadata = {
  title: "사주 만세력 기본 해석 - 오행·십성·명식 분석 | Code Destiny",
  description:
    "생년월일시 기반 사주 명식으로 오행 균형과 십성 흐름을 분석하는 사주 서비스.",
};

export default function SajuBasicLandingPage() {
  return <FeatureLandingPage service={SERVICE} />;
}
