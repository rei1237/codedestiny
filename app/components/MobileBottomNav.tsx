"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { memo, useCallback, useEffect, useState, type MouseEvent } from "react";
import { Gem, Home, Sparkles, UserCircle } from "lucide-react";
import {
  MOBILE_TABS,
  resolveActiveTabKey,
  readStoredTabKey,
  writeStoredTabKey,
  type MobileTab,
  type MobileTabKey,
} from "@/app/_lib/mobile-tabs";

const ICON_CLASS = "cd-mnav__icon";

/**
 * 홈("/") 을 가리키는 탭(홈·사주·모든 운세)은 클라이언트 라우팅으로 가면 안 된다.
 *
 * "/" 의 실제 화면은 정적 메인 셸이고, `?action=cdOpenAllFortunes` 같은 탭 액션을 집어
 * 화면을 여는 것도 셸 런타임(js/core/index-inline-runtime.js)이다. 그런데 next/link 는
 * 문서를 새로 받지 않고 app/page.js(React 홈)를 렌더해 버려서, 액션을 처리할 코드가
 * 아예 없는 화면에 도착한다 → 탭을 눌러도 아무것도 열리지 않는다.
 * 청크 상태에 따라 Next 가 하드 내비게이션으로 폴백할 때만 우연히 동작해서
 * "몇 번 눌러야 열린다"로 보였다. 그래서 이 탭들은 문서 로드로 확실히 보낸다.
 */
function targetsStaticShellHome(href: string) {
  return href === "/" || href.startsWith("/?");
}

// 이동이 시작되지 않는 최악의 경우에도 네비가 영구히 잠기지 않게 하는 안전장치.
const TAB_PENDING_FAILSAFE_MS = 6000;

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
  const [pendingKey, setPendingKey] = useState<MobileTabKey | null>(null);

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

  // 경로가 실제로 바뀌면 대기 표시를 내린다.
  useEffect(() => {
    setPendingKey(null);
  }, [pathname]);

  useEffect(() => {
    if (!pendingKey) return;
    const timer = window.setTimeout(() => setPendingKey(null), TAB_PENDING_FAILSAFE_MS);
    return () => window.clearTimeout(timer);
  }, [pendingKey]);

  const handleTabClick = useCallback((event: MouseEvent<HTMLAnchorElement>, tab: MobileTab) => {
    writeStoredTabKey(tab.key);
    setActiveKey(tab.key);

    // 새 탭·수정키 클릭은 브라우저 기본 동작에 맡긴다.
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

    // 전환 중 재탭 흡수 — 목적지 라우트가 무거워 전환에 시간이 걸리는 동안의 연타를 삼킨다.
    if (pendingKey) {
      event.preventDefault();
      return;
    }
    setPendingKey(tab.key);

    if (targetsStaticShellHome(tab.href)) {
      event.preventDefault();
      window.location.assign(tab.href);
      return;
    }
    // React 라우트(/points)는 next/link 기본 이동에 맡기고 대기 표시만 남긴다.
  }, [pendingKey]);

  return (
    <nav className="cd-mnav" aria-label="주요 화면">
      <ul className="cd-mnav__list">
        {MOBILE_TABS.map((tab) => {
          const isActive = activeKey === tab.key;
          const loading = pendingKey === tab.key;
          return (
            <li key={tab.key} className="cd-mnav__item">
              <Link
                href={tab.href}
                className={loading ? "cd-mnav__link opacity-70" : "cd-mnav__link"}
                data-nav-key={tab.key}
                aria-label={tab.ariaLabel}
                aria-current={isActive ? "page" : undefined}
                aria-busy={loading}
                onClick={(event) => handleTabClick(event, tab)}
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
