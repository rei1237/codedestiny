import type { Metadata } from "next";
import TarotDebugPage from "@/src/features/fortune-tea-house/components/TarotDebugPage";

export const metadata: Metadata = {
  title: "운명의 찻집 타로 아틀라스 검증",
  robots: {
    index: false,
    follow: false,
  },
};

export default function FortuneTeaHouseTarotDebugRoute() {
  return <TarotDebugPage />;
}
