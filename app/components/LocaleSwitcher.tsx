"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import * as React from "react";

type LocaleItem = { key: string; slug: string; label: string };

const LOCALES: LocaleItem[] = [
  { key: "ko-KR", slug: "", label: "한국어" },
  { key: "en-US", slug: "/en-us", label: "English (US)" },
  { key: "en-CA", slug: "/en-ca", label: "English (Canada)" },
  { key: "en-SG", slug: "/en-sg", label: "English (Singapore)" },
  { key: "en-GB", slug: "/en-gb", label: "English (UK)" },
  { key: "en-AU", slug: "/en-au", label: "English (Australia)" },
  { key: "en-PH", slug: "/en-ph", label: "English (Philippines)" },
  { key: "en-IN", slug: "/en-in", label: "English (India)" },
  { key: "hi-IN", slug: "/hi-in", label: "हिन्दी (भारत)" },
  { key: "en-ZA", slug: "/en-za", label: "English (South Africa)" },
  { key: "fr-FR", slug: "/fr-fr", label: "Français (France)" },
  { key: "fr-CA", slug: "/fr-ca", label: "Français (Canada)" },
  { key: "de-DE", slug: "/de-de", label: "Deutsch (Deutschland)" },
  { key: "it-IT", slug: "/it-it", label: "Italiano (Italia)" },
  { key: "hu-HU", slug: "/hu-hu", label: "Magyar (Magyarország)" },
  { key: "nl-NL", slug: "/nl-nl", label: "Nederlands (Nederland)" },
  { key: "ja-JP", slug: "/ja-jp", label: "日本語 (日本)" },
  { key: "zh-CN", slug: "/zh-cn", label: "简体中文 (中国)" },
  { key: "zh-TW", slug: "/zh-tw", label: "繁體中文 (台灣)" },
  { key: "es-ES", slug: "/es-es", label: "Español (España)" },
  { key: "es-MX", slug: "/es-mx", label: "Español (México)" },
  { key: "es-CO", slug: "/es-co", label: "Español (Colombia)" },
  { key: "es-AR", slug: "/es-ar", label: "Español (Argentina)" },
  { key: "es-PE", slug: "/es-pe", label: "Español (Perú)" },
  { key: "th-TH", slug: "/th-th", label: "ไทย (ประเทศไทย)" },
  { key: "vi-VN", slug: "/vi-vn", label: "Tiếng Việt (Việt Nam)" },
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

export function LocaleSwitcher() {
  const router = useRouter();
  const pathname = usePathname() || "/";
  const searchParams = useSearchParams();

  const current = React.useMemo(() => detectLocaleFromPath(pathname), [pathname]);
  const [open, setOpen] = React.useState(false);

  const goLocale = React.useCallback(
    (localeKey: string) => {
      const next = LOCALES.find((l) => l.key === localeKey);
      if (!next) return;

      setLocaleCookie(next.key);
      const basePath = stripLocalePrefix(pathname);
      const nextPath = next.slug ? `${next.slug}${basePath === "/" ? "" : basePath}` : basePath;
      const qs = searchParams?.toString();
      router.push(qs ? `${nextPath}?${qs}` : nextPath);
    },
    [pathname, router, searchParams],
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

