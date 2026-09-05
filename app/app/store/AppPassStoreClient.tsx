"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { authFetch } from "@/app/_lib/auth-client";
import { clearSubscriptionSnapshotForUser, saveSubscriptionSnapshotForUser } from "@/app/_lib/billing-client";
import { checkoutEntryRuntime as checkoutEntry } from "@/app/_lib/legacy-core-runtime";
import { refreshUserAccessAfterPayment } from "@/app/_lib/user-session-cache";
import {
  consumeNativePurchase,
  getNativeBridge,
  isNativeBillingReady,
  queryAppProducts,
  type AppProductDetails,
} from "@/app/app/_lib/native-billing";
import { useAppShellCopy, type AppShellCopy, type PassTier } from "@/app/app/_lib/copy";
// 🔴 순수 상수 테이블이라 클라이언트 번들에 안전하게 들어간다(worker 전용 모듈을 import 하지 않는다).
import { MONTHLY_PASS_LIMITS_KRW } from "@/worker/lib/profile-limits";

type PassPlan = {
  passTier: PassTier;
  productId: string;
  title: string;
  blurb: string;
  profileLabel: string;
  recommended?: boolean;
};

// productId는 서버 가격표(worker/lib/app-store-pricing.js)와 Play Console 등록값의 정본이다.
// 표시 가격은 여기 두지 않는다 — Play의 formattedPrice를 받아 쓴다.
// 커버 금액도 여기 두지 않는다 — 서버가 웹 정본(PASS_LIMITS)에서 앱가로 환산해 내려준다.
// 🔴 월 이용 한도 금액도 여기 적지 않는다 — 서버 정본 MONTHLY_PASS_LIMITS_KRW 를 import 해서 쓴다.
//    "횟수 제한 없음"은 쓰지 않는다(2026-08-24): 모든 등급에 월 이용 한도가 있어 모순이다.
function buildPassPlans(copy: AppShellCopy): PassPlan[] {
  return [
    { passTier: "standard", productId: "cd_pass_standard_30d", ...copy.passPlans.standard },
    { passTier: "premium", productId: "cd_pass_premium_30d", ...copy.passPlans.premium, recommended: true },
    { passTier: "vvip", productId: "cd_pass_vvip_30d", ...copy.passPlans.vvip },
    { passTier: "family", productId: "cd_pass_family_30d", ...copy.passPlans.family },
  ];
}

function buildBenefits(copy: AppShellCopy, plan: PassPlan, coverageKRW: number | null): string[] {
  const monthlyCapKRW = Number(MONTHLY_PASS_LIMITS_KRW[plan.passTier] || 0);
  return [
    coverageKRW
      ? copy.benefitCoverageFree(`${coverageKRW.toLocaleString("ko-KR")}원`)
      : copy.benefitAllFree,
    copy.benefitMonthlyCap(`${monthlyCapKRW.toLocaleString("ko-KR")}원`),
    plan.profileLabel,
    copy.benefit30Days,
  ];
}

type PurchaseState = { tier: string; phase: "idle" | "purchasing" | "verifying" };

