import type { Metadata } from "next";
import TenGodDebugRouteClient from "./TenGodDebugRouteClient";

export const metadata: Metadata = {
  title: "운명의 찻집 십성 검증",
  robots: {
    index: false,
    follow: false,
  },
};

export default function FortuneTeaHouseTenGodDebugRoute() {
  return <TenGodDebugRouteClient />;
}
