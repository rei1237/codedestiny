"use client";

import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import {
  fetchBillingBalance,
  openPaidFeatureGate,
  runBillingCoinGate,
} from "@/app/_lib/billing-client";
import { getAssetUrlFromPublicPath } from "@/lib/r2-public-url";

const LoveSimulationEngine = dynamic(
  () => import("./_components/LoveSimulationEngine").then((mod) => mod.LoveSimulationEngine),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-screen bg-[#0a0a0c] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-pink-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-400 animate-pulse">운명의 코드를 분석 중입니다...</p>
        </div>
      </div>
    ),
  }
);

const FEATURE_KEY = "loveSimulation";
const FEATURE_REASON = "LOVE CODE 사주 연애 시뮬레이션 잠금 해제";

export default function LoveSimulationClient() {
  const [status, setStatus] = useState<"checking" | "locked" | "unlocking" | "unlocked">("checking");
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;

    fetchBillingBalance()
      .then((result) => {
        if (!alive) return;
        const data = result.ok ? result.data : null;
        const hasUnlock = data?.unlockMap?.[FEATURE_KEY] === true || data?.unlockedFeatures?.includes(FEATURE_KEY);
        setStatus(hasUnlock ? "unlocked" : "locked");
      })
      .catch(() => {
        if (alive) setStatus("locked");
      });

    return () => {
      alive = false;
    };
  }, []);

  async function unlockLoveCode() {
    if (status === "unlocking") return;
    setStatus("unlocking");
    setError("");

    const requestId = openPaidFeatureGate({
      featureKey: FEATURE_KEY,
      cost: 100,
      title: "LOVE CODE",
      message: "러브 코드 이용권을 확인 중입니다.",
    });

    try {
      const result = await runBillingCoinGate({
        featureKey: FEATURE_KEY,
        reason: FEATURE_REASON,
        requestId,
      });

      if (result.ok) {
        setStatus("unlocked");
        return;
      }

      const message = String(result.error?.message || "");
      if (/로그인|인증|auth/i.test(message)) {
        setError("로그인 후 러브 코드를 잠금 해제할 수 있습니다.");
      } else if (/coin|코인|balance|잔액|insufficient/i.test(message)) {
        setError("코인이 부족합니다. 충전 후 다시 시도해주세요.");
      } else {
        setError("잠금 해제에 실패했습니다. 잠시 후 다시 시도해주세요.");
      }
      setStatus("locked");
    } catch {
      setError("잠금 해제에 실패했습니다. 잠시 후 다시 시도해주세요.");
      setStatus("locked");
    }
  }

  if (status !== "unlocked") {
    const isBusy = status === "checking" || status === "unlocking";
    const loveCodeBackgroundUrl = getAssetUrlFromPublicPath("/fuctionassets/love code.webp");

    return (
      <main className="relative min-h-screen overflow-hidden bg-[#120714] text-white">
        <div className="absolute inset-0">
          <img
            src={loveCodeBackgroundUrl}
            alt=""
            className="h-full w-full object-cover opacity-55"
          />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_25%,rgba(244,114,182,.34),transparent_34%),linear-gradient(180deg,rgba(18,7,20,.46),rgba(18,7,20,.94))]" />
        </div>

        <section className="relative z-10 flex min-h-screen items-center justify-center px-5 py-12">
          <div className="w-full max-w-[520px] rounded-[28px] border border-pink-200/24 bg-black/42 p-7 text-center shadow-[0_28px_90px_rgba(0,0,0,.48)] backdrop-blur-xl sm:p-9">
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-pink-400/18 text-3xl shadow-[0_0_34px_rgba(244,114,182,.4)]">
              💕
            </div>
            <p className="mb-2 text-sm font-semibold tracking-[.22em] text-pink-100">LOVE CODE</p>
            <h1 className="text-3xl font-black leading-tight text-white sm:text-4xl">
              사주로 여는 연애 시뮬레이션
            </h1>
            <p className="mx-auto mt-4 max-w-[420px] text-sm leading-7 text-pink-50/84">
              오행과 일간 흐름으로 당신의 러브 코드 페르소나를 찾고, 선택에 따라 달라지는 데이트 케미를 확인하세요.
            </p>

            {error ? (
              <p className="mt-5 rounded-2xl border border-rose-200/24 bg-rose-500/16 px-4 py-3 text-sm text-rose-50">
                {error}
              </p>
            ) : null}

            <button
              type="button"
              onClick={unlockLoveCode}
              disabled={isBusy}
              className="mt-7 inline-flex h-14 w-full items-center justify-center rounded-2xl bg-gradient-to-r from-pink-400 via-fuchsia-400 to-violet-400 px-5 text-base font-black text-white shadow-[0_16px_34px_rgba(217,70,239,.34)] transition hover:scale-[1.01] disabled:cursor-wait disabled:opacity-70"
            >
              {status === "unlocking" ? "잠금 해제 중..." : status === "checking" ? "이용권 확인 중..." : "100코인으로 잠금 해제"}
            </button>
          </div>
        </section>
      </main>
    );
  }

  return <LoveSimulationEngine />;
}
