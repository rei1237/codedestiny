"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getAuthState, handleSessionInvalidated, refreshAuth } from "../_lib/auth-store";
import { refreshUserAccessAfterPayment } from "../_lib/user-session-cache";
import {
  hasClientAuthSessionHint,
  loadPaidServiceRuntimeGate,
  runPaidAccessGate,
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
// 결제 영수증 저장소 정본은 셸·독립 정적과 같은 모듈 하나다(사본을 만들면 한쪽만 낡는다).
import checkoutEntry, { type PaidResumeDescriptor } from "@/js/core/checkout-entry.js";

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
  // 가격을 넘기면 runBillingCoinGate의 스냅샷 기반 빠른 이용권 선검사가 켜져
  // 이용권 보유자는 서버 왕복 없이 즉시 무료 통과한다(넘기지 않으면 기존대로 서버 판정).
  coinPrice?: number;
  cost?: number;
  amountKRW?: number;
  /**
   * 결제 후 이 기능을 **스스로 다시 열기** 위한 재개 서술자. 모바일 PG 는 상위 프레임을 리다이렉트해
   * 이 문서(와 onPaid 클로저)가 통째로 죽으므로, 넘기지 않으면 결제만 끝나고 화면은 닫힌 채 돌아온다.
   *
   * 쓰는 법: 결제 **전에** 만들어 넘기고(`{kind, action, args}`), 같은 `kind` 로
   * `checkoutEntry.registerPaidResumeHandler(kind, fn)` 를 컴포넌트 최상위에서 등록한다.
   * 핸들러는 `(descriptor, grant)` 를 받으며 grant 는 서버에 다시 실을 결제 증빙이다.
   * 🔴 args 에는 원시값만 살아남는다 — 배열·객체는 JSON.stringify 로 접어 넣는다.
   */
  resume?: PaidResumeDescriptor | null;
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

const COIN_GATE_TEXT_TRANSLATIONS: Record<LoadingLocale, {
  paymentInProgress: string;
  checkingPass: string;
  loginRequired: string;
  checkingEntitlements: string;
  featureExecutionFailed: string;
  paymentComplete: string;
  singlePaymentRequired: string;
  temporarilyUnavailable: string;
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
    temporarilyUnavailable: "일시적인 오류로 처리하지 못했어요. 잠시 후 다시 시도해 주세요.",
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
    temporarilyUnavailable: "We couldn't complete this right now. Please try again in a moment.",
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
    temporarilyUnavailable: "一時的なエラーで処理できませんでした。しばらくしてからもう一度お試しください。",
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
    temporarilyUnavailable: "因临时故障未能处理。请稍后再试。",
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
    temporarilyUnavailable: "因暫時性故障而無法處理。請稍後再試。",
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
    temporarilyUnavailable: "Không thể xử lý do lỗi tạm thời. Vui lòng thử lại sau giây lát.",
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
    temporarilyUnavailable: "अस्थायी त्रुटि के कारण यह पूरा नहीं हो सका. कृपया कुछ देर बाद पुनः प्रयास करें.",
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
    temporarilyUnavailable: "No se pudo completar por un error temporal. Inténtalo de nuevo en un momento.",
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
    temporarilyUnavailable: "Impossible d'aboutir en raison d'une erreur temporaire. Réessayez dans un instant.",
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
    temporarilyUnavailable: "Aufgrund eines vorübergehenden Fehlers nicht möglich. Bitte versuche es gleich noch einmal.",
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
    temporarilyUnavailable: "Door een tijdelijke fout niet gelukt. Probeer het zo meteen opnieuw.",
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
    temporarilyUnavailable: "Tidak dapat diselesaikan kerana ralat sementara. Sila cuba lagi sebentar lagi.",
    generatingResult: "Bayaran telah selesai. Sedang menjana keputusan...",
  },
};

function coinGateText(key: keyof typeof COIN_GATE_TEXT_TRANSLATIONS.ko) {
  const locale = getCurrentLoadingLocale();
  return COIN_GATE_TEXT_TRANSLATIONS[locale]?.[key] || COIN_GATE_TEXT_TRANSLATIONS.en[key] || COIN_GATE_TEXT_TRANSLATIONS.ko[key];
}

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

