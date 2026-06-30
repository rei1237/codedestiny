import { Suspense } from "react";
import NeoOperationRoomResultPage from "@/src/features/neo-war-room/NeoOperationRoomResultPage";

export const metadata = {
  title: "네오의 작전 명령서 | Code Destiny",
};

export default function NeoOperationRoomResultRoute() {
  return (
    <Suspense fallback={null}>
      <NeoOperationRoomResultPage />
    </Suspense>
  );
}
