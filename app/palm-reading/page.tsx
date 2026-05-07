import PalmDestinyMain from "./PalmDestinyMain";
import { generatePageMetadata } from "../../lib/generate-page-metadata";

const META = {
  path: "/palm-reading",
  title: "손금 지도 - Palm Destiny | Code Destiny",
  description:
    "손바닥 이미지 기반으로 사랑, 재물, 직업, 마음 흐름을 상징적으로 읽어보는 손금 지도 기본 화면입니다.",
  keywords: ["손금", "손금 지도", "Palm Destiny", "손바닥 운세", "손금 리딩"],
  image: "https://code-destiny.com/fuctionassets/ai%20animal.webp",
  featureList: ["손바닥 업로드 준비", "실시간 촬영 준비", "손금 결과 화면 준비"],
  applicationCategory: "LifestyleApplication",
} as const;

export function generateMetadata() {
  return generatePageMetadata(META);
}

export default function PalmReadingPage() {
  return <PalmDestinyMain />;
}
