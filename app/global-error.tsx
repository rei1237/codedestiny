"use client";

import { useEffect } from "react";
import { useT } from "../lib/i18n/useT";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useT();
  useEffect(() => {
    console.error("[GlobalError]", error);
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
    <html lang="ko">
      <body style={{ margin: 0, background: "#0a0d24", color: "#e8e6ff", fontFamily: "sans-serif" }}>
        <section
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "2rem 1rem",
            textAlign: "center",
          }}
        >
          <div>
            <p style={{ fontSize: "0.75rem", letterSpacing: "0.2em", fontWeight: 800, color: "#a5b4fc" }}>
              CODE DESTINY
            </p>
            <h2 style={{ margin: "0.75rem 0", fontSize: "1.35rem", fontWeight: 900 }}>
              {t("errorBoundary.title")}
            </h2>
            <p style={{ margin: "0 0 1.5rem", fontSize: "0.9rem", lineHeight: 1.7, color: "#c7c9ec" }}>
              {t("errorBoundary.description")}
            </p>
            <button
              type="button"
              onClick={reset}
              aria-label={t("errorBoundary.retry")}
              style={{
                minHeight: 44,
                padding: "0.5rem 1.25rem",
                borderRadius: 8,
                border: "none",
                background: "#6366f1",
                color: "#fff",
                fontWeight: 700,
                cursor: "pointer",
                marginRight: "0.5rem",
              }}
            >
              {t("errorBoundary.retry")}
            </button>
            <a
              href="/"
              style={{
                display: "inline-flex",
                alignItems: "center",
                minHeight: 44,
                padding: "0.5rem 1.25rem",
                borderRadius: 8,
                border: "1px solid rgba(165,180,252,0.4)",
                color: "#e8e6ff",
                fontWeight: 700,
                textDecoration: "none",
              }}
            >
              {t("errorBoundary.goHome")}
            </a>
          </div>
        </section>
      </body>
    </html>
  );
}
