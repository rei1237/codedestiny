import { Suspense } from "react";
import NeoOperationRoomResultClient from "./NeoOperationRoomResultClient";

// 개인 AI 상담 결과 화면이다. description·canonical·robots 가 비어 있으면
// app/layout.js 기본값이 내려와 홈 설명과 홈 canonical 을 쓰면서 index,follow 로 노출된다
// (엣지의 `X-Robots-Tag: noindex, nofollow` 와 모순되는 신호였다).
export const metadata = {
  title: "네오의 작전 명령서 | Code Destiny",
  description: "네오가 정리한 개인 작전 명령서입니다. 상담을 진행한 본인에게만 표시되며 검색에는 공개되지 않습니다.",
  alternates: {
    canonical: "https://code-destiny.com/neo-operation-room/result",
  },
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
};

export default function NeoOperationRoomResultRoute() {
  return (
    <Suspense fallback={null}>
      <NeoOperationRoomResultClient />
    </Suspense>
  );
}
