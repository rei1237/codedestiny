"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import PaymentLoading, { type PaymentLoadingProps } from "./common/PaymentLoading";

type PaymentLoadingVariant = NonNullable<PaymentLoadingProps["variant"]>;

type PaymentProcessingContextValue = {
  isProcessing: boolean;
  isPaymentLoading: boolean;
  processingMessage: string;
  startProcessing: (message?: string, variant?: PaymentLoadingVariant) => void;
  stopProcessing: () => void;
  setProcessingMessage: (message: string) => void;
  startPayment: (message?: string, variant?: PaymentLoadingVariant) => void;
  endPayment: () => void;
  setPaymentMessage: (message: string) => void;
};

type PaymentProcessingProviderProps = {
  children: React.ReactNode;
};

type PaidFeatureGateStatus =
  | "idle"
  | "opening"
  | "checkingEntitlement"
  | "hasEntitlement"
  | "noEntitlement"
  | "loadingProducts"
  | "readyToPay"
  | "paymentProcessing"
  | "paymentSuccess"
  | "paymentFailed"
  | "error";

type PaidFeatureGateDetail = {
  featureId?: string;
  featureKey?: string;
  requestId?: string;
  title?: string;
  message?: string;
  status?: PaidFeatureGateStatus;
  cost?: number;
  startedAt?: number;
};

type PaidFeatureGateState = Required<Pick<PaidFeatureGateDetail, "featureId" | "requestId" | "title" | "message">> & {
  open: boolean;
  status: PaidFeatureGateStatus;
  cost: number | null;
  seq: number;
  startedAt: number;
};

type PaidFeatureGateContextValue = {
  state: PaidFeatureGateState;
  open: (detail: PaidFeatureGateDetail) => number;
  update: (detail: PaidFeatureGateDetail) => void;
  close: (requestId?: string) => void;
  preload: () => void;
};

const DEFAULT_PROCESSING_MESSAGE = "결제가 진행 중입니다.";

const PAID_GATE_DEFAULT_TITLE = "결제/이용권 확인";
const PAID_GATE_DEFAULT_MESSAGE = "이용권을 적용하고 있습니다.";

const PAID_GATE_COPY: Record<PaidFeatureGateStatus, { label: string; title: string; message: string }> = {
  idle: { label: "대기", title: PAID_GATE_DEFAULT_TITLE, message: PAID_GATE_DEFAULT_MESSAGE },
  opening: { label: "준비", title: "결제 준비", message: "결제 가능한 수단을 확인하고 있습니다." },
  checkingEntitlement: { label: "확인 중", title: "이용권 확인", message: "이용권을 적용하고 있습니다." },
  hasEntitlement: { label: "이용 가능", title: "이용권 적용 완료", message: "이용권으로 바로 이용할 수 있습니다." },
  noEntitlement: { label: "결제 필요", title: PAID_GATE_DEFAULT_TITLE, message: "이용 가능한 이용권을 찾지 못했습니다." },
  loadingProducts: { label: "상품 조회", title: "결제 수단 확인", message: "결제 가능한 상품을 확인하고 있습니다." },
  readyToPay: { label: "결제 가능", title: "결제 가능", message: "결제 후 바로 이용할 수 있습니다." },
  paymentProcessing: { label: "처리 중", title: "결제 승인 확인", message: "결제 승인과 이용 권한을 확인하고 있습니다." },
  paymentSuccess: { label: "완료", title: "이용 권한 저장 완료", message: "잠시 후 결과 화면으로 이어집니다." },
  paymentFailed: { label: "실패", title: "결제 확인 실패", message: "결제를 완료하지 못했습니다." },
  error: { label: "오류", title: "확인 실패", message: "네트워크 상태를 확인한 뒤 다시 시도해 주세요." },
};

const PaidFeatureGateContext = createContext<PaidFeatureGateContextValue | undefined>(undefined);

