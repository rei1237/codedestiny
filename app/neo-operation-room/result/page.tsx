import { Suspense } from "react";
import NeoOperationRoomResultClient from "./NeoOperationRoomResultClient";

export const metadata = {
  title: "네오의 작전 명령서 | Code Destiny",
};

export default function NeoOperationRoomResultRoute() {
  return (
    <Suspense fallback={null}>
      <NeoOperationRoomResultClient />
    </Suspense>
  );
}
