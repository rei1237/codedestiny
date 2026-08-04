"use client";

import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useCallback } from "react";
import { ArrowLeft, Home } from "lucide-react";
import { LazyMotion } from "framer-motion";
import GlobalHeader from "./GlobalHeader";
import DisclaimerBanner from "./DisclaimerBanner";
import MobileBottomNav from "./MobileBottomNav";
import SiteFooterHub from "./SiteFooterHub";
import { SHELL_HOME_PATH, hardNavigateToShellHome } from "@/lib/navigation/shellHome";

const HOME_ROUTE = SHELL_HOME_PATH;

// /app/** 은 자체 하단 탭바(app/app/_components/AppTabBar.tsx)를 이미 갖고 있다.
// 여기서 또 깔면 탭바가 두 겹으로 쌓인다.
const APP_SHELL_ROUTE = "/app";

// framer-motion feature 번들을 비동기 청크로 로드 (m.* 컴포넌트 전용).
const loadFramerFeatures = () => import("@/lib/framer-features").then((mod) => mod.default);


const CHROMELESS_ROUTES = [
  "/app",
  "/points/history",
  "/nakshatra",
  "/saju/love-simulation",
  "/saju/destiny-bias",
  "/saju/destiny-meeting-place",
  "/yeon-star-hug",
  "/saju-fpti",
  "/tarot/numerology",
  "/tarot/prompt-maker",
  "/tarot/crystal-soul",
  "/tarot/healing",
  "/tarot/mindscan",
  "/saju/animal-destiny",
  "/saju/animal-test",
  "/palm-reading",
  "/music",
  "/ziwei-ai",
  "/ziwei/chart",
  "/fortune/prompt-hub",
  "/maya",
  "/fortune-tea-house",
  "/neo-operation-room",
  "/new-year-ai-consultation",
  "/life-book-ai",
  "/love-secret-ai",
  "/master-love-codex",
  "/naming-ai",
  "/astrology-ai",
  "/vedic-ai",
  "/sukuyo-compatibility-ai",
  "/saju-guardian",
  "/premium-unlock",
  "/olympus",
  "/oracle/rune",
  "/destiny-compass",
  "/journey",
  "/island-consult",
  "/lock-screen-fortune",
  "/feedback",
];

const FEATURE_NAV_EXTRA_ROUTES = [
  "/premium-unlock",
  "/pdf/life-book",
];

// Premium fortune routes that own their complete in-experience navigation.
// They must not inherit the site header, footer, floating feature nav, or mobile tab bar.
const IMMERSIVE_FORTUNE_ROUTES = [
  "/fusion-fortune",
];

// Routes that render their own in-experience back/home controls, so the global
// floating nav would duplicate and overlap them.
const FEATURE_NAV_SELF_MANAGED_ROUTES = [
  "/points/history",
  "/fortune-tea-house",
  "/master-love-codex",
  "/fortune/prompt-hub",
  "/olympus",
  "/island-consult",
  "/lock-screen-fortune",
  // 밝은 배경이라 공용 나브(어두운 페이지 전용 스타일)가 묻힌다 — 자체 상단바를 쓴다.
  "/feedback",
];

function isUnsafePaymentReferrer(referrer: string) {
  if (!referrer) return true;
  try {
    const url = new URL(referrer);
    if (url.origin !== window.location.origin) return true;
    return /\/api\/(payments|billing)|payment|checkout|confirm|portone/i.test(url.pathname + url.search);
  } catch {
    return true;
  }
}

