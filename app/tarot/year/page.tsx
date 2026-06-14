import FeatureLandingPage from "../../components/FeatureLandingPage";
import { generatePageMetadata } from "../../../lib/generate-page-metadata";

const META = {
  path: "/tarot/year",
  title: "십이지신 천운 타로 - 열두 달의 수호 리듬",
  description: "열두 수호 기운과 12장의 카드를 엮어 한 해의 상승 구간, 속도 조절이 필요한 달, 월별 선택의 결을 읽습니다.",
  keywords: ["십이지신 천운", "연간 운세 타로", "12개월 타로", "월별 타로", "재물운", "연애운"],
  image: "https://code-destiny.com/fuctionassets/12animals.webp",
  featureList: ["열두 달의 수호 리듬", "상승과 속도 조절의 달", "월별 선택의 작은 의식"],
  applicationCategory: "EntertainmentApplication",
} as const;

export function generateMetadata() {
  return generatePageMetadata(META);
}

export default function TarotYearLandingPage() {
  return (
    <FeatureLandingPage
      service={{
        h1: "십이지신 천운 타로",
        description: META.description,
        ogImage: META.image,
        landingPoints: [...META.featureList],
        seoText: "실행은 메인 런처에서 진행됩니다.",
      }}
    />
  );
}
