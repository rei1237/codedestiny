import FeatureLandingPage from "../../components/FeatureLandingPage";

const SERVICE = {
  h1: "명리학 AI 타로 - 78장 유니버설 덱 리딩",
  description:
    "연애, 재회, 사업, 건강 등 고민 카테고리에 맞춰 원카드 또는 3카드 명리학 타로 해석을 제공합니다.",
  ogImage: "https://code-destiny.com/fuctionassets/ai%20tarrot.webp",
  landingPoints: ["카테고리별 고민 리딩", "원카드 및 3카드 스프레드", "AI 명리 해석 리포트"],
  seoText:
    "명리학 AI 타로는 타로 카드를 카테고리별 맥락으로 해석하는 서비스입니다.",
};

export const metadata = {
  title: "명리학 AI 타로 - 78장 유니버설 덱 리딩 | Code Destiny",
  description:
    "연애, 재회, 사업, 건강 등 고민 카테고리에 맞춰 원카드 또는 3카드 명리학 타로 해석을 제공합니다.",
};

export default function MingriTarotLandingPage() {
  return <FeatureLandingPage service={SERVICE} />;
}
