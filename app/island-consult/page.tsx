import type { Metadata } from "next";
import IslandConsultClient from "./IslandConsultClient";

// 운명의 섬 12궁 상담 허브 — 궁을 골라 기존 검증된 자미두수 전문가 상담(/ziwei-ai)으로 이어주는 진입 화면.
// 상담 결과·결제는 /ziwei-ai가 그대로 담당한다. 색인 대상 아님(noindex, 사이트맵 미등록).
export const metadata: Metadata = {
  title: "운명의 섬 · 12궁 상담",
  description:
    "운명의 섬 12궁 중 하나를 골라 자미두수 전문가 상담으로 이어주는 진입 화면입니다. 상담과 결제는 /ziwei-ai 가 담당하며 이 화면은 검색 색인 대상이 아닙니다.",
  robots: { index: false, follow: false },
};

export default function IslandConsultPage() {
  return <IslandConsultClient />;
}
