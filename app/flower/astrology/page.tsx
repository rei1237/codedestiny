import FeatureLandingPage from "../../components/FeatureLandingPage";
import { generatePageMetadata } from "../../../lib/generate-page-metadata";

const META = {
  path: "/flower/astrology",
  title: "점성술 운명의 꽃 | Code Destiny",
  description:
    "태양 별자리가 그려내는 본래 기질 위로, 상승궁의 첫인상과 달 별자리의 감정 결이 함께 포개지며 나만의 점성술 꽃이 성운처럼 피어납니다.",
  keywords: ["점성술 운명의 꽃", "네온 성운", "natal flower", "astrology flower"],
  image: "https://code-destiny.com/fuctionassets/flower2.webp",
  // 색인 제외 사유와 "왜 siteSeo 목록이 아니라 페이지 단위인가"는 app/flower/destiny/page.tsx 참고.
  noindex: true,
} as const;

export function generateMetadata() {
  return generatePageMetadata(META);
}

const SERVICE = {
  h1: "점성술 운명의 꽃",
  description: META.description,
  ogImage: META.image,
  landingPoints: ["태양 별자리 중심 꽃 매핑", "상승궁·달 별자리 보조 시그널", "성운 테마 시각화/공유"],
  seoText:
    "점성술 운명의 꽃은 태양 별자리를 중심에 두고, 상승궁과 달 별자리의 분위기를 성운처럼 겹쳐 보여줍니다.",
  localized: {
    en: {
      title: "Astrology Flower of Destiny",
      h1: "Astrology Flower of Destiny",
      description:
        "The core energy of your sun sign is joined by ascendant and moon-sign signals, letting your astrology flower bloom like a nebula.",
      landingPoints: ["Sun-sign flower mapping", "Ascendant and moon support signals", "Nebula-theme visualization and sharing"],
      seoText:
        "Astrology Flower of Destiny layers ascendant and moon-sign moods over the flower of your sun sign.",
    },
  },
};

export default function FlowerAstrologyLandingPage() {
  return <FeatureLandingPage service={SERVICE} />;
}
