import FeatureLandingPage from "../components/FeatureLandingPage";
import { generatePageMetadata } from "../../lib/generate-page-metadata";

const META = {
  path: "/flower",
  title: "운명의 꽃 - 통합 아틀리에 | 꿀꿀 운세",
  description:
    "사주가 고른 꽃 카드와 공유는 무료예요. 아틀리에 상세를 해금하면 점성술·자미두수·숙요점의 꽃과 꽃말·색·해설을 함께 볼 수 있어요.",
  keywords: ["운명의 꽃", "사주 꽃", "점성술 꽃", "자미두수 꽃", "숙요 꽃", "destiny flower"],
  image: "https://code-destiny.com/images/consultation/destiny-flower-editorial-v1-960.webp",
  // 결제 유도 스텁이라 크롤러가 보는 고유 본문이 449자뿐이다(2026-08-17 out/ 실측).
  // AdSense 가 "가치 없는 콘텐츠"로 거절한 표본이라 색인에서 뺀다. 기능·링크는 그대로다.
  // 🔴 lib/seo/siteSeo.ts 의 noindexPathPrefixes 에 "/flower" 를 넣는 방식은 쓰지 않는다 —
  //    그 목록은 isPrivateRoute 를 거쳐 ShareWidget 을 숨겨(lib/share.v2.ts:36) 이 유료
  //    랜딩의 공유 버튼까지 지운다. 페이지 단위 noindex 가 정답이다.
  noindex: true,
} as const;

export function generateMetadata() {
  return generatePageMetadata(META);
}

const SERVICE = {
  h1: "네 갈래 운세로 피우는 나의 운명의 꽃",
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
        "Your Saju flower card and sharing are free. Unlock atelier details to explore flowers from astrology, Zi Wei Dou Shu and Sukuyo, with their meanings, colors and readings.",
      landingPoints: ["Switch four fortune-source tabs", "Flowers, keywords, and panels by source", "Prompt, save, and share tools"],
      seoText:
        "Flower of Destiny Atelier blossoms four fortune energies into flowers, palettes, and interpretation panels.",
    },
    ja: {
      title: "運命の花 - 統合アトリエ",
      h1: "運命の花アトリエ",
      description:
        "四柱推命の花カードと共有は無料です。アトリエの詳細を開くと、占星術・紫微斗数・宿曜の花と花言葉・色・解説も確認できます。",
      landingPoints: ["4つの運勢ソースをタブ切替", "ソース別の花・キーワード・解釈パネル", "プロンプト・保存・共有ツール"],
      seoText:
        "運命の花アトリエは、四柱推命・占星術・紫微斗数・宿曜という4つの運勢エネルギーを花とパレット、解釈パネルへと咲かせます。",
    },
    "zh-CN": {
      title: "命运之花 - 综合工坊",
      h1: "命运之花工坊",
      description:
        "四柱花卡和分享免费。解锁工坊详情后，可查看占星、紫微斗数和宿曜之花，以及花语、色彩和解读。",
      landingPoints: ["四种运势来源标签切换", "按来源区分的花朵、关键词与解读面板", "提示词、保存、分享工具"],
      seoText:
        "命运之花工坊将四柱、占星、紫微斗数、宿曜四种运势能量绽放为花朵、色彩与解读面板。",
    },
    "zh-TW": {
      title: "命運之花 - 綜合工坊",
      h1: "命運之花工坊",
      description:
        "四柱花卡與分享免費。解鎖工坊詳情後，可查看占星、紫微斗數與宿曜之花，以及花語、色彩與解讀。",
      landingPoints: ["四種運勢來源標籤切換", "依來源區分的花朵、關鍵字與解讀面板", "提示詞、儲存、分享工具"],
      seoText:
        "命運之花工坊將四柱、占星、紫微斗數、宿曜四種運勢能量綻放為花朵、色彩與解讀面板。",
    },
  },
};

export default function FlowerAtelierLandingPage() {
  return <FeatureLandingPage service={SERVICE} />;
}
