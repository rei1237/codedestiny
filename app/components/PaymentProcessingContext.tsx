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
import PaymentProcessingOverlay from "./PaymentProcessingOverlay";

type PaymentProcessingContextValue = {
  isProcessing: boolean;
  isPaymentLoading: boolean;
  processingMessage: string;
  startProcessing: (message?: string) => void;
  stopProcessing: () => void;
  setProcessingMessage: (message: string) => void;
  startPayment: (message?: string) => void;
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
const PAID_GATE_DEFAULT_MESSAGE = "이용권 확인 중";

const PAID_GATE_COPY: Record<PaidFeatureGateStatus, { label: string; title: string; message: string }> = {
  idle: { label: "대기", title: PAID_GATE_DEFAULT_TITLE, message: PAID_GATE_DEFAULT_MESSAGE },
  opening: { label: "열림", title: PAID_GATE_DEFAULT_TITLE, message: "확인 창을 여는 중" },
  checkingEntitlement: { label: "확인 중", title: PAID_GATE_DEFAULT_TITLE, message: "이용권 확인 중" },
  hasEntitlement: { label: "이용 가능", title: "이용권 확인 완료", message: "보유 이용권으로 바로 이용할 수 있습니다." },
  noEntitlement: { label: "결제 필요", title: PAID_GATE_DEFAULT_TITLE, message: "이용 가능한 이용권을 찾지 못했습니다." },
  loadingProducts: { label: "상품 조회", title: PAID_GATE_DEFAULT_TITLE, message: "결제 가능한 상품을 불러오는 중" },
  readyToPay: { label: "결제 가능", title: "결제 가능", message: "결제 후 바로 이용할 수 있습니다." },
  paymentProcessing: { label: "처리 중", title: "결제 처리 중", message: "결제와 이용권 반영을 확인 중입니다." },
  paymentSuccess: { label: "완료", title: "결제 확인 완료", message: "잠시 후 결과 화면으로 이어집니다." },
  paymentFailed: { label: "실패", title: "결제 확인 실패", message: "결제를 완료하지 못했습니다." },
  error: { label: "오류", title: "확인 실패", message: "네트워크 상태를 확인한 뒤 다시 시도해 주세요." },
};

const PaidFeatureGateContext = createContext<PaidFeatureGateContextValue | undefined>(undefined);

function resolveProcessingCopy(message: string) {
  const normalizedMessage = String(message || "");
  const isUnlockFlow = /잠금|해금|unlock|해제/i.test(normalizedMessage);

  if (isUnlockFlow) {
    return {
      title: "잠금 해제 중입니다...",
      description: "우주 결제 게이트를 확인하고 해금 권한을 적용하고 있습니다. 잠시만 기다려 주세요.",
    };
  }

  return {
    title: "운명을 읽어오는 중입니다...",
    description: "결제가 진행 중입니다. 잠시만 기다려 주세요.",
  };
}

const PaymentProcessingContext = createContext<PaymentProcessingContextValue | undefined>(
  undefined,
);

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
    return seq;
  }, []);

  const update = useCallback((detail: PaidFeatureGateDetail) => {
    setState((prev) => {
      if (!prev.open) return prev;
      if (detail.requestId && prev.requestId && detail.requestId !== prev.requestId) return prev;
      const status = detail.status || prev.status;
      const copy = PAID_GATE_COPY[status] || PAID_GATE_COPY.checkingEntitlement;
      return {
        ...prev,
        status,
        featureId: detail.featureId || detail.featureKey || prev.featureId,
        title: detail.title || prev.title || copy.title,
        message: detail.message || copy.message,
        cost: Number.isFinite(Number(detail.cost)) ? Number(detail.cost) : prev.cost,
      };
    });
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
  const [processingMessage, setProcessingMessageState] = useState(
    DEFAULT_PROCESSING_MESSAGE,
  );
  const overlayCopy = resolveProcessingCopy(processingMessage);

  const startProcessing = useCallback((message?: string) => {
    if (typeof message === "string" && message.trim()) {
      setProcessingMessageState(message);
    }
    setIsProcessing(true);
  }, []);

  const stopProcessing = useCallback(() => {
    setIsProcessing(false);
    setProcessingMessageState(DEFAULT_PROCESSING_MESSAGE);
  }, []);

  const setProcessingMessage = useCallback((message: string) => {
    if (!message || !message.trim()) {
      setProcessingMessageState(DEFAULT_PROCESSING_MESSAGE);
      return;
    }
    setProcessingMessageState(message);
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      (window as any)._cdSetCoinGateOverlay = (show: boolean, message?: string) => {
        if (show) {
          startProcessing(message);
        } else {
          stopProcessing();
        }
      };
    }
    return () => {
      if (typeof window !== "undefined") {
        delete (window as any)._cdSetCoinGateOverlay;
      }
    };
  }, [startProcessing, stopProcessing]);

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
      <PaidFeatureGateProvider>
        {children}
        <PaymentProcessingOverlay
          open={isProcessing}
          title={overlayCopy.title}
          description={overlayCopy.description}
          statusMessage={processingMessage}
        />
      </PaidFeatureGateProvider>
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
