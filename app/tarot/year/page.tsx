import FeatureLandingPage from "../../components/FeatureLandingPage";

const SERVICE = {
  h1: "십이지신 천운(天運)",
  description:
    "12개월 월별 흐름을 타로로 점검하는 연간 운세 리딩입니다. 올해의 상승 구간과 주의 구간을 한 번에 확인하세요.",
  ogImage: "https://code-destiny.com/fuctionassets/12shin.webp",
  landingPoints: ["12개월 연간 운세", "상승/주의 구간 분석", "월별 행동 포인트 제안"],
  seoText:
    "십이지신 천운 타로는 12개월 운세를 월별로 분석해 중요한 타이밍과 실전 행동 포인트를 안내하는 연간 타로 서비스입니다.",
};

export const metadata = {
  title: "십이지신 천운(天運) - 12개월 연간 운세 타로 | Code Destiny",
  description:
    "12개월 연간 운세를 타로로 확인하는 십이지신 천운 리딩 서비스.",
};

export default function TarotYearLandingPage() {
  return <FeatureLandingPage service={SERVICE} />;
}
