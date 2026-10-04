"use client";

import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useCallback } from "react";
import { ArrowLeft, Home } from "lucide-react";
import styles from "./FeatureBackHomeNav.module.css";
import { LazyMotion } from "framer-motion";
import { useLocale } from "@/lib/i18n/useT";
import GlobalHeader from "./GlobalHeader";
import DisclaimerBanner from "./DisclaimerBanner";
import MobileBottomNav from "./MobileBottomNav";
import SiteFooterHub from "./SiteFooterHub";
import { SHELL_HOME_PATH, hardNavigateToShellHome } from "@/lib/navigation/shellHome";
// 함수만 가져온다 — 번역 테이블이 아니라 프리픽스 판정 로직이라 클라이언트 번들 비용이 사실상 없다.
import { localeFromPathname } from "@/lib/i18n/locales";

const HOME_ROUTE = SHELL_HOME_PATH;

// /app/** 은 AppShell 이 같은 MobileBottomNav 를 직접 렌더한다(앱 팔레트 스킨은 app-shell.css).
// 여기서 또 깔면 탭바가 두 겹으로 쌓인다.
const APP_SHELL_ROUTE = "/app";
const AUTH_ROUTES = ["/login", "/signup", "/auth"];

// framer-motion feature 번들을 비동기 청크로 로드 (m.* 컴포넌트 전용).
const loadFramerFeatures = () => import("@/lib/framer-features").then((mod) => mod.default);


const CHROMELESS_ROUTES = [
  "/share",
  "/relationship-boundary-test/inline",
  "/gift",
  "/app",
  "/points/history",
  // 운기 다이어리는 자체 하단바(app/diary/_components/DiaryBottomNav.tsx)를 갖는다.
  // 🔴 FEATURE_NAV_SELF_MANAGED_ROUTES 에도 함께 있어야 한다(아래 /admin 주석 참고).
  "/diary",
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
  "/ziwei/animal-destiny",
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
  "/karma-destiny-ai",
  "/saju-guardian",
  "/premium-unlock",
  "/olympus",
  "/oracle/rune",
  // 핀란드 주석점 — 화면 전체를 덮는 파스텔 오버레이라 프리렌더된 헤더·링크 허브 푸터·탭바가
  // 청크 로드 전까지 그대로 노출됐다(다른 랜딩페이지가 번쩍이는 것처럼 보임). 자체 상단바를 쓴다.
  "/oracle/sikojen-povailu",
  "/destiny-compass",
  "/journey",
  "/island-consult",
  "/lock-screen-fortune",
  "/feedback",
  // 오늘의 운세 전용 화면. 자체 상단바 + 3종 탭으로 화면 전체를 쓴다.
  "/today",
  // 리뷰 목록·작성 화면. 자체 sticky 상단바(홈 링크 포함)를 쓴다.
  "/reviews",
  // 휴먼 디자인 바디그래프 — 자체 상단 컨트롤로 화면 전체를 몰입형으로 쓴다.
  "/human-design",
  // 관리자 콘솔 — AdminShell 이 자체 좌측 네비·상단바·로그아웃을 갖는다. 사이트 헤더·면책배너·
  // 푸터·하단 탭바가 겹치면 관리 화면이 그만큼 잘리고, 하단 탭바는 저장 버튼을 덮는다.
  "/admin",
];

const FEATURE_NAV_EXTRA_ROUTES = [
  "/premium-unlock",
  "/pdf/life-book",
];

// Premium fortune routes that own their complete in-experience navigation.
// They must not inherit the site header, footer, floating feature nav, or mobile tab bar.
const IMMERSIVE_FORTUNE_ROUTES = [
  "/checkout",
  "/yeongnyangi",
  "/features",
  "/fusion-fortune",
  "/fortune-chat",
];

// Routes that render their own in-experience back/home controls, so the global
// floating nav would duplicate and overlap them.
const FEATURE_NAV_SELF_MANAGED_ROUTES = [
  "/share",
  "/relationship-boundary-test/inline",
  "/gift",
  "/points/history",
  "/fortune-tea-house",
  "/master-love-codex",
  "/fortune/prompt-hub",
  "/olympus",
  "/island-consult",
  "/lock-screen-fortune",
  // 밝은 배경이라 공용 나브(어두운 페이지 전용 스타일)가 묻힌다 — 자체 상단바를 쓴다.
  "/feedback",
  "/today",
  "/reviews",
  // 자체 상단 컨트롤을 갖는다 — 공용 플로팅 나브가 겹치면 차트 위를 덮는다.
  "/human-design",
  // 밝은 파스텔 배경 + 자체 상단바(뒤로·홈). 공용 나브는 어두운 페이지 전용이라 묻힌다.
  "/oracle/sikojen-povailu",
  // 🔴 CHROMELESS_ROUTES 에만 넣으면 showFeatureNav 의 `hideChrome ||` 가지가 켜져
  //    관리자 화면 좌상단에 공용 back/home 나브가 새로 뜬다. 두 배열에 함께 있어야 한다.
  "/admin",
  // 자체 상단바(뒤로·홈·검색) + 자체 하단바. 위 /admin 주석과 같은 이유로 두 배열에 함께 둔다.
  "/diary",
  "/karma-destiny-ai",
];

const LOCALE_CODES = ["ko", "en", "ja", "zh-CN", "zh-TW", "vi", "hi", "es", "fr", "de", "nl", "ms"] as const;
type ChromeLocale = (typeof LOCALE_CODES)[number];

