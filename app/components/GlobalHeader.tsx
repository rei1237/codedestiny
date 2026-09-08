"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useLocale } from "@/lib/i18n/useT";
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
  { href: "/index.html" },
  { href: "/insights" },
] as const;

const policyNavItems = [
  { href: "/privacy" },
  { href: "/terms" },
  { href: "/contact" },
  { href: "/about" },
  { href: "/disclaimer" },
  { href: "/advertising-policy" },
] as const;

const GLOBAL_HEADER_COPY: Record<LoadingLocale, {
  nav: Record<string, string>;
  mainNav: string;
  openMenu: string;
  closeMenu: string;
  menu: string;
  auth: string;
  policyLinks: string;
}> = {
  ko: {
    nav: { "/index.html": "홈", "/insights": "운세 인사이트", "/privacy": "개인정보", "/terms": "이용약관", "/contact": "문의", "/about": "소개", "/disclaimer": "면책", "/advertising-policy": "광고정책" },
    mainNav: "주요 내비게이션",
    openMenu: "메뉴 열기",
    closeMenu: "메뉴 닫기",
    menu: "메뉴",
    auth: "인증",
    policyLinks: "정책 링크",
  },
  en: {
    nav: { "/index.html": "Home", "/insights": "Insights", "/privacy": "Privacy", "/terms": "Terms", "/contact": "Contact", "/about": "About", "/disclaimer": "Disclaimer", "/advertising-policy": "Advertising Policy" },
    mainNav: "Main navigation",
    openMenu: "Open menu",
    closeMenu: "Close menu",
    menu: "Menu",
    auth: "Auth",
    policyLinks: "Policy Links",
  },
  ja: {
    nav: { "/index.html": "ホーム", "/insights": "インサイト", "/privacy": "プライバシー", "/terms": "利用規約", "/contact": "お問い合わせ", "/about": "紹介", "/disclaimer": "免責事項", "/advertising-policy": "広告ポリシー" },
    mainNav: "メインナビゲーション",
    openMenu: "メニューを開く",
    closeMenu: "メニューを閉じる",
    menu: "メニュー",
    auth: "認証",
    policyLinks: "ポリシーリンク",
  },
  "zh-CN": {
    nav: { "/index.html": "首页", "/insights": "运势洞察", "/privacy": "隐私", "/terms": "使用条款", "/contact": "联系", "/about": "关于", "/disclaimer": "免责声明", "/advertising-policy": "广告政策" },
    mainNav: "主导航",
    openMenu: "打开菜单",
    closeMenu: "关闭菜单",
    menu: "菜单",
    auth: "认证",
    policyLinks: "政策链接",
  },
  "zh-TW": {
    nav: { "/index.html": "首頁", "/insights": "運勢洞察", "/privacy": "隱私", "/terms": "使用條款", "/contact": "聯絡", "/about": "關於", "/disclaimer": "免責聲明", "/advertising-policy": "廣告政策" },
    mainNav: "主要導覽",
    openMenu: "開啟選單",
    closeMenu: "關閉選單",
    menu: "選單",
    auth: "認證",
    policyLinks: "政策連結",
  },
  vi: {
    nav: { "/index.html": "Trang chủ", "/insights": "Bài viết", "/privacy": "Quyền riêng tư", "/terms": "Điều khoản", "/contact": "Liên hệ", "/about": "Giới thiệu", "/disclaimer": "Miễn trừ", "/advertising-policy": "Chính sách quảng cáo" },
    mainNav: "Điều hướng chính",
    openMenu: "Mở menu",
    closeMenu: "Đóng menu",
    menu: "Menu",
    auth: "Xác thực",
    policyLinks: "Liên kết chính sách",
  },
  hi: {
    nav: { "/index.html": "होम", "/insights": "लेख", "/privacy": "गोपनीयता", "/terms": "शर्तें", "/contact": "संपर्क", "/about": "परिचय", "/disclaimer": "अस्वीकरण", "/advertising-policy": "विज्ञापन नीति" },
    mainNav: "मुख्य नेविगेशन",
    openMenu: "मेनू खोलें",
    closeMenu: "मेनू बंद करें",
    menu: "मेनू",
    auth: "प्रमाणन",
    policyLinks: "नीति लिंक",
  },
  es: {
    nav: { "/index.html": "Inicio", "/insights": "Artículos", "/privacy": "Privacidad", "/terms": "Términos", "/contact": "Contacto", "/about": "Acerca de", "/disclaimer": "Aviso legal", "/advertising-policy": "Política publicitaria" },
    mainNav: "Navegación principal",
    openMenu: "Abrir menú",
    closeMenu: "Cerrar menú",
    menu: "Menú",
    auth: "Acceso",
    policyLinks: "Enlaces de políticas",
  },
  fr: {
    nav: { "/index.html": "Accueil", "/insights": "Articles", "/privacy": "Confidentialité", "/terms": "Conditions", "/contact": "Contact", "/about": "À propos", "/disclaimer": "Avertissement", "/advertising-policy": "Politique publicitaire" },
    mainNav: "Navigation principale",
    openMenu: "Ouvrir le menu",
    closeMenu: "Fermer le menu",
    menu: "Menu",
    auth: "Compte",
    policyLinks: "Liens de politique",
  },
  de: {
    nav: { "/index.html": "Start", "/insights": "Artikel", "/privacy": "Datenschutz", "/terms": "Nutzungsbedingungen", "/contact": "Kontakt", "/about": "Über uns", "/disclaimer": "Haftungsausschluss", "/advertising-policy": "Werberichtlinie" },
    mainNav: "Hauptnavigation",
    openMenu: "Menü öffnen",
    closeMenu: "Menü schließen",
    menu: "Menü",
    auth: "Auth",
    policyLinks: "Richtlinienlinks",
  },
  nl: {
    nav: { "/index.html": "Home", "/insights": "Artikelen", "/privacy": "Privacy", "/terms": "Voorwaarden", "/contact": "Contact", "/about": "Over", "/disclaimer": "Disclaimer", "/advertising-policy": "Advertentiebeleid" },
    mainNav: "Hoofdnavigatie",
    openMenu: "Menu openen",
    closeMenu: "Menu sluiten",
    menu: "Menu",
    auth: "Auth",
    policyLinks: "Beleidslinks",
  },
  ms: {
    nav: { "/index.html": "Laman utama", "/insights": "Artikel", "/privacy": "Privasi", "/terms": "Terma", "/contact": "Hubungi", "/about": "Tentang", "/disclaimer": "Penafian", "/advertising-policy": "Dasar iklan" },
    mainNav: "Navigasi utama",
    openMenu: "Buka menu",
    closeMenu: "Tutup menu",
    menu: "Menu",
    auth: "Auth",
    policyLinks: "Pautan dasar",
  },
};

