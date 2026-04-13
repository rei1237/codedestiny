import FeatureLandingPage from "../../components/FeatureLandingPage";

const SERVICE = {
  h1: "💕 연애 비책 — 사주 기반 연애 전략서",
  description:
    "일주·도화살·관성을 완전 해독해 연애 패턴을 진단하고 이상형 프로파일링부터 밀당 전략까지 제공하는 연애 운명 분석 서비스입니다.",
  ogImage: "/fuctionassets/saju.webp",
  landingPoints: [
    "연애 자아 분석 · 페로몬 매력 해독",
    "이상형 프로파일링 · 밀당 전략서",
    "연애 타이밍 · 결혼 시기 예측",
    "궁합 분析 포함 버전 · 290코인(+100코인)",
  ],
  seoText:
    "연애 비책은 사주팔자의 일주·도화살·관성을 기반으로 연애 패턴 진단, 이상형 프로파일링, 밀당 전략, 연애 타이밍, 결혼 시기까지 11챕터 22,000자 이상으로 분석하는 프리미엄 연애 운세 서비스입니다.",
};

export const metadata = {
  title: "연애 비책 - 사주 기반 연애 전략 · 이상형 프로파일링 | Code Destiny",
  description:
    "사주팔자로 연애 패턴 진단, 이상형 프로파일링, 밀당 전략, 연애 타이밍까지. 11챕터 심층 리포트 · 290코인.",
};

export default function SajuLoveSecretLandingPage() {
  return <FeatureLandingPage service={SERVICE} />;
}
