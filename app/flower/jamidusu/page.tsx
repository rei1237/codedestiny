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
    ja: {
      title: "紫微斗数の運命の花",
      h1: "紫微斗数の運命の花",
      description:
        "命宮に座す主星とその明るさ、三方四正へとつながる宮位の気運が重なり合い、紫微斗数の花とテーマが一枚の命盤のように咲きます。",
      landingPoints: ["命宮・主星に基づく花の算出", "明るさの強度を反映したテーマ", "紫微斗数の解釈パネル"],
      seoText:
        "紫微斗数の運命の花では、命宮の主星と四化の流れが花のパレットと解釈へと広がります。",
    },
    "zh-CN": {
      title: "紫微命运之花",
      h1: "紫微命运之花",
      description:
        "命宫中的主星与其亮度，以及三方四正延续而来的宫位气运相互交叠，让紫微斗数的花朵与主题如一张命盘般绽放。",
      landingPoints: ["基于命宫/主星的花朵生成", "反映亮度强弱的主题", "紫微斗数解读面板"],
      seoText:
        "紫微命运之花中，命宫主星与四化的流转会蔓延为花朵色彩与解读。",
    },
    "zh-TW": {
      title: "紫微命運之花",
      h1: "紫微命運之花",
      description:
        "命宮中的主星與其亮度，以及三方四正延續而來的宮位氣運相互交疊，讓紫微斗數的花朵與主題如一張命盤般綻放。",
      landingPoints: ["基於命宮/主星的花朵生成", "反映亮度強弱的主題", "紫微斗數解讀面板"],
      seoText:
        "紫微命運之花中，命宮主星與四化的流轉會蔓延為花朵色彩與解讀。",
    },
  },
};

export default function FlowerJamidusuLandingPage() {
  return <FeatureLandingPage service={SERVICE} />;
}
