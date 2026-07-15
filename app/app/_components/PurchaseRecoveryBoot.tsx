"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { authFetch } from "@/app/_lib/auth-client";
import {
  consumeNativePurchase,
  isNativeBillingReady,
  PURCHASE_STATE_PENDING,
  restoreNativePurchases,
  type AppNativePurchase,
} from "@/app/app/_lib/native-billing";

type RestoreResponse = {
  ok?: boolean;
  data?: {
    restoredFeatures?: string[];
    purchases?: Array<{ featureKey?: string; shouldConsume?: boolean; purchaseToken?: string }>;
    failedPurchases?: Array<{ code?: string; message?: string }>;
  };
};

/**
 * 미완료 구매 자동 복구.
 *
 * Play 결제는 앱 밖(Play 결제 시트)에서 끝나므로, 결제 직후 앱이 죽거나 네트워크가 끊기면
 * "돈은 나갔는데 콘텐츠는 없는" 상태가 남는다. 앱 시작·포그라운드 복귀마다
 * queryPurchasesAsync로 훑어 서버 검증을 다시 태우는 것이 유일한 안전망이다.
 *
 * PENDING(편의점 결제 등)은 아직 결제가 끝난 게 아니라 지급 대상이 아니다 — 안내만 띄운다.
 */
export default function PurchaseRecoveryBoot() {
  const [pendingCount, setPendingCount] = useState(0);
  const runningRef = useRef(false);

  const recover = useCallback(async () => {
    if (runningRef.current || !isNativeBillingReady()) return;
    runningRef.current = true;
    try {
      const purchases = await restoreNativePurchases();
      if (!purchases.length) {
        setPendingCount(0);
        return;
      }

      const pending = purchases.filter((purchase) => Number(purchase.purchaseState) === PURCHASE_STATE_PENDING);
      setPendingCount(pending.length);

      // PENDING은 아직 결제 확정 전이라 서버로 보내지 않는다(검증에서 402로 떨어진다).
      const settled: AppNativePurchase[] = purchases.filter(
        (purchase) => Number(purchase.purchaseState) !== PURCHASE_STATE_PENDING,
      );
      if (!settled.length) return;

      const response = await authFetch("/api/app-store/google/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ purchases: settled }),
      });
      const payload = (await response.json().catch(() => ({}))) as RestoreResponse;
      if (!response.ok || !payload?.ok) return;

      // 회당 결제는 지급 후 소비해야 재구매가 열린다.
      for (const purchase of payload.data?.purchases || []) {
        if (purchase.shouldConsume === true && purchase.purchaseToken) {
          await consumeNativePurchase(purchase.purchaseToken);
        }
      }

      if (Array.isArray(payload.data?.restoredFeatures) && payload.data.restoredFeatures.length) {
        window.dispatchEvent(new CustomEvent("cd:unlocks-changed", {
          detail: { source: "app-purchase-recovery", features: payload.data.restoredFeatures },
        }));
      }
    } catch {
      // 복구는 다음 포그라운드 복귀에서 다시 시도된다 — 실패를 사용자에게 알릴 필요 없다.
    } finally {
      runningRef.current = false;
    }
  }, []);

  useEffect(() => {
    // 브리지(MobileAppRuntimeBridge)가 설치되기 전에 뜰 수 있어 한 박자 늦춘다.
    const timer = window.setTimeout(() => void recover(), 600);
    const onVisible = () => {
      if (document.visibilityState === "visible") void recover();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [recover]);

  if (!pendingCount) return null;

  return (
    <div
      className="cd-app-surface cd-app-enter mx-4 mt-3 p-4"
      role="status"
      aria-live="polite"
    >
      <p className="cd-app-heading">결제 승인을 기다리는 중입니다</p>
      <p className="cd-app-body mt-2">
        승인이 완료되면 콘텐츠가 자동으로 열립니다. 편의점·계좌이체 결제는 입금 확인까지 시간이 걸릴 수 있습니다.
      </p>
    </div>
  );
}
