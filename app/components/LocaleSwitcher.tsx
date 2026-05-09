"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import * as React from "react";
import { getRouteKeyByLocalizedPath, I18N_ROUTE_MAP } from "../../lib/i18n/routes";

type LocaleCode = "ko" | "en" | "ja" | "zh";
type LocaleItem = { code: LocaleCode; slug: string; label: string; hrefLang: string };

const LOCALES: LocaleItem[] = [
  { code: "ko", slug: "", label: "한국어", hrefLang: "ko" },
  { code: "en", slug: "/en", label: "English", hrefLang: "en" },
  { code: "ja", slug: "/ja", label: "日本語", hrefLang: "ja" },
  { code: "zh", slug: "/zh", label: "中文", hrefLang: "zh" },
];

function normalizePathname(input: string | null | undefined) {
  if (!input) return "/";
  const withSlash = input.startsWith("/") ? input : `/${input}`;
  if (withSlash !== "/" && withSlash.endsWith("/")) return withSlash.slice(0, -1);
  return withSlash;
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

function setLocaleCookie(localeCode: LocaleCode) {
  const oneYear = 60 * 60 * 24 * 365;
  document.cookie = `cd_locale=${encodeURIComponent(localeCode)}; Max-Age=${oneYear}; Path=/; SameSite=Lax`;
  document.cookie = `cd_locale_ack=1; Max-Age=${oneYear}; Path=/; SameSite=Lax`;
}

function getLocalizedHref(pathname: string, targetLocale: LocaleCode) {
  const normalized = normalizePathname(pathname);
  const routeKey = getRouteKeyByLocalizedPath(normalized);
  if (routeKey) {
    return I18N_ROUTE_MAP[routeKey][targetLocale];
  }

  const basePath = stripLocalePrefix(normalized);
  if (targetLocale === "ko") return basePath;
  const prefix = LOCALES.find((locale) => locale.code === targetLocale)?.slug || "";
  if (!prefix) return basePath;
  if (basePath === "/") return prefix;
  return `${prefix}${basePath}`;
}

export function LocaleSwitcher() {
  const pathname = usePathname() || "/";

  const current = React.useMemo(() => detectLocaleFromPath(pathname), [pathname]);
  const [open, setOpen] = React.useState(false);

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
            <Link
              key={l.code}
              role="menuitem"
              href={getLocalizedHref(pathname, l.code)}
              hrefLang={l.hrefLang}
              lang={l.hrefLang}
              onClick={() => {
                setOpen(false);
                setLocaleCookie(l.code);
              }}
              style={{
                display: "block",
                width: "100%",
                textAlign: "left",
                padding: "10px 10px",
                borderRadius: "12px",
                border: "1px solid transparent",
                background: l.code === current.code ? "rgba(99, 102, 241, 0.18)" : "transparent",
                color: "#e2e8f0",
                fontWeight: 800,
                cursor: "pointer",
                textDecoration: "none",
              }}
            >
              {l.label}
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}

