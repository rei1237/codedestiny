"use client";

import { useState } from "react";
import { authFetch } from "@/app/_lib/auth-client";

type NativeProvider = "google" | "naver" | "kakao";

type NativePurchaseResult = {
  productId?: string;
  productType?: string;
  purchaseToken?: string;
  packageName?: string;
  orderId?: string;
  purchaseState?: number | string;
  acknowledged?: boolean;
};

type NativeBridge = {
  openAuth?: (input: { provider: NativeProvider; nextPath?: string }) => Promise<{ ok?: boolean; message?: string }>;
  restore?: (input?: { productType?: "inapp" | "subs" | "all" }) => Promise<{
    ok?: boolean;
    message?: string;
    purchases?: NativePurchaseResult[];
  }>;
};

function getNativeBridge() {
  return (window as unknown as { CodeDestinyNative?: NativeBridge }).CodeDestinyNative;
}

export default function MobileAppActions() {
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  async function startAuth(provider: NativeProvider) {
    setStatus("");
    const result = await getNativeBridge()?.openAuth?.({ provider, nextPath: "/app" });
    if (result && result.ok === false) setStatus(result.message || "로그인을 시작할 수 없습니다.");
  }

  async function restorePurchases() {
    setBusy(true);
    setStatus("구매 내역을 확인하고 있습니다.");
    try {
      const nativeResult = await getNativeBridge()?.restore?.({ productType: "all" });
      if (!nativeResult?.ok) {
        setStatus(nativeResult?.message || "구매 복원을 시작할 수 없습니다.");
        return;
      }

      const response = await authFetch("/api/app-store/google/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ purchases: nativeResult.purchases || [] }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload?.ok) {
        setStatus(payload?.message || "구매 복원에 실패했습니다.");
        return;
      }
      const restored = Array.isArray(payload?.data?.restoredFeatures) ? payload.data.restoredFeatures.length : 0;
      setStatus(restored > 0 ? `복원 완료: ${restored}개 권한` : "복원할 구매 권한이 없습니다.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "구매 복원에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="grid gap-3 rounded-[18px] border border-white/10 bg-white/[0.055] p-4">
      <div className="grid grid-cols-3 gap-2">
        {(["google", "naver", "kakao"] as const).map((provider) => (
          <button
            key={provider}
            type="button"
            onClick={() => void startAuth(provider)}
            className="min-h-11 rounded-xl border border-white/10 bg-slate-950/65 px-2 text-xs font-black uppercase text-slate-100"
          >
            {provider}
          </button>
        ))}
      </div>
      <button
        type="button"
        disabled={busy}
        onClick={() => void restorePurchases()}
        className="min-h-11 rounded-xl bg-[#f3d680] px-3 text-sm font-black text-[#111827] disabled:opacity-60"
      >
        구매 복원
      </button>
      {status ? <p className="m-0 text-xs font-semibold leading-5 text-slate-200/80">{status}</p> : null}
    </section>
  );
}