function resolvePaymentLoadingVariant(message?: string, mode?: string): PaymentLoadingVariant {
  const normalizedMode = String(mode || "").trim().toLowerCase();
  if (["payment-complete", "paymentcomplete", "payment-success", "success", "complete"].includes(normalizedMode)) return "payment-complete";
  if (normalizedMode === "pass-applied" || normalizedMode === "passapplied") return "pass-applied";
  if (normalizedMode === "pass" || normalizedMode === "pass-checking" || normalizedMode === "membership") return "pass-checking";
  if (["checkout", "card", "prepare", "opening"].includes(normalizedMode)) return "checkout";
  if (["confirm", "verification", "payment-confirm"].includes(normalizedMode)) return "confirm";
  if (["monthly", "monthly-credit", "moonstone"].includes(normalizedMode)) return "monthly";
  if (["subscription", "subscription-confirm", "subscription-prepare"].includes(normalizedMode)) return "subscription";
  if (["unlock-saving", "savingunlock", "saving-unlock"].includes(normalizedMode)) return "unlock-saving";
  if (normalizedMode === "refund") return "refund";

  const normalizedMessage = String(message || "");
  if (/이용권을 적용|이용권 확인|이용권 권한|membership_pass|pass_applied|달빛 결제 시스템/i.test(normalizedMessage)) return "pass-checking";
  if (/결제창|주문|checkout|prepare|연결|열고/i.test(normalizedMessage)) return "checkout";
  if (/검증|승인|confirm|복귀 신호|확인하고 있습니다/i.test(normalizedMessage)) return "confirm";
  if (/월정석|moonstone|monthly/i.test(normalizedMessage)) return "monthly";
  if (/이용권 결제|구독|subscription|플랜|활성화/i.test(normalizedMessage)) return "subscription";
  if (/권한 저장|저장|해금|잠금 해제|결과 화면/i.test(normalizedMessage)) return "unlock-saving";
  if (/환불|refund|복구/i.test(normalizedMessage)) return "refund";
  return "payment";
}

function isPaymentCompletionVariant(variant: PaymentLoadingVariant) {
  return variant === "payment-complete" || variant === "unlock-saving" || variant === "pass-applied";
}

const PaymentProcessingContext = createContext<PaymentProcessingContextValue | undefined>(
  undefined,
);

function emitCoinGateOverlay(open: boolean, message?: string, mode?: string) {
  if (typeof window === "undefined") return;
  const overlayWindow = window as Window & { _cdSetCoinGateOverlay?: (show: boolean, overlayMessage?: string, mode?: string) => void };
  overlayWindow._cdSetCoinGateOverlay?.(open, message, mode);
}

function paymentLoadingOwnsPaidFeatureStatus(status: PaidFeatureGateStatus) {
  return [
    "opening",
    "checkingEntitlement",
    "hasEntitlement",
    "loadingProducts",
    "paymentProcessing",
    "paymentSuccess",
  ].includes(status);
}

function resolvePaidFeatureStatusOverlay(status: PaidFeatureGateStatus, message?: string) {
  if (status === "checkingEntitlement") {
    return { message: "이용권을 적용하고 있습니다.", mode: "pass" };
  }
  if (status === "hasEntitlement") {
    return { message: "이용권 적용이 완료되었습니다.", mode: "pass-applied" };
  }
  if (status === "paymentSuccess") {
    const text = String(message || "");
    if (/이용권 적용|이용권으로|pass_applied|membership/i.test(text)) {
      return { message: "이용권 적용이 완료되었습니다.", mode: "pass-applied" };
    }
    return { message: text || "이용 권한 저장이 완료되었습니다.", mode: "payment-complete" };
  }
  if (status === "opening" || status === "loadingProducts") {
    return { message: message || "결제 가능한 수단을 확인하고 있습니다.", mode: "checkout" };
  }
  if (status === "paymentProcessing") {
    return { message: message || "결제 승인과 이용 권한을 확인하고 있습니다.", mode: resolvePaymentLoadingVariant(message, "confirm") };
  }
  return { message, mode: resolvePaymentLoadingVariant(message) };
}

