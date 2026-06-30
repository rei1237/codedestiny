import type { Metadata } from "next";
import NeoOperationRoomPage from "@/src/features/neo-war-room/NeoOperationRoomPage";

export const metadata: Metadata = {
  title: "네오의 팩폭 작전실 | Code Destiny",
  description: "위로보다 진단, 감정보다 작전. 네오가 운명의 구조를 읽고 인생 작전을 다시 짜준다.",
  referrer: "no-referrer",
};

export default function NeoOperationRoomRoute() {
  return <NeoOperationRoomPage />;
}
