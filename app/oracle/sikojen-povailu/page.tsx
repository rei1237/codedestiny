import FeatureLandingPage from "../../components/FeatureLandingPage";

const SERVICE = {
  h1: "핀란드 주석점",
  description:
    "핀란드 전통 주석점(낙점) 의식을 무료로 체험하세요. 낙이 물에서 굳는 형태로 미래를 읽는 5단계 인터랙티브 오라클 — Shadow Reading까지 완전 무료.",
  ogImage: "https://code-destiny.com/fortune/sikojen-povailu/images/piggyfortune.webp",
  landingPoints: ["5단계 인터랙티브 의식", "낙 형태 상징 해석", "Shadow Reading 제공"],
  seoText:
    "핀란드 주석점은 5단계 의식으로 낙 형태 상징을 해석하고 Shadow Reading까지 제공하는 핀란드 전통 오라클입니다.",
};

export const metadata = {
  title: "핀란드 주석점 Sikojen Povailu | Code Destiny",
  description:
    "핀란드 전통 주석점(낙점) 의식을 무료로 체험하세요. 5단계 인터랙티브 낙점 오라클.",
};

export default function SikojenpovailuLandingPage() {
  return <FeatureLandingPage service={SERVICE} />;
}
