"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { memo, useEffect, useState } from "react";
import { Gem, Home, Sparkles, UserCircle } from "lucide-react";
import {
  MOBILE_TABS,
  resolveActiveTabKey,
  readStoredTabKey,
  writeStoredTabKey,
  type MobileTabKey,
} from "@/app/_lib/mobile-tabs";

const ICON_CLASS = "cd-mnav__icon";

function TabIcon({ tabKey }: { tabKey: MobileTabKey }) {
  switch (tabKey) {
    case "home":
      return <Home className={ICON_CLASS} strokeWidth={1.9} aria-hidden="true" />;
    case "fortunes":
      return <Sparkles className={ICON_CLASS} strokeWidth={1.9} aria-hidden="true" />;
    case "pass":
      return <Gem className={ICON_CLASS} strokeWidth={1.9} aria-hidden="true" />;
    case "my":
      return <UserCircle className={ICON_CLASS} strokeWidth={1.9} aria-hidden="true" />;
    // 사주는 정적 셸과 같은 글리프를 쓴다 — 명(命) 한 글자가 lucide 아이콘보다 뜻이 분명하다.
    default:
      return (
        <span className={ICON_CLASS} aria-hidden="true">
          命
        </span>
      );
  }
}

function MobileBottomNav() {
  const pathname = usePathname() ?? "/";
  // useSearchParams 는 output:"export" 프리렌더에서 Suspense 경계를 요구하므로 location 을 직접 읽는다.
  // 활성 표시는 클라이언트 전용 정보라 마운트 이후에 확정해도 문제가 없다.
  const [activeKey, setActiveKey] = useState<MobileTabKey | null>(null);

  useEffect(() => {
    const sync = () => {
      const urlKey = resolveActiveTabKey(window.location.pathname, window.location.search);
      if (urlKey) writeStoredTabKey(urlKey);
      setActiveKey(urlKey ?? readStoredTabKey());
    };
    sync();
    window.addEventListener("popstate", sync);
    window.addEventListener("pageshow", sync);
    return () => {
      window.removeEventListener("popstate", sync);
      window.removeEventListener("pageshow", sync);
    };
  }, [pathname]);

  useEffect(() => {
    document.body.classList.add("cd-mnav-mounted");
    return () => document.body.classList.remove("cd-mnav-mounted");
  }, []);

  return (
    <nav className="cd-mnav" aria-label="주요 화면">
      <ul className="cd-mnav__list">
        {MOBILE_TABS.map((tab) => {
          const isActive = activeKey === tab.key;
          return (
            <li key={tab.key} className="cd-mnav__item">
              <Link
                href={tab.href}
                className="cd-mnav__link"
                data-nav-key={tab.key}
                aria-label={tab.ariaLabel}
                aria-current={isActive ? "page" : undefined}
                onClick={() => {
                  writeStoredTabKey(tab.key);
                  setActiveKey(tab.key);
                }}
              >
                <TabIcon tabKey={tab.key} />
                <span className="cd-mnav__label">{tab.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export default memo(MobileBottomNav);
