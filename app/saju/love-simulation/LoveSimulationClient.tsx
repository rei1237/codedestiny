"use client";

import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { fetchBillingBalance } from "@/app/_lib/billing-client";

const LoveSimulationEngine = dynamic(
  () => import("./_components/LoveSimulationEngine").then((mod) => mod.LoveSimulationEngine),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-screen bg-[#0a0a0c] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-pink-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-400 animate-pulse">러브 코드를 준비 중입니다...</p>
        </div>
      </div>
    ),
  }
);

const FEATURE_KEY = "loveSimulation";
const LOVE_CODE_MAIN_UNLOCK_URL = "/index.html?action=openLoveSimulation";

export default function LoveSimulationClient() {
  const [status, setStatus] = useState<"checking" | "unlocked">("checking");

  useEffect(() => {
    let alive = true;

    function redirectToMainUnlock() {
      window.location.replace(LOVE_CODE_MAIN_UNLOCK_URL);
    }

    fetchBillingBalance({ force: true })
      .then((result) => {
        if (!alive) return;
        const data = result.ok ? result.data : null;
        const hasUnlock = data?.unlockMap?.[FEATURE_KEY] === true || data?.unlockedFeatures?.includes(FEATURE_KEY);
        if (hasUnlock) {
          setStatus("unlocked");
          return;
        }
        redirectToMainUnlock();
      })
      .catch(() => {
        if (alive) redirectToMainUnlock();
      });

    return () => {
      alive = false;
    };
  }, []);

  if (status !== "unlocked") {
    return (
      <main className="min-h-screen bg-[#0a0a0c] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-pink-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-400 animate-pulse">러브 코드 이용권을 확인 중입니다...</p>
        </div>
      </main>
    );
  }

  return <LoveSimulationEngine />;
}
