import type { Metadata } from "next";
import type { ReactNode } from "react";

// 입력 도구 페이지 — 검색 색인 제외(실질 콘텐츠는 /nakshatra 랜딩에 있음)
export const metadata: Metadata = {
  title: "나크샤트라 계산",
  description:
    "생년월일로 본명 나크샤트라를 계산하는 입력 화면입니다. 실질 콘텐츠는 /nakshatra 에 있어 색인 대상이 아닙니다.",
  robots: { index: false, follow: false },
};

export default function NakshatraCalcLayout({ children }: { children: ReactNode }) {
  return children;
}
