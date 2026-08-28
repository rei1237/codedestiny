import type { Metadata } from "next";
import type { ReactNode } from "react";

// 진행 단계 화면 — 검색 색인 제외 (thin content / 중간 상태 URL)
export const metadata: Metadata = {
  title: "최애운명 분석 진행",
  description:
    "최애운명 덕질 운명 분석이 진행되는 중간 단계 화면입니다. 결과가 아직 없어 검색 색인 대상이 아닙니다.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function DestinyBiasStageLayout({ children }: { children: ReactNode }) {
  return children;
}
