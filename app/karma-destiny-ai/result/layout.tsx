import type { Metadata } from "next";
import type { ReactNode } from "react";

// 개인화 결과 페이지 — 검색 색인 제외 (thin content / 개인 결과 보호)
export const metadata: Metadata = {
  title: "업보 운세 결과 — 운명의 업",
  description:
    "반복되는 인생 패턴을 읽은 업보 운세 결과를 확인하는 개인 전용 화면입니다. 검색 색인 대상이 아닙니다.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function KarmaDestinyAiResultLayout({ children }: { children: ReactNode }) {
  return children;
}
