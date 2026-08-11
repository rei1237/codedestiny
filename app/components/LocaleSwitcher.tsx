"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import * as React from "react";
import { getRouteKeyByLocalizedPath, I18N_ROUTE_MAP } from "../../lib/i18n/routes";

type LocaleCode = "ko" | "en" | "ja" | "zh-CN" | "zh-TW" | "vi" | "hi" | "es" | "fr" | "de" | "nl" | "ms";
type RouteLocaleCode = "ko" | "en" | "ja" | "zh" | "zh-TW";
type LocaleItem = { code: LocaleCode; slug: string; label: string; shortLabel: string; hrefLang: string; routeLocale?: RouteLocaleCode };

const LOCALE_SWITCHER_LABELS: LocaleItem[] = [
  { code: "ko", slug: "", label: "한국어", shortLabel: "KR", hrefLang: "ko", routeLocale: "ko" },
  { code: "en", slug: "/en", label: "English", shortLabel: "ENG", hrefLang: "en", routeLocale: "en" },
  { code: "ja", slug: "/ja", label: "日本語", shortLabel: "JPN", hrefLang: "ja", routeLocale: "ja" },
  { code: "zh-CN", slug: "/zh", label: "简体中文", shortLabel: "CHN", hrefLang: "zh-CN", routeLocale: "zh" },
  { code: "zh-TW", slug: "/zh-tw", label: "繁體中文", shortLabel: "TWN", hrefLang: "zh-TW", routeLocale: "zh-TW" },
  { code: "vi", slug: "", label: "Tiếng Việt", shortLabel: "VIE", hrefLang: "vi" },
  { code: "hi", slug: "", label: "हिन्दी", shortLabel: "HIN", hrefLang: "hi" },
  { code: "es", slug: "", label: "Español", shortLabel: "ESP", hrefLang: "es" },
  { code: "fr", slug: "", label: "Français", shortLabel: "FRA", hrefLang: "fr" },
  { code: "de", slug: "", label: "Deutsch", shortLabel: "DEU", hrefLang: "de" },
  { code: "nl", slug: "", label: "Nederlands", shortLabel: "NLD", hrefLang: "nl" },
  { code: "ms", slug: "", label: "Bahasa Melayu", shortLabel: "MYS", hrefLang: "ms" },
];

const LOCALE_SWITCHER_COPY: Record<LocaleCode, {
  changeLanguage: string;
  languageList: string;
}> = {
  ko: { changeLanguage: "언어 변경", languageList: "언어 목록" },
  en: { changeLanguage: "Change language", languageList: "Language list" },
  ja: { changeLanguage: "言語を変更", languageList: "言語一覧" },
  "zh-CN": { changeLanguage: "更改语言", languageList: "语言列表" },
  "zh-TW": { changeLanguage: "變更語言", languageList: "語言清單" },
  vi: { changeLanguage: "Đổi ngôn ngữ", languageList: "Danh sách ngôn ngữ" },
  hi: { changeLanguage: "भाषा बदलें", languageList: "भाषा सूची" },
  es: { changeLanguage: "Cambiar idioma", languageList: "Lista de idiomas" },
  fr: { changeLanguage: "Changer de langue", languageList: "Liste des langues" },
  de: { changeLanguage: "Sprache ändern", languageList: "Sprachliste" },
  nl: { changeLanguage: "Taal wijzigen", languageList: "Talenlijst" },
  ms: { changeLanguage: "Tukar bahasa", languageList: "Senarai bahasa" },
};

function normalizePathname(input: string | null | undefined) {
  if (!input) return "/";
  const withSlash = input.startsWith("/") ? input : `/${input}`;
  if (withSlash !== "/" && withSlash.endsWith("/")) return withSlash.slice(0, -1);
  return withSlash;
}

function detectLocaleFromPath(pathname: string) {
  const normalized = normalizePathname(pathname).toLowerCase();
  const match = LOCALE_SWITCHER_LABELS.find(
    (locale) => locale.slug && (normalized === locale.slug || normalized.startsWith(`${locale.slug}/`)),
  );
  return match || null;
}

function stripLocalePrefix(pathname: string) {
  const normalized = normalizePathname(pathname).toLowerCase();
  for (const locale of LOCALE_SWITCHER_LABELS) {
    if (!locale.slug) continue;
    if (normalized === locale.slug) return "/";
    if (normalized.startsWith(`${locale.slug}/`)) return normalized.slice(locale.slug.length) || "/";
  }
  return normalized || "/";
}

function setLocaleCookie(localeCode: LocaleCode) {
  const oneYear = 60 * 60 * 24 * 365;
  document.cookie = `cd_locale=${encodeURIComponent(localeCode)}; Max-Age=${oneYear}; Path=/; SameSite=Lax`;
  document.cookie = `cd_locale_ack=1; Max-Age=${oneYear}; Path=/; SameSite=Lax`;
}

