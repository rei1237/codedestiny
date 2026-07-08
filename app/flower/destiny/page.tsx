import FeatureLandingPage from "../../components/FeatureLandingPage";
import { generatePageMetadata } from "../../../lib/generate-page-metadata";

const META = {
  path: "/flower/destiny",
  title: "운명의 꽃 - 통합 아틀리에 | Code Destiny",
  description:
    "사주의 오행과 십성, 점성술의 행성 배치, 자미두수의 명궁, 숙요점의 27수 — 네 학문이 각각 짚어낸 기운을 소스 탭으로 넘겨 보며, 나만의 운명 꽃 한 송이로 모읍니다.",
  keywords: ["운명의 꽃", "사주 꽃", "점성술 꽃", "자미두수 꽃", "숙요 꽃", "destiny flower"],
  image: "https://code-destiny.com/fuctionassets/flower.webp",
} as const;

export function generateMetadata() {
  return generatePageMetadata(META);
}

const SERVICE = {
  h1: "운명의 꽃 아틀리에",
  description: META.description,
  ogImage: META.image,
  landingPoints: ["4개 운세 소스 탭 전환", "소스별 꽃·키워드·해석 패널", "프롬프트/저장/공유 도구"],
  seoText:
    "운명의 꽃 아틀리에는 사주·점성술·자미두수·숙요점, 네 가지 오래된 셈법이 읽어낸 기운을 하나의 꽃과 팔레트로 엮어 보여줍니다.",
  localized: {
    en: {
      title: "Flower of Destiny - Integrated Atelier",
      h1: "Flower of Destiny Atelier",
      description:
        "Open Saju, astrology, Zi Wei Dou Shu, and Sukuyo in source tabs, then watch your flower of destiny and palette bloom.",
      landingPoints: ["Switch four fortune-source tabs", "Flowers, keywords, and panels by source", "Prompt, save, and share tools"],
      seoText:
        "Flower of Destiny Atelier blossoms four fortune energies into flowers, palettes, and interpretation panels.",
    },
  },
};

export default function FlowerDestinyLandingPage() {
  return <FeatureLandingPage service={SERVICE} />;
}
