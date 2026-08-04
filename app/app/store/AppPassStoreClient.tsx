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

type PassPlan = {
  passTier: "standard" | "premium" | "vvip" | "family";
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
const PASS_PLANS: PassPlan[] = [
  {
    passTier: "standard",
    productId: "cd_pass_standard_30d",
    title: "스탠다드",
    blurb: "가볍게 시작하는 30일",
    profileLabel: "프로필 3개",
  },
  {
    passTier: "premium",
    productId: "cd_pass_premium_30d",
    title: "프리미엄",
    blurb: "가장 많이 고르는 구성",
    profileLabel: "프로필 7개",
    recommended: true,
  },
  {
    passTier: "vvip",
    productId: "cd_pass_vvip_30d",
    title: "VVIP",
    blurb: "깊은 상담까지 넉넉하게",
    profileLabel: "프로필 15개",
  },
  {
    passTier: "family",
    productId: "cd_pass_family_30d",
    title: "패밀리",
    blurb: "모든 유료 기능 이용",
    profileLabel: "프로필 무제한",
  },
];

function buildBenefits(plan: PassPlan, coverageKRW: number | null): string[] {
  return [
    coverageKRW
      ? `${coverageKRW.toLocaleString("ko-KR")}원 이하 기능 무료`
      : "모든 유료 기능 무료",
    // 이용권에 사용 횟수 제한은 없다 — 커버 범위 안이면 30일간 몇 번이든.
    "횟수 제한 없이 이용",
    plan.profileLabel,
    "30일 · 자동 갱신 없음",
  ];
}

type PurchaseState = { tier: string; phase: "idle" | "purchasing" | "verifying" };

const APP_PASS_PURCHASE_DISABLED = true;

export default function AppPassStoreClient() {
  const [products, setProducts] = useState<Record<string, AppProductDetails>>({});
  const [coverage, setCoverage] = useState<Record<string, number | null>>({});
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [purchase, setPurchase] = useState<PurchaseState>({ tier: "", phase: "idle" });
  const [message, setMessage] = useState("");
  const [nativeReady, setNativeReady] = useState(true);

  const productIds = useMemo(() => PASS_PLANS.map((plan) => plan.productId), []);

  const loadProducts = useCallback(async () => {
    setLoadingProducts(true);
    // 커버 금액은 서버 가격표가 정본이다(웹 PASS_LIMITS → 앱가 환산). 네이티브 결제가
    // 준비되지 않아도 혜택 표시는 가능하므로 브리지 확인보다 먼저 받아둔다.
    const coverageByTier: Record<string, number | null> = {};
    await Promise.all(PASS_PLANS.map(async (plan) => {
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
  }, [productIds]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadProducts(), 400);
    return () => window.clearTimeout(timer);
  }, [loadProducts]);

  const buy = useCallback(async (plan: PassPlan) => {
    if (APP_PASS_PURCHASE_DISABLED) {
      setMessage("이용권 신규 구매는 웹 PG 단건 결제로만 진행할 수 있습니다.");
      return;
    }
    // 중복 탭 방지 — 결제창이 두 번 뜨면 두 번 청구된다.
    if (purchase.phase !== "idle") return;
    setMessage("");
    setPurchase({ tier: plan.passTier, phase: "purchasing" });

    try {
      const bridge = getNativeBridge();
      if (!bridge?.purchase) {
        setMessage("앱 결제 연결이 준비되지 않았습니다. 앱을 다시 시작해 주세요.");
        return;
      }

      const intentResponse = await authFetch("/api/app-store/google/intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passTier: plan.passTier }),
      });
      const intentPayload = await intentResponse.json().catch(() => ({}));
      if (!intentResponse.ok || !intentPayload?.ok) {
        setMessage(String(intentPayload?.message || "이용권 상품을 불러오지 못했습니다."));
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
          setMessage(String((result as { message?: string })?.message || "결제가 완료되지 않았습니다."));
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
        setMessage(String(verifyPayload?.message || "결제 확인에 실패했습니다. 잠시 후 홈에서 자동으로 복구됩니다."));
        return;
      }

      // 소비하지 않으면 Play가 이 상품을 '영구 소유'로 남겨 30일 뒤 재구매가
      // ITEM_ALREADY_OWNED로 막힌다 — 갱신 매출이 통째로 죽는다.
      // 이용권 자체는 서버(profileSubscription)가 들고 있으므로 소비해도 잃지 않는다.
      // 실패해도 되돌리지 않는다: 서버는 이미 지급했고, 구매 복구 경로가 다시 소비한다.
      if (verifyPayload?.data?.appPurchase?.shouldConsume === true && result.purchaseToken) {
        await consumeNativePurchase(result.purchaseToken);
      }

      setMessage(`${plan.title} 이용권이 적용되었습니다.`);
      window.dispatchEvent(new CustomEvent("cd:unlocks-changed", {
        detail: { source: "app-pass-store", passTier: plan.passTier },
      }));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "결제 처리 중 문제가 생겼습니다.");
    } finally {
      setPurchase({ tier: "", phase: "idle" });
    }
  }, [purchase.phase]);

  return (
    <section className="grid gap-3 px-4 pb-6" aria-label="이용권 구매">
      {!nativeReady ? (
        <div className="cd-app-surface p-4">
          <p className="cd-app-heading">Google Play 이용권 신규 구매는 중단되었습니다.</p>
          <p className="cd-app-body mt-2">이용권 상품은 웹 PG 단건 결제로만 구매할 수 있습니다. 월정석으로는 이용권을 구매할 수 없습니다.</p>
          <button
            type="button"
            onClick={() => void loadProducts()}
            className="cd-app-tap cd-app-press mt-3 rounded-[var(--cd-app-radius-md)] px-4 text-sm font-bold"
            style={{ background: "var(--cd-app-gold)", color: "var(--cd-app-on-gold)" }}
          >
            다시 시도
          </button>
        </div>
      ) : null}

      {loadingProducts
        ? PASS_PLANS.map((plan) => <div key={plan.passTier} className="cd-app-skeleton h-[168px]" aria-hidden="true" />)
        : PASS_PLANS.map((plan, index) => {
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
                    추천
                  </span>
                ) : null}
              </div>

              <ul className="mt-3 grid list-none gap-1.5 p-0">
                {buildBenefits(plan, coverage[plan.passTier] ?? null).map((benefit) => (
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
                  {busy ? (purchase.phase === "verifying" ? "확인 중" : "결제 중") : "구매"}
                </button>
              </div>
            </article>
          );
        })}

      {message ? (
        <p className="cd-app-body px-1" role="status" aria-live="polite">{message}</p>
      ) : null}

      <p className="cd-app-body mt-2 px-1 text-[12px]">
        이용권은 30일간 유효하며 사용 횟수 제한이 없습니다. 자동 갱신되지 않습니다.
        커버 범위를 넘는 기능은 단건 결제 또는 월정석으로 이용할 수 있습니다.
        결제·환불은 Google Play 정책과 전자상거래법에 따릅니다.
      </p>
    </section>
  );
}
