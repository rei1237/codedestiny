"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Coffee, Home, Sparkles, Target, UserCircle } from "lucide-react";
import { normalizeAppPathname } from "@/app/app/_lib/app-route";

const TABS = [
  { href: "/app", label: "홈", icon: Home },
  { href: "/saju/basic", label: "운세", icon: Sparkles },
  { href: "/fortune-tea-house", label: "찻집", icon: Coffee },
  { href: "/neo-operation-room", label: "전략실", icon: Target },
  { href: "/me", label: "마이", icon: UserCircle },
] as const;

function isActive(pathname: string, href: string) {
  if (href === "/app") return pathname === "/app" || pathname === "/app/";
  return pathname.startsWith(href);
}

export default function AppTabBar() {
  const pathname = normalizeAppPathname(usePathname() || "");

  return (
    <nav className="cd-app-tabbar" aria-label="주요 화면">
      <ul className="mx-auto flex w-full max-w-[560px] list-none items-stretch gap-1 p-0 px-2">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const active = isActive(pathname, tab.href);
          return (
            <li key={tab.href} className="flex-1">
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className="cd-app-tap cd-app-press flex flex-col items-center justify-center gap-1 rounded-[var(--cd-app-radius-md)] py-2 no-underline"
                style={{ color: active ? "var(--cd-app-gold)" : "var(--cd-app-ink-subtle)" }}
              >
                <Icon className="h-[19px] w-[19px]" strokeWidth={active ? 2.4 : 1.8} aria-hidden="true" />
                <span className="cd-app-tabbar__label text-[11px] font-bold leading-none">{tab.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
