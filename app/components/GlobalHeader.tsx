"use client";

import Link from "next/link";
import { useState } from "react";
import AuthWidget from "./AuthWidget";

const headerNavItems = [
  { href: "/index.html", label: "홈" },
];

const policyNavItems = [
  { href: "/privacy", label: "개인정보" },
  { href: "/terms", label: "이용약관" },
  { href: "/contact", label: "문의" },
  { href: "/about", label: "소개" },
  { href: "/disclaimer", label: "면책" },
  { href: "/advertising-policy", label: "광고정책" },
];

function isStaticShellHref(href: string) {
  return href === "/index.html" || href.startsWith("/index.html?");
}

export default function GlobalHeader() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-[70] border-b border-violet-200/20 bg-[rgba(12,8,28,0.84)] backdrop-blur-xl">
        <div className="mx-auto flex min-h-[58px] w-[min(1240px,100%-20px)] items-center gap-3 py-2">
          <a
            href="/index.html"
            className="shrink-0 bg-gradient-to-r from-violet-300 via-fuchsia-200 to-amber-100 bg-clip-text text-[17px] font-black text-transparent"
          >
            Code Destiny
          </a>

          <nav className="hidden min-w-0 flex-1 items-center gap-1.5 overflow-x-auto xl:flex" aria-label="주요 내비게이션">
            {headerNavItems.map((item) => {
              const className = "inline-flex shrink-0 items-center rounded-full border border-violet-200/25 bg-[rgba(33,18,64,0.56)] px-3 py-1.5 text-[12px] font-semibold text-violet-100 transition hover:border-violet-200/50 hover:bg-[rgba(65,39,120,0.55)]";
              return isStaticShellHref(item.href) ? (
                <a key={item.href} href={item.href} className={className}>
                  {item.label}
                </a>
              ) : (
                <Link key={item.href} href={item.href} className={className}>
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="hidden items-center gap-2 md:flex">
            <AuthWidget />
          </div>

          <button
            type="button"
            className="ml-auto rounded-lg border border-violet-200/30 bg-[rgba(32,19,60,0.78)] px-3 py-1.5 text-sm font-semibold text-violet-100 md:hidden"
            aria-label="메뉴 열기"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((value) => !value)}
          >
            {menuOpen ? "닫기" : "메뉴"}
          </button>
        </div>
        <div className="hidden border-t border-violet-200/15 xl:block">
          <nav className="mx-auto flex w-[min(1240px,100%-20px)] flex-wrap items-center justify-end gap-2 py-2" aria-label="정책 링크">
            {policyNavItems.map((item) => (
              <Link
                key={`d-${item.href}`}
                href={item.href}
                className="rounded-full border border-violet-200/20 bg-[rgba(32,19,60,0.54)] px-2.5 py-1 text-[11px] font-semibold text-violet-100/90 transition hover:border-violet-200/45 hover:bg-[rgba(65,39,120,0.48)]"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      {menuOpen ? (
        <div className="sticky top-[58px] z-[65] border-b border-violet-200/20 bg-[rgba(11,8,26,0.95)] px-3 pb-4 pt-3 md:hidden">
          <div className="mb-3 flex items-center justify-between gap-2 rounded-xl border border-violet-200/20 bg-[rgba(36,20,68,0.45)] p-2">
            <span className="text-xs font-semibold tracking-[0.14em] text-violet-200/75">AUTH</span>
            <AuthWidget />
          </div>
          <div className="grid grid-cols-3 gap-2">
            {headerNavItems.map((item) => {
              const className = "rounded-xl border border-violet-200/25 bg-[rgba(32,19,60,0.8)] px-2.5 py-2 text-center text-[11px] font-semibold text-violet-100";
              return isStaticShellHref(item.href) ? (
                <a key={`m-${item.href}`} href={item.href} onClick={() => setMenuOpen(false)} className={className}>
                  {item.label}
                </a>
              ) : (
                <Link key={`m-${item.href}`} href={item.href} onClick={() => setMenuOpen(false)} className={className}>
                  {item.label}
                </Link>
              );
            })}
          </div>
          <div className="mt-4 border-t border-violet-200/15 pt-3">
            <p className="mb-2 text-[11px] font-semibold tracking-[0.12em] text-violet-200/70">정책 링크</p>
            <div className="flex flex-wrap gap-2">
              {policyNavItems.map((item) => (
                <Link
                  key={`m-policy-${item.href}`}
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                  className="rounded-full border border-violet-200/25 bg-[rgba(32,19,60,0.8)] px-2.5 py-1 text-[11px] font-semibold text-violet-100"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
