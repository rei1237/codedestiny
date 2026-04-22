"use client";

import { usePaymentProcessing } from "../components/PaymentProcessingContext";

export function usePayment() {
  const {
    isPaymentLoading,
    processingMessage,
    startPayment,
    endPayment,
    setPaymentMessage,
  } = usePaymentProcessing();

  return {
    isPaymentLoading,
    paymentMessage: processingMessage,
    startPayment,
    endPayment,
    setPaymentMessage,
  };
}
