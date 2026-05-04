import FeatureLandingPage from "../../components/FeatureLandingPage";
import { generatePageMetadata } from "../../../lib/generate-page-metadata";

const META = {
  path: "/tarot/reunion",
  title: "재회운 타로 - 5카드 등대 스프레드 | Code Destiny",
  description: "재회 가능성과 관계 회복 흐름을 타로 카드로 점검하고 실전 조언을 확인하세요.",
  keywords: ["재회운 타로", "reunion tarot", "5카드 타로", "등대 스프레드", "연애 재회", "관계 회복"],
  image: "https://code-destiny.com/fuctionassets/reunion.webp",
  featureList: ["재회운 중심 리딩", "감정 흐름 점검", "실행 가능한 조언 제공"],
  applicationCategory: "EntertainmentApplication",
} as const;

export function generateMetadata() {
  return generatePageMetadata(META);
}

export default function TarotReunionLandingPage() {
  return (
    <FeatureLandingPage
      service={{
        h1: "🌊 재회운 타로",
        description: META.description,
        ogImage: META.image,
        landingPoints: [...META.featureList],
        seoText: "실행은 /static 서비스 화면에서만 진행됩니다.",
      }}
    />
  );
}
