"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import MobileBottomNav from "@/app/components/MobileBottomNav";
import { useAndroidBackButton } from "@/app/app/_lib/useAndroidBackButton";
import { normalizeAppPathname } from "@/app/app/_lib/app-route";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = normalizeAppPathname(usePathname() || "");
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
      {/* 🔴 탭 정의 정본은 app/_lib/mobile-tabs.ts 하나다. 앱 셸 전용 탭바를 다시 만들지 말 것 —
          예전 AppTabBar 는 5탭 중 4탭이 이 셸을 벗어나(미들웨어가 정적 셸로 리다이렉트) 한 번
          누르면 탭바가 사라졌다. 스킨만 app-shell.css 가 앱 팔레트로 덮는다. */}
      <MobileBottomNav />
      {exitHint ? (
        <div
          className="cd-app-enter fixed inset-x-0 z-50 mx-auto w-fit rounded-[var(--cd-app-radius-pill)] px-4 py-2 text-xs font-bold"
          style={{
            bottom: "calc(var(--cd-mnav-offset) + 20px)",
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
