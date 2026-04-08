/**
 * /premium-unlock — 인생 총운 해금 세일즈 페이지
 * CRO 구조: 공감 → 문제제기 → 차별성 → 베네핏 → 가격 → CTA
 */

import { Metadata } from "next";
import PremiumSalesContent from "./PremiumSalesContent";

export const metadata: Metadata = {
  title: "인생 총운 해금 — 당신의 운명이 엇나가는 진짜 이유 | Code Destiny",
  description:
    "AI + 사주명리 8만 케이스 기반. 10년 대운 전환점, 재물운 타이밍, 숨겨진 재능을 한 번에. 49,000원으로 평생 사주 리포트를 받아보세요.",
  openGraph: {
    title: "당신의 운명을 해금하세요 — 인생 총운 분석",
    description: "노력해도 안 풀리는 이유, 사주 명리학이 알고 있습니다.",
  },
};

export default function PremiumUnlockPage() {
  return <PremiumSalesContent />;
}
