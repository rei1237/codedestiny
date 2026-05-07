"use client";

/**
 * GlobalTrustSection — 글로벌 신뢰 배지 + 영문 푸터 섹션
 *
 * 글로벌 사용자 결제 전환율(Conversion) 향상을 위한:
 * 1. 신뢰 배지 그리드 (사용자수, SSL, 평점, Stripe 등)
 * 2. 영문 글로벌 푸터 (Refund Policy, Terms, Privacy)
 *
 * 사용 위치: PremiumBlurGate, locale 랜딩 페이지, premium-unlock 페이지
 */

const TRUST_BADGES = [
  {
    icon: "👥",
    label: "Trusted by",
    value: "100,000+ Users",
    sub: "Across 80+ countries worldwide",
  },
  {
    icon: "🔒",
    label: "SSL Secure",
    value: "256-bit Encryption",
    sub: "Your data is always protected",
  },
  {
    icon: "⭐",
    label: "User Rating",
    value: "4.9 / 5",
    sub: "Based on verified reviews",
  },
  {
    icon: "💳",
    label: "Stripe Verified",
    value: "Safe Payments",
    sub: "All major cards & Apple Pay",
  },
  {
    icon: "🌐",
    label: "Languages",
    value: "10 Languages",
    sub: "Fully localized experience",
  },
  {
    icon: "🔄",
    label: "Guarantee",
    value: "30-Day Refund",
    sub: "No questions asked",
  },
];

const GLOBAL_FOOTER_LINKS = [
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/terms", label: "Terms of Service" },
  { href: "/terms#refund-policy", label: "Refund Policy" },
  { href: "/about", label: "About Us" },
  { href: "/disclaimer", label: "Disclaimer" },
  { href: "/advertising-policy", label: "Advertising Policy" },
  { href: "/faq", label: "FAQ" },
  { href: "/contact", label: "Contact" },
];

const ORIGIN = "https://code-destiny.com";

/**
 * @param {Object} props
 * @param {boolean} [props.compact] - 콤팩트 모드 (배지만, 푸터 생략)
 * @param {boolean} [props.showFooter] - 글로벌 영문 푸터 포함 여부
 * @param {string} [props.locale] - 현재 로케일 (en-us, ja-jp 등)
 */
