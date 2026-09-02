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
  readMnavCollapsed,
  writeMnavCollapsed,
  MNAV_TOGGLE_TRANS_KEY,
  MNAV_TOGGLE_LABEL_KO,
  type MobileTab,
  type MobileTabKey,
} from "@/app/_lib/mobile-tabs";
import { getCurrentLoadingLocale, type LoadingLocale } from "@/constants/loadingMessages";
import { useTPick } from "@/lib/i18n/useT";

const NAV_ARIA_LABEL: Partial<Record<LoadingLocale, string>> = {
  ko: "주요 화면",
  en: "Main screens",
};

function getNavAriaLabel(locale: LoadingLocale): string {
  return NAV_ARIA_LABEL[locale] || NAV_ARIA_LABEL.en || "Main screens";
}

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
  // 데스크탑 접힘 상태. SSR/하이드레이션 불일치를 피하려고 초깃값은 항상 false 이고,
  // 실제 값은 마운트 이펙트에서 localStorage 로 확정한다.
  const [collapsed, setCollapsed] = useState(false);
  const [locale, setLocale] = useState<LoadingLocale>(() => getCurrentLoadingLocale());
  // 탭 라벨·aria 문구는 정적 셸이 쓰던 코어 사전 키를 그대로 읽는다. useTPick 은 값이
  // 없으면 넘긴 한국어를 돌려주므로 한국어 화면이 비지 않는다.
  const pick = useTPick();

  useEffect(() => {
    const syncLocale = () => setLocale(getCurrentLoadingLocale());
    syncLocale();
    window.addEventListener("cd:locale-ready", syncLocale);
    window.addEventListener("cd:locale-change", syncLocale);
    return () => {
      window.removeEventListener("cd:locale-ready", syncLocale);
      window.removeEventListener("cd:locale-change", syncLocale);
    };
  }, []);

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
    setCollapsed(readMnavCollapsed());
    return () => document.body.classList.remove("cd-mnav-mounted");
  }, []);

  /**
   * 접힘은 **데스크탑 전용**이지만 폭 판정은 여기서 하지 않는다 — 상태 클래스만 붙이고
   * 실제로 무언가를 감추는 규칙은 styles/mobile-bottom-nav.css 의
   * `@media (min-width: 769px)` 안에만 있다. 그래서 데스크탑에서 접은 채 창을 좁히면
   * 탭바가 저절로 온전히 돌아오고(모바일 사용자가 갇히지 않는다) 다시 넓히면 접힌 채다.
   */
  useEffect(() => {
    document.body.classList.toggle("cd-mnav-collapsed", collapsed);
    return () => document.body.classList.remove("cd-mnav-collapsed");
  }, [collapsed]);

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

  const toggleCollapsed = useCallback(() => {
    setCollapsed((previous) => {
      const next = !previous;
      writeMnavCollapsed(next);
      return next;
    });
  }, []);

  return (
    <nav className="cd-mnav" aria-label={getNavAriaLabel(locale)}>
      {/* 데스크탑 전용 접기 손잡이 — 모바일 폭에서는 CSS 가 감춘다(그쪽은 탭바가 유일한 내비다). */}
      <button
        type="button"
        className="cd-mnav__handle"
        aria-expanded={!collapsed}
        aria-controls="cd-mnav-list"
        aria-label={pick(MNAV_TOGGLE_TRANS_KEY, MNAV_TOGGLE_LABEL_KO)}
        onClick={toggleCollapsed}
      >
        <span className="cd-mnav__chevron" aria-hidden="true" />
      </button>
      <ul className="cd-mnav__list" id="cd-mnav-list">
        {MOBILE_TABS.map((tab) => {
          const isActive = activeKey === tab.key;
          const loading = pendingKey === tab.key;
          return (
            <li key={tab.key} className="cd-mnav__item">
              <Link
                href={tab.href}
                // 정적 셸 홈은 클릭을 handleTabClick 이 문서 로드로 가로채므로 클라이언트 라우팅이
                // 절대 쓰이지 않는다. 그런데 prefetch 는 살아 있어 "/" 의 RSC 페이로드(/index.txt)를
                // 받고 그 안의 Float 힌트가 홈 전용 CSS 청크를 preload 한다 — 끝내 쓰이지 않아
                // 브라우저 경고("preloaded but not used")와 함께 전 페이지에서 헛다운로드가 된다.
                prefetch={targetsStaticShellHome(tab.href) ? false : undefined}
                className={loading ? "cd-mnav__link opacity-70" : "cd-mnav__link"}
                data-nav-key={tab.key}
                aria-label={pick(tab.ariaTransKey, tab.ariaLabel)}
                aria-current={isActive ? "page" : undefined}
                aria-busy={loading}
                onClick={(event) => handleTabClick(event, tab)}
              >
                <TabIcon tabKey={tab.key} />
                <span className="cd-mnav__label">{pick(tab.transKey, tab.label)}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export default memo(MobileBottomNav);
