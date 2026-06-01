"use client";

import { useCallback, useRef, useState } from "react";
import { getAuthState, refreshAuth } from "../_lib/auth-store";
import {
  fetchBillingFeaturePricing,
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

function toText(value: unknown): string {
  return String(value || "").trim();
}

function toNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeCode(value: unknown): string {
  return String(value || "").trim().toUpperCase();
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
    startPayment("결제 상태를 확인하고 있습니다...");

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

      const pricingResult = await fetchBillingFeaturePricing({
        categoryKey: input.categoryKey,
        subFeatureKey: input.subFeatureKey,
        featureKey: input.featureKey,
        reason: input.reason,
      });

      if (!pricingResult.ok || !pricingResult.data?.pricing) {
        const code = toText(pricingResult.error?.code || "PRICE_NOT_FOUND") || "PRICE_NOT_FOUND";
        const message = toText(pricingResult.error?.message || pricingResult.message || "가격 정보를 불러오지 못했습니다.") || "가격 정보를 불러오지 못했습니다.";
        return {
          ok: false,
          code,
          message,
          requiredCoins: 0,
          chargedCoins: 0,
          balanceAfter: 0,
          transactionId: "",
          refunded: false,
        };
      }

      requiredCoins = toNumber(pricingResult.data.pricing.cost, 0);

      const amountKRW = toNumber(pricingResult.data.pricing.amountKRW || pricingResult.data.pricing.cashPrice, 0);
      setPaymentMessage(amountKRW > 0
        ? `단건 결제를 준비하고 있습니다... (${amountKRW.toLocaleString("ko-KR")}원)`
        : `단건 결제를 준비하고 있습니다... (${requiredCoins}코인 가치)`);

      const chargeResult = await runBillingCoinGate({
        categoryKey: input.categoryKey,
        subFeatureKey: input.subFeatureKey,
        featureKey: input.featureKey || pricingResult.data.pricing.featureKey,
        reason: input.reason || pricingResult.data.pricing.reason,
        payloadHash: input.payloadHash,
        forceDeduct: input.forceDeduct,
        requestId: input.requestId,
      });

      if (!chargeResult.ok || !chargeResult.data) {
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

      const consume = (chargeResult.data.consume || {}) as Record<string, unknown>;
      const transactionId = toText(consume.transactionId || consume._id || "");
      const chargedCoins = toNumber(consume.cost, requiredCoins);
      const balanceAfter = toNumber(chargeResult.data.balance, 0);
      const resolvedFeatureKey = toText(consume.featureKey || input.featureKey || pricingResult.data.pricing.featureKey);

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

      return {
        ok: true,
        code: "OK",
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
