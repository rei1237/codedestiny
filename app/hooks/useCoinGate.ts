"use client";

import { useCallback, useRef, useState } from "react";
import { getAuthState, refreshAuth } from "../_lib/auth-store";
import {
  fetchBillingAccessDecision,
  fetchBillingFeaturePricing,
  runBillingCharge,
  runBillingRefund,
} from "../_lib/billing-client";
import { usePayment } from "./usePayment";

type CoinGateContext = {
  transactionId: string;
  chargedCoins: number;
  requiredCoins: number;
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

function resolveLoginRequired(code: string, status: number) {
  const normalized = String(code || "").toUpperCase();
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
          try {
            await refreshAuth({ force: true, silent: true });
          } catch {
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

      const accessResult = await fetchBillingAccessDecision({
        categoryKey: input.categoryKey,
        subFeatureKey: input.subFeatureKey,
        featureKey: input.featureKey || pricingResult.data.pricing.featureKey,
        reason: input.reason || pricingResult.data.pricing.reason,
      });

      if (!accessResult.ok) {
        const accessCode = toText(accessResult.error?.code || "SERVER_ERROR") || "SERVER_ERROR";
        const accessMessage = toText(accessResult.error?.message || accessResult.message || "결제 접근 권한 확인에 실패했습니다.") || "결제 접근 권한 확인에 실패했습니다.";
        if (resolveLoginRequired(accessCode, accessResult.status)) {
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
        return {
          ok: false,
          code: accessCode,
          message: accessMessage,
          requiredCoins,
          chargedCoins: 0,
          balanceAfter: 0,
          transactionId: "",
          refunded: false,
        };
      }

      const accessDecision = accessResult.data?.accessDecision;
      const accessReason = toText(accessDecision?.reason).toLowerCase();
      const accessBalance = toNumber(accessDecision?.coinBalance, 0);

      if (accessReason === "auth_required") {
        return {
          ok: false,
          code: "AUTH_REQUIRED",
          message: "로그인이 필요합니다.",
          requiredCoins,
          chargedCoins: 0,
          balanceAfter: accessBalance,
          transactionId: "",
          refunded: false,
        };
      }

      if (accessReason === "insufficient_coins") {
        return {
          ok: false,
          code: "INSUFFICIENT_COINS",
          message: "코인이 부족합니다.",
          requiredCoins,
          chargedCoins: 0,
          balanceAfter: accessBalance,
          transactionId: "",
          refunded: false,
        };
      }

      if (accessReason === "free" || accessReason === "already_unlocked" || accessReason === "subscription_active") {
        if (typeof input.onPaid === "function") {
          try {
            await input.onPaid({
              transactionId: "",
              chargedCoins: 0,
              requiredCoins,
              balanceAfter: accessBalance,
              featureKey: toText(input.featureKey || pricingResult.data.pricing.featureKey),
            });
          } catch (error) {
            return {
              ok: false,
              code: "FEATURE_EXECUTION_FAILED",
              message: error instanceof Error ? error.message : "유료 기능 실행에 실패했습니다.",
              requiredCoins,
              chargedCoins: 0,
              balanceAfter: accessBalance,
              transactionId: "",
              refunded: false,
            };
          }
        }

        return {
          ok: true,
          code: "OK",
          message: "이미 이용 가능한 서비스입니다.",
          requiredCoins,
          chargedCoins: 0,
          balanceAfter: accessBalance,
          transactionId: "",
          refunded: false,
        };
      }

      setPaymentMessage(`결제를 진행 중입니다... (${requiredCoins}코인)`);

      const chargeResult = await runBillingCharge({
        categoryKey: input.categoryKey,
        subFeatureKey: input.subFeatureKey,
        featureKey: input.featureKey || pricingResult.data.pricing.featureKey,
        reason: input.reason || pricingResult.data.pricing.reason,
        payloadHash: input.payloadHash,
        forceDeduct: input.forceDeduct,
        requestId: input.requestId,
      });

      if (!chargeResult.ok || !chargeResult.data) {
        const code = toText(chargeResult.error?.code || "SERVER_ERROR") || "SERVER_ERROR";
        const message = toText(chargeResult.error?.message || chargeResult.message || "코인 결제에 실패했습니다.") || "코인 결제에 실패했습니다.";

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

        if (chargeResult.status === 402 || code === "INSUFFICIENT_COINS" || code === "INSUFFICIENT_BALANCE") {
          return {
            ok: false,
            code: "INSUFFICIENT_COINS",
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

      const transactionId = toText(chargeResult.data.transactionId);
      const chargedCoins = toNumber(chargeResult.data.chargedCoins, 0);
      const balanceAfter = toNumber(chargeResult.data.balanceAfter, 0);
      const resolvedFeatureKey = toText(chargeResult.data.featureKey || input.featureKey || pricingResult.data.pricing.featureKey);

      if (typeof input.onPaid === "function") {
        setPaymentMessage("결제가 완료되었습니다. 결과를 생성하고 있습니다...");
        try {
          await input.onPaid({
            transactionId,
            chargedCoins,
            requiredCoins,
            balanceAfter,
            featureKey: resolvedFeatureKey,
          });
        } catch (error) {
          if (transactionId) {
            await runBillingRefund({
              transactionId,
              sourceTransactionId: transactionId,
              featureKey: resolvedFeatureKey,
              cost: chargedCoins > 0 ? chargedCoins : requiredCoins,
              reason: `${toText(input.reason) || "유료 기능 실행"} 실패 자동 환불`,
            });
          }

          return {
            ok: false,
            code: "FEATURE_EXECUTION_FAILED",
            message: error instanceof Error ? error.message : "유료 기능 실행에 실패했습니다.",
            requiredCoins,
            chargedCoins,
            balanceAfter,
            transactionId,
            refunded: Boolean(transactionId),
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
