import FeatureLandingPage from "../../components/FeatureLandingPage";

const SERVICE = {
  h1: "💕 우리는 무슨 사이?",
  description:
    "내가 보는 상대, 상대의 시선, 관계를 막는 요인과 예상 결과까지 6카드 스프레드로 확인하는 연애 타로 리딩.",
  ogImage: "https://code-destiny.com/fuctionassets/tarolove.webp",
  landingPoints: ["6카드 연애 스프레드", "서로의 시선 확인", "관계 방향 한눈에 파악"],
  seoText:
    "우리는 무슨 사이 타로는 relationship_six_card 스프레드를 사용해 관계의 현재 상태와 흐름을 다각도로 읽어주는 연애 특화 카드 리딩입니다.",
};

export const metadata = {
  title: "💕 우리는 무슨 사이? - 6카드 연애 관계 타로 | Code Destiny",
  description:
    "내가 보는 상대, 상대의 시선, 관계를 막는 요인과 예상 결과까지 6카드 스프레드로 확인하세요.",
};

export default function TarotLoveLandingPage() {
  return <FeatureLandingPage service={SERVICE} />;
}
