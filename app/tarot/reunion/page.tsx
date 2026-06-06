import FeatureLandingPage from "../../components/FeatureLandingPage";
import { generatePageMetadata } from "../../../lib/generate-page-metadata";

const META = {
  path: "/tarot/reunion",
  title: "재회운 등대 타로 - 다시 닿아도 안전한 거리 | Code Destiny",
  description: "남은 마음과 현실 조건을 5장의 카드로 비추고, 다시 닿아도 무너지지 않을 거리와 첫 문장을 정리합니다.",
  keywords: ["재회운 타로", "reunion tarot", "5카드 타로", "등대 스프레드", "연애 재회", "관계 회복"],
  image: "https://code-destiny.com/fuctionassets/reunion.webp",
  featureList: ["남은 마음의 온도", "연락을 막는 현실 파도", "다시 닿는 첫 문장"],
  applicationCategory: "EntertainmentApplication",
} as const;

export function generateMetadata() {
  return generatePageMetadata(META);
}

export default function TarotReunionLandingPage() {
  return (
    <FeatureLandingPage
      service={{
        h1: "🌊 재회운 등대 타로",
        description: META.description,
        ogImage: META.image,
        landingPoints: [...META.featureList],
        seoText: "실행은 메인 런처에서 진행됩니다.",
      }}
    />
  );
}
