"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState, type MouseEvent } from "react";
import { Coffee, Home, Sparkles, Target, UserCircle } from "lucide-react";
import { normalizeAppPathname } from "@/app/app/_lib/app-route";
import { PROFILE_SHEET_ACTION } from "@/app/_lib/mobile-tabs";

const TABS = [
  { href: "/app", label: "홈", icon: Home },
  { href: "/saju/basic", label: "운세", icon: Sparkles },
  { href: "/fortune-tea-house", label: "찻집", icon: Coffee },
  { href: "/neo-operation-room", label: "전략실", icon: Target },
  // 프로필 카드 관리는 정적 셸의 하단 시트가 정본이다. React 라우트가 아니라 셸로 넘긴다.
  { href: `/?action=${PROFILE_SHEET_ACTION}`, label: "마이", icon: UserCircle },
] as const;

/** 셸(정적 index.html) 대상 href. Next 라우터로는 못 가므로 하드 이동시킨다. */
function targetsStaticShell(href: string) {
  return href === "/" || href.startsWith("/?");
}

// 탭 목적지는 전부 무거운 클라이언트 번들이라 청크가 콜드일 때 전환이 1~수 초 걸린다.
// 이 앱에는 loading 경계가 없어 App Router 는 그 사이 현재 화면을 그대로 유지한다 —
// 사용자는 "안 눌렸다"고 판단해 다시 누른다. 그래서 탭한 즉시 대기 표시를 띄우고 재탭을 흡수한다.
// 이동이 끝나지 않는 최악의 경우에도 탭바가 영구히 잠기지 않게 하는 안전장치.
const TAB_PENDING_FAILSAFE_MS = 6000;

function isActive(pathname: string, href: string) {
  if (href === "/app") return pathname === "/app" || pathname === "/app/";
  // 셸 대상 탭은 앱 라우트를 벗어나므로 /app 안에서는 절대 활성이 아니다.
  if (targetsStaticShell(href)) return false;
  return pathname.startsWith(href);
}

export default function AppTabBar() {
  const pathname = normalizeAppPathname(usePathname() || "");
  const router = useRouter();
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  // 경로가 실제로 바뀌면 대기 표시를 내린다.
  useEffect(() => {
    setPendingHref(null);
  }, [pathname]);

  useEffect(() => {
    if (!pendingHref) return;
    const timer = window.setTimeout(() => setPendingHref(null), TAB_PENDING_FAILSAFE_MS);
    return () => window.clearTimeout(timer);
  }, [pendingHref]);

  const handleTabClick = useCallback((event: MouseEvent<HTMLAnchorElement>, href: string) => {
    // 새 탭·수정키 클릭은 브라우저 기본 동작에 맡긴다.
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    if (pendingHref) return;
    if (targetsStaticShell(href)) {
      setPendingHref(href);
      window.location.assign(href);
      return;
    }
    if (normalizeAppPathname(href) === pathname) return;
    setPendingHref(href);
    router.push(href);
  }, [pathname, pendingHref, router]);

  return (
    <nav className="cd-app-tabbar" aria-label="주요 화면">
      <ul className="mx-auto flex w-full max-w-[560px] list-none items-stretch gap-1 p-0 px-2">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const active = isActive(pathname, tab.href);
          const loading = pendingHref === tab.href;
          return (
            <li key={tab.href} className="flex-1">
              <Link
                href={tab.href}
                onClick={(event) => handleTabClick(event, tab.href)}
                aria-current={active ? "page" : undefined}
                aria-busy={loading}
                className="cd-app-tap cd-app-press flex flex-col items-center justify-center gap-1 rounded-[var(--cd-app-radius-md)] py-2 no-underline"
                style={{ color: active || loading ? "var(--cd-app-gold)" : "var(--cd-app-ink-subtle)" }}
              >
                {loading ? (
                  <span className="h-[19px] w-[19px] animate-spin rounded-full border-2 border-transparent border-t-current" aria-hidden="true" />
                ) : (
                  <Icon className="h-[19px] w-[19px]" strokeWidth={active ? 2.4 : 1.8} aria-hidden="true" />
                )}
                <span className="cd-app-tabbar__label text-[11px] font-bold leading-none">{tab.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
