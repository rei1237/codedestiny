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

const DEFAULT_TITLE = "결제 상태를 확인하고 있습니다";
const DEFAULT_DESCRIPTION = "결제와 이용 권한을 안전하게 확인하고 있습니다. 잠시만 기다려 주세요.";
const YEON_SPRITE_URL =
  "/fuctionassets/%EB%8F%88%EB%8F%85%EC%98%A4%EB%A5%B8%20%EC%97%B0%EC%9D%B4.webp?v=20260612-clean-cut";
const UNIFIED_PAYMENT_MARKER = "cd-money-yeon-unified-payment-ui-v20260612-clean-cut";

function resolveYeonSpriteAnimation(variant: NonNullable<PaymentLoadingProps["variant"]>) {
  if (variant === "checkout") return "cdYeonPaymentSpriteCheckout 2.8s steps(1, end) infinite";
  if (variant === "confirm") return "cdYeonPaymentSpriteConfirm 2.8s steps(1, end) infinite";
  if (variant === "monthly" || variant === "subscription") return "cdYeonPaymentSpriteBalance 3.2s steps(1, end) infinite";
  if (variant === "unlock-saving") return "cdYeonPaymentSpriteUnlock 3s steps(1, end) infinite";
  if (variant === "payment-complete" || variant === "pass-applied") return "cdYeonPaymentSpriteComplete 2.6s steps(1, end) infinite";
  if (variant === "refund") return "cdYeonPaymentSpriteCalm 3s steps(1, end) infinite";
  return "cdYeonPaymentSpriteCheck 3s steps(1, end) infinite";
}

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
  const isPassAppliedVariant = variant === "pass-applied";
  const copyMap: Record<NonNullable<PaymentLoadingProps["variant"]>, { title: string; description: string; status?: string }> = {
    payment: {
      title: "이용 권한 확인 중",
      description: "주문 정보와 이용 권한을 차분히 맞춰 보고 있습니다.",
    },
    checkout: {
      title: "결제창 준비 중",
      description: "결제창을 열기 전 주문 금액과 인증 정보를 확인하고 있습니다.",
    },
    confirm: {
      title: "결제 승인 확인 중",
      description: "승인 신호와 콘텐츠 이용 권한을 함께 확인하고 있습니다.",
    },
    monthly: {
      title: "Moonlight Stone 적용 중",
      description: "보너스 잔량과 콘텐츠 이용 권한을 확인하고 있습니다.",
    },
    subscription: {
      title: "이용권 결제 확인 중",
      description: "이용권 결제 승인과 서비스 이용 권한을 연결하고 있습니다.",
    },
    "unlock-saving": {
      title: "잠금 해제 저장 중",
      description: "결과 화면으로 이어지도록 권한 기록을 정리하고 있습니다.",
    },
    "payment-complete": {
      title: "결제 확인 완료",
      description: "이용 권한이 정상적으로 열렸습니다.",
      status: "잠시 후 콘텐츠로 이어집니다.",
    },
    refund: {
      title: "환불 상태 확인 중",
      description: "결제 내역과 이용 권한을 안전하게 다시 확인하고 있습니다.",
    },
    "pass-checking": {
      title: "이용권 확인 중",
      description: "보유한 이용권 범위와 현재 콘텐츠 권한을 확인하고 있습니다.",
      status: "이용권 적용 여부를 확인하고 있습니다.",
    },
    "pass-applied": {
      title: "이용권 적용 완료",
      description: "보유한 이용권으로 이번 콘텐츠가 열렸습니다.\n코인 차감 없이 바로 이어집니다.",
      status: "콘텐츠 문을 여는 중입니다.",
    },
  };
  const copy = copyMap[variant] || copyMap.payment;
  const cleanedStatus = String(statusMessage || "").trim();
  const passLines = isPassAppliedVariant && !description && cleanedStatus
    ? cleanedStatus.split(/\n+/).map((line) => line.trim()).filter(Boolean)
    : [];
  const resolvedTitle = title || (passLines.length > 1 ? passLines[0] : "") || copy.title || DEFAULT_TITLE;
  const resolvedDescription = description
    || (passLines.length > 1 ? passLines.slice(1).join("\n") : "")
    || copy.description
    || DEFAULT_DESCRIPTION;
  const isFamilyPassVariant = isPassAppliedVariant && [resolvedTitle, resolvedDescription, cleanedStatus].join(" ").toUpperCase().includes("FAMILY");
  const resolvedStatus = elapsedMs >= 20000
    ? "확인이 길어지고 있습니다. 같은 창에서 계속 안전하게 재확인 중입니다."
    : elapsedMs >= 8000
      ? "결제 확인이 조금 지연되고 있습니다. 곧 자동으로 이어집니다."
      : isPassAppliedVariant
        ? copy.status
      : cleanedStatus && cleanedStatus !== resolvedDescription
        ? cleanedStatus
        : copy.status;
  const isWarmVariant = ["pass-checking", "pass-applied", "subscription", "monthly"].includes(variant) || isPaymentComplete;
  const spriteAnimation = resolveYeonSpriteAnimation(variant);

  return (
    <div
      role={isPassAppliedVariant ? "dialog" : "alertdialog"}
      aria-modal="true"
      aria-live={isPassAppliedVariant ? "polite" : "assertive"}
      data-payment-loading-variant={variant}
      data-payment-loading-marker={UNIFIED_PAYMENT_MARKER}
      className={`fixed inset-0 z-[2147483003] flex items-center justify-center px-4 ${
        isPassAppliedVariant
          ? "bg-slate-950/70 backdrop-blur-xl"
          : "bg-[#050510]/78 backdrop-blur-md"
      }`}
    >
      <div className={`relative w-full max-w-[360px] overflow-hidden border p-5 text-center shadow-[0_20px_54px_rgba(0,0,0,0.38)] sm:p-6 ${
        isPassAppliedVariant
          ? `rounded-[2rem] border-white/15 bg-white/10 shadow-2xl ${isFamilyPassVariant ? "ring-1 ring-amber-200/30" : ""}`
          : "rounded-[1.5rem] border-amber-100/35 bg-[linear-gradient(180deg,rgba(24,19,34,0.96),rgba(8,9,20,0.97))]"
      }`}>
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-100/70 to-transparent" />
        <div className={`pointer-events-none absolute inset-x-8 top-0 h-28 bg-gradient-to-b ${isPassAppliedVariant ? "from-amber-100/18" : "from-amber-200/12"} to-transparent`} />
        {isPassAppliedVariant ? (
          <div className="pointer-events-none absolute inset-0 opacity-80">
            <span className="absolute left-[18%] top-[18%] h-1 w-1 rounded-full bg-white shadow-[0_0_12px_rgba(255,255,255,.8)]" />
            <span className="absolute right-[22%] top-[24%] h-1.5 w-1.5 rounded-full bg-amber-100 shadow-[0_0_14px_rgba(253,230,138,.82)]" />
            <span className="absolute bottom-[26%] left-[24%] h-1 w-1 rounded-full bg-cyan-100 shadow-[0_0_12px_rgba(207,250,254,.75)]" />
            <span className="absolute bottom-[30%] right-[18%] h-1 w-1 rounded-full bg-fuchsia-100 shadow-[0_0_12px_rgba(250,232,255,.7)]" />
          </div>
        ) : null}

        <div className="relative mx-auto mb-5 flex h-[142px] w-[104px] items-center justify-center">
          <span className={`absolute -inset-2 rounded-[1.5rem] border border-amber-100/18 bg-amber-100/5 shadow-[0_0_24px_rgba(251,191,36,0.18)] ${isFamilyPassVariant ? "scale-110 shadow-[0_0_38px_rgba(251,191,36,0.32)]" : ""}`} />
          <div className="relative h-[132px] w-[88px] overflow-hidden rounded-[1.25rem] border border-amber-100/45 bg-[#fff7ed] shadow-[0_10px_24px_rgba(251,191,36,0.2)] [contain:paint]">
            <div
              className="absolute left-0 top-0 h-[200%] w-[400%]"
              style={{
                animation: spriteAnimation,
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
        <p className={`mt-3 whitespace-pre-line text-sm leading-relaxed ${isPassAppliedVariant ? "text-slate-100/86" : "text-indigo-100/76"}`}>{resolvedDescription}</p>

        {resolvedStatus ? (
          <div className="mt-6 flex justify-center">
            <p className="relative rounded-2xl border border-indigo-500/30 bg-indigo-950/50 px-4 py-2.5 text-xs font-medium text-cyan-100 sm:text-sm">
              <span className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-r from-cyan-500/10 to-violet-500/10" />
              <span className="relative">{resolvedStatus}</span>
            </p>
          </div>
        ) : null}

        <style jsx global>{`
          @keyframes cdYeonPaymentSpriteCheck {
            0%, 49.99% { transform: translate3d(0%, 0%, 0); }
            50%, 100% { transform: translate3d(-25%, 0%, 0); }
          }
          @keyframes cdYeonPaymentSpriteCheckout {
            0%, 49.99% { transform: translate3d(-50%, 0%, 0); }
            50%, 100% { transform: translate3d(-25%, -50%, 0); }
          }
          @keyframes cdYeonPaymentSpriteConfirm {
            0%, 49.99% { transform: translate3d(-25%, -50%, 0); }
            50%, 100% { transform: translate3d(-50%, -50%, 0); }
          }
          @keyframes cdYeonPaymentSpriteBalance {
            0%, 49.99% { transform: translate3d(-50%, -50%, 0); }
            50%, 100% { transform: translate3d(-75%, -50%, 0); }
          }
          @keyframes cdYeonPaymentSpriteUnlock {
            0%, 49.99% { transform: translate3d(0%, -50%, 0); }
            50%, 100% { transform: translate3d(-50%, -50%, 0); }
          }
          @keyframes cdYeonPaymentSpriteComplete {
            0%, 49.99% { transform: translate3d(-75%, 0%, 0); }
            50%, 100% { transform: translate3d(-75%, -50%, 0); }
          }
          @keyframes cdYeonPaymentSpriteCalm {
            0%, 100% { transform: translate3d(0%, 0%, 0); }
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
