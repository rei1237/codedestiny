"use client";

import { useEffect, useState, type ComponentType } from "react";
import theme from "../love-secret-theme.module.css";

// 색은 인라인 스타일이 아니라 토큰 클래스로 준다 — 인라인은 prefers-color-scheme 를 표현할 수 없어
// 라이트 모드 사용자에게 다크 플래시가 남는다. 레이아웃만 인라인으로 유지한다.
function LoveSecretAiResultFallback() {
  return (
    <main
      aria-busy="true"
      className={`${theme.theme} ${theme.pageBg} text-[var(--ls-text)]`}
      style={{ minHeight: "100dvh", display: "grid", placeItems: "center", padding: "32px 18px" }}
    >
      <p className="m-0 text-sm font-extrabold">연애 비책 리포트를 여는 중입니다.</p>
    </main>
  );
}

export default function LoveSecretResultPage() {
  const [Content, setContent] = useState<ComponentType | null>(null);

  useEffect(() => {
    let isMounted = true;

    import("./LoveSecretAiResultClient").then((module) => {
      if (isMounted) {
        setContent(() => module.default);
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  if (!Content) {
    return <LoveSecretAiResultFallback />;
  }

  return <Content />;
}
