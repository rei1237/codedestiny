import FeatureLandingPage from "../../components/FeatureLandingPage";
import { generatePageMetadata } from "../../../lib/generate-page-metadata";

const META = {
  path: "/flower/destiny",
  title: "운명의 꽃 - 통합 아틀리에 | Code Destiny",
  description:
    "사주의 오행과 십성, 점성술의 행성 배치, 자미두수의 명궁, 숙요점의 27수 — 네 학문이 각각 짚어낸 기운을 소스 탭으로 넘겨 보며, 나만의 운명 꽃 한 송이로 모읍니다.",
  keywords: ["운명의 꽃", "사주 꽃", "점성술 꽃", "자미두수 꽃", "숙요 꽃", "destiny flower"],
  image: "https://code-destiny.com/fuctionassets/flower.webp",
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
