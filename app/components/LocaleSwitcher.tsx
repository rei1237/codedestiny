"use client";

import { usePathname, useSearchParams } from "next/navigation";
import * as React from "react";

type LocaleItem = { key: string; slug: string; label: string; googleLang: string };

const LOCALES: LocaleItem[] = [
  { key: "ko-KR", slug: "", label: "한국어", googleLang: "ko" },
  { key: "en-US", slug: "/en-us", label: "English (US)", googleLang: "en" },
  { key: "en-CA", slug: "/en-ca", label: "English (Canada)", googleLang: "en" },
  { key: "en-SG", slug: "/en-sg", label: "English (Singapore)", googleLang: "en" },
  { key: "en-GB", slug: "/en-gb", label: "English (UK)", googleLang: "en" },
  { key: "en-AU", slug: "/en-au", label: "English (Australia)", googleLang: "en" },
  { key: "en-PH", slug: "/en-ph", label: "English (Philippines)", googleLang: "en" },
  { key: "en-IN", slug: "/en-in", label: "English (India)", googleLang: "en" },
  { key: "hi-IN", slug: "/hi-in", label: "हिन्दी (भारत)", googleLang: "hi" },
  { key: "en-ZA", slug: "/en-za", label: "English (South Africa)", googleLang: "en" },
  { key: "fr-FR", slug: "/fr-fr", label: "Français (France)", googleLang: "fr" },
  { key: "fr-CA", slug: "/fr-ca", label: "Français (Canada)", googleLang: "fr" },
  { key: "de-DE", slug: "/de-de", label: "Deutsch (Deutschland)", googleLang: "de" },
  { key: "it-IT", slug: "/it-it", label: "Italiano (Italia)", googleLang: "it" },
  { key: "hu-HU", slug: "/hu-hu", label: "Magyar (Magyarország)", googleLang: "hu" },
  { key: "nl-NL", slug: "/nl-nl", label: "Nederlands (Nederland)", googleLang: "nl" },
  { key: "ja-JP", slug: "/ja-jp", label: "日本語 (日本)", googleLang: "ja" },
  { key: "zh-CN", slug: "/zh-cn", label: "简体中文 (中国)", googleLang: "zh-CN" },
  { key: "zh-TW", slug: "/zh-tw", label: "繁體中文 (台灣)", googleLang: "zh-TW" },
  { key: "es-ES", slug: "/es-es", label: "Español (España)", googleLang: "es" },
  { key: "es-MX", slug: "/es-mx", label: "Español (México)", googleLang: "es" },
  { key: "es-CO", slug: "/es-co", label: "Español (Colombia)", googleLang: "es" },
  { key: "es-AR", slug: "/es-ar", label: "Español (Argentina)", googleLang: "es" },
  { key: "es-PE", slug: "/es-pe", label: "Español (Perú)", googleLang: "es" },
  { key: "th-TH", slug: "/th-th", label: "ไทย (ประเทศไทย)", googleLang: "th" },
  { key: "vi-VN", slug: "/vi-vn", label: "Tiếng Việt (Việt Nam)", googleLang: "vi" },
];

function normalizePathname(input: string | null | undefined) {
  if (!input) return "/";
  return input.startsWith("/") ? input : `/${input}`;
}

function detectLocaleFromPath(pathname: string) {
  const normalized = normalizePathname(pathname).toLowerCase();
  const match = LOCALES.find(
    (locale) => locale.slug && (normalized === locale.slug || normalized.startsWith(`${locale.slug}/`)),
  );
  return match || LOCALES[0];
}

function stripLocalePrefix(pathname: string) {
  const normalized = normalizePathname(pathname).toLowerCase();
  for (const locale of LOCALES) {
    if (!locale.slug) continue;
    if (normalized === locale.slug) return "/";
    if (normalized.startsWith(`${locale.slug}/`)) return normalized.slice(locale.slug.length) || "/";
  }
  return normalized || "/";
}

function setLocaleCookie(localeKey: string) {
  const oneYear = 60 * 60 * 24 * 365;
  document.cookie = `cd_locale=${encodeURIComponent(localeKey)}; Max-Age=${oneYear}; Path=/; SameSite=Lax`;
}

