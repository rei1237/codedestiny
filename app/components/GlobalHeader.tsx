"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import AuthWidget from "./AuthWidget";
import { LocaleSwitcher } from "./LocaleSwitcher";

const headerNavItems = [
  { href: "/", label: "홈" },
  { href: "/saju/basic", label: "기초사주" },
  { href: "/saju/lifebook", label: "만세력" },
  { href: "/saju/love-secret", label: "연애비밀" },
  { href: "/tarot", label: "타로" },
  { href: "/tarot/year", label: "타로년운" },
  { href: "/oracle", label: "오라클" },
  { href: "/insights", label: "가이드" },
  { href: "/points", label: "포인트" },
];

export default function GlobalHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const localeFallback = <span className="text-xs text-slate-300">Language</span>;

  return (
    <>
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 60,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "10px",
          padding: "0 12px",
          minHeight: "56px",
          background: "rgba(7, 11, 31, 0.9)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          borderBottom: "1px solid rgba(124, 58, 237, 0.2)",
        }}
      >
        <Link
          href="/"
          style={{
            fontWeight: 900,
            fontSize: "16px",
            letterSpacing: "-0.02em",
            background: "linear-gradient(135deg, #a78bfa, #4ecdc4)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            textDecoration: "none",
            whiteSpace: "nowrap",
          }}
        >
          ✦ Code Destiny
        </Link>

        <div className="hidden md:flex md:items-center md:gap-2">
          <Suspense fallback={localeFallback}>
            <LocaleSwitcher />
          </Suspense>
          <AuthWidget />
        </div>

        <button
          type="button"
          className="md:hidden rounded-lg border border-slate-500/50 bg-slate-900/70 px-3 py-1.5 text-sm font-semibold text-slate-100"
          aria-label="메뉴 열기"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((v) => !v)}
        >
          {menuOpen ? "닫기" : "메뉴"}
        </button>
      </header>

      <nav
        aria-label="주요 내비게이션"
        style={{
          position: "sticky",
          top: "56px",
          zIndex: 55,
          display: "flex",
          gap: "8px",
          alignItems: "center",
          overflowX: "auto",
          whiteSpace: "nowrap",
          padding: "8px 12px",
          borderBottom: "1px solid rgba(124, 58, 237, 0.16)",
          background: "rgba(10, 14, 37, 0.88)",
          backdropFilter: "blur(10px)",
          WebkitBackdropFilter: "blur(10px)",
        }}
      >
        {headerNavItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            style={{
              textDecoration: "none",
              color: "#dbe5ff",
              border: "1px solid rgba(148,163,184,0.25)",
              borderRadius: "999px",
              padding: "5px 12px",
              fontSize: "0.85rem",
              lineHeight: 1.2,
              background: "rgba(15,23,42,0.7)",
            }}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      {menuOpen ? (
        <div className="md:hidden sticky top-[102px] z-50 border-b border-violet-400/20 bg-[#0a1024f2] px-3 pb-4 pt-3">
          <div className="mb-3 flex items-center justify-between gap-2">
            <Suspense fallback={localeFallback}>
              <LocaleSwitcher />
            </Suspense>
            <AuthWidget />
          </div>
          <div className="grid grid-cols-2 gap-2">
            {headerNavItems.map((item) => (
              <Link
                key={`m-${item.href}`}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                className="rounded-xl border border-slate-500/40 bg-slate-900/60 px-3 py-2 text-center text-xs font-semibold text-slate-100"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      ) : null}
    </>
  );
}