function nowForPaidGate() {
  if (typeof performance !== "undefined" && typeof performance.now === "function") {
    return performance.now();
  }
  return Date.now();
}

function markPaidGate(name: string) {
  try {
    if (typeof performance !== "undefined" && typeof performance.mark === "function") {
      performance.mark(name);
    }
  } catch (_) {}
}

function resolvePaidGateFeature(detail: PaidFeatureGateDetail) {
  return String(detail.featureId || detail.featureKey || "paid-feature").trim() || "paid-feature";
}

function resolvePaidGateCopy(state: PaidFeatureGateState) {
  const fallback = PAID_GATE_COPY[state.status] || PAID_GATE_COPY.checkingEntitlement;
  return {
    label: fallback.label,
    title: state.title || fallback.title,
    message: state.message || fallback.message,
  };
}

function PaidFeatureGateProvider({ children }: PaymentProcessingProviderProps) {
  const seqRef = useRef(0);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [state, setState] = useState<PaidFeatureGateState>({
    open: false,
    status: "idle",
    featureId: "",
    requestId: "",
    title: PAID_GATE_DEFAULT_TITLE,
    message: PAID_GATE_DEFAULT_MESSAGE,
    cost: null,
    seq: 0,
    startedAt: 0,
  });

  const close = useCallback((requestId?: string) => {
    setState((prev) => {
      if (requestId && prev.requestId && requestId !== prev.requestId) return prev;
      return { ...prev, open: false, status: "idle", message: PAID_GATE_DEFAULT_MESSAGE };
    });
    emitCoinGateOverlay(false);
  }, []);

  const open = useCallback((detail: PaidFeatureGateDetail) => {
    const seq = seqRef.current + 1;
    seqRef.current = seq;
    const startedAt = Number.isFinite(Number(detail.startedAt)) ? Number(detail.startedAt) : nowForPaidGate();
    const featureId = resolvePaidGateFeature(detail);
    const status = detail.status || "checkingEntitlement";
    const copy = PAID_GATE_COPY[status] || PAID_GATE_COPY.checkingEntitlement;

    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }

    if (paymentLoadingOwnsPaidFeatureStatus(status)) {
      const overlay = resolvePaidFeatureStatusOverlay(status, detail.message || copy.message);
      setState((prev) => {
        if (!prev.open) return prev;
        return { ...prev, open: false, status: "idle", message: PAID_GATE_DEFAULT_MESSAGE };
      });
      emitCoinGateOverlay(true, overlay.message, overlay.mode);
      if (status === "hasEntitlement" || status === "paymentSuccess") {
        window.setTimeout(() => emitCoinGateOverlay(false), 900);
      }
      return seq;
    }

    markPaidGate("cd-paid-feature-gate-open-call");
    setState((prev) => {
      if (prev.open && detail.requestId && prev.requestId === detail.requestId) {
        return {
          ...prev,
          status,
          title: detail.title || prev.title || copy.title,
          message: detail.message || copy.message,
          cost: Number.isFinite(Number(detail.cost)) ? Number(detail.cost) : prev.cost,
        };
      }
      return {
        open: true,
        status,
        featureId,
        requestId: String(detail.requestId || `${featureId}:${seq}`),
        title: detail.title || copy.title,
        message: detail.message || copy.message,
        cost: Number.isFinite(Number(detail.cost)) ? Number(detail.cost) : null,
        seq,
        startedAt,
      };
    });

    if (typeof requestAnimationFrame === "function") {
      requestAnimationFrame(() => {
        markPaidGate("cd-paid-feature-gate-first-frame");
        try {
          const elapsed = Math.round(nowForPaidGate() - startedAt);
          if (elapsed > 100) {
            console.warn("[paid-feature-gate] first frame exceeded 100ms", { featureId, elapsed });
          }
        } catch (_) {}
      });
    }
    emitCoinGateOverlay(false);
    return seq;
  }, []);

  const update = useCallback((detail: PaidFeatureGateDetail) => {
    const requestedStatus = detail.status || "checkingEntitlement";
    if (paymentLoadingOwnsPaidFeatureStatus(requestedStatus)) {
      const overlay = resolvePaidFeatureStatusOverlay(
        requestedStatus,
        detail.message || PAID_GATE_COPY[detail.status || "checkingEntitlement"]?.message || PAID_GATE_DEFAULT_MESSAGE,
      );
      setState((prev) => {
        if (detail.requestId && prev.requestId && detail.requestId !== prev.requestId) return prev;
        if (!prev.open) return prev;
        return { ...prev, open: false, status: "idle", message: PAID_GATE_DEFAULT_MESSAGE };
      });
      emitCoinGateOverlay(true, overlay.message, overlay.mode);
      if (requestedStatus === "hasEntitlement" || requestedStatus === "paymentSuccess") {
        window.setTimeout(() => emitCoinGateOverlay(false), 900);
      }
      return;
    }

    setState((prev) => {
      if (detail.requestId && prev.requestId && detail.requestId !== prev.requestId) return prev;
      const status = detail.status || prev.status;
      const copy = PAID_GATE_COPY[status] || PAID_GATE_COPY.checkingEntitlement;
      if (!prev.open) {
        return {
          open: true,
          status,
          featureId: detail.featureId || detail.featureKey || prev.featureId || "paid-feature",
          requestId: String(detail.requestId || prev.requestId || `paid-feature:${Date.now().toString(36)}`),
          title: detail.title || copy.title,
          message: detail.message || copy.message,
          cost: Number.isFinite(Number(detail.cost)) ? Number(detail.cost) : null,
          seq: prev.seq + 1,
          startedAt: nowForPaidGate(),
        };
      }
      return {
        ...prev,
        status,
        featureId: detail.featureId || detail.featureKey || prev.featureId,
        title: detail.title || prev.title || copy.title,
        message: detail.message || copy.message,
        cost: Number.isFinite(Number(detail.cost)) ? Number(detail.cost) : prev.cost,
      };
    });
    emitCoinGateOverlay(false);
  }, []);

  const preload = useCallback(() => {
    markPaidGate("cd-paid-feature-gate-preload");
  }, []);

  useEffect(() => {
    if (!state.open) return;
    if (!["hasEntitlement", "paymentSuccess"].includes(state.status)) return;
    closeTimerRef.current = setTimeout(() => close(state.requestId), 900);
    return () => {
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }
    };
  }, [close, state.open, state.requestId, state.status]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    if (!state.open) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [state.open]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    type PaidGateWindow = Window & {
      __cdPaidFeatureGate?: {
        open: (detail: PaidFeatureGateDetail) => number;
        update: (detail: PaidFeatureGateDetail) => void;
        close: (requestId?: string) => void;
        preload: () => void;
      };
    };
    const runtimeWindow = window as PaidGateWindow;
    runtimeWindow.__cdPaidFeatureGate = { open, update, close, preload };

    const onGateEvent = (event: Event) => {
      const detail = (event as CustomEvent<PaidFeatureGateDetail & { action?: string }>).detail || {};
      if (detail.action === "close") {
        close(detail.requestId);
        return;
      }
      if (detail.action === "update") {
        update(detail);
        return;
      }
      open(detail);
    };

    window.addEventListener("cd:paid-feature-gate", onGateEvent);
    return () => {
      window.removeEventListener("cd:paid-feature-gate", onGateEvent);
      if (runtimeWindow.__cdPaidFeatureGate?.open === open) {
        delete runtimeWindow.__cdPaidFeatureGate;
      }
    };
  }, [close, open, preload, update]);

  const contextValue = useMemo(() => ({ state, open, update, close, preload }), [close, open, preload, state, update]);
  const copy = resolvePaidGateCopy(state);
  const showSkeleton = ["opening", "checkingEntitlement", "loadingProducts", "paymentProcessing"].includes(state.status);
  const showPayAction = state.status === "readyToPay" || state.status === "noEntitlement" || state.status === "paymentFailed";

  return (
    <PaidFeatureGateContext.Provider value={contextValue}>
      {children}
      {state.open ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-live="polite"
          data-paid-feature-gate-status={state.status}
          className="fixed inset-0 z-[2147483002] flex items-end justify-center bg-black/58 px-0 backdrop-blur-sm sm:items-center sm:px-4"
        >
          <div className="w-full rounded-t-[1.75rem] border border-white/15 bg-[#10131f] p-5 text-white shadow-[0_-22px_80px_rgba(0,0,0,0.35)] sm:max-w-md sm:rounded-[1.5rem] sm:p-6">
            <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-white/20 sm:hidden" />
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-200/80">{copy.label}</p>
                <h2 className="mt-1 text-xl font-black leading-tight text-white">{copy.title}</h2>
              </div>
              <button
                type="button"
                aria-label="닫기"
                onClick={() => close(state.requestId)}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/12 bg-white/8 text-lg font-bold text-white/80"
              >
                ×
              </button>
            </div>
            <p className="text-sm leading-6 text-slate-200">{copy.message}</p>
            {state.cost !== null ? (
              <p className="mt-3 inline-flex rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-xs font-bold text-cyan-100">
                필요 코인 {state.cost.toLocaleString("ko-KR")}
              </p>
            ) : null}
            {showSkeleton ? (
              <div className="mt-5 grid gap-2">
                <span className="h-3 w-full animate-pulse rounded-full bg-white/12" />
                <span className="h-3 w-4/5 animate-pulse rounded-full bg-white/10" />
                <span className="h-3 w-2/3 animate-pulse rounded-full bg-white/8" />
              </div>
            ) : null}
            {showPayAction ? (
              <button
                type="button"
                onClick={() => {
                  window.location.href = `/points?feature=${encodeURIComponent(state.featureId)}`;
                }}
                className="mt-5 min-h-12 w-full rounded-2xl bg-cyan-200 px-4 text-sm font-black text-slate-950"
              >
                결제 상품 보기
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </PaidFeatureGateContext.Provider>
  );
}

export function PaymentProcessingProvider({
  children,
}: PaymentProcessingProviderProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingVariant, setProcessingVariant] = useState<PaymentLoadingVariant>("payment");
  const processingVariantRef = useRef<PaymentLoadingVariant>("payment");
  const completionCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [processingMessage, setProcessingMessageState] = useState(
    DEFAULT_PROCESSING_MESSAGE,
  );

  const setPaymentLoadingVariant = useCallback((variant: PaymentLoadingVariant) => {
    processingVariantRef.current = variant;
    setProcessingVariant(variant);
  }, []);

  const clearCompletionCloseTimer = useCallback(() => {
    if (completionCloseTimerRef.current) {
      clearTimeout(completionCloseTimerRef.current);
      completionCloseTimerRef.current = null;
    }
  }, []);

  const closeProcessingNow = useCallback(() => {
    clearCompletionCloseTimer();
    setIsProcessing(false);
    setPaymentLoadingVariant("payment");
    setProcessingMessageState(DEFAULT_PROCESSING_MESSAGE);
  }, [clearCompletionCloseTimer, setPaymentLoadingVariant]);

  const startProcessing = useCallback((message?: string, variant?: PaymentLoadingVariant) => {
    clearCompletionCloseTimer();
    if (typeof message === "string" && message.trim()) {
      setProcessingMessageState(message);
    }
    setPaymentLoadingVariant(variant || resolvePaymentLoadingVariant(message));
    setIsProcessing(true);
  }, [clearCompletionCloseTimer, setPaymentLoadingVariant]);

  const stopProcessing = useCallback(() => {
    if (isPaymentCompletionVariant(processingVariantRef.current) && typeof window !== "undefined") {
      clearCompletionCloseTimer();
      completionCloseTimerRef.current = setTimeout(() => {
        closeProcessingNow();
      }, 900);
      return;
    }
    closeProcessingNow();
  }, [clearCompletionCloseTimer, closeProcessingNow]);

  const setProcessingMessage = useCallback((message: string) => {
    if (!message || !message.trim()) {
      setProcessingMessageState(DEFAULT_PROCESSING_MESSAGE);
      setPaymentLoadingVariant("payment");
      return;
    }
    setProcessingMessageState(message);
    setPaymentLoadingVariant(resolvePaymentLoadingVariant(message));
  }, [setPaymentLoadingVariant]);

  useEffect(() => {
    return () => clearCompletionCloseTimer();
  }, [clearCompletionCloseTimer]);

  const applyReactPaymentOverlay = useCallback((show: boolean, message?: string, mode?: string) => {
    if (show) {
      clearCompletionCloseTimer();
      const nextVariant = resolvePaymentLoadingVariant(message, mode);
      setPaymentLoadingVariant(nextVariant);
      setProcessingMessageState(String(message || "").trim() || DEFAULT_PROCESSING_MESSAGE);
      setIsProcessing(true);
      return;
    }
    stopProcessing();
  }, [clearCompletionCloseTimer, setPaymentLoadingVariant, stopProcessing]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const overlayWindow = window as Window & { _cdSetCoinGateOverlay?: (show: boolean, message?: string, mode?: string) => void };
    const previousOverlay = overlayWindow._cdSetCoinGateOverlay;
    const onPaymentLoadingState = (event: Event) => {
      const detail = (event as CustomEvent<{ open?: boolean; message?: string; mode?: string }>).detail || {};
      applyReactPaymentOverlay(Boolean(detail.open), detail.message, detail.mode);
    };
    overlayWindow._cdSetCoinGateOverlay = applyReactPaymentOverlay;
    window.addEventListener("cd:payment-loading-state", onPaymentLoadingState);
    return () => {
      window.removeEventListener("cd:payment-loading-state", onPaymentLoadingState);
      if (overlayWindow._cdSetCoinGateOverlay === applyReactPaymentOverlay) {
        overlayWindow._cdSetCoinGateOverlay = previousOverlay;
      }
    };
  }, [applyReactPaymentOverlay]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const runtimeWindow = window as unknown as Record<string, unknown>;
    runtimeWindow.__CD_PAYMENT_PROCESSING__ = isProcessing;

    if (document?.body) {
      if (isProcessing) {
        document.body.dataset.cdVersionGuardBusy = "1";
      } else {
        delete document.body.dataset.cdVersionGuardBusy;
      }
    }

    window.dispatchEvent(new CustomEvent("cd:critical-operation-state", {
      detail: {
        isPaymentProcessing: isProcessing,
      },
    }));

    return () => {
      runtimeWindow.__CD_PAYMENT_PROCESSING__ = false;
      if (document?.body) {
        delete document.body.dataset.cdVersionGuardBusy;
      }
    };
  }, [isProcessing]);

  useEffect(() => {
    if (!isProcessing || typeof window === "undefined") return;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [isProcessing]);

  const value = useMemo(
    () => ({
      isProcessing,
      isPaymentLoading: isProcessing,
      processingMessage,
      startProcessing,
      stopProcessing,
      setProcessingMessage,
      startPayment: startProcessing,
      endPayment: stopProcessing,
      setPaymentMessage: setProcessingMessage,
    }),
    [
      isProcessing,
      processingMessage,
      startProcessing,
      stopProcessing,
      setProcessingMessage,
    ],
  );

  return (
    <PaymentProcessingContext.Provider value={value}>
      {children}
      <PaymentLoading
        open={isProcessing}
        variant={processingVariant}
        statusMessage={processingMessage}
      />
    </PaymentProcessingContext.Provider>
  );
}

export function usePaymentProcessing() {
  const context = useContext(PaymentProcessingContext);
  if (!context) {
    throw new Error("usePaymentProcessing must be used within PaymentProcessingProvider");
  }
  return context;
}

export const usePayment = usePaymentProcessing;

export function usePaidFeatureGate() {
  const context = useContext(PaidFeatureGateContext);
  if (!context) {
    throw new Error("usePaidFeatureGate must be used within PaidFeatureGateProvider");
  }
  return context;
}
