import FeatureLandingPage from "../../components/FeatureLandingPage";
import { withUniqueRouteMetadata } from "../../../lib/generate-page-metadata";

const SERVICE = {
  h1: "사주 만세력 기본 해석",
  description:
    "사주 명식의 네 기둥, 오행 균형, 십성의 의미를 초보자도 이해할 수 있도록 단계별로 설명하고 현재 선택에 참고할 해석 포인트와 주의점을 정리합니다.",
  ogImage: "/fuctionassets/saju.webp",
  landingPoints: ["사주 명식 구조 확인", "오행 균형 분석", "십성 흐름 해석"],
  seoText:
    "사주 기본 해석은 생년월일과 시간을 바탕으로 명식을 확인하고, 오행과 십성이 현재의 선택과 관계 흐름에 어떤 신호를 주는지 정리합니다.",
  valueGuideTitle: "사주 기본 해석을 읽는 순서",
  valueSections: [
    {
      title: "1. 명식의 네 기둥을 먼저 확인합니다",
      body:
        "연월일시의 천간과 지지를 나누어 보고, 일간을 중심으로 다른 기둥이 어떤 역할을 하는지 차례로 살펴봅니다.",
    },
    {
      title: "2. 오행 균형을 단순한 많고 적음으로 보지 않습니다",
      body:
        "오행은 개수만이 아니라 계절, 위치, 관계에 따라 힘이 달라집니다. 강한 요소와 약한 요소가 실제 생활에서 어떻게 드러나는지 함께 읽어야 합니다.",
    },
    {
      title: "3. 십성은 성격표가 아니라 역할 언어입니다",
      body:
        "비견, 식상, 재성, 관성, 인성은 사람을 단정하는 말이 아니라 일, 관계, 학습, 책임을 처리하는 방식을 설명하는 언어입니다.",
    },
  ],
};

export const metadata = withUniqueRouteMetadata("/saju/basic", {
  title: "사주 만세력 기본 해석 | 오행·십성·명식 분석",
  description:
    "사주 명식의 네 기둥, 오행 균형, 십성의 의미를 초보자도 이해할 수 있도록 단계별로 설명하고 현재 선택에 참고할 해석 포인트와 주의점을 정리합니다.",
});

export default function SajuBasicLandingPage() {
  return <FeatureLandingPage service={SERVICE} />;
}
