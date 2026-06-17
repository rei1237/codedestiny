"use client";

import { useCallback, useRef, useState } from "react";
import { getAuthState, refreshAuth } from "../_lib/auth-store";
import {
  PAID_SERVICE_RUNTIME_SRC,
  runBillingCoinGate,
} from "../_lib/billing-client";
import {
  logPaidAttemptEvent,
  markPaidAttemptFailed,
  markPaidAttemptGenerationCompleted,
  markPaidAttemptGenerationStarted,
} from "../_lib/paid-attempt-session";
import { usePayment } from "./usePayment";

type CoinGateContext = {
  transactionId: string;
  chargedCoins: number;
  requiredCoins: number;
  amountKRW?: number;
  balanceAfter: number;
  featureKey: string;
  accessSource: "subscription" | "moonlight_stone" | "coin" | "payment";
  accessType: string;
  paymentMode: string;
  subscriptionTier: string;
  monthlyCreditsSpent: number;
  monthlyBalanceAfter: number | null;
};

type EnsurePaidAccessInput = {
  categoryKey?: string;
  subFeatureKey?: string;
  featureKey?: string;
  reason?: string;
  payloadHash?: string;
  forceDeduct?: boolean;
  requestId?: string;
  skipAuthCheck?: boolean;
  onPaid?: (context: CoinGateContext) => Promise<void> | void;
};

type EnsurePaidAccessResult = {
  ok: boolean;
  code: string;
  message: string;
  requiredCoins: number;
  chargedCoins: number;
  balanceAfter: number;
  transactionId: string;
  refunded: boolean;
};

type RuntimePaidServiceGateResult = {
  status?: string;
  reason?: string;
  transactionId?: string;
  paymentId?: string;
  purchaseId?: string;
  requestId?: string;
  payload?: Record<string, unknown>;
  data?: Record<string, unknown>;
};

type RuntimePaidServiceGateWindow = Window & {
  _cdOpenPaidServiceGate?: (options: Record<string, unknown>) => Promise<RuntimePaidServiceGateResult> | RuntimePaidServiceGateResult;
};

const LEGACY_PAYMENT_RUNTIME_SRC = PAID_SERVICE_RUNTIME_SRC;

let legacyPaymentRuntimePromise: Promise<RuntimePaidServiceGateWindow["_cdOpenPaidServiceGate"] | null> | null = null;

function toText(value: unknown): string {
  return String(value || "").trim();
}

function toNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function firstFiniteNonNegativeNumber(...candidates: unknown[]): number | null {
  for (const candidate of candidates) {
    if (candidate === null || candidate === undefined || candidate === "") continue;
    const value = Number(candidate);
    if (Number.isFinite(value) && value >= 0) return Math.floor(value);
  }
  return null;
}

function normalizeCode(value: unknown): string {
  return String(value || "").trim().toUpperCase();
}

function getRuntimePaidServiceGate() {
  if (typeof window === "undefined") return null;
  const runtimeWindow = window as RuntimePaidServiceGateWindow;
  return typeof runtimeWindow._cdOpenPaidServiceGate === "function" ? runtimeWindow._cdOpenPaidServiceGate : null;
}

function loadRuntimePaidServiceGate() {
  const current = getRuntimePaidServiceGate();
  if (current) return Promise.resolve(current);
  if (typeof document === "undefined") return Promise.resolve(null);
  if (legacyPaymentRuntimePromise) return legacyPaymentRuntimePromise;

  legacyPaymentRuntimePromise = new Promise((resolve) => {
    const finish = () => resolve(getRuntimePaidServiceGate());
    const existing = document.querySelector<HTMLScriptElement>('script[src^="/js/destiny-profile.js"]');
    if (existing) {
      existing.addEventListener("load", finish, { once: true });
      existing.addEventListener("error", () => resolve(null), { once: true });
      window.setTimeout(finish, 1200);
      return;
    }

    const script = document.createElement("script");
    script.src = LEGACY_PAYMENT_RUNTIME_SRC;
    script.async = true;
    script.dataset.cdPaymentRuntimeLoader = "1";
    script.onload = finish;
    script.onerror = () => resolve(null);
    document.head.appendChild(script);
  });

  return legacyPaymentRuntimePromise;
}

function unwrapRuntimeGatePayload(result: RuntimePaidServiceGateResult | null | undefined) {
  const payload = result?.payload && typeof result.payload === "object"
    ? result.payload
    : (result?.data && typeof result.data === "object" ? result.data : result);
  return (payload && typeof payload === "object" ? payload : {}) as Record<string, unknown>;
}

