import type { Metadata } from "next";
import IslandConsultClient from "./IslandConsultClient";

// 운명의 섬 12궁 상담 허브 — 궁을 골라 기존 검증된 자미두수 전문가 상담(/ziwei-ai)으로 이어주는 진입 화면.
// 상담 결과·결제는 /ziwei-ai가 그대로 담당한다. 색인 대상 아님(noindex, 사이트맵 미등록).
export const metadata: Metadata = {
  title: "운명의 섬 · 12궁 상담",
  robots: { index: false, follow: false },
};

export default function IslandConsultPage() {
  return <IslandConsultClient />;
}
