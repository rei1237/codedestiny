"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useLocale } from "@/lib/i18n/useT";
import { getLocalizedPublicHref } from "@/lib/i18n/routes";
import type { Locale } from "@/lib/i18n/locales";
import styles from "./GlobalHeader.module.css";

type LoadingLocale = "ko" | "en" | "ja" | "zh-CN" | "zh-TW" | "vi" | "hi" | "es" | "fr" | "de" | "nl" | "ms";

// 로케일 감지는 lib/i18n/useT 의 useLocale 이 담당한다(cd:locale-ready 구독 포함).
// 여기 있던 normalizeChromeLocale/getCurrentChromeLocale 은 그 훅과 중복이라 제거했다.

const AuthWidget = dynamic(() => import("./AuthWidget"), {
  ssr: false,
  loading: () => null,
});

const LocaleSwitcher = dynamic(
  () => import("./LocaleSwitcher").then((mod) => mod.LocaleSwitcher),
  {
    ssr: false,
    loading: () => null,
  },
);

// 홈 하나뿐이면 상단에서 콘텐츠로 가는 길이 없다. 인사이트는 색인·광고 대상 기사 100편이
// 넘게 걸린 허브라 여기 두 번째 자리를 준다(그 아래 링크는 푸터가 계속 맡는다).
const headerNavItems = [
  { href: "/" },
  { href: "/insights" },
] as const;

const GLOBAL_HEADER_COPY: Record<LoadingLocale, {
  nav: Record<string, string>;
  mainNav: string;
  openMenu: string;
  closeMenu: string;
  menu: string;
  auth: string;
  brandTagline: string;
}> = {
  ko: {
    nav: { "/": "홈", "/insights": "운세 인사이트" },
    mainNav: "주요 내비게이션",
    openMenu: "메뉴 열기",
    closeMenu: "메뉴 닫기",
    menu: "메뉴",
    auth: "인증",
    brandTagline: "다채로운 운세, 나를 위한 이야기",
  },
  en: {
    nav: { "/": "Home", "/insights": "Insights" },
    mainNav: "Main navigation",
    openMenu: "Open menu",
    closeMenu: "Close menu",
    menu: "Menu",
    auth: "Auth",
    brandTagline: "A gentler reading",
  },
  ja: {
    nav: { "/": "ホーム", "/insights": "インサイト" },
    mainNav: "メインナビゲーション",
    openMenu: "メニューを開く",
    closeMenu: "メニューを閉じる",
    menu: "メニュー",
    auth: "認証",
    brandTagline: "心ほどける占い",
  },
  "zh-CN": {
    nav: { "/": "首页", "/insights": "运势洞察" },
    mainNav: "主导航",
    openMenu: "打开菜单",
    closeMenu: "关闭菜单",
    menu: "菜单",
    auth: "认证",
    brandTagline: "治愈心绪的占卜",
  },
  "zh-TW": {
    nav: { "/": "首頁", "/insights": "運勢洞察" },
    mainNav: "主要導覽",
    openMenu: "開啟選單",
    closeMenu: "關閉選單",
    menu: "選單",
    auth: "認證",
    brandTagline: "療癒心緒的占卜",
  },
  vi: {
    nav: { "/": "Trang chủ", "/insights": "Bài viết" },
    mainNav: "Điều hướng chính",
    openMenu: "Mở menu",
    closeMenu: "Đóng menu",
    menu: "Menu",
    auth: "Xác thực",
    brandTagline: "Lời giải dịu dàng",
  },
  hi: {
    nav: { "/": "होम", "/insights": "लेख" },
    mainNav: "मुख्य नेविगेशन",
    openMenu: "मेनू खोलें",
    closeMenu: "मेनू बंद करें",
    menu: "मेनू",
    auth: "प्रमाणन",
    brandTagline: "मन को सुकून देने वाला पठन",
  },
  es: {
    nav: { "/": "Inicio", "/insights": "Artículos" },
    mainNav: "Navegación principal",
    openMenu: "Abrir menú",
    closeMenu: "Cerrar menú",
    menu: "Menú",
    auth: "Acceso",
    brandTagline: "Una lectura más amable",
  },
  fr: {
    nav: { "/": "Accueil", "/insights": "Articles" },
    mainNav: "Navigation principale",
    openMenu: "Ouvrir le menu",
    closeMenu: "Fermer le menu",
    menu: "Menu",
    auth: "Compte",
    brandTagline: "Une lecture apaisante",
  },
  de: {
    nav: { "/": "Start", "/insights": "Artikel" },
    mainNav: "Hauptnavigation",
    openMenu: "Menü öffnen",
    closeMenu: "Menü schließen",
    menu: "Menü",
    auth: "Auth",
    brandTagline: "Eine sanfte Deutung",
  },
  nl: {
    nav: { "/": "Home", "/insights": "Artikelen" },
    mainNav: "Hoofdnavigatie",
    openMenu: "Menu openen",
    closeMenu: "Menu sluiten",
    menu: "Menu",
    auth: "Auth",
    brandTagline: "Een zachte duiding",
  },
  ms: {
    nav: { "/": "Laman utama", "/insights": "Artikel" },
    mainNav: "Navigasi utama",
    openMenu: "Buka menu",
    closeMenu: "Tutup menu",
    menu: "Menu",
    auth: "Auth",
    brandTagline: "Tafsiran yang menenangkan",
  },
};

