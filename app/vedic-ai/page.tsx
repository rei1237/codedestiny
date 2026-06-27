import type { Metadata } from "next";
import VedicAiClient from "./VedicAiClient";

export const metadata: Metadata = {
  title: "베다점 AI 상담 | Code Destiny",
  description: "출생정보 기반 베다 점성술 차트를 바탕으로 상담을 이어갑니다.",
};

export default function VedicAiPage() {
  return <VedicAiClient />;
}
