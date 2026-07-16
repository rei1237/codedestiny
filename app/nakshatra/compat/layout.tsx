import type { Metadata } from "next";
import type { ReactNode } from "react";

// 유료 궁합 도구 — 검색 색인 제외(실질 콘텐츠는 /nakshatra 랜딩)
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function NakshatraCompatLayout({ children }: { children: ReactNode }) {
  return children;
}
