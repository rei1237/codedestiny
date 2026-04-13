import FeatureLandingPage from "../../components/FeatureLandingPage";

const SERVICE = {
  h1: "✨ 자존감 레벨업",
  description:
    "5카드 RPG 퀘스트 스프레드로 현재 자존감 상태, 방해 요인, 회복 루트를 확인하는 성장형 타로 리딩입니다.",
  ogImage: "https://code-destiny.com/fuctionassets/tarotselfesteem.webp",
  landingPoints: ["5카드 RPG 퀘스트", "자존감 방해 요인 진단", "회복 루트 가이드"],
  seoText:
    "자존감 레벨업 타로는 5카드 성장 퀘스트 스프레드를 통해 자기 인식, 감정 회복, 행동 전략을 제안하는 타로 서비스입니다.",
};

export const metadata = {
  title: "✨ 자존감 레벨업 - 5카드 RPG 퀘스트 타로 | Code Destiny",
  description:
    "5카드 RPG 퀘스트 스프레드로 자존감 상태를 점검하고 회복 전략을 확인하세요.",
};

export default function TarotSelfEsteemLandingPage() {
  return <FeatureLandingPage service={SERVICE} />;
}
