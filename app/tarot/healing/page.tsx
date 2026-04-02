import FeatureLandingPage from "../../components/FeatureLandingPage";

const SERVICE = {
  h1: "따뜻한 태양 회복 타로",
  description:
    "햇살같은 포근한 빛으로 마음을 어루만지고, 다시 일어설 힘을 찾아가는 4카드 타로 리딩. 무료 힐링 타로로 오늘의 회복 에너지를 확인하세요.",
  ogImage: "https://code-destiny.com/fuctionassets/healing.webp",
  landingPoints: ["4카드 힐링 스프레드", "오늘의 회복 에너지 리딩", "과거·현재·방향·선물 카드 해석"],
  seoText:
    "따뜻한 태양 회복 타로는 Sun and Light 에너지를 활용한 4카드 힐링 스프레드입니다.",
};

export const metadata = {
  title: "따뜻한 태양 회복 타로 리딩 | Code Destiny",
  description:
    "햇살같은 포근한 빛으로 마음을 어루만지고 회복 에너지를 읽는 4카드 힐링 타로 리딩 서비스.",
};

export default function TarotHealingLandingPage() {
  return <FeatureLandingPage service={SERVICE} />;
}
