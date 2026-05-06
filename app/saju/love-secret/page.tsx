import FeatureLandingPage from "../../components/FeatureLandingPage";

const SERVICE = {
  h1: "💕 연애 비책 — 사주 기반 연애 전략서",
  description:
    "일주·도화살·관성을 완전 해독해 연애 패턴을 진단하고 이상형 프로파일링부터 밀당 전략까지 제공하는 연애 운명 분석 서비스입니다.",
  ogImage: "/fuctionassets/saju.webp",
  landingPoints: [
    "연애 자아 분석 · 페로몬 매력 해독",
    "이상형 프로파일링 · 밀당 전략서",
    "연애 타이밍 · 결혼 시기 · 개운 처방",
    "1인 10챕터(300코인) · 2인 12챕터(500코인)",
  ],
  seoText:
    "연애 비책은 사주 엔진 데이터(사주팔자·오행·십성·신살·12운성·대운·세운·월운)를 기반으로 1인 모드 10챕터(최소 45,000자), 2인 궁합 모드 12챕터(최소 60,000자) 리포트를 생성하는 프리미엄 연애 운세 서비스입니다.",
};

export const metadata = {
  title: "연애 비책 - 사주 기반 연애 전략 · 이상형 프로파일링 | Code Destiny",
  description:
    "사주 엔진 기반 연애운/궁합 심층 리포트. 1인 10챕터(300코인), 2인 12챕터(500코인).",
};

export default function SajuLoveSecretLandingPage() {
  return <FeatureLandingPage service={SERVICE} />;
}
