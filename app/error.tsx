"use client";

import { useEffect } from "react";
import { SystemNotice } from "./components/SystemNotice";
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
    const chunkFailed =
      error?.name === "ChunkLoadError" || /Loading chunk \S+ failed/i.test(String(error?.message || ""));
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
    <SystemNotice
      title={t("errorBoundary.title")}
      eyebrow="CODE DESTINY"
      description={t("errorBoundary.description")}
      actions={
        <>
          <button
            type="button"
            onClick={reset}
            className="policy-btn policy-btn--primary"
            aria-label={t("errorBoundary.retry")}
          >
            {t("errorBoundary.retry")}
          </button>
          <a href="/" className="policy-btn policy-btn--ghost">
            {t("errorBoundary.goHome")}
          </a>
        </>
      }
    />
  );
}