function FeatureBackHomeNav() {
  const router = useRouter();

  // 홈은 React 라우트가 아니라 정적 메인 셸이다. router.push 로 보내면 React 홈이 한 번
  // 렌더된 뒤 셸로 되돌려져 화면이 번쩍인다 → 문서 로드로 곧장 보낸다.
  const goHome = useCallback(() => {
    hardNavigateToShellHome();
  }, []);

  const goBack = useCallback(() => {
    if (typeof window === "undefined") {
      router.push(HOME_ROUTE);
      return;
    }
    const canUseHistory = window.history.length > 1 && !isUnsafePaymentReferrer(document.referrer);
    if (canUseHistory) {
      const startPath = `${window.location.pathname}${window.location.search}`;
      window.history.back();
      window.setTimeout(() => {
        if (`${window.location.pathname}${window.location.search}` === startPath) hardNavigateToShellHome();
      }, 240);
      return;
    }
    hardNavigateToShellHome();
  }, [router]);

  return (
    <nav
      aria-label="Feature navigation"
      className="pointer-events-none fixed left-3 top-[calc(env(safe-area-inset-top,0px)+12px)] z-[2147481200] flex items-center gap-2 sm:left-4"
    >
      <button
        type="button"
        onClick={goBack}
        className="pointer-events-auto inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border border-white/18 bg-slate-950/62 text-white shadow-[0_14px_36px_rgba(0,0,0,0.34)] backdrop-blur-xl transition hover:bg-slate-900/82 focus:outline-none focus:ring-2 focus:ring-amber-200/60"
        aria-label="이전 페이지로 이동"
      >
        <ArrowLeft className="h-5 w-5" aria-hidden="true" />
      </button>
      <button
        type="button"
        onClick={goHome}
        className="pointer-events-auto inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-amber-200/30 bg-[linear-gradient(135deg,rgba(15,23,42,0.78),rgba(70,49,118,0.68),rgba(184,134,48,0.42))] px-4 text-sm font-black text-amber-50 no-underline shadow-[0_14px_36px_rgba(0,0,0,0.34)] backdrop-blur-xl transition hover:border-amber-100/54 hover:bg-slate-900/82 focus:outline-none focus:ring-2 focus:ring-amber-200/60"
      >
        <Home className="h-4 w-4" aria-hidden="true" />
        <span>홈</span>
      </button>
    </nav>
  );
}

export default function AppChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "/";
  const isImmersiveFortuneRoute = IMMERSIVE_FORTUNE_ROUTES.some((r) => pathname === r || pathname.startsWith(r + "/"));
  const hideChrome = isImmersiveFortuneRoute || CHROMELESS_ROUTES.some((r) => pathname === r || pathname.startsWith(r + "/"));
  const selfManagedNav = FEATURE_NAV_SELF_MANAGED_ROUTES.some((r) => pathname === r || pathname.startsWith(r + "/"));
  const showFeatureNav = pathname !== HOME_ROUTE && !isImmersiveFortuneRoute && !selfManagedNav && (
    hideChrome
    || FEATURE_NAV_EXTRA_ROUTES.some((r) => pathname === r || pathname.startsWith(r + "/"))
    || /\/(result|play|start)(?=\/|$)/.test(pathname)
  );
  const isAppShellRoute = pathname === APP_SHELL_ROUTE || pathname.startsWith(`${APP_SHELL_ROUTE}/`);
  return (
    <LazyMotion features={loadFramerFeatures} strict>
      {!hideChrome && <GlobalHeader />}
      {showFeatureNav && <FeatureBackHomeNav />}
      {children}
      {!hideChrome && <DisclaimerBanner />}
      {/* 푸터는 서버 렌더한다. 과거 IntersectionObserver 로 지연시키고 그동안 영문 플레이스홀더를
          보여 줬는데, 정적 HTML 에 남는 것이 그 영문 문구뿐이라 전 페이지가 동일 보일러플레이트를
          갖고 크롤러는 내부 링크 51개를 전혀 보지 못했다. SiteFooterHub 는 훅·브라우저 API 가 없다. */}
      {!hideChrome && <SiteFooterHub />}
      {/* App-shell and fully immersive routes own their mobile navigation. */}
      {!isAppShellRoute && !isImmersiveFortuneRoute && <MobileBottomNav />}
    </LazyMotion>
  );
}
