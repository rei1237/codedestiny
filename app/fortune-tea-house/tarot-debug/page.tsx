import type { Metadata } from "next";
import TarotDebugRouteClient from "./TarotDebugRouteClient";
import { notFound } from "next/navigation";

export const metadata: Metadata = {
  title: "운명의 찻집 타로 아틀라스 검증",
  robots: {
    index: false,
    follow: false,
  },
};

export default function FortuneTeaHouseTarotDebugRoute() {
  // 디버그 라우트는 프로덕션 빌드에서 404로 제외한다.
  if (process.env.NODE_ENV === "production") notFound();

  return <TarotDebugRouteClient />;
}