function writeGoogleTranslateCookie(googleLang: string) {
  const host = window.location.hostname;
  const expires = "expires=Fri, 31 Dec 9999 23:59:59 GMT";
  const value = `/ko/${googleLang}`;
  const cookies = [
    `googtrans=${value}; ${expires}; Path=/; SameSite=Lax`,
    host ? `googtrans=${value}; ${expires}; Domain=${host}; Path=/; SameSite=Lax` : "",
    host && host.includes(".") ? `googtrans=${value}; ${expires}; Domain=.${host}; Path=/; SameSite=Lax` : "",
  ].filter(Boolean);

  cookies.forEach((cookie) => {
    document.cookie = cookie;
  });
}

function clearGoogleTranslateCookie() {
  const host = window.location.hostname;
  const expired = "expires=Thu, 01 Jan 1970 00:00:00 UTC";
  const cookies = [
    `googtrans=; ${expired}; Path=/; SameSite=Lax`,
    host ? `googtrans=; ${expired}; Domain=${host}; Path=/; SameSite=Lax` : "",
    host && host.includes(".") ? `googtrans=; ${expired}; Domain=.${host}; Path=/; SameSite=Lax` : "",
  ].filter(Boolean);

  cookies.forEach((cookie) => {
    document.cookie = cookie;
  });
}

function applyGoogleTranslateIntent(locale: LocaleItem) {
  try {
    window.localStorage.setItem("cd_lang", locale.googleLang);
  } catch {}

  if (locale.googleLang === "ko") {
    clearGoogleTranslateCookie();
    return;
  }

  writeGoogleTranslateCookie(locale.googleLang);
}

function buildMainServiceUrl(pathname: string, searchParams: { toString(): string } | null, locale: LocaleItem) {
  const basePath = stripLocalePrefix(pathname);
  const targetPath = basePath === "/" || basePath === "/index.html" ? "/" : basePath;
  const params = new URLSearchParams(searchParams?.toString() || "");

  if (locale.googleLang === "ko") {
    params.delete("lang");
  } else {
    params.set("lang", locale.googleLang);
  }

  const qs = params.toString();
  return qs ? `${targetPath}?${qs}` : targetPath;
}

export function LocaleSwitcher() {
  const pathname = usePathname() || "/";
  const searchParams = useSearchParams();

  const current = React.useMemo(() => detectLocaleFromPath(pathname), [pathname]);
  const [open, setOpen] = React.useState(false);

  const goLocale = React.useCallback(
    (localeKey: string) => {
      const next = LOCALES.find((l) => l.key === localeKey);
      if (!next) return;

      setLocaleCookie(next.key);
      applyGoogleTranslateIntent(next);
      window.location.assign(buildMainServiceUrl(pathname, searchParams, next));
    },
    [pathname, searchParams],
  );

  // Auto-pick locale once by IP/country if cookie not set
  React.useEffect(() => {
    if (typeof document === "undefined") return;
    if (document.cookie.includes("cd_locale=")) return;

    fetch("/api/geo", { cache: "no-store" })
      .then((r) => r.json())
      .then((p) => {
        const locale = String(p?.locale || "");
        if (!locale) return;
        const exists = LOCALES.find((l) => l.key.toLowerCase() === locale.toLowerCase());
        if (!exists) return;
        goLocale(exists.key);
      })
      .catch(() => {});
    // run once
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const currentLabel = current.label;

  const ButtonStyle: React.CSSProperties = {
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

  const MenuStyle: React.CSSProperties = {
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
        aria-label="언어 변경"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        style={ButtonStyle}
      >
        <span aria-hidden="true">🌐</span>
        <span style={{ fontSize: "13px", letterSpacing: "0.08em" }}>{currentLabel}</span>
        <span aria-hidden="true" style={{ opacity: 0.8 }}>
          ▾
        </span>
      </button>

      {open ? (
        <div role="menu" aria-label="언어 목록" style={MenuStyle} onMouseLeave={() => setOpen(false)}>
          {LOCALES.map((l) => (
            <button
              key={l.key}
              role="menuitem"
              type="button"
              onClick={() => {
                setOpen(false);
                goLocale(l.key);
              }}
              style={{
                width: "100%",
                textAlign: "left",
                padding: "10px 10px",
                borderRadius: "12px",
                border: "1px solid transparent",
                background: l.key === current.key ? "rgba(99, 102, 241, 0.18)" : "transparent",
                color: "#e2e8f0",
                fontWeight: 800,
                cursor: "pointer",
              }}
            >
              {l.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

