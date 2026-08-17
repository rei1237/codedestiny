import FeatureLandingPage from "../../components/FeatureLandingPage";
import { generatePageMetadata } from "../../../lib/generate-page-metadata";

const META = {
  path: "/flower/jamidusu",
  title: "자미두수 운명의 꽃 | Code Destiny",
  description:
    "명궁에 자리한 주성과 그 밝기, 삼방사정으로 이어지는 궁위의 기운이 겹치며 자미두수의 꽃과 테마가 한 장의 명반처럼 피어납니다.",
  keywords: ["자미두수 꽃", "紫微 꽃", "명궁 꽃", "ziwei flower"],
  image: "https://code-destiny.com/fuctionassets/flower3.webp",
  // 색인 제외 사유와 "왜 siteSeo 목록이 아니라 페이지 단위인가"는 app/flower/destiny/page.tsx 참고.
  noindex: true,
} as const;

export function generateMetadata() {
  return generatePageMetadata(META);
}

const SERVICE = {
  h1: "자미두수 운명의 꽃",
  description: META.description,
  ogImage: META.image,
  landingPoints: ["명궁/주성 기반 꽃 산출", "밝기 강도 반영 테마", "자미두수 해석 패널"],
  seoText:
    "자미두수 운명의 꽃에서는 명궁의 주성과 사화의 흐름이 꽃 팔레트와 해석으로 번집니다.",
  localized: {
    en: {
      title: "Zi Wei Flower of Destiny",
      h1: "Zi Wei Flower of Destiny",
      description:
        "The life palace, main star, and brightness energy overlap, blooming into a Zi Wei flower and theme like a destiny garden.",
      landingPoints: ["Flower from life palace and main star", "Theme reflecting brightness intensity", "Zi Wei interpretation panel"],
      seoText:
        "Zi Wei Flower of Destiny spreads life-palace clues and main-star light into a flower palette and interpretation.",
    },
  },
};

export default function FlowerJamidusuLandingPage() {
  return <FeatureLandingPage service={SERVICE} />;
}
