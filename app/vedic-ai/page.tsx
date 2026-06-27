import type { Metadata } from "next";
import VedicAiClient from "./VedicAiClient";

export const metadata: Metadata = {
  title: "베다점 AI 상담 | Code Destiny",
  description: "나크샤트라와 행성의 흐름을 따라 지금의 질문을 조용히 풀어드립니다.",
};

export default function VedicAiPage() {
  return <VedicAiClient />;
}