function isRuntimeGateGranted(result: RuntimePaidServiceGateResult | null | undefined) {
  const payload = unwrapRuntimeGatePayload(result);
  const status = String(result?.status || payload.status || "").trim().toLowerCase();
  return status === "granted"
    || status === "paid"
    || status === "success"
    || Boolean(payload.accessGrant)
    || Boolean(payload.premiumAccessToken)
    || Boolean(payload.consume)
    || Boolean(payload.payment);
}

function readNestedObject(source: Record<string, unknown>, key: string) {
  const value = source[key];
  return value && typeof value === "object" ? value as Record<string, unknown> : {};
}

function resolveLoginRequired(code: string, status: number) {
  const normalized = normalizeCode(code);
  return (
    status === 401
    || status === 403
    || normalized === "AUTH_REQUIRED"
    || normalized === "LOGIN_REQUIRED"
    || normalized === "UNAUTHORIZED"
  );
}

export function useCoinGate() {
  const { startPayment, endPayment, setPaymentMessage } = usePayment();
  const inFlightRef = useRef(false);
  const [isPaying, setIsPaying] = useState(false);

  const ensurePaidAccess = useCallback(async (input: EnsurePaidAccessInput): Promise<EnsurePaidAccessResult> => {
    if (inFlightRef.current) {
      return {
        ok: false,
        code: "PAYMENT_IN_PROGRESS",
        message: "결제가 이미 진행 중입니다. 잠시만 기다려 주세요.",
        requiredCoins: 0,
        chargedCoins: 0,
        balanceAfter: 0,
        transactionId: "",
        refunded: false,
      };
    }

    inFlightRef.current = true;
    setIsPaying(true);
    startPayment("이용권을 확인하고 있어요.", "pass-checking");

    let requiredCoins = 0;

    try {
      if (!input.skipAuthCheck) {
        const authState = getAuthState();
        if (!authState.isAuthenticated) {
          logPaidAttemptEvent("PaidAttempt.AuthHydrating", {
            reason: "ensure_paid_access_refresh_auth",
          });
          try {
            await refreshAuth({ force: true, silent: true });
          } catch (e) {
            // ignore auth refresh errors here; final state check below determines result.
          }
        }

        const finalAuth = getAuthState();
        if (!finalAuth.isAuthenticated) {
          return {
            ok: false,
            code: "AUTH_REQUIRED",
            message: "로그인이 필요합니다.",
            requiredCoins: 0,
            chargedCoins: 0,
            balanceAfter: 0,
            transactionId: "",
            refunded: false,
          };
        }
      }

      setPaymentMessage("이용권과 기존 잠금 해제 내역을 확인하고 있어요.");

      const chargeResult = await runBillingCoinGate({
        categoryKey: input.categoryKey,
        subFeatureKey: input.subFeatureKey,
        featureKey: input.featureKey,
        reason: input.reason,
        payloadHash: input.payloadHash,
        forceDeduct: input.forceDeduct,
        requestId: input.requestId,
      });

      if (!chargeResult.ok || !chargeResult.data) {
        const rawData = readNestedObject(chargeResult.raw, "data");
        const dataPricing = readNestedObject(rawData, "pricing");
        const rawPricing = Object.keys(dataPricing).length ? dataPricing : readNestedObject(chargeResult.raw, "pricing");
        requiredCoins = toNumber(rawPricing.cost ?? rawPricing.coinPrice ?? chargeResult.raw.requiredCoins, requiredCoins);
        const code = normalizeCode(chargeResult.error?.code || "SERVER_ERROR") || "SERVER_ERROR";
        const message = toText(chargeResult.error?.message || chargeResult.message || "단건 결제가 필요합니다.") || "단건 결제가 필요합니다.";

        if (resolveLoginRequired(code, chargeResult.status)) {
          return {
            ok: false,
            code: "AUTH_REQUIRED",
            message: "로그인이 필요합니다.",
            requiredCoins,
            chargedCoins: 0,
            balanceAfter: 0,
            transactionId: "",
            refunded: false,
          };
        }

        if (chargeResult.status === 402 || code === "PAYMENT_REQUIRED") {
          return {
            ok: false,
            code: "PAYMENT_REQUIRED",
            message,
            requiredCoins,
            chargedCoins: 0,
            balanceAfter: 0,
            transactionId: "",
            refunded: false,
          };
        }

        return {
          ok: false,
          code,
          message,
          requiredCoins,
          chargedCoins: 0,
          balanceAfter: 0,
          transactionId: "",
          refunded: false,
        };
      }

      requiredCoins = toNumber(chargeResult.data.pricing?.cost ?? chargeResult.data.pricing?.coinPrice, requiredCoins);
      const amountKRW = toNumber(chargeResult.data.pricing?.amountKRW || chargeResult.data.pricing?.cashPrice, 0);
      const consume = (chargeResult.data.consume || {}) as Record<string, unknown>;
      const transactionId = toText(consume.transactionId || consume._id || "");
      const balanceAfter = toNumber(chargeResult.data.balance, 0);
      const resolvedFeatureKey = toText(consume.featureKey || input.featureKey || chargeResult.data.pricing?.featureKey);
      const chargeData = chargeResult.data as Record<string, unknown>;
      const chargePricing = readNestedObject(chargeData, "pricing");
      const chargeAccessGrant = readNestedObject(chargeData, "accessGrant");
      const chargeAccessMethod = normalizeCode(chargeData.accessMethod || consume.accessMethod || consume.paymentMethod || chargeAccessGrant.accessMethod);
      const chargePaymentMode = normalizeCode(chargeData.paymentMode || consume.paymentMode || consume.paymentMethod || chargeAccessGrant.paymentMode || chargeAccessGrant.paymentMethod);
      const chargeCurrency = normalizeCode(chargeData.currency || consume.currency || chargePricing.currency || chargeAccessGrant.currency);
      const chargeAccessType = toText(chargeData.accessType || consume.accessType || consume.transactionType || chargeAccessGrant.accessType).toLowerCase();
      const chargeAccessSignal = `${chargeAccessType}|${chargeAccessMethod}|${chargePaymentMode}|${chargeCurrency}`.toLowerCase();
      const chargePassGranted = Boolean(
        chargeData.freeBySubscription === true
          || chargeAccessMethod === "PASS"
          || chargeAccessMethod === "FAMILY"
          || chargeAccessSignal.includes("family")
          || chargeAccessSignal.includes("membership_pass")
          || chargeAccessSignal.includes("usage_pass")
      );
      const chargeMonthlyGranted = /membership_credit|monthly_credit|moonlight_stone/.test(chargeAccessSignal);
      const chargeAlreadyGranted = chargeAccessType === "already_unlocked";
      const monthlyCreditsSpent = chargeMonthlyGranted
        ? Math.max(0, Math.floor(toNumber(consume.monthlyCreditsSpent ?? consume.membershipCreditCost ?? consume.cost ?? chargeData.membershipCreditCost ?? chargePricing.membershipCreditCost, requiredCoins * 10)))
        : 0;
      const monthlyBalanceAfter = chargeMonthlyGranted
        ? firstFiniteNonNegativeNumber(
          consume.remainingMembershipCredit,
          consume.membershipCreditBalance,
          consume.monthlyCredits,
          chargeData.membershipCreditBalance,
          chargeData.monthlyCredits,
          chargeAccessGrant.membershipCreditBalance,
          chargeAccessGrant.monthlyCredits,
        )
        : null;
      const chargedCoins = (chargePassGranted || chargeMonthlyGranted || chargeAlreadyGranted)
        ? 0
        : toNumber(consume.chargedCoins ?? consume.cost, requiredCoins);
      const accessSource = chargePassGranted
        ? "subscription"
        : chargeMonthlyGranted
          ? "moonlight_stone"
          : chargedCoins > 0
            ? "coin"
            : "payment";
      const subscriptionTier = toText(chargeData.subscriptionTier || chargeData.passTier || consume.subscriptionTier || consume.passTier || chargeAccessGrant.subscriptionTier || chargeAccessGrant.passTier);

      if (typeof input.onPaid === "function") {
        setPaymentMessage("결제가 완료되었습니다. 결과를 생성하고 있습니다...");
        markPaidAttemptGenerationStarted("onPaid_callback_start");
        try {
          await input.onPaid({
            transactionId,
            chargedCoins,
            requiredCoins,
            amountKRW,
            balanceAfter,
            featureKey: resolvedFeatureKey,
            accessSource,
            accessType: chargeAccessType,
            paymentMode: chargePaymentMode,
            subscriptionTier,
            monthlyCreditsSpent,
            monthlyBalanceAfter,
          });
          markPaidAttemptGenerationCompleted();
        } catch (error) {
          markPaidAttemptFailed("feature_execution_failed");
          return {
            ok: false,
            code: "FEATURE_EXECUTION_FAILED",
            message: error instanceof Error ? error.message : "유료 기능 실행에 실패했습니다.",
            requiredCoins,
            chargedCoins,
            balanceAfter,
            transactionId,
            refunded: false,
          };
        }
      }

      refreshAuth({ force: true, silent: true }).catch(() => {});

      return {
        ok: true,
        code: chargePassGranted ? "PASS_FREE" : chargeMonthlyGranted ? "MOONLIGHT_STONE" : "OK",
        message: "결제가 완료되었습니다.",
        requiredCoins,
        chargedCoins,
        balanceAfter,
        transactionId,
        refunded: false,
      };
    } finally {
      endPayment();
      setIsPaying(false);
      inFlightRef.current = false;
    }
  }, [endPayment, setPaymentMessage, startPayment]);

  return {
    isPaying,
    ensurePaidAccess,
  };
}
