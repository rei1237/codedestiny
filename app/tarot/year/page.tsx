import FeatureLandingPage from "../../components/FeatureLandingPage";
import { generatePageMetadata } from "../../../lib/generate-page-metadata";

const META = {
  path: "/tarot/year",
  title: "십이지신 천운(天運) - 12개월 연간 운세 타로 | Code Destiny",
  description: "12개월 연간 운세를 타로로 확인하는 십이지신 천운 리딩 서비스.",
  keywords: ["십이지신 천운", "연간 운세 타로", "12개월 타로", "월별 타로", "재물운", "연애운"],
  image: "https://code-destiny.com/fuctionassets/12shin.webp",
  featureList: ["12개월 연간 운세", "상승/주의 구간 분석", "월별 행동 포인트 제안"],
  applicationCategory: "EntertainmentApplication",
} as const;

export function generateMetadata() {
  return generatePageMetadata(META);
}

export default function TarotYearLandingPage() {
  return (
    <FeatureLandingPage
      service={{
        h1: "십이지신 천운(天運)",
        description: META.description,
        ogImage: META.image,
        landingPoints: [...META.featureList],
        seoText: "실행은 /static 서비스 화면에서만 진행됩니다.",
      }}
    />
  );
}
