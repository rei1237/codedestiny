"use client";

import { useCallback, useRef, useState } from "react";
import { getAuthState, handleSessionInvalidated, refreshAuth } from "../_lib/auth-store";
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
import { getCurrentLoadingLocale, type LoadingLocale } from "@/constants/loadingMessages";
import { resolvePaidFeatureBillingType } from "@/lib/payment/feature-billing-type";

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

const COIN_GATE_TEXT_TRANSLATIONS: Record<LoadingLocale, {
  paymentInProgress: string;
  checkingPass: string;
  loginRequired: string;
  checkingEntitlements: string;
  featureExecutionFailed: string;
  paymentComplete: string;
  singlePaymentRequired: string;
  generatingResult: string;
}> = {
  ko: {
    paymentInProgress: "결제가 이미 진행 중입니다. 잠시만 기다려 주세요.",
    checkingPass: "이용권을 확인하고 있어요.",
    loginRequired: "로그인이 필요합니다.",
    checkingEntitlements: "이용권과 기존 잠금 해제 내역을 확인하고 있어요.",
    featureExecutionFailed: "유료 기능 실행에 실패했습니다.",
    paymentComplete: "결제가 완료되었습니다.",
    singlePaymentRequired: "단건 결제가 필요합니다.",
    generatingResult: "결제가 완료되었습니다. 결과를 생성하고 있습니다...",
  },
  en: {
    paymentInProgress: "A payment is already in progress. Please wait a moment.",
    checkingPass: "Checking your pass.",
    loginRequired: "Login is required.",
    checkingEntitlements: "Checking your pass and previous unlocks.",
    featureExecutionFailed: "The paid feature could not be completed.",
    paymentComplete: "Payment has been completed.",
    singlePaymentRequired: "A one-time payment is required.",
    generatingResult: "Payment has been completed. Creating your result...",
  },
  ja: {
    paymentInProgress: "決済がすでに進行中です。少しお待ちください。",
    checkingPass: "利用券を確認しています。",
    loginRequired: "ログインが必要です。",
    checkingEntitlements: "利用券と以前のロック解除履歴を確認しています。",
    featureExecutionFailed: "有料機能の実行に失敗しました。",
    paymentComplete: "決済が完了しました。",
    singlePaymentRequired: "単発決済が必要です。",
    generatingResult: "決済が完了しました。結果を生成しています...",
  },
  "zh-CN": {
    paymentInProgress: "付款已在进行中，请稍候。",
    checkingPass: "正在确认使用券。",
    loginRequired: "需要登录。",
    checkingEntitlements: "正在确认使用券和既有解锁记录。",
    featureExecutionFailed: "付费功能执行失败。",
    paymentComplete: "付款已完成。",
    singlePaymentRequired: "需要单次付款。",
    generatingResult: "付款已完成。正在生成结果...",
  },
  "zh-TW": {
    paymentInProgress: "付款已在進行中，請稍候。",
    checkingPass: "正在確認使用券。",
    loginRequired: "需要登入。",
    checkingEntitlements: "正在確認使用券與既有解鎖紀錄。",
    featureExecutionFailed: "付費功能執行失敗。",
    paymentComplete: "付款已完成。",
    singlePaymentRequired: "需要單次付款。",
    generatingResult: "付款已完成。正在生成結果...",
  },
  vi: {
    paymentInProgress: "Đang có một thanh toán được xử lý. Vui lòng chờ.",
    checkingPass: "Đang kiểm tra vé của bạn.",
    loginRequired: "Bạn cần đăng nhập.",
    checkingEntitlements: "Đang kiểm tra vé và các lần mở khóa trước đó.",
    featureExecutionFailed: "Không thể hoàn tất tính năng trả phí.",
    paymentComplete: "Thanh toán đã hoàn tất.",
    singlePaymentRequired: "Cần thanh toán một lần.",
    generatingResult: "Thanh toán đã hoàn tất. Đang tạo kết quả...",
  },
  hi: {
    paymentInProgress: "भुगतान पहले से चल रहा है. कृपया प्रतीक्षा करें.",
    checkingPass: "आपका पास जाँचा जा रहा है.",
    loginRequired: "लॉगिन आवश्यक है.",
    checkingEntitlements: "आपका पास और पुराने अनलॉक जाँचे जा रहे हैं.",
    featureExecutionFailed: "Paid feature पूरा नहीं हो सका.",
    paymentComplete: "भुगतान पूरा हो गया.",
    singlePaymentRequired: "एक बार का भुगतान आवश्यक है.",
    generatingResult: "भुगतान पूरा हो गया. आपका result बनाया जा रहा है...",
  },
  es: {
    paymentInProgress: "Ya hay un pago en curso. Espera un momento.",
    checkingPass: "Comprobando tu pase.",
    loginRequired: "Debes iniciar sesión.",
    checkingEntitlements: "Comprobando tu pase y desbloqueos anteriores.",
    featureExecutionFailed: "No se pudo completar la función de pago.",
    paymentComplete: "El pago se ha completado.",
    singlePaymentRequired: "Se requiere un pago único.",
    generatingResult: "El pago se ha completado. Creando tu resultado...",
  },
  fr: {
    paymentInProgress: "Un paiement est déjà en cours. Veuillez patienter.",
    checkingPass: "Vérification de votre pass.",
    loginRequired: "Connexion requise.",
    checkingEntitlements: "Vérification de votre pass et de vos déblocages précédents.",
    featureExecutionFailed: "La fonctionnalité payante n'a pas pu être terminée.",
    paymentComplete: "Le paiement est terminé.",
    singlePaymentRequired: "Un paiement unique est requis.",
    generatingResult: "Le paiement est terminé. Création de votre résultat...",
  },
  de: {
    paymentInProgress: "Eine Zahlung läuft bereits. Bitte warte kurz.",
    checkingPass: "Dein Pass wird geprüft.",
    loginRequired: "Anmeldung erforderlich.",
    checkingEntitlements: "Dein Pass und frühere Freischaltungen werden geprüft.",
    featureExecutionFailed: "Die bezahlte Funktion konnte nicht abgeschlossen werden.",
    paymentComplete: "Die Zahlung wurde abgeschlossen.",
    singlePaymentRequired: "Eine Einmalzahlung ist erforderlich.",
    generatingResult: "Die Zahlung wurde abgeschlossen. Dein Ergebnis wird erstellt...",
  },
  nl: {
    paymentInProgress: "Er loopt al een betaling. Wacht even.",
    checkingPass: "Je pas wordt gecontroleerd.",
    loginRequired: "Inloggen is vereist.",
    checkingEntitlements: "Je pas en eerdere ontgrendelingen worden gecontroleerd.",
    featureExecutionFailed: "De betaalde functie kon niet worden voltooid.",
    paymentComplete: "De betaling is voltooid.",
    singlePaymentRequired: "Een eenmalige betaling is vereist.",
    generatingResult: "De betaling is voltooid. Je resultaat wordt gemaakt...",
  },
  ms: {
    paymentInProgress: "Bayaran sedang diproses. Sila tunggu sebentar.",
    checkingPass: "Menyemak pas anda.",
    loginRequired: "Log masuk diperlukan.",
    checkingEntitlements: "Menyemak pas dan buka kunci terdahulu.",
    featureExecutionFailed: "Ciri berbayar tidak dapat diselesaikan.",
    paymentComplete: "Bayaran telah selesai.",
    singlePaymentRequired: "Bayaran sekali diperlukan.",
    generatingResult: "Bayaran telah selesai. Sedang menjana keputusan...",
  },
};

