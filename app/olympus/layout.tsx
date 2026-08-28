import type { Metadata } from "next";
import type { ReactNode } from "react";

// VIP 라운지 — 로그인 사용자 전용 화면이라 검색 색인 제외
export const metadata: Metadata = {
  title: "올림푸스 VIP 라운지 | Code Destiny",
  description:
    "올림푸스 VIP 라운지는 로그인한 회원만 들어오는 전용 화면입니다. 검색 색인 대상이 아닙니다.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function OlympusLayout({ children }: { children: ReactNode }) {
  return children;
}