function toPublicRouteLocale(locale: LoadingLocale): Locale {
  if (locale === "zh-CN") return "zh";
  if (locale === "ko" || locale === "en" || locale === "ja" || locale === "zh-TW") return locale;
  return "ko";
}

function isStaticShellHref(href: string) {
  return href === "/";
}

// "홈"은 하단 탭과 같은 서비스 홈으로 보낸다. 한국어 서비스 홈은 /ggulggul/ 이고(lib/i18n/routes I18N_ROUTE_MAP.home),
// 브랜드 첫 화면(/)은 로고가 맡는다. 다른 언어는 번역 셸이 곧 서비스 홈이라 그대로 둔다.
function headerNavHref(href: string, locale: Locale) {
  return href === "/" && locale === "ko" ? "/ggulggul/" : getLocalizedPublicHref(href, locale);
}

function useDesktopHeaderControls() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(min-width: 768px)");
    const sync = () => setEnabled(media.matches);
    sync();
    if (typeof media.addEventListener === "function") {
      media.addEventListener("change", sync);
      return () => media.removeEventListener("change", sync);
    }
    media.addListener(sync);
    return () => media.removeListener(sync);
  }, []);

  return enabled;
}

export default function GlobalHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  // 🔴 마운트 시 1회만 읽으면 안 된다. LocaleRuntimeBridge 도 useEffect 에서 로케일을
  // 쓰므로 순서에 따라 헤더가 "ko" 로 굳어버린다(실측: /points 에서 ja 인데 네비가 한국어).
  // useLocale 은 cd:locale-ready 를 구독해 전환 때마다 다시 렌더한다 —
  // 로케일 감지 로직을 여기서 또 만들지 않고 공유 훅을 쓴다.
  const locale = useLocale() as LoadingLocale;
  const showDesktopControls = useDesktopHeaderControls();
  // 표가 12개 로케일을 다 갖췄고 useLocale 이 그중 하나로 수렴하므로 fallback 이 필요 없다.
  const copy = GLOBAL_HEADER_COPY[locale];
  const publicRouteLocale = toPublicRouteLocale(locale);

  return (
    <>
      <header className={styles.root}>
        <div className={styles.shell}>
          {/* 홈 / 은 워커가 로케일·기능 파라미터를 판정하므로 문서 이동으로 연다. */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a
            href={getLocalizedPublicHref("/", publicRouteLocale)}
            className={styles.brand}
          >
            <Image className={styles.brandImage} src="/icons/moonlight-garden-v1-512.webp" alt="" width={512} height={512} sizes="42px" />
            <span className={styles.brandText}>
              <strong>꿀꿀 운세</strong>
              <small>{copy.brandTagline}</small>
            </span>
          </a>

          <nav className={styles.mainNav} aria-label={copy.mainNav}>
            {headerNavItems.map((item) => {
              const label = copy.nav[item.href] || item.href;
              const href = headerNavHref(item.href, publicRouteLocale);
              return isStaticShellHref(item.href) ? (
                <a key={item.href} href={href} className={styles.navLink}>
                  {label}
                </a>
              ) : (
                <Link key={item.href} href={href} className={styles.navLink}>
                  {label}
                </Link>
              );
            })}
          </nav>

          <div className={styles.controls}>
            {showDesktopControls ? (
              <>
                <LocaleSwitcher />
                <AuthWidget />
              </>
            ) : null}
          </div>

          <button
            type="button"
            className={styles.menuButton}
            aria-label={menuOpen ? copy.closeMenu : copy.openMenu}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((value) => !value)}
          >
            <svg viewBox="0 0 20 20" aria-hidden="true">
              {menuOpen ? <path d="m5 5 10 10M15 5 5 15" /> : <path d="M3 5h14M3 10h14M3 15h14" />}
            </svg>
            <span>{menuOpen ? copy.closeMenu : copy.menu}</span>
          </button>
        </div>
      </header>

      {menuOpen ? (
        <div className={styles.mobilePanel}>
          <div className={styles.mobileTools}>
            <span>{copy.auth}</span>
            <div>
              <LocaleSwitcher />
              <AuthWidget />
            </div>
          </div>
          {/* 2026-10-17 "직관성": 햄버거 메뉴는 로그인(위)과 홈만 둔다. 정책 링크는 푸터가 맡는다. */}
          <div className={styles.mobileLinks}>
            {headerNavItems.filter((item) => item.href === "/").map((item) => {
              const label = copy.nav[item.href] || item.href;
              const href = headerNavHref(item.href, publicRouteLocale);
              return isStaticShellHref(item.href) ? (
                <a key={`m-${item.href}`} href={href} onClick={() => setMenuOpen(false)} className={styles.navLink}>
                  {label}
                </a>
              ) : (
                <Link key={`m-${item.href}`} href={href} onClick={() => setMenuOpen(false)} className={styles.navLink}>
                  {label}
                </Link>
              );
            })}
          </div>
        </div>
      ) : null}
    </>
  );
}