function normalizeStoredLocale(value: string | null | undefined): LocaleCode {
  const normalized = String(value || "").trim().replace("_", "-").toLowerCase();
  if (normalized === "zh" || normalized === "zh-cn" || normalized === "zh-hans") return "zh-CN";
  if (normalized === "zh-tw" || normalized === "zh-hant" || normalized === "zh-hk" || normalized === "zh-mo") return "zh-TW";
  if (normalized === "vi-vn") return "vi";
  return LOCALE_SWITCHER_LABELS.find((locale) => locale.code.toLowerCase() === normalized)?.code || "ko";
}

function readSavedLocale(): LocaleItem {
  if (typeof window === "undefined") return LOCALE_SWITCHER_LABELS[0];
  try {
    const stored = window.localStorage.getItem("cd_lang");
    return LOCALE_SWITCHER_LABELS.find((locale) => locale.code === normalizeStoredLocale(stored)) || LOCALE_SWITCHER_LABELS[0];
  } catch {
    return LOCALE_SWITCHER_LABELS[0];
  }
}

function saveLocalePreference(localeCode: LocaleCode) {
  try {
    window.localStorage.setItem("cd_lang", localeCode);
    window.localStorage.setItem("cd_lang_explicit", "1");
  } catch {}
  setLocaleCookie(localeCode);
}

function getLocalizedHref(pathname: string, targetLocale: LocaleItem) {
  const normalized = normalizePathname(pathname);
  const routeKey = getRouteKeyByLocalizedPath(normalized);
  if (routeKey && targetLocale.routeLocale) {
    return I18N_ROUTE_MAP[routeKey][targetLocale.routeLocale];
  }

  const basePath = stripLocalePrefix(normalized);
  if (targetLocale.code === "ko") return basePath;

  return targetLocale.slug || `/?lang=${encodeURIComponent(targetLocale.code)}`;
}

export function LocaleSwitcher() {
  const pathname = usePathname() || "/";

  const [savedLocale, setSavedLocale] = React.useState<LocaleItem>(LOCALE_SWITCHER_LABELS[0]);
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    setSavedLocale(readSavedLocale());
  }, []);

  const current = React.useMemo(() => detectLocaleFromPath(pathname) || savedLocale, [pathname, savedLocale]);
  const currentLabel = current.shortLabel;
  const copy = LOCALE_SWITCHER_COPY[current.code] || LOCALE_SWITCHER_COPY.ko;

  const buttonStyle: React.CSSProperties = {
    height: "36px",
    padding: "0 12px",
    borderRadius: "999px",
    border: "1px solid rgba(148, 163, 184, 0.35)",
    background: "rgba(2, 6, 23, 0.55)",
    color: "#e2e8f0",
    fontWeight: 900,
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
  };

  const menuStyle: React.CSSProperties = {
    position: "absolute",
    top: "calc(100% + 8px)",
    right: 0,
    minWidth: "220px",
    background: "rgba(2, 6, 23, 0.92)",
    border: "1px solid rgba(148, 163, 184, 0.22)",
    borderRadius: "14px",
    padding: "8px",
    boxShadow: "0 20px 70px rgba(0,0,0,0.45)",
    zIndex: 100,
  };

  return (
    <div style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
      <button
        type="button"
        aria-label={copy.changeLanguage}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        style={buttonStyle}
      >
        <span aria-hidden="true">🌙</span>
        <span style={{ fontSize: "13px", letterSpacing: "0.08em" }}>{currentLabel}</span>
        <span aria-hidden="true" style={{ opacity: 0.8 }}>
          ▾
        </span>
      </button>

      {open ? (
        <div role="menu" aria-label={copy.languageList} style={menuStyle} onMouseLeave={() => setOpen(false)}>
          {LOCALE_SWITCHER_LABELS.map((locale) => (
            <Link
              key={locale.code}
              role="menuitem"
              href={getLocalizedHref(pathname, locale)}
              hrefLang={locale.hrefLang}
              lang={locale.hrefLang}
              onClick={() => {
                setOpen(false);
                setSavedLocale(locale);
                saveLocalePreference(locale.code);
              }}
              style={{
                display: "block",
                width: "100%",
                textAlign: "left",
                padding: "10px 10px",
                borderRadius: "12px",
                border: "1px solid transparent",
                background: locale.code === current.code ? "rgba(99, 102, 241, 0.18)" : "transparent",
                color: "#e2e8f0",
                fontWeight: 800,
                cursor: "pointer",
                textDecoration: "none",
              }}
            >
              {locale.label}
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}
