"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[GlobalError]", error);
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
              화면을 불러오는 중 문제가 생겼어요.
            </h2>
            <p style={{ margin: "0 0 1.5rem", fontSize: "0.9rem", lineHeight: 1.7, color: "#c7c9ec" }}>
              일시적인 오류일 수 있어요. 다시 시도하면 대부분 정상적으로 돌아옵니다.
            </p>
            <button
              type="button"
              onClick={reset}
              aria-label="다시 시도"
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
              다시 시도
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
              메인으로 이동
            </a>
          </div>
        </section>
      </body>
    </html>
  );
}
