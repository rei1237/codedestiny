"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useLocale } from "@/lib/i18n/useT";

const LOCALE_CODES = ["ko", "en", "ja", "zh-CN", "zh-TW", "vi", "hi", "es", "fr", "de", "nl", "ms"] as const;
type LoadingLocale = (typeof LOCALE_CODES)[number];

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
      <header className="sticky top-0 z-[70] border-b border-violet-200/20 bg-[rgba(12,8,28,0.84)] backdrop-blur-xl">
        <div className="mx-auto flex min-h-[58px] w-[min(1240px,100%-20px)] items-center gap-3 py-2">
          <a
            href="/index.html"
            className="shrink-0 bg-gradient-to-r from-violet-300 via-fuchsia-200 to-amber-100 bg-clip-text text-[17px] font-black text-transparent"
          >
            Code Destiny
          </a>

          <nav className="hidden min-w-0 flex-1 items-center gap-1.5 overflow-x-auto xl:flex" aria-label={copy.mainNav}>
            {headerNavItems.map((item) => {
              const className = "inline-flex shrink-0 items-center rounded-full border border-violet-200/25 bg-[rgba(33,18,64,0.56)] px-3 py-1.5 text-[12px] font-semibold text-violet-100 transition hover:border-violet-200/50 hover:bg-[rgba(65,39,120,0.55)]";
              const label = copy.nav[item.href] || item.href;
              return isStaticShellHref(item.href) ? (
                <a key={item.href} href={item.href} className={className}>
                  {label}
                </a>
              ) : (
                <Link key={item.href} href={item.href} className={className}>
                  {label}
                </Link>
              );
            })}
          </nav>

          <div className="hidden items-center gap-2 md:flex">
            {showDesktopControls ? (
              <>
                <LocaleSwitcher />
                <AuthWidget />
              </>
            ) : null}
          </div>

          <button
            type="button"
            className="ml-auto rounded-lg border border-violet-200/30 bg-[rgba(32,19,60,0.78)] px-3 py-1.5 text-sm font-semibold text-violet-100 md:hidden"
            aria-label={menuOpen ? copy.closeMenu : copy.openMenu}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((value) => !value)}
          >
            {menuOpen ? copy.closeMenu : copy.menu}
          </button>
        </div>
        <div className="hidden border-t border-violet-200/15 xl:block">
          <nav className="mx-auto flex w-[min(1240px,100%-20px)] flex-wrap items-center justify-end gap-2 py-2" aria-label={copy.policyLinks}>
            {policyNavItems.map((item) => {
              const label = copy.nav[item.href] || item.href;
              return (
                <Link
                  key={`d-${item.href}`}
                  href={item.href}
                  className="rounded-full border border-violet-200/20 bg-[rgba(32,19,60,0.54)] px-2.5 py-1 text-[11px] font-semibold text-violet-100/90 transition hover:border-violet-200/45 hover:bg-[rgba(65,39,120,0.48)]"
                >
                  {label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      {menuOpen ? (
        <div className="sticky top-[58px] z-[65] border-b border-violet-200/20 bg-[rgba(11,8,26,0.95)] px-3 pb-4 pt-3 md:hidden">
          <div className="mb-3 flex items-center justify-between gap-2 rounded-xl border border-violet-200/20 bg-[rgba(36,20,68,0.45)] p-2">
            <span className="text-xs font-semibold tracking-[0.14em] text-violet-200/75">{copy.auth}</span>
            <div className="flex items-center gap-2">
              <LocaleSwitcher />
              <AuthWidget />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {headerNavItems.map((item) => {
              const className = "rounded-xl border border-violet-200/25 bg-[rgba(32,19,60,0.8)] px-2.5 py-2 text-center text-[11px] font-semibold text-violet-100";
              const label = copy.nav[item.href] || item.href;
              return isStaticShellHref(item.href) ? (
                <a key={`m-${item.href}`} href={item.href} onClick={() => setMenuOpen(false)} className={className}>
                  {label}
                </a>
              ) : (
                <Link key={`m-${item.href}`} href={item.href} onClick={() => setMenuOpen(false)} className={className}>
                  {label}
                </Link>
              );
            })}
          </div>
          <div className="mt-4 border-t border-violet-200/15 pt-3">
            <p className="mb-2 text-[11px] font-semibold tracking-[0.12em] text-violet-200/70">{copy.policyLinks}</p>
            <div className="flex flex-wrap gap-2">
              {policyNavItems.map((item) => {
                const label = copy.nav[item.href] || item.href;
                return (
                  <Link
                    key={`m-policy-${item.href}`}
                    href={item.href}
                    onClick={() => setMenuOpen(false)}
                    className="rounded-full border border-violet-200/25 bg-[rgba(32,19,60,0.8)] px-2.5 py-1 text-[11px] font-semibold text-violet-100"
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
