"use client";

import { useEffect } from "react";

interface MyDestinyBiasShellProps {
  children: React.ReactNode;
}

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
    <div className="fixed inset-0 z-[60] overflow-y-auto overflow-x-hidden bg-[#06020f] text-white [padding-top:env(safe-area-inset-top)] [padding-bottom:env(safe-area-inset-bottom)]">
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden
        style={{
          background:
            "radial-gradient(1200px 520px at 50% -8%, rgba(244,114,182,0.34), transparent 62%), radial-gradient(980px 460px at 80% 0%, rgba(34,211,238,0.28), transparent 58%), radial-gradient(760px 520px at 10% 8%, rgba(251,191,36,0.2), transparent 56%), linear-gradient(180deg, #09021a 0%, #05030e 62%, #070616 100%)",
        }}
      />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[linear-gradient(180deg,rgba(248,113,113,0.12),rgba(255,255,255,0))] blur-2xl" aria-hidden />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-48 bg-[linear-gradient(0deg,rgba(34,211,238,0.08),rgba(255,255,255,0))]" aria-hidden />

      <div className="relative z-10">{children}</div>
    </div>
  );
}
