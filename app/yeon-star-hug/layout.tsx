import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "연이 별빛 상담 | Code Destiny",
  description:
    "감정, 별자리, 고민 문장을 바탕으로 오늘의 마음 흐름과 작은 실천 방향을 살피는 상담형 콘텐츠입니다. 결과는 엔터테인먼트와 자기 성찰을 위한 참고 자료로 읽어 주세요.",
  keywords: ["감정 상담", "별자리 상담", "오늘의 조언", "연애 고민", "마음 리딩"],
  alternates: {
    canonical: "/yeon-star-hug",
  },
  openGraph: {
    title: "연이 별빛 상담 | Code Destiny",
    description:
      "오늘의 감정과 고민을 별자리 흐름에 비추어 읽고, 지금 해볼 수 있는 작은 행동을 정리합니다.",
    url: "/yeon-star-hug",
    type: "website",
  },
};

export default function YeonStarHugLayout({ children }: { children: ReactNode }) {
  return children;
}
