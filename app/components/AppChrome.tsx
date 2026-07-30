"use client";

import dynamic from "next/dynamic";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, Home } from "lucide-react";
import { LazyMotion } from "framer-motion";
import GlobalHeader from "./GlobalHeader";
import DisclaimerBanner from "./DisclaimerBanner";
import MobileBottomNav from "./MobileBottomNav";

const HOME_ROUTE = "/";

// /app/** 은 자체 하단 탭바(app/app/_components/AppTabBar.tsx)를 이미 갖고 있다.
// 여기서 또 깔면 탭바가 두 겹으로 쌓인다.
const APP_SHELL_ROUTE = "/app";

// framer-motion feature 번들을 비동기 청크로 로드 (m.* 컴포넌트 전용).
const loadFramerFeatures = () => import("@/lib/framer-features").then((mod) => mod.default);

const DeferredSiteFooterHub = dynamic(() => import("./SiteFooterHub"), {
  ssr: false,
  loading: () => null,
});

const FOOTER_PREVIEW_LINKS = [
  { href: "/saju", label: "Saju" },
  { href: "/tarot", label: "Tarot" },
  { href: "/astrology/cosmic", label: "Astrology" },
  { href: "/oracle/sukuyo", label: "Sukuyo" },
  { href: "/ziwei/chart", label: "Ziwei" },
  { href: "/vedic/jyotish", label: "Vedic" },
  { href: "/dream", label: "Dream" },
  { href: "/music", label: "Music" },
  { href: "/premium-unlock", label: "Premium" },
  { href: "/faq", label: "FAQ" },
  { href: "/contact", label: "Contact" },
];

const CHROMELESS_ROUTES = [
  "/app",
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
];

const FEATURE_NAV_EXTRA_ROUTES = [
  "/premium-unlock",
  "/pdf/life-book",
];

// Routes that render their own in-experience back/home controls, so the global
// floating nav would duplicate and overlap them.
const FEATURE_NAV_SELF_MANAGED_ROUTES = [
  "/fortune-tea-house",
  "/master-love-codex",
  "/fortune/prompt-hub",
  "/olympus",
  "/island-consult",
  "/lock-screen-fortune",
];

function useFooterInView(enabled: boolean) {
  const footerMountRef = useRef<HTMLDivElement | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!enabled || isReady) return;
    const target = footerMountRef.current;
    if (!target || !("IntersectionObserver" in window)) {
      const timer = window.setTimeout(() => setIsReady(true), 5000);
      return () => window.clearTimeout(timer);
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setIsReady(true);
          observer.disconnect();
        }
      },
      { rootMargin: "720px 0px" },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [enabled, isReady]);

  return { footerMountRef, isReady };
}

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

  const goHome = useCallback(() => {
    router.push(HOME_ROUTE);
  }, [router]);

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
        if (`${window.location.pathname}${window.location.search}` === startPath) router.replace(HOME_ROUTE);
      }, 240);
      return;
    }
    router.push(HOME_ROUTE);
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

function FooterWarmupPreview() {
  return (
    <footer
      aria-label="Code Destiny navigation preview"
      style={{
        marginTop: 48,
        padding: "30px 20px calc(30px + env(safe-area-inset-bottom))",
        borderTop: "1px solid rgba(215, 196, 255, 0.18)",
        background: "linear-gradient(180deg, rgba(15, 13, 34, 0.92), rgba(7, 6, 18, 0.96))",
        color: "rgba(249, 246, 255, 0.78)",
      }}
    >
      <strong style={{ display: "block", color: "#fff", fontSize: 15 }}>Code Destiny Navigation</strong>
      <p style={{ margin: "8px 0 0", maxWidth: 720, fontSize: 13, lineHeight: 1.65 }}>
        Code Destiny gathers saju, tarot, astrology, sukuyo, ziwei, vedic stars, dream symbols, moon music,
        and premium destiny readings under one quiet night sky. Each path keeps the tone of a private
        consultation: calm, mystical, emotionally natural, and close enough to return to when a question
        begins to stir again.
      </p>
      <p style={{ margin: "8px 0 0", maxWidth: 720, fontSize: 13, lineHeight: 1.65 }}>
        The main paths lead to birth chart insight, relationship timing, daily fortune, tarot spreads,
        compatibility, dream interpretation, story chapters, music playlists, and deeper paid readings.
        Policy pages, contact details, refund guidance, privacy terms, and service information remain close
        beside them so the journey feels clear as well as enchanted.
      </p>
      <p style={{ margin: "8px 0 0", maxWidth: 720, fontSize: 13, lineHeight: 1.65 }}>
        Return to the reading that called your name, move toward another symbol, or keep this small
        constellation as a gentle guide through the service.
      </p>
      <p style={{ margin: "8px 0 0", maxWidth: 720, fontSize: 13, lineHeight: 1.65 }}>
        Every guide is written to support reflection, not to replace medical, legal, financial, or personal
        decisions that need real-world information and qualified help. Let each symbol become a calm note
        beside your own judgment, not a command above it.
      </p>
      <p style={{ margin: "8px 0 0", maxWidth: 720, fontSize: 13, lineHeight: 1.65 }}>
        For returning visitors, the familiar doors remain in the same constellation: free readings for quick
        orientation, guide pages for slower study, story and music rooms for softer moments, and premium
        reports for people who want a longer reading. Move lightly, check the policy pages when needed, and
        keep the answer close to the life you are actually living.
      </p>
      <nav
        aria-label="Essential Code Destiny links"
        style={{ display: "flex", flexWrap: "wrap", gap: "10px 14px", marginTop: 14, fontSize: 13 }}
      >
        {FOOTER_PREVIEW_LINKS.map((link) => (
          <a key={link.href} href={link.href} style={{ color: "#d9c8ff", textDecoration: "none" }}>
            {link.label}
          </a>
        ))}
      </nav>
    </footer>
  );
}

export default function AppChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "/";
  const hideChrome = CHROMELESS_ROUTES.some((r) => pathname === r || pathname.startsWith(r + "/"));
  const selfManagedNav = FEATURE_NAV_SELF_MANAGED_ROUTES.some((r) => pathname === r || pathname.startsWith(r + "/"));
  const showFeatureNav = pathname !== HOME_ROUTE && !selfManagedNav && (
    hideChrome
    || FEATURE_NAV_EXTRA_ROUTES.some((r) => pathname === r || pathname.startsWith(r + "/"))
    || /\/(result|play|start)(?=\/|$)/.test(pathname)
  );
  const isAppShellRoute = pathname === APP_SHELL_ROUTE || pathname.startsWith(`${APP_SHELL_ROUTE}/`);
  const footer = useFooterInView(!hideChrome);
  return (
    <LazyMotion features={loadFramerFeatures} strict>
      {!hideChrome && <GlobalHeader />}
      {showFeatureNav && <FeatureBackHomeNav />}
      {children}
      {!hideChrome && <DisclaimerBanner />}
      {!hideChrome && (
        <div ref={footer.footerMountRef}>
          {footer.isReady ? <DeferredSiteFooterHub /> : <FooterWarmupPreview />}
        </div>
      )}
      {/* 몰입형(hideChrome) 라우트에서도 하단 네비는 유지한다 — 모든 모바일 화면 공통 탐색. */}
      {!isAppShellRoute && <MobileBottomNav />}
    </LazyMotion>
  );
}
