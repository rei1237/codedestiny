import type { Metadata } from "next";
import ZiweiAiRouteClient from "./ZiweiAiRouteClient";

export const metadata: Metadata = {
  title: "자미두수 AI 상담 | Code Destiny",
  description: "명궁과 신궁, 사화와 대운의 흐름을 따라 지금의 고민을 상담형으로 읽습니다.",
};

export default function ZiweiAiPage() {
  return <ZiweiAiRouteClient />;
}
