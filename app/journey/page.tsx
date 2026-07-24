import type { Metadata } from "next";
import { CompassApp } from "../destiny-compass/_components/CompassApp";

export const metadata: Metadata = {
  title: "운명 여정 | Code Destiny",
  description:
    "매일 방향을 찾고, 이야기를 모으고, 오늘의 한 걸음을 내딛는 곳. 연이의 따뜻한 위로와 네오의 솔직한 팩폭이 함께하는 운명 여정.",
  // 클라이언트 전용 몰입 허브(콘텐츠 페이지 아님) — 색인 대상에서 제외한다.
  robots: { index: false, follow: false },
};

export default function JourneyPage() {
  return <CompassApp start="hub" />;
}
