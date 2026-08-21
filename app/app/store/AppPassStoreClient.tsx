"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { authFetch } from "@/app/_lib/auth-client";
import {
  consumeNativePurchase,
  getNativeBridge,
  isNativeBillingReady,
  queryAppProducts,
  type AppProductDetails,
} from "@/app/app/_lib/native-billing";
import { getAppNumberLocaleTag, useAppCopy, type AppCopy } from "../_lib/copy";
import { getCurrentLoadingLocale } from "@/constants/loadingMessages";

type PassTier = "standard" | "premium" | "vvip" | "family";

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
// 이용권은 30일 기간만 있고 사용 횟수 제한이 없다.
const PASS_TIER_ORDER: PassTier[] = ["standard", "premium", "vvip", "family"];
const PASS_TIER_PRODUCT_ID: Record<PassTier, string> = {
  standard: "cd_pass_standard_30d",
  premium: "cd_pass_premium_30d",
  vvip: "cd_pass_vvip_30d",
  family: "cd_pass_family_30d",
};
const PASS_TIER_RECOMMENDED: Partial<Record<PassTier, boolean>> = { premium: true };

function buildPassPlans(copy: AppCopy): PassPlan[] {
  return PASS_TIER_ORDER.map((passTier) => ({
    passTier,
    productId: PASS_TIER_PRODUCT_ID[passTier],
    title: copy.passPlans[passTier].title,
    blurb: copy.passPlans[passTier].blurb,
    profileLabel: copy.passPlans[passTier].profileLabel,
    recommended: PASS_TIER_RECOMMENDED[passTier],
  }));
}

function buildBenefits(plan: PassPlan, coverageKRW: number | null, copy: AppCopy, locale: ReturnType<typeof getCurrentLoadingLocale>): string[] {
  const formattedAmount = coverageKRW
    ? (locale === "ko" ? `${coverageKRW.toLocaleString(getAppNumberLocaleTag(locale))}원` : `₩${coverageKRW.toLocaleString(getAppNumberLocaleTag(locale))}`)
    : "";
  return [
    coverageKRW
      ? copy.benefitCoverageFreeTemplate.replace("{amount}", formattedAmount)
      : copy.benefitAllFreeFallback,
    // 이용권에 사용 횟수 제한은 없다 — 커버 범위 안이면 30일간 몇 번이든.
    copy.benefitUnlimitedUse,
    plan.profileLabel,
    copy.benefitDurationNote,
  ];
}

type PurchaseState = { tier: string; phase: "idle" | "purchasing" | "verifying" };

const APP_PASS_PURCHASE_DISABLED = true;

export default function AppPassStoreClient() {
  const copy = useAppCopy();
  const locale = getCurrentLoadingLocale();
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
    if (APP_PASS_PURCHASE_DISABLED || !isNativeBillingReady()) {
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

  const buy = useCallback(async (plan: PassPlan) => {
    if (APP_PASS_PURCHASE_DISABLED) {
      setMessage(copy.purchaseWebOnlyMessage);
      return;
    }
    // 중복 탭 방지 — 결제창이 두 번 뜨면 두 번 청구된다.
    if (purchase.phase !== "idle") return;
    setMessage("");
    setPurchase({ tier: plan.passTier, phase: "purchasing" });

    try {
      const bridge = getNativeBridge();
      if (!bridge?.purchase) {
        setMessage(copy.purchaseConnectionNotReadyMessage);
        return;
      }

      const intentResponse = await authFetch("/api/app-store/google/intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passTier: plan.passTier }),
      });
      const intentPayload = await intentResponse.json().catch(() => ({}));
      if (!intentResponse.ok || !intentPayload?.ok) {
        setMessage(String(intentPayload?.message || copy.purchaseProductLoadFailedMessage));
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
          setMessage(String((result as { message?: string })?.message || copy.purchaseNotCompletedMessage));
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
        setMessage(String(verifyPayload?.message || copy.purchaseVerifyFailedMessage));
        return;
      }

      // 소비하지 않으면 Play가 이 상품을 '영구 소유'로 남겨 30일 뒤 재구매가
      // ITEM_ALREADY_OWNED로 막힌다 — 갱신 매출이 통째로 죽는다.
      // 이용권 자체는 서버(profileSubscription)가 들고 있으므로 소비해도 잃지 않는다.
      // 실패해도 되돌리지 않는다: 서버는 이미 지급했고, 구매 복구 경로가 다시 소비한다.
      if (verifyPayload?.data?.appPurchase?.shouldConsume === true && result.purchaseToken) {
        await consumeNativePurchase(result.purchaseToken);
      }

      setMessage(copy.purchaseAppliedTemplate.replace("{title}", plan.title));
      window.dispatchEvent(new CustomEvent("cd:unlocks-changed", {
        detail: { source: "app-pass-store", passTier: plan.passTier },
      }));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : copy.purchaseProcessingErrorMessage);
    } finally {
      setPurchase({ tier: "", phase: "idle" });
    }
  }, [purchase.phase, copy]);

  return (
    <>
      <header className="cd-app-bar px-4 pb-3">
        <h1 className="cd-app-title pt-3">{copy.passStorePageTitle}</h1>
        <p className="cd-app-body mt-1">
          {copy.passStorePageDescription}
        </p>
      </header>
      <section className="grid gap-3 px-4 pb-6" aria-label={copy.passStoreSectionAria}>
      {!nativeReady ? (
        <div className="cd-app-surface p-4">
          <p className="cd-app-heading">{copy.purchaseSuspendedTitle}</p>
          <p className="cd-app-body mt-2">{copy.purchaseSuspendedBody}</p>
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
          const disabled = APP_PASS_PURCHASE_DISABLED || purchase.phase !== "idle" || !detail;
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
                {buildBenefits(plan, coverage[plan.passTier] ?? null, copy, locale).map((benefit) => (
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
                  {busy ? (purchase.phase === "verifying" ? copy.verifyingButton : copy.chargingButton) : copy.buyButton}
                </button>
              </div>
            </article>
          );
        })}

      {message ? (
        <p className="cd-app-body px-1" role="status" aria-live="polite">{message}</p>
      ) : null}

      <p className="cd-app-body mt-2 px-1 text-[12px]">
        {copy.passFooterNote}
      </p>
      </section>
    </>
  );
}
