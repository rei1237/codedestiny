"use client";

import { useEffect } from "react";

export type PaymentLoadingProps = {
  open: boolean;
  title?: string;
  description?: string;
  statusMessage?: string;
};

const DEFAULT_TITLE = "운명을 읽어오는 중입니다...";
const DEFAULT_DESCRIPTION = "결제가 진행 중입니다. 잠시만 기다려 주세요.";

export default function PaymentLoading({
  open,
  title = DEFAULT_TITLE,
  description = DEFAULT_DESCRIPTION,
  statusMessage,
}: PaymentLoadingProps) {
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
      className="fixed inset-0 z-[2147483001] flex items-center justify-center bg-[#050510]/80 px-4 backdrop-blur-xl"
    >
      <div className="w-full max-w-md relative overflow-hidden rounded-[2rem] border border-indigo-500/30 bg-gradient-to-b from-[#0B0C21]/95 to-[#060612]/95 p-8 text-center shadow-[0_0_80px_rgba(79,70,229,0.3)]">
        {/* 장식용 은하수 글로우 */}
        <div className="absolute -top-24 -right-24 h-48 w-48 rounded-full bg-violet-600/20 blur-[60px] pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 h-48 w-48 rounded-full bg-cyan-600/20 blur-[60px] pointer-events-none" />

        {/* 행성/우주 느낌의 로딩 애니메이션 */}
        <div className="mx-auto mb-8 relative flex h-24 w-24 items-center justify-center">
          {/* 궤도 1 */}
          <span className="absolute inset-0 rounded-full border-[1px] border-indigo-500/30 animate-[spin_4s_linear_infinite]">
            <span className="absolute -top-1 left-1/2 h-2 w-2 rounded-full bg-indigo-400 shadow-[0_0_8px_rgba(129,140,248,0.8)]" />
          </span>
          {/* 궤도 2 */}
          <span className="absolute inset-2 rounded-full border-[1px] border-violet-400/20 animate-[spin_3s_linear_infinite_reverse]">
            <span className="absolute top-1/2 -left-1 h-1.5 w-1.5 rounded-full bg-violet-300 shadow-[0_0_6px_rgba(196,181,253,0.8)]" />
          </span>
          
          {/* 중심 행성/별 */}
          <div className="relative h-11 w-11 rounded-full bg-gradient-to-tr from-indigo-600 via-violet-400 to-cyan-300 shadow-[0_0_30px_rgba(139,92,246,0.6)] animate-pulse" />
        </div>

        <p className="text-xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-cyan-200 via-indigo-200 to-violet-300 sm:text-2xl">{title}</p>
        <p className="mt-3 text-sm leading-relaxed text-indigo-200/70">{description}</p>

        {statusMessage ? (
          <div className="mt-6 flex justify-center">
            <p className="relative rounded-2xl border border-indigo-500/30 bg-indigo-950/50 px-4 py-2.5 text-xs font-medium text-cyan-100 sm:text-sm">
              <span className="absolute inset-0 rounded-2xl bg-gradient-to-r from-cyan-500/10 to-violet-500/10 pointer-events-none" />
              <span className="relative">{statusMessage}</span>
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}