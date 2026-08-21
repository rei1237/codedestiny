"use client";

import { useEffect } from "react";
import { useT } from "../lib/i18n/useT";

export default function RootRouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useT();
  useEffect(() => {
    console.error("[RootRouteError]", error);
    // 배포 전환 순간 이전 HTML이 사라진 청크를 요청하면 ChunkLoadError로 떨어진다.
    // 새 HTML을 받으면 해결되므로 경로당 1회만 자동 새로고침한다(무한 루프 방지).
    const chunkFailed = error?.name === "ChunkLoadError" || /Loading chunk \S+ failed/i.test(String(error?.message || ""));
    if (!chunkFailed || typeof window === "undefined") return;
    const reloadKey = `cd:chunk-reload:${window.location.pathname}`;
    try {
      if (window.sessionStorage.getItem(reloadKey)) return;
      window.sessionStorage.setItem(reloadKey, String(Date.now()));
    } catch {
      return;
    }
    window.location.reload();
  }, [error]);

  return (
    <section className="mx-auto flex min-h-[70vh] w-full max-w-3xl items-center justify-center px-4 py-10">
      <div className="w-full rounded-2xl border border-slate-300/40 bg-white/95 p-6 text-center shadow-[0_20px_60px_rgba(0,0,0,0.25)] dark:border-indigo-300/25 dark:bg-[#0d1030]/95 md:p-8">
        <p className="text-xs font-black tracking-[0.2em] text-indigo-500 dark:text-indigo-300">CODE DESTINY</p>
        <h2 className="mt-3 text-xl font-black text-slate-900 dark:text-indigo-100 md:text-2xl">
          {t("errorBoundary.title")}
        </h2>
        <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-indigo-200/85 md:text-base">
          {t("errorBoundary.description")}
        </p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={reset}
            className="min-h-[44px] rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-indigo-500"
            aria-label={t("errorBoundary.retry")}
          >
            {t("errorBoundary.retry")}
          </button>
          <a
            href="/"
            className="inline-flex min-h-[44px] items-center justify-center rounded-lg border border-slate-300/60 px-4 py-2 text-sm font-bold text-slate-700 dark:border-indigo-300/35 dark:text-indigo-100"
          >
            {t("errorBoundary.goHome")}
          </a>
        </div>
      </div>
    </section>
  );
}
