"use client";

import { useEffect } from "react";

export default function PalmReadingError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[PalmReadingError]", error);
  }, [error]);

  return (
    <section className="mx-auto flex min-h-[70vh] w-full max-w-3xl items-center justify-center px-4 py-10">
      <div className="w-full rounded-2xl border border-[#c8a84b]/45 bg-[#0d0808]/92 p-6 text-center shadow-[0_20px_60px_rgba(0,0,0,0.55)] md:p-8">
        <p className="text-xs font-black tracking-[0.2em] text-[#d4b45c]">PALM DESTINY</p>
        <h2 className="mt-3 text-xl font-black text-[#f5d987] md:text-2xl">손금 화면을 불러오는 중 오류가 발생했습니다.</h2>
        <p className="mt-3 text-sm leading-7 text-[#ead7b6]/88 md:text-base">
          일시적인 브라우저 상태나 이미지 처리 오류일 수 있습니다. 다시 시도하면 대부분 정상 복구됩니다.
        </p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={reset}
            className="min-h-[44px] rounded-lg border border-[#d4af37]/70 bg-[linear-gradient(140deg,#8b0000_0%,#6b1a0a_35%,#5a1200_65%,#7a1800_100%)] px-4 py-2 text-sm font-bold text-[#fff8e0]"
          >
            다시 시도
          </button>
          <a
            href="/"
            className="inline-flex min-h-[44px] items-center justify-center rounded-lg border border-[#c8a84b]/45 bg-[#0b0606] px-4 py-2 text-sm font-bold text-[#f3dca0]"
          >
            메인으로 이동
          </a>
        </div>
      </div>
    </section>
  );
}
