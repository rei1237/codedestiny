import type { Metadata } from "next";
import type { ReactNode } from "react";

// VIP 라운지 — 로그인 사용자 전용 화면이라 검색 색인 제외
export const metadata: Metadata = {
  title: "올림푸스 VIP 라운지 | Code Destiny",
  robots: {
    index: false,
    follow: false,
  },
};

export default function OlympusLayout({ children }: { children: ReactNode }) {
  return children;
}
