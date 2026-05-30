"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
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
      {children}
      <PaymentProcessingOverlay
        open={isProcessing}
        title={overlayCopy.title}
        description={overlayCopy.description}
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
