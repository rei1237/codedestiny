import type { Metadata } from "next";
import NeoOperationRoomClient from "./NeoOperationRoomClient";

export const metadata: Metadata = {
  title: "네오의 팩폭 작전실 | Code Destiny",
  description: "위로보다 진단, 감정보다 기준. 네오가 막힌 흐름을 읽고 반복된 선택을 현실적인 행동 전략으로 정리한다.",
  referrer: "no-referrer",
  // canonical·robots 를 비워 두면 app/layout.js 기본값(홈 canonical + index,follow)이
  // 내려와, 엣지의 `X-Robots-Tag: noindex, nofollow`(public/_headers) 와 정면으로
  // 어긋나는 신호를 HTML 로 내보내게 된다. 엣지 헤더와 같은 값으로 맞춘다.
  alternates: {
    canonical: "https://code-destiny.com/neo-operation-room",
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

export default function NeoOperationRoomRoute() {
  return <NeoOperationRoomClient />;
}
