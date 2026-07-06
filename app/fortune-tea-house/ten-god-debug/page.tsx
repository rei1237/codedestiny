import type { Metadata } from "next";
import TenGodDebugRouteClient from "./TenGodDebugRouteClient";
import { notFound } from "next/navigation";

export const metadata: Metadata = {
  title: "운명의 찻집 십성 검증",
  robots: {
    index: false,
    follow: false,
  },
};

export default function FortuneTeaHouseTenGodDebugRoute() {
  // 디버그 라우트는 프로덕션 빌드에서 404로 제외한다.
  if (process.env.NODE_ENV === "production") notFound();

  return <TenGodDebugRouteClient />;
}
