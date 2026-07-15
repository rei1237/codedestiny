import type { Metadata } from "next";
import "../../styles/app-shell.css";
import AppShell from "@/app/app/_components/AppShell";
import MobileAppRuntimeBridge from "@/app/app/MobileAppRuntimeBridge";
import PurchaseRecoveryBoot from "@/app/app/_components/PurchaseRecoveryBoot";

export const metadata: Metadata = {
  title: "Code Destiny",
  description: "Code Destiny Android 앱 홈",
  // 앱 전용 셸이라 색인 대상이 아니다.
  robots: {
    index: false,
    follow: false,
  },
};

export default function CodeDestinyAppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <MobileAppRuntimeBridge />
      <AppShell>
        <PurchaseRecoveryBoot />
        {children}
      </AppShell>
    </>
  );
}
