"use client";

import { useEffect, type CSSProperties } from "react";
import { useT } from "../lib/i18n/useT";

/*
 * 🔴 이 파일은 인라인 스타일을 유지한다 — 자체 `<html>` 을 렌더하므로 `app/layout.js` 를 타지 않고,
 *    그래서 `styles/globals.css` 가 도달하지 않는다(근거: `app/components/SystemNotice.tsx:15-18`).
 *    `SystemNotice` 도 클래스도 쓸 수 없다.
 *
 *    아래 값은 전부 `.policy-doc` 계열(styles/globals.css:828-1180)에서 그대로 옮긴 리터럴이며,
 *    새 색을 만들지 않는다. 정본이 바뀌면 여기도 같이 바꾼다. 같은 제약을 받는 `pages/404.tsx` 와
 *    같은 상수 집합을 쓴다.
 *
 *    `--font-display` 는 도달하지 않으므로 제목은 시스템 폰트로 렌더된다. 굵기 400 은
 *    `.policy-doc__title` 과 같은 값이다(정본 주석: 표시용 폰트에 w700 이 없어 위계를 크기로 만든다).
 */
const bodyStyle: CSSProperties = {
  margin: 0,
  minHeight: "100vh",
  display: "grid",
  placeItems: "center",
  background: "#0a0818",
  color: "#dbe4f3",
  fontFamily: "sans-serif",
};

const docStyle: CSSProperties = {
  width: "min(1080px, calc(100% - 32px))",
  marginInline: "auto",
  padding: "36px 0 72px",
};

const headStyle: CSSProperties = {
  paddingBottom: 22,
  borderBottom: "1px solid rgba(148,163,184,0.2)",
};

const titleStyle: CSSProperties = {
  margin: 0,
  fontWeight: 400,
  fontSize: "clamp(2rem, 5vw, 2.75rem)",
  lineHeight: 1.28,
  letterSpacing: "-0.01em",
  color: "#f8fafc",
};

const metaStyle: CSSProperties = {
  margin: "12px 0 0",
  fontSize: "0.875rem",
  color: "#9fb0cc",
};

const ledeStyle: CSSProperties = {
  margin: "14px 0 0",
  maxWidth: "68ch",
  lineHeight: 1.75,
  color: "#c3cfe4",
  wordBreak: "keep-all",
};

const actionsStyle: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 10,
  marginTop: 28,
};

const btnStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 44,
  borderRadius: 999,
  padding: "10px 22px",
  fontSize: "0.9375rem",
  fontWeight: 700,
  textDecoration: "none",
};

const primaryBtnStyle: CSSProperties = {
  ...btnStyle,
  border: "1px solid transparent",
  background: "#c4b5fd",
  color: "#0f0a24",
  cursor: "pointer",
};

const ghostBtnStyle: CSSProperties = {
  ...btnStyle,
  border: "1px solid rgba(148,163,184,0.42)",
  background: "transparent",
  color: "#dbe4f3",
};

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
      <body style={bodyStyle}>
        <main style={docStyle}>
          <header style={headStyle}>
            <h1 style={titleStyle}>{t("errorBoundary.title")}</h1>
            <p style={metaStyle}>CODE DESTINY</p>
            <p style={ledeStyle}>{t("errorBoundary.description")}</p>
          </header>
          <div style={actionsStyle}>
            <button
              type="button"
              onClick={reset}
              aria-label={t("errorBoundary.retry")}
              style={primaryBtnStyle}
            >
              {t("errorBoundary.retry")}
            </button>
            <a href="/" style={ghostBtnStyle}>
              {t("errorBoundary.goHome")}
            </a>
          </div>
        </main>
      </body>
    </html>
  );
}