// 서버가 "일시적으로 확인하지 못했다"고 명시한 코드들. 전부 재시도 가능이며 결제 요구가 아니다.
// 정본: worker/routes/billing.js(requireBillingAuth / buildPassStatusTemporarilyUnavailableFailure /
// readBillingSnapshot degraded) + app/_lib/auth-client.ts 의 합성 503.
const TRANSIENT_BILLING_CODES = new Set([
  "AUTH_STATUS_TEMPORARILY_UNAVAILABLE",
  "PASS_STATUS_TEMPORARILY_UNAVAILABLE",
  "BALANCE_SNAPSHOT_UNAVAILABLE",
  "AUTH_REFRESH_TEMPORARY_FAILURE",
  "AUTH_DB_UNAVAILABLE",
  "SERVICE_UNAVAILABLE",
  "MONTHLY_CREDIT_CONTENDED",
  // 🔴 월정석 경합의 **현행** 코드. 구 billing.js 는 경합을 503 MONTHLY_CREDIT_CONTENDED 로 냈지만
  // V2(worker/payments/index.js)는 409 MONTHLY_CREDIT_CONSUME_IN_PROGRESS 하나로 접어서 낸다.
  // 이게 빠져 있어서 409 가 transient 로 안 잡혔고, 사용자에게 "단건 결제가 필요합니다"라는
  // **틀린 문구**가 떴다 — 실제로는 아무것도 차감되지 않았고 잠시 뒤 되는 상태다.
  "MONTHLY_CREDIT_CONSUME_IN_PROGRESS",
]);

// 🔴 맨 403 은 인증 실패가 아니다 — 여기서 401 과 같이 취급하면 안 된다.
// 서버가 403 을 내는 실제 이유는 MISSING_PROFILE_ID(프로필 미선택)·INVALID_ORIGIN(Origin 헤더)
// 처럼 세션과 무관한 것들인데, 이 판정이 true 면 아래에서 handleSessionInvalidated({redirect:true})
// 가 돌아 **멀쩡히 로그인한 사용자가 로그아웃되고 로그인 페이지로 튕겼다.**
// 인증 실패는 401 이거나 명시적 auth 코드로만 판정한다(정적 셸은 이미 이 기준이다 — index.html
// _cdIsAuthRequiredBillingError). 서버측 짝은 worker/routes/billing.js mapCoinGateFailure.
function resolveLoginRequired(code: string, status: number) {
  const normalized = normalizeCode(code);
  return (
    status === 401
    || normalized === "AUTH_REQUIRED"
    || normalized === "LOGIN_REQUIRED"
    || normalized === "UNAUTHORIZED"
  );
}

