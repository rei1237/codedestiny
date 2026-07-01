import type { Metadata } from "next";
import TarotDebugRouteClient from "./TarotDebugRouteClient";

export const metadata: Metadata = {
  title: "운명의 찻집 타로 아틀라스 검증",
  robots: {
    index: false,
    follow: false,
  },
};

export default function FortuneTeaHouseTarotDebugRoute() {
  return <TarotDebugRouteClient />;
}
