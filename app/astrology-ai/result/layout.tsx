import type { Metadata } from "next";
import type { ReactNode } from "react";

// 개인화 결과 페이지 — 검색 색인 제외 (thin content / 개인 결과 보호)
export const metadata: Metadata = {
  title: "점성술 전문가 상담 결과",
  description:
    "생성된 서양 점성술 상담 결과를 확인하는 개인 전용 화면입니다. 검색 색인 대상이 아닙니다.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function AstrologyAiResultLayout({ children }: { children: ReactNode }) {
  return children;
}