export function useCoinGate() {
  // startPayment 는 더 이상 쓰지 않는다 — 진입 이용권 확인 화면이 사라졌다(2026-08 정책 전환).
  const { endPayment, setPaymentMessage } = usePayment();
  const inFlightRef = useRef(false);
  const [isPaying, setIsPaying] = useState(false);

  // 🔴 구독 스냅샷 워밍은 여기서 하지 않는다 — 앱 전역 Provider(PaymentProcessingContext)가 이미
  // subscribeAuth 로 '인증이 확정되는 순간' 워밍한다. 여기서 한 번 더 걸면 중첩이고, 게다가 이쪽은
  // 마운트 시점의 getAuthState() 만 봐서 하이드레이션이 늦으면 그냥 건너뛰던 열등한 사본이었다.
  // 결제 런타임 스크립트(destiny-profile.js, ~400KB)는 인증과 무관한 정적 자산이라 여기서 미리 받는다.
  // 예전에는 인증 상태일 때만 받아서, 아직 비인증으로 보이던 흔한 경우에 이 다운로드가 클릭 경로의
  // await(billing-client 의 runtimeGate)로 그대로 옮겨갔다. 내부에서 중복 주입을 막는다.
  useEffect(() => {
    void loadPaidServiceRuntimeGate();
  }, []);

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
    // 🔴 진입 이용권 확인 화면은 더 이상 켜지 않는다(2026-08 정책 전환, 정적 셸과 동일).
    // 판정 근거가 로컬 구독 스냅샷뿐이라 서버 왕복이 0이고, 켜 봐야 다음 프레임에 결제창으로 덮이면서
    // 진행바가 '혜택 적용 → 결과 준비'까지 흘러 이용권이 없는 사용자에게 있지도 않은 혜택을 적용하는
    // 것처럼 보인다. 이용권 확인은 결제창의 '이용권으로 구매' 카드가 맡는다.
    // (스냅샷이 커버를 확답하는 경우의 '이용권 적용 완료' 프레임은 runBillingCoinGate 가 그대로 emit 한다.)

    let requiredCoins = 0;

    try {
      if (!input.skipAuthCheck) {
        const authState = getAuthState();
        if (!authState.isAuthenticated) {
          logPaidAttemptEvent("PaidAttempt.AuthHydrating", {
            reason: "ensure_paid_access_refresh_auth",
          });
          try {
            // 🔴 상한 없이 await 하면 여기서 게이트가 고착한다. refreshAuth 는 401 이면 내부에서
            // /api/auth/me → /api/auth/refresh → /api/auth/me 로 3연쇄가 되고 각 요청에 타임아웃이
            // 없다(authFetch 는 AbortController 를 쓰지 않는다). billing-client 의 인증 예열과 같은
            // 4초 상한을 건다 — 실패하면 바로 아래 finalAuth 검사가 AUTH_REQUIRED 로 끊으므로
            // billing-client 쪽 예열까지 이어지지 않는다(중복 발사 아님).
            await Promise.race([
              refreshAuth({ force: true, silent: true }),
              new Promise<void>((resolve) => { window.setTimeout(resolve, 4000); }),
            ]);
          } catch (e) {
            // ignore auth refresh errors here; final state check below determines result.
          }
        }

        // 🔴 "인증 안 됨"과 "아직 모름"을 구분한다.
        // 위 race 는 **지연 상한**이지 판정이 아니다. 예전에는 4초를 넘기면 그대로
        // !isAuthenticated → AUTH_REQUIRED 로 접었는데, /api/auth/me 의 서버 예산은 12초이고
        // authFetch 타임아웃은 22초다. 즉 느리기만 한 요청이 **로그인한 사용자에게 "로그인이
        // 필요합니다"** 를 띄웠다. status 는 이미 3값 이상을 표현한다(auth-store 의 AuthStatus).
        // unknown/refreshing/temporarilyOffline/authenticating 은 전부 "모름"이므로 서버로 보낸다 —
        // 서버가 확정 401 을 주면 아래 resolveLoginRequired 가 그때 로그아웃 처리한다.
        const finalAuth = getAuthState();
        const definitelySignedOut = finalAuth.authReady
          && !finalAuth.isAuthenticated
          && (finalAuth.status === "guest" || finalAuth.status === "expired");
        if (definitelySignedOut && !hasClientAuthSessionHint()) {
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

      /* 🔴 리다이렉트 복귀로 이미 결제가 끝난 기능이면 결제창을 열지 않는다(정적 셸 _cdOpenPaidServiceGate ·
         독립 정적 게이트 코어와 같은 조건·같은 저장소). 중첩 사전검사가 아니다(원칙 6 확인) — React 는 그 두
         게이트에 internalMainGate:true 로 진입해(billing-client 의 runPaidServiceRuntimePayment) 거기 있는
         같은 단축을 **타지 않는다**. 즉 이 줄이 React 경로의 유일한 구제 지점이다.
         회당 결제(per-use)는 서버 보유 목록에 남지 않으므로(worker/lib/access-state.js) 이 영수증이 없으면
         "결제하고 못 본" 사용자가 재클릭에서 또 결제된다.
         🔴 로컬 저장소 판정이라 서버 왕복이 0이다 — 여기에 서버 이용권 재검사를 넣지 말 것(게이팅 절대 순서 3).
         영수증은 1회만 소비된다 — 회당 결제가 영구 무료가 되면 안 된다. */
      const receiptFeatureKey = toText(input.featureKey || input.subFeatureKey || input.categoryKey);
      const paidGrantReceipt = (receiptFeatureKey && input.forceDeduct !== false)
        ? checkoutEntry.consumePaidGrantReceipt({ featureKey: receiptFeatureKey })
        : null;
      if (paidGrantReceipt) {
        requiredCoins = toNumber(input.coinPrice ?? input.cost, requiredCoins);
        const receiptTransactionId = toText(paidGrantReceipt.merchantUid || paidGrantReceipt.requestId);
        if (typeof input.onPaid === "function") {
          setPaymentMessage(coinGateText("generatingResult"));
          markPaidAttemptGenerationStarted("paid_grant_receipt");
          try {
            await input.onPaid({
              transactionId: receiptTransactionId,
              chargedCoins: 0,
              requiredCoins,
              amountKRW: toNumber(input.amountKRW, 0),
              balanceAfter: 0,
              featureKey: receiptFeatureKey,
              accessSource: "payment",
              accessType: "redirect_receipt",
              paymentMode: "DIRECT_KRW",
              subscriptionTier: "",
              monthlyCreditsSpent: 0,
              monthlyBalanceAfter: null,
            });
            markPaidAttemptGenerationCompleted();
          } catch (error) {
            markPaidAttemptFailed("feature_execution_failed");
            return {
              ok: false,
              code: "FEATURE_EXECUTION_FAILED",
              message: error instanceof Error ? error.message : coinGateText("featureExecutionFailed"),
              requiredCoins,
              chargedCoins: 0,
              balanceAfter: 0,
              transactionId: receiptTransactionId,
              refunded: false,
            };
          }
        }
        return {
          ok: true,
          code: "OK",
          message: coinGateText("paymentComplete"),
          requiredCoins,
          chargedCoins: 0,
          balanceAfter: 0,
          transactionId: receiptTransactionId,
          refunded: false,
        };
      }

      // 해금(영구 잠금 해제) 기능만 "기존 잠금 해제 내역 확인" 문구를 쓴다 — 이 확인은 이용권 선검사가
      // 아니라 '이미 산 콘텐츠인가' 조회라서 남아 있고, 그때만 문구가 필요하다.
      // 1회당 결제(per-use)는 진입 확인 화면 자체가 없으므로 문구도 건드리지 않는다(다음 화면이 결제창).
      if (resolvePaidFeatureBillingType(input.featureKey) === "unlock") {
        setPaymentMessage(
          coinGateText("checkingEntitlements"),
        );
      }

      const chargeResult = await runPaidAccessGate({
        categoryKey: input.categoryKey,
        subFeatureKey: input.subFeatureKey,
        featureKey: input.featureKey,
        reason: input.reason,
        payloadHash: input.payloadHash,
        requestId: input.requestId,
        coinPrice: input.coinPrice,
        cost: input.cost,
        amountKRW: input.amountKRW,
        // 결제 티켓까지 그대로 흐른다(billing-client → 런타임 게이트 → dp 복귀 티켓 → runPaidResume).
        resume: input.resume,
      });

      if (!chargeResult.ok || !chargeResult.data) {
        const rawData = readNestedObject(chargeResult.raw, "data");
        const dataPricing = readNestedObject(rawData, "pricing");
        const rawPricing = Object.keys(dataPricing).length ? dataPricing : readNestedObject(chargeResult.raw, "pricing");
        requiredCoins = toNumber(rawPricing.cost ?? rawPricing.coinPrice ?? chargeResult.raw.requiredCoins, requiredCoins);
        const code = normalizeCode(chargeResult.error?.code || "SERVER_ERROR") || "SERVER_ERROR";
        // 🔴 일시 장애의 기본 문구는 "단건 결제가 필요합니다"가 아니다.
        // 서버가 503(AUTH_STATUS_TEMPORARILY_UNAVAILABLE / PASS_STATUS_TEMPORARILY_UNAVAILABLE /
        // BALANCE_SNAPSHOT_UNAVAILABLE)이나 합성 503을 돌려줬는데 singlePaymentRequired 로 폴백하면,
        // 사용자에게는 "인프라 문제"가 "돈을 내라"로 보인다. 실제로 이용권 보유자가 이 문구를 봤다.
        const transientFailure = chargeResult.status >= 500
          || chargeResult.status === 0
          || TRANSIENT_BILLING_CODES.has(code);
        const fallbackMessage = transientFailure
          ? coinGateText("temporarilyUnavailable")
          : coinGateText("singlePaymentRequired");
        const message = toText(chargeResult.error?.message || chargeResult.message || fallbackMessage) || fallbackMessage;

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
      // 🔴 위 refreshAuth 와 겹치지 않는다(코딩 원칙 6 확인함) — 엔드포인트도 소비처도 다르다.
      //    refreshAuth        → /api/auth/me,          인증 스토어(잔량·티어 표시)
      //    이 호출            → /api/me/access-state,  이용권 스냅샷 + 서버 60초 캐시 강제 무효화
      //    그래서 refreshAuth 를 이걸로 대체하면 결제 후 잔량 표시가 회귀한다. 둘 다 필요하다.
      //    access-state 응답이 정상이면 헬퍼는 거기서 early-return 하므로 실제 요청은 1건이다.
      refreshUserAccessAfterPayment().catch(() => {});

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
  }, [endPayment, setPaymentMessage]);

  return {
    isPaying,
    ensurePaidAccess,
  };
}
