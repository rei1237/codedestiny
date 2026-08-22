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
    ja: {
      title: "占星術の運命の花",
      h1: "占星術の運命の花",
      description:
        "太陽星座が描く本来の気質の上に、アセンダントの第一印象と月星座の感情のニュアンスが重なり、星雲のようにあなただけの占星術の花が咲きます。",
      landingPoints: ["太陽星座を中心にした花のマッピング", "アセンダント・月星座の補助シグナル", "星雲テーマの可視化と共有"],
      seoText:
        "占星術の運命の花は太陽星座を中心に置き、アセンダントと月星座の雰囲気を星雲のように重ねて見せます。",
    },
    "zh-CN": {
      title: "占星命运之花",
      h1: "占星命运之花",
      description:
        "太阳星座勾勒出的本真气质之上，上升星座的第一印象与月亮星座的情感层次相互叠加，让专属于你的占星之花如星云般绽放。",
      landingPoints: ["以太阳星座为中心的花朵映射", "上升星座、月亮星座辅助信号", "星云主题可视化与分享"],
      seoText:
        "占星命运之花以太阳星座为核心，将上升星座与月亮星座的氛围如星云般层层叠加呈现。",
    },
    "zh-TW": {
      title: "占星命運之花",
      h1: "占星命運之花",
      description:
        "太陽星座勾勒出的本真氣質之上，上升星座的第一印象與月亮星座的情感層次相互疊加，讓專屬於你的占星之花如星雲般綻放。",
      landingPoints: ["以太陽星座為中心的花朵映射", "上升星座、月亮星座輔助訊號", "星雲主題視覺化與分享"],
      seoText:
        "占星命運之花以太陽星座為核心，將上升星座與月亮星座的氛圍如星雲般層層疊加呈現。",
    },
  },
};

export default function FlowerAstrologyLandingPage() {
  return <FeatureLandingPage service={SERVICE} />;
}
