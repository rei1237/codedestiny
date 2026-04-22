"use client";

import PaymentLoading, { type PaymentLoadingProps } from "./common/PaymentLoading";

export type PaymentProcessingOverlayProps = PaymentLoadingProps;

export default function PaymentProcessingOverlay(props: PaymentProcessingOverlayProps) {
  return <PaymentLoading {...props} />;
}
