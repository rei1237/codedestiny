import type { Metadata } from "next";
import type { ReactNode } from "react";

// 개인화 결과 페이지 — 검색 색인 제외 (thin content / 개인 결과 보호)
export const metadata: Metadata = {
  title: "작명 결과 — 훈민정음 작명소",
  description:
    "사주 용신으로 추천한 이름 결과를 확인하는 개인 전용 화면입니다. 검색 색인 대상이 아닙니다.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function NamingAiResultLayout({ children }: { children: ReactNode }) {
  return children;
}
