"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import AuthWidget from "./AuthWidget";
import { LocaleSwitcher } from "./LocaleSwitcher";

const headerNavItems = [
  { href: "/index.html", label: "홈" },
  { href: "/saju/basic", label: "기초사주" },
  { href: "/saju/lifebook", label: "만세력" },
  { href: "/saju/love-secret", label: "연애" },
  { href: "/tarot", label: "타로" },
  { href: "/tarot/year", label: "타로년운" },
  { href: "/oracle", label: "오라클" },
  { href: "/insights", label: "가이드" },
  { href: "/points", label: "포인트" },
];

export default function GlobalHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const localeFallback = <span className="text-xs text-slate-400">Language</span>;

  return (
    <>
      <header className="sticky top-0 z-[70] border-b border-violet-200/20 bg-[rgba(12,8,28,0.84)] backdrop-blur-xl">
        <div className="mx-auto flex min-h-[58px] w-[min(1240px,100%-20px)] items-center gap-3 py-2">
          <Link
            href="/"
            className="shrink-0 bg-gradient-to-r from-violet-300 via-fuchsia-200 to-amber-100 bg-clip-text text-[17px] font-black tracking-[-0.02em] text-transparent"
          >
            ✦ Code Destiny
          </Link>

          <nav className="hidden min-w-0 flex-1 items-center gap-1.5 overflow-x-auto xl:flex" aria-label="주요 내비게이션">
            {headerNavItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="inline-flex shrink-0 items-center rounded-full border border-violet-200/25 bg-[rgba(33,18,64,0.56)] px-3 py-1.5 text-[12px] font-semibold text-violet-100 transition hover:border-violet-200/50 hover:bg-[rgba(65,39,120,0.55)]"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="hidden items-center gap-2 md:flex">
            <Suspense fallback={localeFallback}>
              <LocaleSwitcher />
            </Suspense>
            <AuthWidget />
          </div>

          <button
            type="button"
            className="ml-auto rounded-lg border border-violet-200/30 bg-[rgba(32,19,60,0.78)] px-3 py-1.5 text-sm font-semibold text-violet-100 md:hidden"
            aria-label="메뉴 열기"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
          >
            {menuOpen ? "닫기" : "메뉴"}
          </button>
        </div>
      </header>

      {menuOpen ? (
        <div className="sticky top-[58px] z-[65] border-b border-violet-200/20 bg-[rgba(11,8,26,0.95)] px-3 pb-4 pt-3 md:hidden">
          <div className="mb-3 flex items-center justify-between gap-2 rounded-xl border border-violet-200/20 bg-[rgba(36,20,68,0.45)] p-2">
            <Suspense fallback={localeFallback}>
              <LocaleSwitcher />
            </Suspense>
            <AuthWidget />
          </div>
          <div className="grid grid-cols-3 gap-2">
            {headerNavItems.map((item) => (
              <Link
                key={`m-${item.href}`}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                className="rounded-xl border border-violet-200/25 bg-[rgba(32,19,60,0.8)] px-2.5 py-2 text-center text-[11px] font-semibold text-violet-100"
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
