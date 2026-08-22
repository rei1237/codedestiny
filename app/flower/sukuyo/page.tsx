import FeatureLandingPage from "../../components/FeatureLandingPage";
import { generatePageMetadata } from "../../../lib/generate-page-metadata";

const META = {
  path: "/flower/sukuyo",
  title: "숙요 운명의 꽃 | Code Destiny",
  description:
    "내가 태어난 날 달이 머문 숙명의 자리, 27수와 오늘의 월상이 겹치며 달빛을 머금은 나만의 꽃이 피어납니다.",
  keywords: ["숙요 꽃", "27숙", "달 꽃", "sukuyo flower"],
  image: "https://code-destiny.com/fuctionassets/flower4.webp",
  // 색인 제외 사유와 "왜 siteSeo 목록이 아니라 페이지 단위인가"는 app/flower/destiny/page.tsx 참고.
  noindex: true,
} as const;

export function generateMetadata() {
  return generatePageMetadata(META);
}

const SERVICE = {
  h1: "숙요 운명의 꽃",
  description: META.description,
  ogImage: META.image,
  landingPoints: ["27수 기반 꽃 매칭", "달 위상 보정 시각화", "숙요 해석/가이드 패널"],
  seoText:
    "숙요 운명의 꽃은 태어난 날의 27수와 오늘의 달 위치를 겹쳐, 달빛 꽃과 키워드로 보여줍니다.",
  localized: {
    en: {
      title: "Sukuyo Flower of Destiny",
      h1: "Sukuyo Flower of Destiny",
      description:
        "The twenty-seven Sukuyo mansions and lunar phase currents open your moonlit flower and a small ritual of your own.",
      landingPoints: ["Flower match by twenty-seven mansions", "Lunar-phase adjusted visualization", "Sukuyo guide and interpretation panel"],
      seoText:
        "Sukuyo Flower of Destiny connects the starlight of the twenty-seven mansions and the shadow of the lunar phase to flowers, keywords, and rituals.",
    },
    ja: {
      title: "宿曜の運命の花",
      h1: "宿曜の運命の花",
      description:
        "生まれた日に月が宿っていた宿命の座、27宿と今日の月相が重なり合い、月明かりをまとったあなただけの花が咲きます。",
      landingPoints: ["27宿に基づく花のマッチング", "月相補正の可視化", "宿曜の解釈・ガイドパネル"],
      seoText:
        "宿曜の運命の花は、生まれた日の27宿と今日の月の位置を重ね、月明かりの花とキーワードで見せてくれます。",
    },
    "zh-CN": {
      title: "宿曜命运之花",
      h1: "宿曜命运之花",
      description:
        "你出生那天月亮所栖息的宿命之位，27宿与今日月相相互交叠，绽放出一朵沐浴月光、专属于你的花。",
      landingPoints: ["基于27宿的花朵匹配", "月相校正可视化", "宿曜解读/指南面板"],
      seoText:
        "宿曜命运之花将出生当日的27宿与今日月亮位置相叠加，以月光之花与关键词呈现给你。",
    },
    "zh-TW": {
      title: "宿曜命運之花",
      h1: "宿曜命運之花",
      description:
        "你出生那天月亮所棲息的宿命之位，27宿與今日月相相互交疊，綻放出一朵沐浴月光、專屬於你的花。",
      landingPoints: ["基於27宿的花朵配對", "月相校正視覺化", "宿曜解讀/指南面板"],
      seoText:
        "宿曜命運之花將出生當日的27宿與今日月亮位置相疊加，以月光之花與關鍵字呈現給你。",
    },
  },
};

export default function FlowerSukuyoLandingPage() {
  return <FeatureLandingPage service={SERVICE} />;
}
