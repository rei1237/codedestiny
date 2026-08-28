import type { Metadata } from "next";
import type { ReactNode } from "react";

// 유료 개인화 상담 — 검색 색인 제외(개인 결과 보호)
export const metadata: Metadata = {
  title: "나크샤트라 AI 상담",
  description:
    "27수 나크샤트라 유료 개인 상담 화면입니다. 소개와 해설은 /nakshatra 에 있으며 이 화면은 검색 색인 대상이 아닙니다.",
  robots: { index: false, follow: false },
};

export default function NakshatraAiLayout({ children }: { children: ReactNode }) {
  return children;
}
