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
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 60,
        overflowY: "auto",
        overflowX: "hidden",
        background: "#070416",
        paddingTop: "env(safe-area-inset-top)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      {children}
    </div>
  );
}
