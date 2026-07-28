"use client";

import { useEffect } from "react";

// React 홈(app/page.js)은 더 이상 별도 화면으로 노출하지 않는다.
// 홈은 정적 메인 셸로 통일한다 — 앱/웹에서 SPA로 "/"에 진입하면 즉시 정적 홈으로 되돌린다.
// 대상은 "/static/": 배포 사이트·개발 서버 모두 정적 셸을 서빙하며,
// (개발 서버에서 "/"가 다시 app/page.js로 잡혀 발생하는 무한 리다이렉트 루프를 피한다.)
export default function HomeRedirectToStatic() {
  useEffect(() => {
    try {
      window.location.replace("/static/");
    } catch (_e) {
      /* noop */
    }
  }, []);

  return (
    <div
      aria-hidden
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 2147483000,
        background: "#0a0818",
        color: "#c4b5fd",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "0.92rem",
        letterSpacing: "0.02em",
      }}
    >
      홈으로 이동 중…
    </div>
  );
}
