import FeatureLandingPage from "../../components/FeatureLandingPage";

const SERVICE = {
  h1: "스톤헨지 룬 오라클",
  description:
    "고대 룬 상징으로 현재 흐름과 연간 운세를 읽는 스톤헨지 룬 신탁 서비스입니다.",
  ogImage: "https://code-destiny.com/fuctionassets/rune.webp",
  landingPoints: ["1/3/5/12 룬 스프레드", "정·역방향 룬 해석", "연간 흐름 리딩"],
  seoText: "실행은 /static 서비스 화면에서만 진행됩니다.",
};

export const metadata = {
  title: "스톤헨지 룬 오라클 | Code Destiny",
  description:
    "고대 룬 상징으로 현재 흐름과 연간 운세를 읽는 스톤헨지 룬 오라클 안내 페이지.",
};

export default function RuneLandingPage() {
  return <FeatureLandingPage service={SERVICE} />;
}
