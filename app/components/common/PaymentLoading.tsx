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
const UNIFIED_PAYMENT_MARKER = "cd-money-yeon-unified-payment-ui-v20260611-slow-sprite";

export default function PaymentLoading({
  open,
  variant = "payment",
  title,
  description,
  statusMessage,
}: PaymentLoadingProps) {
  const [elapsedMs, setElapsedMs] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const img = new window.Image();
    img.decoding = "async";
    img.src = YEON_SPRITE_URL;
  }, []);

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
      title: "단건 결제창을 열고 있습니다",
      description: "주문 금액과 인증 정보를 맞춰 안전한 결제창으로 이어갑니다.",
    },
    confirm: {
      title: "단건 결제 승인을 확인하고 있습니다",
      description: "승인 신호와 콘텐츠 이용 권한을 함께 확인하고 있습니다.",
    },
    monthly: {
      title: "이벤트 월정석 보너스를 반영하고 있습니다",
      description: "이벤트 월정석 보너스 잔량을 확인하고 콘텐츠 이용 권한을 여는 중입니다.",
    },
    subscription: {
      title: "코인 기준 이용권 결제를 확인하고 있습니다",
      description: "코인 기준 이용권 결제 승인과 이용 권한을 차분하게 연결하고 있습니다.",
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
      className="fixed inset-0 z-[2147483003] flex items-center justify-center bg-[#050510]/78 px-4 backdrop-blur-md"
    >
      <div className="relative w-full max-w-[360px] overflow-hidden rounded-[1.5rem] border border-amber-100/35 bg-[linear-gradient(180deg,rgba(24,19,34,0.96),rgba(8,9,20,0.97))] p-5 text-center shadow-[0_20px_54px_rgba(0,0,0,0.38)] sm:p-6">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-100/70 to-transparent" />
        <div className="pointer-events-none absolute inset-x-8 top-0 h-28 bg-gradient-to-b from-amber-200/12 to-transparent" />

        <div className="relative mx-auto mb-5 flex h-[142px] w-[104px] items-center justify-center">
          <span className="absolute -inset-2 rounded-[1.5rem] border border-amber-100/18 bg-amber-100/5 shadow-[0_0_24px_rgba(251,191,36,0.18)]" />
          <div className="relative h-[132px] w-[88px] overflow-hidden rounded-[1.25rem] border border-amber-100/45 bg-[#fff7ed] shadow-[0_10px_24px_rgba(251,191,36,0.2)] [contain:paint]">
            <div
              className="absolute left-0 top-0 h-[200%] w-[400%]"
              style={{
                animation: "cdYeonPaymentSprite 3.6s steps(1, end) infinite",
                backgroundImage: `url("${YEON_SPRITE_URL}")`,
                backgroundRepeat: "no-repeat",
                backgroundSize: "100% 100%",
                imageRendering: "auto",
                transform: "translate3d(0, 0, 0)",
                willChange: "transform",
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
            0%, 12.49% { transform: translate3d(0%, 0%, 0); }
            12.5%, 24.99% { transform: translate3d(-25%, 0%, 0); }
            25%, 37.49% { transform: translate3d(-50%, 0%, 0); }
            37.5%, 49.99% { transform: translate3d(-75%, 0%, 0); }
            50%, 62.49% { transform: translate3d(0%, -50%, 0); }
            62.5%, 74.99% { transform: translate3d(-25%, -50%, 0); }
            75%, 87.49% { transform: translate3d(-50%, -50%, 0); }
            87.5%, 100% { transform: translate3d(-75%, -50%, 0); }
          }
          @media (prefers-reduced-motion: reduce) {
            [data-payment-loading-marker="${UNIFIED_PAYMENT_MARKER}"] [style*="cdYeonPaymentSprite"] {
              animation-duration: 6.4s !important;
            }
          }
        `}</style>
      </div>
    </div>
  );
}
