"use client";

import { useEffect } from "react";
import dynamic from "next/dynamic";
import { useContentUnlock } from "@/app/_lib/use-content-unlock";

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
  const { unlocked, status } = useContentUnlock([FEATURE_KEY]);
  const confirmedLocked = status === "ready" && unlocked[FEATURE_KEY] !== true;

  useEffect(() => {
    // 확정된(ready) 응답에서 명시적으로 미구매일 때만 리다이렉트한다 — loading/degraded/error
    // 상태에서 리다이렉트하면 일시적 DB 오류나 네트워크 지연을 "미구매"로 오인하게 된다.
    if (confirmedLocked) {
      window.location.replace(LOVE_CODE_MAIN_UNLOCK_URL);
    }
  }, [confirmedLocked]);

  if (status !== "ready" || unlocked[FEATURE_KEY] !== true) {
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
