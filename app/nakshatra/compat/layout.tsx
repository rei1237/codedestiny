import type { Metadata } from "next";
import type { ReactNode } from "react";

// 유료 궁합 도구 — 검색 색인 제외(실질 콘텐츠는 /nakshatra 랜딩)
export const metadata: Metadata = {
  title: "나크샤트라 궁합",
  description:
    "두 사람의 나크샤트라 궁합을 보는 유료 도구 화면입니다. 실질 콘텐츠는 /nakshatra 에 있어 색인 대상이 아닙니다.",
  robots: { index: false, follow: false },
};

export default function NakshatraCompatLayout({ children }: { children: ReactNode }) {
  return children;
}
