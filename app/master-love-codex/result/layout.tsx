import type { Metadata } from "next";
import type { ReactNode } from "react";

// 개인화 결과 페이지 — 검색 색인 제외 (thin content / 개인 결과 보호)
export const metadata: Metadata = {
  title: "사주 연애 리포트 결과 — 마스터 인연의 서",
  description:
    "사주와 자미두수를 융합한 연애 리포트를 확인하는 개인 전용 화면입니다. 검색 색인 대상이 아닙니다.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function MasterLoveCodexResultLayout({ children }: { children: ReactNode }) {
  return children;
}
