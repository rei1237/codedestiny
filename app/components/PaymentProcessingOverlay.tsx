"use client";

import { useEffect } from "react";

type PaymentProcessingOverlayProps = {
  open: boolean;
  title?: string;
  description?: string;
  statusMessage?: string;
};

const DEFAULT_TITLE = "결제를 확인하고 있습니다.";
const DEFAULT_DESCRIPTION = "창을 닫거나 새로고침하지 마세요. 중복 결제가 발생할 수 있습니다.";

export default function PaymentProcessingOverlay({
  open,
  title = DEFAULT_TITLE,
  description = DEFAULT_DESCRIPTION,
  statusMessage,
}: PaymentProcessingOverlayProps) {
  useEffect(() => {
    if (!open || typeof document === "undefined") return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-live="assertive"
      className="fixed inset-0 z-[130] flex items-center justify-center bg-slate-950/55 px-4 backdrop-blur-md"
    >
      <div className="w-full max-w-md rounded-3xl border border-amber-200/35 bg-slate-950/85 p-6 text-center shadow-[0_32px_80px_rgba(0,0,0,0.45)] sm:p-8">
        <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full border border-amber-200/20 bg-amber-50/5">
          <div className="relative h-12 w-12">
            <span className="absolute inset-0 rounded-full border-2 border-amber-200/40" />
            <span className="absolute inset-0 rounded-full border-[3px] border-transparent border-t-amber-300 border-r-amber-200 animate-spin" />
            <span className="absolute inset-[9px] rounded-full border-2 border-transparent border-t-white/85 animate-spin [animation-duration:1.5s] [animation-direction:reverse]" />
          </div>
        </div>

        <p className="text-lg font-bold tracking-[-0.015em] text-white sm:text-xl">{title}</p>
        <p className="mt-2 text-sm leading-relaxed text-slate-200/85">{description}</p>

        {statusMessage ? (
          <p className="mt-4 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-amber-100/90 sm:text-sm">
            {statusMessage}
          </p>
        ) : null}
      </div>
    </div>
  );
}
