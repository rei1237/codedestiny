import FeatureLandingPage from "../../components/FeatureLandingPage";
import { generatePageMetadata } from "../../../lib/generate-page-metadata";

const META = {
  path: "/tarot/love",
  title: "우리는 무슨 사이? - 6카드 연애 관계 타로",
  description: "내가 보는 상대, 상대의 시선, 관계를 막는 요인과 예상 결과까지 6카드 스프레드로 확인하세요.",
  keywords: ["연애 타로", "관계 타로", "relationship six card", "우리는 무슨 사이", "재회", "연애운"],
  image: "https://code-destiny.com/fuctionassets/tarolove.webp",
  featureList: ["6카드 연애 스프레드", "서로의 시선 확인", "관계 방향 한눈에 파악"],
  applicationCategory: "EntertainmentApplication",
} as const;

export function generateMetadata() {
  return generatePageMetadata(META);
}

export default function TarotLoveLandingPage() {
  return (
    <FeatureLandingPage
      service={{
        h1: "💕 우리는 무슨 사이?",
        description: META.description,
        ogImage: META.image,
        landingPoints: [...META.featureList],
        seoText: "실행은 메인 런처에서 진행됩니다.",
      }}
    />
  );
}
