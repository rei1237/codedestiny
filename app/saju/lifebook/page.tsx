import FeatureLandingPage from "../../components/FeatureLandingPage";

const SERVICE = {
  h1: "📜 인생의 책 — 프리미엄 사주 심층 분석",
  description:
    "사주팔자 8글자로 운명의 흐름을 완전 해독하는 프리미엄 심층 분석 리포트입니다. 최소 12,000자 · 1회 490코인.",
  ogImage: "/fuctionassets/saju.webp",
  landingPoints: [
    "일주·용신·대운 완전 해독",
    "재물·직업·건강 운명 흐름 분석",
    "10년 대운 타이밍 로드맵",
    "개운 처방전 포함 · PDF 저장 가능",
  ],
  seoText:
    "인생의 책은 사주팔자를 기반으로 일주 분석, 용신 도출, 대운 흐름, 재물·직업·건강 예측까지 12,000자 이상의 심층 리포트를 제공하는 프리미엄 사주 서비스입니다.",
};

export const metadata = {
  title: "인생의 책 - 프리미엄 사주 심층 분석 리포트 | Code Destiny",
  description:
    "사주팔자 기반 프리미엄 심층 분석 — 일주·용신·대운 해독, 재물·직업·건강 운명 흐름 리포트. 1회 490코인.",
};

export default function SajuLifebookLandingPage() {
  return <FeatureLandingPage service={SERVICE} />;
}
