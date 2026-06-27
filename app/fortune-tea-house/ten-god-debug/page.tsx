import type { Metadata } from "next";
import TenGodDebugPage from "@/src/features/fortune-tea-house/components/TenGodDebugPage";

export const metadata: Metadata = {
  title: "운명의 찻집 십성 검증",
  robots: {
    index: false,
    follow: false,
  },
};

export default function FortuneTeaHouseTenGodDebugRoute() {
  return <TenGodDebugPage />;
}
