"use client";

import { useEffect } from "react";

export default function RootRouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[RootRouteError]", error);
  }, [error]);

  return (
    <section className="mx-auto flex min-h-[70vh] w-full max-w-3xl items-center justify-center px-4 py-10">
      <div className="w-full rounded-2xl border border-slate-300/40 bg-white/95 p-6 text-center shadow-[0_20px_60px_rgba(0,0,0,0.25)] dark:border-indigo-300/25 dark:bg-[#0d1030]/95 md:p-8">
        <p className="text-xs font-black tracking-[0.2em] text-indigo-500 dark:text-indigo-300">CODE DESTINY</p>
        <h2 className="mt-3 text-xl font-black text-slate-900 dark:text-indigo-100 md:text-2xl">
          화면을 불러오는 중 문제가 생겼어요.
        </h2>
        <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-indigo-200/85 md:text-base">
          일시적인 오류일 수 있어요. 다시 시도하면 대부분 정상적으로 돌아옵니다.
        </p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={reset}
            className="min-h-[44px] rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-indigo-500"
            aria-label="다시 시도"
          >
            다시 시도
          </button>
          <a
            href="/"
            className="inline-flex min-h-[44px] items-center justify-center rounded-lg border border-slate-300/60 px-4 py-2 text-sm font-bold text-slate-700 dark:border-indigo-300/35 dark:text-indigo-100"
          >
            메인으로 이동
          </a>
        </div>
      </div>
    </section>
  );
}
