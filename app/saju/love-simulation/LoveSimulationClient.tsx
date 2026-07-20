"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useContentUnlock } from "@/app/_lib/use-content-unlock";
import { hasLedgerUnlock } from "@/app/_lib/optimistic-unlock-ledger";

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
  // 이미 해금한 사용자는 이용권 확인을 다시 기다릴 이유가 없다. 결제·해금 원장에 기록이 있으면
  // 서버 응답을 기다리지 않고 곧장 엔진을 띄운다(원장은 결제 성공·서버 확정 시에만 기록된다).
  // 마운트 후에 읽는 이유는 정적 프리렌더 결과와 첫 렌더를 어긋나게 하지 않기 위해서다.
  const [ledgerUnlocked, setLedgerUnlocked] = useState(false);
  useEffect(() => {
    if (hasLedgerUnlock(FEATURE_KEY)) setLedgerUnlocked(true);
  }, []);

  const confirmedLocked = status === "ready" && unlocked[FEATURE_KEY] !== true && !ledgerUnlocked;

  useEffect(() => {
    // 확정된(ready) 응답에서 명시적으로 미구매일 때만 리다이렉트한다 — loading/degraded/error
    // 상태에서 리다이렉트하면 일시적 DB 오류나 네트워크 지연을 "미구매"로 오인하게 된다.
    if (confirmedLocked) {
      window.location.replace(LOVE_CODE_MAIN_UNLOCK_URL);
    }
  }, [confirmedLocked]);

  if (!ledgerUnlocked && (status !== "ready" || unlocked[FEATURE_KEY] !== true)) {
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
