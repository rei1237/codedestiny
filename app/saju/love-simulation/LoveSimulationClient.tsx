"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { authFetch } from "@/app/_lib/auth-client";

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

type LoveSimulationBalanceData = {
  unlockedFeatures: string[];
  unlockMap: Record<string, boolean>;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function normalizeUnlockedFeatures(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function normalizeUnlockMap(value: unknown) {
  const record = asRecord(value);
  if (!record) return {};
  return Object.fromEntries(Object.entries(record).filter((entry): entry is [string, boolean] => typeof entry[1] === "boolean"));
}

async function fetchLoveSimulationBillingBalance(): Promise<{ ok: boolean; data: LoveSimulationBalanceData | null }> {
  const response = await authFetch("/api/billing/balance", { method: "GET", cache: "no-store" });
  const payload = await response.json().catch(() => null);
  const root = asRecord(payload);
  const data = asRecord(root?.data) || root;

  if (!response.ok || root?.ok === false || !data) {
    return { ok: false, data: null };
  }

  return {
    ok: true,
    data: {
      unlockedFeatures: normalizeUnlockedFeatures(data.unlockedFeatures),
      unlockMap: normalizeUnlockMap(data.unlockMap),
    },
  };
}

export default function LoveSimulationClient() {
  const [status, setStatus] = useState<"checking" | "unlocked">("checking");

  useEffect(() => {
    let alive = true;

    function redirectToMainUnlock() {
      window.location.replace(LOVE_CODE_MAIN_UNLOCK_URL);
    }

    fetchLoveSimulationBillingBalance()
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
