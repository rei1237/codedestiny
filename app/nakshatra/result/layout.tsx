import type { Metadata } from "next";
import type { ReactNode } from "react";

// 개인화 결과 페이지 — 검색 색인 제외(개인 결과 보호)
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function NakshatraResultLayout({ children }: { children: ReactNode }) {
  return children;
}
