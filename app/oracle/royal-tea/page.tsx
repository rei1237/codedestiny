import FeatureLandingPage from "../../components/FeatureLandingPage";
import { withUniqueRouteMetadata } from "../../../lib/generate-page-metadata";

const SERVICE = {
  h1: "타세오그래피 찻잎 점",
  description:
    "런던 로열 컵 문양을 기반으로 상징을 해석하는 영국 홍차 찻잎 점 오라클 리딩 서비스. 찻잎이 남긴 패턴으로 현재의 흐름과 미래 메시지를 읽어보세요.",
  ogImage: "/fuctionassets/london.webp",
  landingPoints: ["런던 로열 컵 문양 리딩", "영국 홍차 전통 점술", "상징 기반 오라클 메시지"],
  seoText:
    "타세오그래피는 타 컵 내에 남은 찻잎 패턴으로 미래를 읽는 유럽 전통 점술입니다. 런던 로열 컵 버전으로 즐겨보세요.",
};

export const metadata = withUniqueRouteMetadata("/oracle/royal-tea", {
  title: "타세오그래피 찻잎 점 - 런던 로열 컵 문양 리딩",
  description:
    "런던 로열 컵 문양을 기반으로 찻잎 패턴의 상징을 해석하는 영국 전통 홍차 점 오라클.",
});

export default function RoyalTeaLandingPage() {
  return <FeatureLandingPage service={SERVICE} />;
}
