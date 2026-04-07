"use client";

import { usePathname } from "next/navigation";
import { LOCALE_META, DEFAULT_LOCALE_META } from "../../lib/i18n-locales";
import GlobalTrustSection from "../components/GlobalTrustSection";
import GlobalPricingCard from "../components/GlobalPricingCard";

const ORIGIN = "https://code-destiny.com";

/**
 * Locale roots (/en-us, /ja-jp, …) — 다국어 랜딩 페이지
 * 각 언어에 맞는 프리미엄 캐치카피 + 서비스 목록을 렌더링.
 */
export default function LocaleShellPage() {
  const pathname = usePathname() || "/";
  // "/en-us" → "en-us"
  const slug = pathname.replace(/^\//, "").split("/")[0];
  const meta = LOCALE_META[slug] || DEFAULT_LOCALE_META;

  return (
    <main
      dir={meta.dir}
      style={{
        minHeight: "100vh",
        background: "linear-gradient(160deg, #070b1f 0%, #0f172a 60%, #1e1b4b 100%)",
        padding: "0 0 80px",
      }}
    >
      {/* Hero */}
      <section
        style={{
          maxWidth: 760,
          margin: "0 auto",
          padding: "72px 20px 48px",
          textAlign: "center",
        }}
      >
        <div
          style={{
            display: "inline-block",
            padding: "4px 14px",
            borderRadius: 999,
            background: "rgba(124,58,237,0.18)",
            border: "1px solid rgba(124,58,237,0.4)",
            color: "#a78bfa",
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: "0.06em",
            marginBottom: 20,
          }}
        >
          Code Destiny · {meta.trustLine}
        </div>
        <h1
          style={{
            fontSize: "clamp(28px,6vw,52px)",
            fontWeight: 900,
            lineHeight: 1.15,
            letterSpacing: "-0.02em",
            background: "linear-gradient(135deg, #a78bfa 0%, #4ecdc4 60%, #fbbf24 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            margin: "0 0 16px",
          }}
        >
          {meta.heading}
        </h1>
        <p
          style={{
            fontSize: "clamp(14px,2vw,18px)",
            color: "#94a3b8",
            marginBottom: 32,
            lineHeight: 1.7,
          }}
        >
          {meta.subheading}
        </p>
        <a
          href={`/${slug}/saju/basic`}
          style={{
            display: "inline-block",
            padding: "14px 36px",
            borderRadius: 999,
            background: "linear-gradient(135deg, #7c3aed, #4ecdc4)",
            color: "#fff",
            fontWeight: 800,
            fontSize: 16,
            textDecoration: "none",
            letterSpacing: "0.02em",
            boxShadow: "0 4px 24px rgba(124,58,237,0.4)",
          }}
        >
          {meta.cta}
        </a>
      </section>

      {/* Service grid */}
      <section
        style={{
          maxWidth: 900,
          margin: "0 auto",
          padding: "0 20px 56px",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
            gap: "16px",
          }}
        >
          {meta.services.map((svc) => (
            <a
              key={svc.href}
              href={`${ORIGIN}${svc.href}`}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 14,
                padding: "20px 18px",
                borderRadius: 16,
                background: "rgba(30,41,59,0.7)",
                border: "1px solid rgba(124,58,237,0.22)",
                textDecoration: "none",
                transition: "border-color 0.15s, box-shadow 0.15s",
              }}
            >
              <span style={{ fontSize: 28, lineHeight: 1 }}>{svc.emoji}</span>
              <div>
                <div
                  style={{
                    fontWeight: 700,
                    fontSize: 15,
                    color: "#e2e8f0",
                    marginBottom: 4,
                  }}
                >
                  {svc.name}
                </div>
                <div style={{ fontSize: 13, color: "#64748b", lineHeight: 1.5 }}>
                  {svc.desc}
                </div>
              </div>
            </a>
          ))}
        </div>
      </section>

      {/* Premium teaser */}
      <section
        style={{
          maxWidth: 700,
          margin: "0 auto",
          padding: "0 20px 40px",
          textAlign: "center",
        }}
      >
        <div
          style={{
            padding: "24px 28px",
            borderRadius: 20,
            background: "linear-gradient(135deg, rgba(124,58,237,0.18), rgba(78,205,196,0.1))",
            border: "1px solid rgba(124,58,237,0.35)",
          }}
        >
          <p
            style={{
              fontSize: 15,
              color: "#c4b5fd",
              marginBottom: 16,
              lineHeight: 1.7,
            }}
          >
            {meta.premiumTeaser}
          </p>
          <a
            href={`${ORIGIN}/premium-unlock`}
            style={{
              display: "inline-block",
              padding: "10px 28px",
              borderRadius: 999,
              background: "linear-gradient(135deg, #7c3aed, #4ecdc4)",
              color: "#fff",
              fontWeight: 700,
              fontSize: 14,
              textDecoration: "none",
            }}
          >
            {meta.premiumCta}
          </a>
        </div>
      </section>

      {/* 글로벌 통화 가격표 */}
      <section style={{ padding: "0 0 48px" }}>
        <GlobalPricingCard locale={slug} />
      </section>

      {/* 신뢰 배지 섹션 */}
      <GlobalTrustSection compact={false} showFooter={false} locale={slug} />

      {/* 글로벌 영문 푸터 */}
      <GlobalTrustSection compact showFooter={true} locale={slug} />

      {/* Language switcher */}
      <nav
        aria-label="Language"
        style={{
          maxWidth: 700,
          margin: "40px auto 0",
          padding: "0 20px",
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          gap: "8px 12px",
        }}
      >
        {[
          { slug: "", label: "한국어" },
          { slug: "en-us", label: "English" },
          { slug: "ja-jp", label: "日本語" },
          { slug: "zh-cn", label: "中文" },
          { slug: "hi-in", label: "हिन्दी" },
          { slug: "es-es", label: "Español" },
          { slug: "fr-fr", label: "Français" },
          { slug: "de-de", label: "Deutsch" },
          { slug: "nl-nl", label: "Nederlands" },
          { slug: "ms-my", label: "Melayu" },
        ].map((loc) => (
          <a
            key={loc.slug}
            href={loc.slug ? `/${loc.slug}` : "/"}
            aria-current={loc.slug === slug ? "page" : undefined}
            style={{
              padding: "5px 14px",
              borderRadius: 999,
              fontSize: 12,
              fontWeight: loc.slug === slug ? 700 : 400,
              color: loc.slug === slug ? "#a78bfa" : "#475569",
              border: `1px solid ${loc.slug === slug ? "rgba(124,58,237,0.5)" : "rgba(71,85,105,0.4)"}`,
              textDecoration: "none",
              background:
                loc.slug === slug ? "rgba(124,58,237,0.15)" : "transparent",
              transition: "color 0.15s, border-color 0.15s",
            }}
          >
            {loc.label}
          </a>
        ))}
      </nav>
    </main>
  );
}