function isStaticShellHref(href: string) {
  return href === "/index.html" || href.startsWith("/index.html?");
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

  return (
    <>
      <header className={styles.root}>
        <div className={styles.shell}>
          {/* 정적 홈 셸로 문서 이동해야 React 홈이 한 프레임 노출되지 않는다. */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a
            href="/index.html"
            className={styles.brand}
            aria-label={copy.nav["/index.html"]}
          >
            <Image className={styles.brandImage} src="/icons/app-logo-512.webp" alt="" width={512} height={512} sizes="42px" />
            <span className={styles.brandText}>
              <strong>CODE DESTINY</strong>
              <small>꿀꿀 운세</small>
            </span>
          </a>

          <nav className={styles.mainNav} aria-label={copy.mainNav}>
            {headerNavItems.map((item) => {
              const label = copy.nav[item.href] || item.href;
              return isStaticShellHref(item.href) ? (
                <a key={item.href} href={item.href} className={styles.navLink}>
                  {label}
                </a>
              ) : (
                <Link key={item.href} href={item.href} className={styles.navLink}>
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
        <div className={styles.policyBar}>
          <nav className={styles.policyNav} aria-label={copy.policyLinks}>
            {policyNavItems.map((item) => {
              const label = copy.nav[item.href] || item.href;
              return (
                <Link
                  key={`d-${item.href}`}
                  href={item.href}
                  className={styles.policyLink}
                >
                  {label}
                </Link>
              );
            })}
          </nav>
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
          <div className={styles.mobileLinks}>
            {headerNavItems.map((item) => {
              const label = copy.nav[item.href] || item.href;
              return isStaticShellHref(item.href) ? (
                <a key={`m-${item.href}`} href={item.href} onClick={() => setMenuOpen(false)} className={styles.navLink}>
                  {label}
                </a>
              ) : (
                <Link key={`m-${item.href}`} href={item.href} onClick={() => setMenuOpen(false)} className={styles.navLink}>
                  {label}
                </Link>
              );
            })}
          </div>
          <div>
            <p className={styles.mobilePolicyLabel}>{copy.policyLinks}</p>
            <div className={styles.mobilePolicyLinks}>
              {policyNavItems.map((item) => {
                const label = copy.nav[item.href] || item.href;
                return (
                  <Link
                    key={`m-policy-${item.href}`}
                    href={item.href}
                    onClick={() => setMenuOpen(false)}
                    className={styles.policyLink}
                  >
                    {label}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
