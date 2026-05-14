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

const DEFAULT_PROCESSING_MESSAGE = "결제가 진행 중입니다.";

function resolveRequestUrl(input: RequestInfo | URL): URL | null {
  if (typeof window === "undefined") return null;
  try {
    if (typeof input === "string") return new URL(input, window.location.origin);
    if (input instanceof URL) return new URL(input.toString(), window.location.origin);
    if (input && typeof (input as Request).url === "string") {
      return new URL((input as Request).url, window.location.origin);
    }
  } catch {
    return null;
  }
  return null;
}

function resolveRequestMethod(input: RequestInfo | URL, init?: RequestInit): string {
  const initMethod = String(init?.method || "").trim();
  if (initMethod) return initMethod.toUpperCase();
  if (typeof input !== "string" && !(input instanceof URL)) {
    const requestMethod = String((input as Request)?.method || "").trim();
    if (requestMethod) return requestMethod.toUpperCase();
  }
  return "GET";
}

function shouldTrackPaymentRequest(pathname: string, method: string): boolean {
  const upperMethod = String(method || "GET").toUpperCase();
  if (upperMethod === "GET" || upperMethod === "HEAD" || upperMethod === "OPTIONS") return false;

  if (pathname.startsWith("/api/billing/")) return true;
  if (pathname.startsWith("/api/payments/")) return true;
  if (pathname.startsWith("/api/subscription/")) return true;
  if (pathname.startsWith("/api/payment/")) return true;
  if (pathname.startsWith("/api/checkout/")) return true;
  if (pathname.startsWith("/api/fortune/pig-coin/")) return true;
  if (pathname.startsWith("/api/premium/")) return true;
  if (pathname.startsWith("/api/premium-report/")) return true;
  if (pathname.startsWith("/api/sibyl/report")) return true;

  return false;
}

function resolvePaymentMessage(pathname: string): string {
  if (pathname.startsWith("/api/payments/subscription/confirm") || pathname.startsWith("/api/billing/confirm")) {
    return "은하 결제망에서 구독 활성화를 확인하고 있습니다...";
  }
  if (pathname.startsWith("/api/payments/confirm") || pathname.startsWith("/api/billing/purchase")) {
    return "별빛 결제를 검증하고 포인트를 정산하고 있습니다...";
  }
  if (pathname.startsWith("/api/payments/prepare") || pathname.startsWith("/api/billing/checkout")) {
    return "우주 결제 채널을 준비하고 있습니다...";
  }
  if (pathname.startsWith("/api/fortune/pig-coin/")) {
    return "꽃돼지 코인 게이트를 통과하는 중입니다...";
  }
  return "성간 결제 라인을 연결하고 있습니다...";
}

const PaymentProcessingContext = createContext<PaymentProcessingContextValue | undefined>(
  undefined,
);

export function PaymentProcessingProvider({
  children,
}: PaymentProcessingProviderProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingMessage, setProcessingMessageState] = useState(
    DEFAULT_PROCESSING_MESSAGE,
  );
  const processingDepthRef = useRef(0);

  const startProcessing = useCallback((message?: string) => {
    if (typeof message === "string" && message.trim()) {
      setProcessingMessageState(message);
    }
    processingDepthRef.current += 1;
    setIsProcessing(true);
  }, [processingDepthRef]);

  const forceStopProcessing = useCallback(() => {
    processingDepthRef.current = 0;
    setIsProcessing(false);
    setProcessingMessageState(DEFAULT_PROCESSING_MESSAGE);
  }, [processingDepthRef]);

  const stopProcessing = useCallback(() => {
    processingDepthRef.current = Math.max(0, processingDepthRef.current - 1);
    if (processingDepthRef.current === 0) {
      setIsProcessing(false);
      setProcessingMessageState(DEFAULT_PROCESSING_MESSAGE);
    }
  }, [processingDepthRef]);

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
          forceStopProcessing();
        }
      };
    }
    return () => {
      if (typeof window !== "undefined") {
        delete (window as any)._cdSetCoinGateOverlay;
      }
    };
  }, [forceStopProcessing, startProcessing]);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.fetch !== "function") return;

    const runtime = window as unknown as {
      __cdPaymentProcessingFetchPatchRefCount?: number;
      __cdPaymentProcessingOriginalFetch?: typeof window.fetch;
    };

    const originalFetch = runtime.__cdPaymentProcessingOriginalFetch || window.fetch.bind(window);
    runtime.__cdPaymentProcessingOriginalFetch = originalFetch;
    runtime.__cdPaymentProcessingFetchPatchRefCount = (runtime.__cdPaymentProcessingFetchPatchRefCount || 0) + 1;

    if (runtime.__cdPaymentProcessingFetchPatchRefCount === 1) {
      window.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
        const url = resolveRequestUrl(input);
        const pathname = String(url?.pathname || "");
        const method = resolveRequestMethod(input, init);
        const shouldTrack = shouldTrackPaymentRequest(pathname, method);

        if (!shouldTrack) {
          return originalFetch(input as RequestInfo, init);
        }

        try {
          const message = resolvePaymentMessage(pathname);
          window.dispatchEvent(new CustomEvent("cd:payment-pending", {
            detail: {
              pending: true,
              message,
              pathname,
              method,
              source: "app-fetch",
            },
          }));
        } catch {
          // ignore event dispatch failures
        }

        const requestInit: RequestInit = {
          ...(init || {}),
          credentials: "include",
        };

        return originalFetch(input as RequestInfo, requestInit)
          .finally(() => {
            try {
              window.dispatchEvent(new CustomEvent("cd:payment-pending", {
                detail: {
                  pending: false,
                  pathname,
                  method,
                  source: "app-fetch",
                },
              }));
            } catch {
              // ignore event dispatch failures
            }
          });
      }) as typeof window.fetch;
    }

    return () => {
      const nextCount = Math.max(0, Number(runtime.__cdPaymentProcessingFetchPatchRefCount || 1) - 1);
      runtime.__cdPaymentProcessingFetchPatchRefCount = nextCount;
      if (nextCount === 0 && runtime.__cdPaymentProcessingOriginalFetch) {
        window.fetch = runtime.__cdPaymentProcessingOriginalFetch;
      }
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handlePendingEvent = (event: Event) => {
      const detail = (event as CustomEvent)?.detail as {
        pending?: boolean;
        message?: string;
      } | undefined;

      if (!detail || typeof detail !== "object") return;

      if (detail.pending) {
        startProcessing(detail.message || DEFAULT_PROCESSING_MESSAGE);
      } else {
        stopProcessing();
      }
    };

    window.addEventListener("cd:payment-pending", handlePendingEvent as EventListener);
    return () => {
      window.removeEventListener("cd:payment-pending", handlePendingEvent as EventListener);
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
      {children}
      <PaymentProcessingOverlay
        open={isProcessing}
        title="운명을 읽어오는 중입니다..."
        description="결제가 진행 중입니다. 잠시만 기다려 주세요."
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
