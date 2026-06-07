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
  "/fuctionassets/%EB%8F%88%EB%B0%9D%ED%9E%88%EB%8A%94%20%EC%97%B0%EC%9D%B4.webp?v=20260607-payment-complete";

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

  const isPassChecking = variant === "pass-checking";
  const isPassApplied = variant === "pass-applied";
  const isPaymentComplete = variant === "payment-complete" || variant === "unlock-saving" || isPassApplied;
  const copyMap: Record<NonNullable<PaymentLoadingProps["variant"]>, { title: string; description: string; status?: string }> = {
    payment: {
      title: "결제 상태를 안전하게 확인하고 있습니다",
      description: "승인 정보와 이용 권한을 확인하고 있습니다.",
    },
    checkout: {
      title: "보안 결제창을 연결하고 있습니다",
      description: "주문 정보를 확인한 뒤 결제창으로 이어갑니다.",
    },
    confirm: {
      title: "결제 승인을 확인하고 있습니다",
      description: "승인 금액과 주문번호를 서버에서 검증하고 있습니다.",
    },
    monthly: {
      title: "월정석 잔량을 반영하고 있습니다",
      description: "잔량 차감과 이용 권한을 안전하게 정리하고 있습니다.",
    },
    subscription: {
      title: "달빛 이용권 결제를 확인하고 있습니다",
      description: "이용권 등급과 기간을 계정에 반영하고 있습니다.",
    },
    "unlock-saving": {
      title: "이용 권한을 저장하고 있습니다",
      description: "결과 화면을 열기 전 권한 기록을 정리하고 있습니다.",
    },
    "payment-complete": {
      title: "결제 확인 완료",
      description: "연이가 이용 권한을 열어두었습니다.",
      status: "잠시 후 콘텐츠로 이어집니다.",
    },
    refund: {
      title: "환불을 안전하게 처리하고 있습니다",
      description: "결제 내역과 이용 권한을 확인하고 있습니다.",
    },
    "pass-checking": {
      title: "달빛 이용권을 확인하고 있습니다",
      description: "이용권을 적용하고 있습니다.",
      status: "이용권 범위와 프로필 권한을 안전하게 확인하고 있습니다.",
    },
    "pass-applied": {
      title: "이용권 적용 완료",
      description: "연이가 이용 권한을 열어두었습니다.",
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
  const isWarmVariant = isPassChecking || isPaymentComplete || variant === "subscription";

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-live="assertive"
      data-payment-loading-variant={variant}
      className="fixed inset-0 z-[2147483003] flex items-center justify-center bg-[#050510]/82 px-4 backdrop-blur-xl"
    >
      <div className={`relative w-full max-w-md overflow-hidden rounded-[2rem] border p-8 text-center shadow-[0_0_80px_rgba(79,70,229,0.3)] ${
        isPaymentComplete
          ? "border-amber-200/35 bg-gradient-to-b from-[#171022]/96 to-[#080612]/96"
          : isPassChecking || variant === "subscription"
            ? "border-amber-200/30 bg-[radial-gradient(circle_at_50%_0%,rgba(251,191,36,0.22),transparent_42%),linear-gradient(180deg,rgba(14,18,42,0.96),rgba(7,8,20,0.96))]"
            : "border-indigo-500/30 bg-gradient-to-b from-[#0B0C21]/95 to-[#060612]/95"
      }`}>
        <div className="pointer-events-none absolute -top-24 -right-24 h-48 w-48 rounded-full bg-violet-600/20 blur-[60px]" />
        <div className="pointer-events-none absolute -bottom-24 -left-24 h-48 w-48 rounded-full bg-cyan-600/20 blur-[60px]" />

        <div className="relative mx-auto mb-8 flex h-24 w-24 items-center justify-center">
          {isPaymentComplete ? (
            <div className="relative h-24 w-24 overflow-hidden rounded-[1.4rem] border border-amber-100/40 bg-white/10 shadow-[0_0_34px_rgba(251,191,36,0.28)]">
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
          ) : isPassChecking ? (
            <div className="relative h-24 w-24">
              <span className="absolute inset-0 rounded-full border border-amber-100/25 shadow-[0_0_34px_rgba(251,191,36,0.22)] animate-[spin_5s_linear_infinite]" />
              <span className="absolute inset-4 rounded-full bg-[radial-gradient(circle_at_35%_25%,#fff7ed_0%,#fde68a_38%,#7c3aed_100%)] shadow-[0_0_42px_rgba(251,191,36,0.46)] animate-pulse" />
              <span className="absolute right-4 top-5 h-10 w-10 rounded-full bg-[#11162f]" />
            </div>
          ) : (
            <>
              <span className="absolute inset-0 rounded-full border-[1px] border-indigo-500/30 animate-[spin_4s_linear_infinite]">
                <span className="absolute -top-1 left-1/2 h-2 w-2 rounded-full bg-indigo-400 shadow-[0_0_8px_rgba(129,140,248,0.8)]" />
              </span>
              <span className="absolute inset-2 rounded-full border-[1px] border-violet-400/20 animate-[spin_3s_linear_infinite_reverse]">
                <span className="absolute top-1/2 -left-1 h-1.5 w-1.5 rounded-full bg-violet-300 shadow-[0_0_6px_rgba(196,181,253,0.8)]" />
              </span>
              <div className="relative h-11 w-11 rounded-full bg-gradient-to-tr from-indigo-600 via-violet-400 to-cyan-300 shadow-[0_0_30px_rgba(139,92,246,0.6)] animate-pulse" />
            </>
          )}
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
