import type { Metadata } from "next";
import IslandConsultClient from "./IslandConsultClient";

// 무료 탐험 전환 후 기존 구매 결과 재열람만 유지한다. 색인 대상 아님.
export const metadata: Metadata = {
  title: "운명의 섬 · 기존 상담 다시 보기",
  description:
    "운명의 섬은 무료 정적 탐험으로 전환되었습니다. 이 화면에서는 기존 구매 상담을 다시 볼 수 있습니다.",
  robots: { index: false, follow: false },
};

export default function IslandConsultPage() {
  return <IslandConsultClient />;
}