export default function AppPassStoreClient() {
  const copy = useAppShellCopy();
  const passPlans = useMemo(() => buildPassPlans(copy), [copy]);
  const [products, setProducts] = useState<Record<string, AppProductDetails>>({});
  const [coverage, setCoverage] = useState<Record<string, number | null>>({});
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [purchase, setPurchase] = useState<PurchaseState>({ tier: "", phase: "idle" });
  const [message, setMessage] = useState("");
  const [nativeReady, setNativeReady] = useState(true);

  const productIds = useMemo(() => passPlans.map((plan) => plan.productId), [passPlans]);

  const loadProducts = useCallback(async () => {
    setLoadingProducts(true);
    // 커버 금액은 서버 가격표가 정본이다(웹 PASS_LIMITS → 앱가 환산). 네이티브 결제가
    // 준비되지 않아도 혜택 표시는 가능하므로 브리지 확인보다 먼저 받아둔다.
    const coverageByTier: Record<string, number | null> = {};
    await Promise.all(passPlans.map(async (plan) => {
      try {
        const response = await authFetch(`/api/app-store/products?passTier=${plan.passTier}`, { method: "GET" });
        const payload = await response.json().catch(() => ({}));
        coverageByTier[plan.passTier] = response.ok && payload?.ok
          ? (payload?.data?.product?.coverageKRW ?? null)
          : null;
      } catch {
        coverageByTier[plan.passTier] = null;
      }
    }));
    setCoverage(coverageByTier);

    // 브리지 설치 직후에는 아직 안 붙어 있을 수 있다.
    if (!isNativeBillingReady()) {
      setNativeReady(false);
      setLoadingProducts(false);
      return;
    }
    setNativeReady(true);
    const details = await queryAppProducts(productIds);
    const byId: Record<string, AppProductDetails> = {};
    for (const detail of details) byId[detail.productId] = detail;
    setProducts(byId);
    setLoadingProducts(false);
  }, [productIds, passPlans]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadProducts(), 400);
    return () => window.clearTimeout(timer);
  }, [loadProducts]);

  // 결제창의 [이용권으로 구매] 로 들어온 사용자를 구매 성공 뒤 원래 콘텐츠로 돌려보낸다.
  // 티켓은 앱 결제 가드(scripts/app-payment-guard.js openAppStore)가 상점으로 떠나기 전에 쓴다.
  // 짝: app/points/PointsClient.tsx scheduleCheckoutReturn — 도착한 화면의 진입 판정은 로컬 스냅샷만
  // 보므로 떠나기 전에 서버 정본으로 스냅샷을 예열해야 방금 산 사용자에게 결제창이 다시 뜨지 않는다.
  // 실패·지연(상한 2.5s)이면 스냅샷을 지워 미확정으로 두고, 최소 체류 1.2s 뒤 이동한다.
  const scheduleCheckoutReturn = useCallback((title: string): boolean => {
    if (typeof window === "undefined") return false;
    let target: { url?: string } | null = null;
    try {
      target = checkoutEntry.consumeCheckoutReturn();
    } catch {
      return false; // 코어 미로드면 종전 동작(메시지만)으로 남는다
    }
    const returnUrl = String(target?.url || "");
    if (!returnUrl) return false;
    setMessage(copy.purchaseReturningMessage(title));
    const departAt = Date.now() + 1200;
    const warmFreshSnapshot = async (): Promise<boolean> => {
      const response = await authFetch("/api/subscription/status", {
        method: "GET",
        headers: { "x-code-destiny-cache-refresh": "1" },
      });
      const payload = await response.json().catch(() => null) as { degraded?: boolean } | null;
      if (!response.ok || !payload || payload.degraded === true) return false;
      return saveSubscriptionSnapshotForUser(undefined, payload, "app-store-return") !== null;
    };
    void (async () => {
      let warmed = false;
      try {
        warmed = await Promise.race([
          warmFreshSnapshot(),
          new Promise<boolean>((resolve) => { window.setTimeout(() => resolve(false), 2500); }),
        ]);
      } catch { warmed = false; }
      if (!warmed) {
        try { clearSubscriptionSnapshotForUser(); } catch { /* 스냅샷 정리 실패는 복귀를 막지 않는다 */ }
      }
      window.setTimeout(() => { window.location.assign(returnUrl); }, Math.max(0, departAt - Date.now()));
    })();
    return true;
  }, [copy]);

  const buy = useCallback(async (plan: PassPlan) => {
    // 중복 탭 방지 — 결제창이 두 번 뜨면 두 번 청구된다.
    if (purchase.phase !== "idle") return;
    setMessage("");
    setPurchase({ tier: plan.passTier, phase: "purchasing" });

    try {
      const bridge = getNativeBridge();
      if (!bridge?.purchase) {
        setMessage(copy.billingNotReadyMessage);
        return;
      }

      const intentResponse = await authFetch("/api/app-store/google/intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passTier: plan.passTier }),
      });
      const intentPayload = await intentResponse.json().catch(() => ({}));
      if (!intentResponse.ok || !intentPayload?.ok) {
        setMessage(String(intentPayload?.message || copy.productLoadFailedMessage));
        return;
      }

      const result = await bridge.purchase({
        featureKey: `app-pass-${plan.passTier}`,
        productId: plan.productId,
        productType: "inapp",
        obfuscatedAccountId: String(intentPayload?.data?.obfuscatedAccountId || ""),
      });
      if (!result || result.ok === false) {
        // 사용자가 결제창을 닫은 것은 오류가 아니다.
        if (String((result as { code?: string })?.code) !== "USER_CANCELED") {
          setMessage(String((result as { message?: string })?.message || copy.paymentIncompleteMessage));
        }
        return;
      }

      setPurchase({ tier: plan.passTier, phase: "verifying" });
      const verifyResponse = await authFetch("/api/app-store/google/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          passTier: plan.passTier,
          productId: plan.productId,
          productType: "inapp",
          purchaseToken: result.purchaseToken,
          packageName: result.packageName,
          orderId: result.orderId,
          purchaseState: result.purchaseState,
          acknowledged: result.acknowledged,
          provider: "GOOGLE_PLAY",
        }),
      });
      const verifyPayload = await verifyResponse.json().catch(() => ({}));
      if (!verifyResponse.ok || !verifyPayload?.ok) {
        setMessage(String(verifyPayload?.message || copy.verifyFailedMessage));
        return;
      }

      // 소비하지 않으면 Play가 이 상품을 '영구 소유'로 남겨 30일 뒤 재구매가
      // ITEM_ALREADY_OWNED로 막힌다 — 갱신 매출이 통째로 죽는다.
      // 이용권 자체는 서버(profileSubscription)가 들고 있으므로 소비해도 잃지 않는다.
      // 실패해도 되돌리지 않는다: 서버는 이미 지급했고, 구매 복구 경로가 다시 소비한다.
      if (verifyPayload?.data?.appPurchase?.shouldConsume === true && result.purchaseToken) {
        await consumeNativePurchase(result.purchaseToken);
      }

      window.dispatchEvent(new CustomEvent("cd:unlocks-changed", {
        detail: { source: "app-pass-store", passTier: plan.passTier },
      }));
      // 서버가 이용권을 반영했으니 access 스냅샷을 강제 갱신한다(웹 /points 확정 경로와 같은 순서).
      refreshUserAccessAfterPayment().catch(() => { /* 갱신 실패는 구매 결과를 바꾸지 않는다 */ });
      if (!scheduleCheckoutReturn(plan.title)) {
        setMessage(copy.purchaseAppliedMessage(plan.title));
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : copy.purchaseErrorGeneric);
    } finally {
      setPurchase({ tier: "", phase: "idle" });
    }
  }, [purchase.phase, copy, scheduleCheckoutReturn]);

  return (
    <section className="grid gap-3 px-4 pb-6" aria-label={copy.storeAriaLabel}>
      {!nativeReady ? (
        <div className="cd-app-surface p-4">
          <p className="cd-app-heading">{copy.billingNotReadyTitle}</p>
          <p className="cd-app-body mt-2">{copy.billingNotReadyBody}</p>
          <button
            type="button"
            onClick={() => void loadProducts()}
            className="cd-app-tap cd-app-press mt-3 rounded-[var(--cd-app-radius-md)] px-4 text-sm font-bold"
            style={{ background: "var(--cd-app-gold)", color: "var(--cd-app-on-gold)" }}
          >
            {copy.retryButton}
          </button>
        </div>
      ) : null}

      {loadingProducts
        ? passPlans.map((plan) => <div key={plan.passTier} className="cd-app-skeleton h-[168px]" aria-hidden="true" />)
        : passPlans.map((plan, index) => {
          const detail = products[plan.productId];
          const busy = purchase.tier === plan.passTier;
          const disabled = purchase.phase !== "idle" || !detail;
          return (
            <article
              key={plan.passTier}
              className="cd-app-surface cd-app-enter p-4"
              style={{
                animationDelay: `${index * 40}ms`,
                borderColor: plan.recommended ? "var(--cd-app-gold-deep)" : undefined,
              }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="cd-app-heading">{plan.title}</h2>
                  <p className="cd-app-body mt-1">{plan.blurb}</p>
                </div>
                {plan.recommended ? (
                  <span
                    className="shrink-0 rounded-[var(--cd-app-radius-pill)] px-2.5 py-1 text-[11px] font-black"
                    style={{ background: "var(--cd-app-gold)", color: "var(--cd-app-on-gold)" }}
                  >
                    {copy.recommendedBadge}
                  </span>
                ) : null}
              </div>

              <ul className="mt-3 grid list-none gap-1.5 p-0">
                {buildBenefits(copy, plan, coverage[plan.passTier] ?? null).map((benefit) => (
                  <li key={benefit} className="flex items-center gap-2 text-[13px] leading-6" style={{ color: "var(--cd-app-ink-muted)" }}>
                    <Check className="h-3.5 w-3.5 shrink-0" style={{ color: "var(--cd-app-gold)" }} aria-hidden="true" />
                    {benefit}
                  </li>
                ))}
              </ul>

              <div className="mt-4 flex items-center justify-between gap-3">
                {/* 가격은 Play가 준 formattedPrice를 그대로 쓴다 — 하드코딩하면 Play Console 변경과 어긋난다. */}
                <span className="cd-app-num text-lg font-black" style={{ color: "var(--cd-app-gold)" }}>
                  {detail?.formattedPrice || "—"}
                </span>
                <button
                  type="button"
                  disabled={disabled}
                  aria-busy={busy}
                  onClick={() => void buy(plan)}
                  className="cd-app-tap cd-app-press inline-flex items-center gap-2 rounded-[var(--cd-app-radius-md)] px-5 text-sm font-black disabled:opacity-50"
                  style={{ background: "var(--cd-app-gold)", color: "var(--cd-app-on-gold)" }}
                >
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
                  {busy ? (purchase.phase === "verifying" ? copy.verifyingButton : copy.purchasingButton) : copy.buyButton}
                </button>
              </div>
            </article>
          );
        })}

      {message ? (
        <p className="cd-app-body px-1" role="status" aria-live="polite">{message}</p>
      ) : null}

      <p className="cd-app-body mt-2 px-1 text-[12px]">
        {copy.footerNote}
        <br />
        {copy.passTerminationNote}
      </p>
    </section>
  );
}
