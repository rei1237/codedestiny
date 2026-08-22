"use client";

import { useState } from "react";
import { authFetch } from "@/app/_lib/auth-client";
import { consumeNativePurchase, restoreNativePurchases } from "@/app/app/_lib/native-billing";
import { useAppShellCopy } from "@/app/app/_lib/copy";

type NativeProvider = "google" | "naver" | "kakao";

type NativeBridge = {
  openAuth?: (input: { provider: NativeProvider; nextPath?: string }) => Promise<{ ok?: boolean; message?: string }>;
};

function getNativeBridge() {
  return (window as unknown as { CodeDestinyNative?: NativeBridge }).CodeDestinyNative;
}

export default function MobileAppActions() {
  const copy = useAppShellCopy();
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  async function startAuth(provider: NativeProvider) {
    setStatus("");
    const result = await getNativeBridge()?.openAuth?.({ provider, nextPath: "/app" });
    if (result && result.ok === false) setStatus(result.message || copy.authStartFailedFallback);
  }

  // 미완료 구매는 PurchaseRecoveryBoot가 앱 시작·포그라운드 복귀마다 자동 복구한다.
  // 이 버튼은 사용자가 직접 확인하고 싶을 때를 위한 보조 수단이다.
  async function restorePurchases() {
    setBusy(true);
    setStatus(copy.restoreCheckingText);
    try {
      const purchases = await restoreNativePurchases();
      const response = await authFetch("/api/app-store/google/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ purchases }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload?.ok) {
        setStatus(payload?.message || copy.restoreFailedFallback);
        return;
      }

      // 회당 결제는 지급 후 소비해야 재구매가 열린다.
      for (const purchase of payload?.data?.purchases || []) {
        if (purchase?.shouldConsume === true && purchase?.purchaseToken) {
          await consumeNativePurchase(String(purchase.purchaseToken));
        }
      }

      const restored = Array.isArray(payload?.data?.restoredFeatures) ? payload.data.restoredFeatures.length : 0;
      setStatus(restored > 0 ? copy.restoreCompleteText(restored) : copy.restoreNoneText);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : copy.restoreFailedFallback);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="cd-app-surface grid gap-3 p-4" aria-label={copy.accountSectionAriaLabel}>
      <div className="grid grid-cols-3 gap-2">
        {(["google", "naver", "kakao"] as const).map((provider) => (
          <button
            key={provider}
            type="button"
            onClick={() => void startAuth(provider)}
            className="cd-app-tap cd-app-press rounded-[var(--cd-app-radius-md)] px-2 text-xs font-black uppercase"
            style={{
              border: "1px solid var(--cd-app-line-strong)",
              background: "var(--cd-app-bg-sunken)",
              color: "var(--cd-app-ink)",
            }}
          >
            {provider}
          </button>
        ))}
      </div>
      <button
        type="button"
        disabled={busy}
        aria-busy={busy}
        onClick={() => void restorePurchases()}
        className="cd-app-tap cd-app-press rounded-[var(--cd-app-radius-md)] px-3 text-sm font-black disabled:opacity-50"
        style={{ background: "var(--cd-app-gold)", color: "var(--cd-app-on-gold)" }}
      >
        {copy.restoreButtonLabel}
      </button>
      {status ? <p className="cd-app-body" role="status" aria-live="polite">{status}</p> : null}
    </section>
  );
}
