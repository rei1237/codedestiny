"use client";

import { useEffect } from "react";

interface MyDestinyBiasShellProps {
  children: React.ReactNode;
}

/** 최애운명 전체화면 셸 — 크림 베이스 + 라일락·블루·핑크 포인트(포토카드 무드). */
export default function MyDestinyBiasShell({ children }: MyDestinyBiasShellProps) {
  // Lock body scroll to this shell when mounted
  useEffect(() => {
    const prev = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = prev;
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto overflow-x-hidden bg-[#fff8f0] text-[#1f1a2e] [padding-top:env(safe-area-inset-top)] [padding-bottom:env(safe-area-inset-bottom)]">
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden
        style={{
          background:
            "radial-gradient(900px 420px at 15% -6%, rgba(199,182,255,0.55), transparent 62%), radial-gradient(760px 380px at 90% 2%, rgba(223,229,255,0.9), transparent 60%), radial-gradient(640px 420px at 70% 100%, rgba(255,225,239,0.8), transparent 58%), linear-gradient(180deg, #fff8f0 0%, #fff4ea 60%, #fff8f0 100%)",
        }}
      />
      <div className="relative z-10">{children}</div>
    </div>
  );
}
