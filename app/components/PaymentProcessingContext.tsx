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
  processingMessage: string;
  startProcessing: (message?: string) => void;
  stopProcessing: () => void;
  setProcessingMessage: (message: string) => void;
};

type PaymentProcessingProviderProps = {
  children: React.ReactNode;
};

const DEFAULT_PROCESSING_MESSAGE = "안전하게 결제를 진행 중입니다.";

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
      processingMessage,
      startProcessing,
      stopProcessing,
      setProcessingMessage,
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
        title="결제를 확인하고 있습니다."
        description="창을 닫거나 새로고침하지 마세요. 중복 결제가 발생할 수 있습니다."
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
