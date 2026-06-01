"use client";

import Link from "next/link";

export default function DestinyBiasCoinModal({
  open,
  title,
  message,
  requiredCoins,
  onClose,
  loginRequired,
}: {
  open: boolean;
  title: string;
  message: string;
  requiredCoins?: number;
  onClose: () => void;
  loginRequired?: boolean;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/65 p-4 md:items-center" role="dialog" aria-modal="true" aria-label="결제 안내 모달">
      <div className="w-full max-w-md rounded-3xl border border-white/20 bg-[linear-gradient(145deg,rgba(24,10,46,0.96),rgba(9,8,32,0.94))] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.5)] backdrop-blur-xl">
        <p className="text-xs font-semibold tracking-[0.12em] text-cyan-200/90">DESTINY NOTICE</p>
        <h3 className="mt-2 text-xl font-black text-white">{title}</h3>
        <p className="mt-3 text-sm leading-7 text-white/85">{message}</p>
        {requiredCoins ? (
          <p className="mt-2 text-xs font-semibold text-amber-100/90">필요 코인: {requiredCoins.toLocaleString("ko-KR")}</p>
        ) : null}

        <div className="mt-5 flex flex-wrap gap-2">
          {loginRequired ? (
            <Link
              href="/login?next=%2Fsaju%2Fdestiny-bias"
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-cyan-200/70 bg-cyan-300/20 px-4 text-sm font-bold text-cyan-50"
            >
              로그인하고 계속하기
            </Link>
          ) : (
            <Link
              href="/points"
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-fuchsia-200/70 bg-fuchsia-400/25 px-4 text-sm font-bold text-white"
            >
              결제 페이지로 이동
            </Link>
          )}

          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-h-11 items-center justify-center rounded-full border border-white/30 bg-white/10 px-4 text-sm font-semibold text-white/90"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
