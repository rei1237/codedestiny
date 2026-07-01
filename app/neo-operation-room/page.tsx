import type { Metadata } from "next";
import NeoOperationRoomClient from "./NeoOperationRoomClient";

export const metadata: Metadata = {
  title: "네오의 팩폭 작전실 | Code Destiny",
  description: "위로보다 진단, 감정보다 기준. 네오가 막힌 흐름을 읽고 반복된 선택을 현실적인 행동 전략으로 정리한다.",
  referrer: "no-referrer",
};

export default function NeoOperationRoomRoute() {
  return <NeoOperationRoomClient />;
}
