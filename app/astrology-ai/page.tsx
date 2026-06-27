import type { Metadata } from "next";
import AstrologyAiClient from "./AstrologyAiClient";

export const metadata: Metadata = {
  title: "점성술 AI 상담 | Code Destiny",
  description: "서양 점성술 차트를 바탕으로 이어가는 1:1 상담",
  alternates: {
    canonical: "/astrology-ai",
  },
  robots: {
    index: false,
    follow: false,
  },
  openGraph: {
    title: "점성술 AI 상담",
    description: "네이탈 차트와 현재 하늘의 흐름을 바탕으로 이어가는 점성술 상담",
    url: "/astrology-ai",
    images: ["/fuctionassets/premiumstar.webp"],
  },
};

export default function AstrologyAiPage() {
  return <AstrologyAiClient />;
}
