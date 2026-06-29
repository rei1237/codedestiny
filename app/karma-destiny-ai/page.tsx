import type { Metadata } from "next";
import KarmaDestinyAiRouteClient from "./KarmaDestinyAiRouteClient";

export const metadata: Metadata = {
  title: "운명의 업 AI 상담 | Code Destiny",
  description: "사주와 점성술, 베다의 흐름을 함께 살펴 반복되는 삶의 문양과 지금의 과제를 읽습니다.",
};

export default function KarmaDestinyAiPage() {
  return <KarmaDestinyAiRouteClient />;
}
