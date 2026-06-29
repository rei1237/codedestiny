import type { Metadata } from "next";
import VedicAiRouteClient from "./VedicAiRouteClient";

export const metadata: Metadata = {
  title: "베다점 AI 상담 | Code Destiny",
  description: "나크샤트라와 행성의 흐름, 다샤의 리듬 위로 지금의 질문을 조용히 비춥니다.",
};

export default function VedicAiPage() {
  return <VedicAiRouteClient />;
}
