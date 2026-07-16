import type { Metadata } from "next";
import type { ReactNode } from "react";

// 입력 도구 페이지 — 검색 색인 제외(실질 콘텐츠는 /nakshatra 랜딩에 있음)
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function NakshatraCalcLayout({ children }: { children: ReactNode }) {
  return children;
}
