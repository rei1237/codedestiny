"use client";

import { useEffect, useState } from "react";

export type PaymentLoadingProps = {
  open: boolean;
  variant?:
    | "payment"
    | "checkout"
    | "confirm"
    | "monthly"
    | "subscription"
    | "unlock-saving"
    | "payment-complete"
    | "refund"
    | "pass-checking"
    | "pass-applied";
  title?: string;
  description?: string;
  statusMessage?: string;
};

const DEFAULT_TITLE = "운명을 읽어오는 중입니다...";
const DEFAULT_DESCRIPTION = "결제가 진행 중입니다. 잠시만 기다려 주세요.";
const YEON_SPRITE_URL =
  "/fuctionassets/%EB%8F%88%EB%B0%9D%ED%9E%88%EB%8A%94%20%EC%97%B0%EC%9D%B4.webp?v=20260607-unified-payment";
const UNIFIED_PAYMENT_MARKER = "cd-money-yeon-unified-payment-ui-v20260607";

export default function PaymentLoading({
  open,
  variant = "payment",
  title,
  description,
  statusMessage,
}: PaymentLoadingProps) {
  const [elapsedMs, setElapsedMs] = useState(0);

  useEffect(() => {
    if (!open || typeof document === "undefined") return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      setElapsedMs(0);
      return;
    }

    const startedAt = Date.now();
    const timer = window.setInterval(() => {
      setElapsedMs(Date.now() - startedAt);
    }, 1000);

    return () => window.clearInterval(timer);
  }, [open]);

  if (!open) return null;

  const isPaymentComplete = variant === "payment-complete" || variant === "unlock-saving" || variant === "pass-applied";
  const copyMap: Record<NonNullable<PaymentLoadingProps["variant"]>, { title: string; description: string; status?: string }> = {
    payment: {
      title: "결제 상태를 안전하게 확인하고 있습니다",
      description: "연이가 주문 정보와 이용 권한을 차례로 맞춰보고 있습니다.",
    },
    checkout: {
      title: "보안 결제창을 열고 있습니다",
      description: "주문 금액과 결제 정보를 정돈한 뒤 결제창으로 이어갑니다.",
    },
    confirm: {
      title: "결제 승인을 확인하고 있습니다",
      description: "승인 금액, 주문번호, 이용 권한을 안전하게 대조하고 있습니다.",
    },
    monthly: {
      title: "월정석 잔량을 반영하고 있습니다",
      description: "잔량 차감과 이용 권한을 한 번 더 확인하고 있습니다.",
    },
    subscription: {
      title: "이용권 결제를 확인하고 있습니다",
      description: "이용권 등급, 기간, 계정 권한을 차분하게 연결하고 있습니다.",
    },
    "unlock-saving": {
      title: "이용 권한을 저장하고 있습니다",
      description: "결과 화면으로 이어지도록 권한 기록을 정리하고 있습니다.",
    },
    "payment-complete": {
      title: "결제 확인 완료",
      description: "연이가 이용 권한을 반짝 열어두었습니다.",
      status: "잠시 후 콘텐츠로 이어집니다.",
    },
    refund: {
      title: "환불을 안전하게 처리하고 있습니다",
      description: "결제 내역과 이용 권한을 차례로 확인하고 있습니다.",
    },
    "pass-checking": {
      title: "이용권을 확인하고 있습니다",
      description: "연이가 이용권 범위와 프로필 권한을 맞춰보고 있습니다.",
      status: "이용권 적용 여부를 확인하고 있습니다.",
    },
    "pass-applied": {
      title: "이용권 적용 완료",
      description: "연이가 이용 권한을 반짝 열어두었습니다.",
      status: "잠시 후 콘텐츠로 이어집니다.",
    },
  };
  const copy = copyMap[variant] || copyMap.payment;
  const resolvedTitle = title || copy.title || DEFAULT_TITLE;
  const resolvedDescription = description || copy.description || DEFAULT_DESCRIPTION;
  const cleanedStatus = String(statusMessage || "").trim();
  const resolvedStatus = elapsedMs >= 20000
    ? "확인이 길어지고 있습니다. 같은 창에서 계속 안전하게 재확인 중입니다."
    : elapsedMs >= 8000
      ? "결제 확인이 조금 지연되고 있습니다. 곧 자동으로 이어집니다."
      : cleanedStatus && cleanedStatus !== resolvedDescription
        ? cleanedStatus
        : copy.status;
  const isWarmVariant = ["pass-checking", "pass-applied", "subscription", "monthly"].includes(variant) || isPaymentComplete;

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-live="assertive"
      data-payment-loading-variant={variant}
      data-payment-loading-marker={UNIFIED_PAYMENT_MARKER}
      className="fixed inset-0 z-[2147483003] flex items-center justify-center bg-[#050510]/86 px-4 backdrop-blur-xl"
    >
      <div className="relative w-full max-w-md overflow-hidden rounded-[2rem] border border-amber-100/35 bg-[linear-gradient(180deg,rgba(24,19,34,0.97),rgba(8,9,20,0.98))] p-8 text-center shadow-[0_28px_90px_rgba(0,0,0,0.48)]">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-100/70 to-transparent" />
        <div className="pointer-events-none absolute inset-x-8 top-0 h-28 bg-gradient-to-b from-amber-200/12 to-transparent" />

        <div className="relative mx-auto mb-8 flex h-24 w-24 items-center justify-center">
          <span className="absolute -inset-2 rounded-[1.65rem] border border-amber-100/20 bg-amber-100/5 shadow-[0_0_38px_rgba(251,191,36,0.22)]" />
          <div className="relative h-24 w-24 overflow-hidden rounded-[1.4rem] border border-amber-100/45 bg-[#fff7ed] shadow-[0_12px_34px_rgba(251,191,36,0.25)]">
            <div
              className="h-full w-full animate-[cdYeonPaymentSprite_1.08s_steps(8)_infinite]"
              style={{
                backgroundImage: `url("${YEON_SPRITE_URL}")`,
                backgroundRepeat: "no-repeat",
                backgroundSize: "400% 200%",
                imageRendering: "auto",
              }}
            />
          </div>
        </div>

        <p className={`text-xl font-bold tracking-tight text-transparent bg-clip-text sm:text-2xl ${
          isWarmVariant
            ? "bg-gradient-to-r from-amber-100 via-fuchsia-100 to-cyan-100"
            : "bg-gradient-to-r from-cyan-200 via-indigo-200 to-violet-300"
        }`}>{resolvedTitle}</p>
        <p className="mt-3 text-sm leading-relaxed text-indigo-100/76">{resolvedDescription}</p>

        {resolvedStatus ? (
          <div className="mt-6 flex justify-center">
            <p className="relative rounded-2xl border border-indigo-500/30 bg-indigo-950/50 px-4 py-2.5 text-xs font-medium text-cyan-100 sm:text-sm">
              <span className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-r from-cyan-500/10 to-violet-500/10" />
              <span className="relative">{resolvedStatus}</span>
            </p>
          </div>
        ) : null}

        <style jsx global>{`
          @keyframes cdYeonPaymentSprite {
            0% { background-position: 0% 0%; }
            12.5% { background-position: 33.333% 0%; }
            25% { background-position: 66.666% 0%; }
            37.5% { background-position: 100% 0%; }
            50% { background-position: 0% 100%; }
            62.5% { background-position: 33.333% 100%; }
            75% { background-position: 66.666% 100%; }
            100% { background-position: 100% 100%; }
          }
        `}</style>
      </div>
    </div>
  );
}
