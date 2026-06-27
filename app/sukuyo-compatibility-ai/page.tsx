import type { Metadata } from "next";
import SukuyoCompatibilityAiClient from "./SukuyoCompatibilityAiClient";

export const metadata: Metadata = {
  title: "숙요점 궁합 AI 상담 | Code Destiny",
  description: "두 사람의 27숙과 숙요점 관계 유형, 끌림과 갈등의 리듬을 바탕으로 이어가는 1:1 궁합 상담입니다.",
  alternates: {
    canonical: "/sukuyo-compatibility-ai",
  },
  openGraph: {
    title: "숙요점 궁합 AI 상담",
    description: "붉은 실처럼 이어진 두 사람의 끌림과 갈등, 장기 관계의 흐름을 상담형으로 읽습니다.",
    url: "/sukuyo-compatibility-ai",
    images: ["/fuctionassets/sukyo_premium.webp"],
  },
};

export default function SukuyoCompatibilityAiPage() {
  return <SukuyoCompatibilityAiClient />;
}
