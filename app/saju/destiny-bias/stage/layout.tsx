import type { Metadata } from "next";
import type { ReactNode } from "react";

// 진행 단계 화면 — 검색 색인 제외 (thin content / 중간 상태 URL)
export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default function DestinyBiasStageLayout({ children }: { children: ReactNode }) {
  return children;
}
