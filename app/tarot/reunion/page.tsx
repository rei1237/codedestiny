import FeatureLandingPage from "../../components/FeatureLandingPage";

const SERVICE = {
  h1: "재회운 타로 - 5카드 등대 스프레드",
  description:
    "관계의 재접점 가능성과 감정 흐름을 읽는 재회운 타로. 지금의 거리감과 다음 신호를 점검해 보세요.",
  ogImage: "https://code-destiny.com/fuctionassets/reunion.webp",
  landingPoints: ["재회운 중심 리딩", "감정 흐름 점검", "실행 가능한 조언 제공"],
  seoText:
    "재회운 타로는 관계 신호와 타이밍 포인트를 카드 흐름으로 해석해 현재의 거리감과 다음 행동 지점을 안내합니다.",
};

export const metadata = {
  title: "재회운 타로 - 감정 흐름 리딩 | Code Destiny",
  description:
    "재회 가능성과 관계 회복 흐름을 타로 카드로 점검하고 실전 조언을 확인하세요.",
};

export default function TarotReunionLandingPage() {
  return <FeatureLandingPage service={SERVICE} />;
}
