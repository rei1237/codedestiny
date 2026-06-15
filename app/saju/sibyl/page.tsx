import FeatureLandingPage from "../../components/FeatureLandingPage";

const SERVICE = {
  h1: "⚡ 시빌라 시스템 — 사주팔자 진로 적성 분석",
  description:
    "사주팔자 8글자를 기반으로 진로 적성 섹터를 배정하고 운명 위험 계수를 분석하는 AI 시스템입니다.",
  ogImage: "/fuctionassets/sybila.webp",
  landingPoints: [
    "데스티니 휴(Hue) 색채 진단",
    "사주 기반 적성 섹터 자동 배정",
    "오행 분포 위험 계수 그래프",
    "도미네이터 심층 리포트 (10,000원)",
  ],
  seoText:
    "시빌라 시스템은 사주팔자 오행 분포를 기반으로 진로 적성을 진단하고, 운명 위험 계수를 시각화하는 독자적인 AI 분석 서비스입니다.",
};

export const metadata = {
  title: "시빌라 시스템 - 사주 진로 적성 × 운명 위험 계수 | Code Destiny",
  description:
    "사주팔자 기반 진로 적성 섹터 배정과 운명 위험 계수 분석. 기본 무료, 도미네이터 리포트 10,000원.",
};

export default function SajuSibylLandingPage() {
  return <FeatureLandingPage service={SERVICE} />;
}
