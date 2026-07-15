"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import AppTabBar from "@/app/app/_components/AppTabBar";
import { useAndroidBackButton } from "@/app/app/_lib/useAndroidBackButton";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "";
  const isRoot = pathname === "/app" || pathname === "/app/";
  const [exitHint, setExitHint] = useState(false);

  const onExitHint = useCallback(() => {
    setExitHint(true);
    window.setTimeout(() => setExitHint(false), 2000);
  }, []);

  useAndroidBackButton({ isRoot, onExitHint });

  useEffect(() => {
    // 스크롤 규칙(overscroll-behavior 등)은 스크롤 컨테이너인 <html>/<body>에 걸려야 한다.
    // 이 라우트를 벗어나면 원래대로 되돌려 다른 화면에 영향을 남기지 않는다.
    const root = document.documentElement;
    root.classList.add("cd-app-html");
    return () => root.classList.remove("cd-app-html");
  }, []);

  useEffect(() => {
    // 키보드가 올라올 때 입력창이 가리지 않도록 실제 보이는 높이를 CSS 변수로 노출한다.
    const viewport = window.visualViewport;
    if (!viewport) return undefined;
    const sync = () => {
      document.documentElement.style.setProperty("--cd-app-viewport-h", `${Math.round(viewport.height)}px`);
    };
    sync();
    viewport.addEventListener("resize", sync);
    return () => viewport.removeEventListener("resize", sync);
  }, []);

  return (
    <div className="cd-app-shell">
      <div className="cd-app-scroll mx-auto flex w-full max-w-[560px] flex-col">{children}</div>
      <AppTabBar />
      {exitHint ? (
        <div
          className="cd-app-enter fixed inset-x-0 z-50 mx-auto w-fit rounded-[var(--cd-app-radius-pill)] px-4 py-2 text-xs font-bold"
          style={{
            bottom: "calc(var(--cd-app-tab-h) + 20px + env(safe-area-inset-bottom))",
            background: "var(--cd-app-bg-raised)",
            color: "var(--cd-app-ink)",
            border: "1px solid var(--cd-app-line-strong)",
            boxShadow: "var(--cd-app-shadow-2)",
          }}
          role="status"
          aria-live="polite"
        >
          한 번 더 누르면 종료됩니다
        </div>
      ) : null}
    </div>
  );
}