const FEATURE_NAV_COPY: Record<ChromeLocale, { back: string; backLabel: string; home: string }> = {
  ko: { back: "이전 페이지로 이동", backLabel: "뒤로", home: "홈" },
  en: { back: "Go back", backLabel: "Back", home: "Home" },
  ja: { back: "前のページに戻る", backLabel: "戻る", home: "ホーム" },
  "zh-CN": { back: "返回上一页", backLabel: "返回", home: "首页" },
  "zh-TW": { back: "返回上一頁", backLabel: "返回", home: "首頁" },
  vi: { back: "Quay lại trang trước", backLabel: "Quay lại", home: "Trang chủ" },
  hi: { back: "पिछले पेज पर जाएं", backLabel: "वापस", home: "होम" },
  es: { back: "Volver a la página anterior", backLabel: "Volver", home: "Inicio" },
  fr: { back: "Retour à la page précédente", backLabel: "Retour", home: "Accueil" },
  de: { back: "Zur vorherigen Seite", backLabel: "Zurück", home: "Startseite" },
  nl: { back: "Terug naar vorige pagina", backLabel: "Terug", home: "Start" },
  ms: { back: "Kembali ke halaman sebelumnya", backLabel: "Kembali", home: "Laman utama" },
};

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
  const locale = useLocale() as ChromeLocale;
  const copy = FEATURE_NAV_COPY[locale] ?? FEATURE_NAV_COPY.ko;

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
      window.history.back();
      // History traversal is asynchronous. A timer cannot distinguish slow
      // navigation from failure (or a same-URL modal history entry).
      return;
    }
    hardNavigateToShellHome();
  }, [router]);

  return (
    // The navigation owns its row in document flow so it cannot cover page content.
    // cd-feature-nav remains the marker hidden when the mobile tab bar is mounted.
    <nav
      aria-label="Feature navigation"
      className={`cd-feature-nav ${styles.navigation}`}
    >
      <button
        type="button"
        onClick={goBack}
        className={`cd-yehwa-button cd-yehwa-button--secondary ${styles.button} ${styles.back}`}
        aria-label={copy.back}
      >
        <ArrowLeft className={styles.icon} aria-hidden="true" />
        <span>{copy.backLabel}</span>
      </button>
      <button
        type="button"
        onClick={goHome}
        className={`cd-yehwa-button cd-yehwa-button--primary ${styles.button} ${styles.home}`}
        aria-label={copy.home}
      >
        <Home className={styles.icon} aria-hidden="true" />
        <span>{copy.home}</span>
      </button>
    </nav>
  );
}

export default function AppChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "/";
  const isImmersiveFortuneRoute = IMMERSIVE_FORTUNE_ROUTES.some((r) => pathname === r || pathname.startsWith(r + "/"));
  const isAuthRoute = AUTH_ROUTES.some((r) => pathname === r || pathname.startsWith(r + "/"));
  const hideChrome = pathname === "/" || isAuthRoute || isImmersiveFortuneRoute || CHROMELESS_ROUTES.some((r) => pathname === r || pathname.startsWith(r + "/"));
  const selfManagedNav = FEATURE_NAV_SELF_MANAGED_ROUTES.some((r) => pathname === r || pathname.startsWith(r + "/"));
  const showFeatureNav = !isAuthRoute && !isImmersiveFortuneRoute && pathname !== HOME_ROUTE && !selfManagedNav && (
    hideChrome
    || FEATURE_NAV_EXTRA_ROUTES.some((r) => pathname === r || pathname.startsWith(r + "/"))
    || /\/(result|play|start)(?=\/|$)/.test(pathname)
  );
  const isAppShellRoute = pathname === APP_SHELL_ROUTE || pathname.startsWith(`${APP_SHELL_ROUTE}/`);
  // 로케일 경로(/ja·/zh·/zh-tw·/en)는 app/[locale]/layout.js 와 app/ja/layout.js 가 서버 컴포넌트
  // LocaleFooterHub 를 붙인다. 여기서 한국어 SiteFooterHub 까지 렌더하면 푸터가 두 개가 된다.
  const isLocaleRoute = localeFromPathname(pathname) !== null;
  return (
    <LazyMotion features={loadFramerFeatures} strict>
      {!hideChrome && <GlobalHeader />}
      {showFeatureNav && <FeatureBackHomeNav />}
      {children}
      {!hideChrome && <DisclaimerBanner />}
      {/* 푸터는 서버 렌더한다. 과거 IntersectionObserver 로 지연시키고 그동안 영문 플레이스홀더를
          보여 줬는데, 정적 HTML 에 남는 것이 그 영문 문구뿐이라 전 페이지가 동일 보일러플레이트를
          갖고 크롤러는 내부 링크 51개를 전혀 보지 못했다. SiteFooterHub 는 훅·브라우저 API 가 없다. */}
      {!hideChrome && !isLocaleRoute && <SiteFooterHub />}
      {/* App-shell routes own their mobile navigation (AppShell renders the same
          MobileBottomNav itself). Every chromeless route (auth, immersive-fortune,
          and the rest of CHROMELESS_ROUTES) owns its own in-page exit control instead —
          same boundary as the header/footer/banner above (hideChrome). */}
      {!isAppShellRoute && !hideChrome && <MobileBottomNav />}
    </LazyMotion>
  );
}