export default function GlobalTrustSection({ compact = false, showFooter = true, locale }) {
  const isGlobal = locale && locale !== "ko";

  return (
    <div>
      {/* ── 신뢰 배지 섹션 ── */}
      <section
        aria-label="Trust and security badges"
        style={{
          maxWidth: 900,
          margin: "0 auto",
          padding: compact ? "24px 16px" : "40px 20px",
        }}
      >
        {!compact && (
          <h3
            style={{
              textAlign: "center",
              fontSize: "clamp(14px,2vw,18px)",
              fontWeight: 800,
              color: "#94a3b8",
              marginBottom: 28,
              letterSpacing: "-0.01em",
            }}
          >
            Why 100,000+ People Trust Code Destiny
          </h3>
        )}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
            gap: compact ? "10px" : "14px",
          }}
        >
          {TRUST_BADGES.map((badge) => (
            <div
              key={badge.label}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 12,
                padding: compact ? "12px 14px" : "16px 18px",
                borderRadius: 14,
                background: "rgba(30,41,59,0.6)",
                border: "1px solid rgba(51,65,85,0.7)",
              }}
            >
              <span style={{ fontSize: compact ? 20 : 24, lineHeight: 1, flexShrink: 0 }}>
                {badge.icon}
              </span>
              <div>
                <div
                  style={{
                    fontSize: compact ? 11 : 12,
                    color: "#475569",
                    textTransform: "uppercase",
                    letterSpacing: "0.07em",
                    fontWeight: 700,
                    marginBottom: 2,
                  }}
                >
                  {badge.label}
                </div>
                <div
                  style={{
                    fontSize: compact ? 14 : 16,
                    fontWeight: 800,
                    color: "#e2e8f0",
                    marginBottom: 2,
                  }}
                >
                  {badge.value}
                </div>
                {!compact && (
                  <div style={{ fontSize: 12, color: "#64748b", lineHeight: 1.4 }}>
                    {badge.sub}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── 글로벌 영문 푸터 ── */}
      {showFooter && (
        <footer
          aria-label="Global footer"
          style={{
            background: "rgba(7,11,31,0.96)",
            borderTop: "1px solid rgba(51,65,85,0.5)",
            padding: "32px 20px 24px",
            marginTop: 20,
          }}
        >
          <div
            style={{
              maxWidth: 900,
              margin: "0 auto",
            }}
          >
            {/* 브랜드 + 설명 */}
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "24px 40px",
                marginBottom: 24,
              }}
            >
              <div style={{ flex: "1 1 280px" }}>
                <div
                  style={{
                    fontSize: 18,
                    fontWeight: 900,
                    background: "linear-gradient(135deg, #a78bfa, #4ecdc4)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                    marginBottom: 8,
                  }}
                >
                  🐷 Code Destiny
                </div>
                <p
                  style={{
                    fontSize: 12,
                    color: "#64748b",
                    lineHeight: 1.7,
                    margin: "0 0 10px",
                    maxWidth: 320,
                  }}
                >
                  An AI-powered destiny & fortune analysis platform combining 3,000+ years of
                  Eastern cosmological wisdom with modern artificial intelligence. Free to use.
                  Available in 10 languages.
                </p>
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "4px 10px",
                  }}
                >
                  {["🔒 SSL", "💳 Stripe", "⭐ 4.9/5", "🌍 80+ countries"].map((b) => (
                    <span
                      key={b}
                      style={{
                        fontSize: 11,
                        color: "#475569",
                        background: "rgba(30,41,59,0.8)",
                        border: "1px solid rgba(51,65,85,0.7)",
                        borderRadius: 6,
                        padding: "2px 8px",
                      }}
                    >
                      {b}
                    </span>
                  ))}
                </div>
              </div>

              {/* 링크 */}
              <div style={{ flex: "1 1 200px" }}>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    color: "#a78bfa",
                    marginBottom: 10,
                  }}
                >
                  Quick Links
                </div>
                <ul
                  style={{
                    listStyle: "none",
                    margin: 0,
                    padding: 0,
                    display: "grid",
                    gap: 7,
                  }}
                >
                  {GLOBAL_FOOTER_LINKS.map((link) => (
                    <li key={link.href + link.label}>
                      <a
                        href={`${ORIGIN}${link.href}`}
                        style={{
                          color: "#475569",
                          fontSize: 13,
                          textDecoration: "none",
                        }}
                      >
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>

              {/* 환불 정책 요약 */}
              <div style={{ flex: "1 1 260px" }}>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    color: "#4ecdc4",
                    marginBottom: 10,
                  }}
                >
                  Refund Policy
                </div>
                <p
                  style={{
                    fontSize: 12,
                    color: "#475569",
                    lineHeight: 1.72,
                    margin: 0,
                  }}
                >
                  Premium Coins (digital credits) are refundable within{" "}
                  <strong style={{ color: "#64748b" }}>14 days of purchase</strong> if unused,
                  per consumer protection law. Used credits are non-refundable.{" "}
                  <a
                    href={`${ORIGIN}/contact`}
                    style={{ color: "#a78bfa", textDecoration: "none" }}
                  >
                    Contact support →
                  </a>
                </p>
              </div>
            </div>

            {/* 하단 정책 링크 + 카피라이트 */}
            <div
              style={{
                borderTop: "1px solid rgba(51,65,85,0.4)",
                paddingTop: 16,
                display: "flex",
                flexWrap: "wrap",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "8px 20px",
              }}
            >
              <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 16px" }}>
                {[
                  { href: "/privacy", label: "Privacy Policy" },
                  { href: "/terms", label: "Terms of Service" },
                  { href: "/disclaimer", label: "Disclaimer" },
                  { href: "/advertising-policy", label: "Advertising Policy" },
                  { href: "/contact", label: "Refund & Support" },
                ].map((l) => (
                  <a
                    key={l.href}
                    href={`${ORIGIN}${l.href}`}
                    style={{
                      fontSize: 11,
                      color: "#334155",
                      textDecoration: "none",
                    }}
                  >
                    {l.label}
                  </a>
                ))}
              </div>
              <p
                style={{
                  fontSize: 11,
                  color: "#334155",
                  margin: 0,
                  textAlign: "right",
                }}
              >
                © 2025 Code Destiny. For entertainment & self-reflection only.
                Not a substitute for professional advice.
              </p>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}