function coinGateText(key: keyof typeof COIN_GATE_TEXT_TRANSLATIONS.ko) {
  const locale = getCurrentLoadingLocale();
  return COIN_GATE_TEXT_TRANSLATIONS[locale]?.[key] || COIN_GATE_TEXT_TRANSLATIONS.en[key] || COIN_GATE_TEXT_TRANSLATIONS.ko[key];
}

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
        message: coinGateText("paymentInProgress"),
        requiredCoins: 0,
        chargedCoins: 0,
        balanceAfter: 0,
        transactionId: "",
        refunded: false,
      };
    }

    inFlightRef.current = true;
    setIsPaying(true);
    startPayment(coinGateText("checkingPass"), "pass-checking");

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
            message: coinGateText("loginRequired"),
            requiredCoins: 0,
            chargedCoins: 0,
            balanceAfter: 0,
            transactionId: "",
            refunded: false,
          };
        }
      }

      // 해금(영구 잠금 해제) 기능만 "기존 잠금 해제 내역 확인" 문구를 쓰고,
      // 1회당 결제(per-use)는 중립적인 이용권 확인 문구를 재사용한다(잘못된 해제 안내 방지).
      setPaymentMessage(
        coinGateText(
          resolvePaidFeatureBillingType(input.featureKey) === "unlock"
            ? "checkingEntitlements"
            : "checkingPass",
        ),
      );

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
        const message = toText(chargeResult.error?.message || chargeResult.message || coinGateText("singlePaymentRequired")) || coinGateText("singlePaymentRequired");

        if (resolveLoginRequired(code, chargeResult.status)) {
          // 유령 로그인: UI는 로그인 상태인데 서버가 확정적 401/403을 반환한 경우.
          // 인증 상태를 즉시 초기화하고 만료 안내 후 로그인 페이지로 이동시킨다(transient
          // 합성 503은 resolveLoginRequired가 걸러내므로 여기 도달하지 않는다).
          handleSessionInvalidated({ redirect: true });
          return {
            ok: false,
            code: "AUTH_REQUIRED",
            message: coinGateText("loginRequired"),
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
            code: "PAYMENT_CANCELLED",
            message: message || coinGateText("singlePaymentRequired"),
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
        setPaymentMessage(coinGateText("generatingResult"));
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
            message: error instanceof Error ? error.message : coinGateText("featureExecutionFailed"),
            requiredCoins,
            chargedCoins,
            balanceAfter,
            transactionId,
            refunded: false,
          };
        }
      }

      // 잔액은 coin-gate 응답으로 이미 반영됨. force 없이 호출해 쿨다운/in-flight 병합을
      // 존중 → 성공마다 /api/auth/me를 강제 재요청하던 중복 왕복 제거.
      refreshAuth({ silent: true }).catch(() => {});

      return {
        ok: true,
        code: chargePassGranted ? "PASS_FREE" : chargeMonthlyGranted ? "MOONLIGHT_STONE" : "OK",
        message: coinGateText("paymentComplete"),
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
