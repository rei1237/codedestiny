"use client";

/**
 * GlobalPricingCard — 글로벌 결제 전환율 최적화 컴포넌트
 *
 * 기능:
 * - IP 기반 국가 감지 → 현지 통화로 가격 자동 표시
 * - 환율은 /public/i18n/en.json 내장값 or 실시간 API 폴백
 * - KRW 기준 가격을 현지 통화로 환산하여 표시
 * - Tailwind CSS 클래스 없이 순수 인라인 스타일 (호환성)
 */

import { useEffect, useState } from "react";

// 내장 환율 (폴백용 — en.json과 동기화)
const FALLBACK_RATES = {
  KRW: { symbol: "₩", rate: 1, format: (n) => `₩${Math.round(n).toLocaleString()}` },
  USD: { symbol: "$", rate: 0.00074, format: (n) => `$${n.toFixed(2)}` },
  EUR: { symbol: "€", rate: 0.00068, format: (n) => `€${n.toFixed(2)}` },
  JPY: { symbol: "¥", rate: 0.11, format: (n) => `¥${Math.round(n).toLocaleString()}` },
  CNY: { symbol: "¥", rate: 0.0053, format: (n) => `¥${n.toFixed(2)}` },
  GBP: { symbol: "£", rate: 0.00058, format: (n) => `£${n.toFixed(2)}` },
  AUD: { symbol: "A$", rate: 0.0012, format: (n) => `A$${n.toFixed(2)}` },
  CAD: { symbol: "C$", rate: 0.0010, format: (n) => `C$${n.toFixed(2)}` },
  INR: { symbol: "₹", rate: 0.062, format: (n) => `₹${Math.round(n).toLocaleString()}` },
  SGD: { symbol: "S$", rate: 0.00099, format: (n) => `S$${n.toFixed(2)}` },
  MYR: { symbol: "RM", rate: 0.0035, format: (n) => `RM${n.toFixed(2)}` },
  THB: { symbol: "฿", rate: 0.026, format: (n) => `฿${Math.round(n)}` },
  BRL: { symbol: "R$", rate: 0.0038, format: (n) => `R$${n.toFixed(2)}` },
  MXN: { symbol: "$", rate: 0.013, format: (n) => `MX$${n.toFixed(2)}` },
};

// 국가코드 → 통화 매핑 (상위 30개국)
const COUNTRY_TO_CURRENCY = {
  US: "USD", GB: "GBP", AU: "AUD", CA: "CAD", NZ: "USD",
  DE: "EUR", FR: "EUR", IT: "EUR", ES: "EUR", NL: "EUR",
  BE: "EUR", AT: "EUR", PT: "EUR", FI: "EUR", GR: "EUR",
  JP: "JPY", CN: "CNY", HK: "CNY", TW: "CNY",
  IN: "INR", SG: "SGD", MY: "MYR", TH: "THB",
  BR: "BRL", MX: "MXN",
  KR: "KRW",
};

const TIERS = [
  {
    id: "starter",
    name: "Starter",
    krwPrice: 9900,
    coins: 10,
    description: "10 premium readings",
    popular: false,
  },
  {
    id: "standard",
    name: "Standard",
    krwPrice: 29000,
    coins: 35,
    description: "35 readings + Destiny Report",
    popular: true,
  },
  {
    id: "premium",
    name: "Premium",
    krwPrice: 59000,
    coins: 80,
    description: "80 readings + lifetime perks",
    popular: false,
  },
];

function convertPrice(krwPrice, currencyKey, rates) {
  const currency = rates[currencyKey] || rates["USD"];
  const converted = krwPrice * currency.rate;
  return currency.format(converted);
}

async function detectCurrencyFromIP() {
  try {
    // Cloudflare Workers는 cf-ipcountry 헤더를 자동 주입함
    // CSR에서는 ipapi.co free tier 사용 (월 1000회 무료)
    const res = await fetch("https://ipapi.co/json/", { cache: "force-cache" });
    if (!res.ok) return "USD";
    const data = await res.json();
    const country = (data.country_code || "").toUpperCase();
    return COUNTRY_TO_CURRENCY[country] || "USD";
  } catch (e) {
    return "USD";
  }
}

/**
 * @param {Object} props
 * @param {string} [props.locale] - 현재 로케일 키 ("en-us", "ja-jp", etc.)
 * @param {string} [props.forceCurrency] - 통화 강제 지정 (테스트용)
 * @param {Function} [props.onSelectTier] - 티어 선택 콜백 (id, krwPrice)
 */
export default function GlobalPricingCard({ locale, forceCurrency, onSelectTier }) {
  const [currency, setCurrency] = useState(forceCurrency || "USD");
  const [rates, setRates] = useState(FALLBACK_RATES);
  const [loading, setLoading] = useState(!forceCurrency);

  useEffect(() => {
    if (forceCurrency) {
      setCurrency(forceCurrency);
      setLoading(false);
      return;
    }
    // 로케일에서 먼저 추론
    const localeToDefault = {
      "ja-jp": "JPY", "zh-cn": "CNY", "hi-in": "INR",
      "es-es": "EUR", "fr-fr": "EUR", "de-de": "EUR",
      "nl-nl": "EUR", "ms-my": "MYR", "en-us": "USD",
    };
    const localGuess = locale ? localeToDefault[locale] : null;

    (async () => {
      try {
        // 실시간 환율 (open.er-api.com 무료 tier)
        const erRes = await fetch("https://open.er-api.com/v6/latest/KRW", { cache: "force-cache" });
        if (erRes.ok) {
          const erData = await erRes.json();
          if (erData.rates) {
            const updatedRates = { ...FALLBACK_RATES };
            for (const [key, entry] of Object.entries(updatedRates)) {
              if (key !== "KRW" && erData.rates[key]) {
                updatedRates[key] = { ...entry, rate: erData.rates[key] };
              }
            }
            setRates(updatedRates);
          }
        }
      } catch (e) {
        // 폴백 유지
      }

      const detected = await detectCurrencyFromIP();
      setCurrency(localGuess || detected);
      setLoading(false);
    })();
  }, [locale, forceCurrency]);

  const CARD_BASE = {
    borderRadius: 20,
    padding: "24px 20px",
    position: "relative",
    display: "flex",
    flexDirection: "column",
    gap: 12,
    transition: "transform 0.15s, box-shadow 0.15s",
    cursor: "pointer",
  };

  return (
    <section
      style={{
        maxWidth: 900,
        margin: "0 auto",
        padding: "0 16px",
      }}
    >
      {/* 헤더 */}
      <div style={{ textAlign: "center", marginBottom: 28 }}>
        <h2
          style={{
            fontSize: "clamp(20px,3vw,28px)",
            fontWeight: 900,
            background: "linear-gradient(135deg, #a78bfa, #4ecdc4)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            margin: "0 0 8px",
          }}
        >
          Unlock Premium Destiny Analysis
        </h2>
        <p style={{ color: "#64748b", fontSize: 14, margin: 0 }}>
          Prices shown in your local currency
          {loading ? " (detecting…)" : ` (${currency})`}
        </p>
      </div>

      {/* 티어 카드 그리드 */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 16,
        }}
      >
        {TIERS.map((tier) => (
          <button
            key={tier.id}
            onClick={() => onSelectTier?.(tier.id, tier.krwPrice)}
            style={{
              ...CARD_BASE,
              background: tier.popular
                ? "linear-gradient(135deg, rgba(124,58,237,0.25), rgba(78,205,196,0.15))"
                : "rgba(30,41,59,0.8)",
              border: tier.popular
                ? "2px solid rgba(124,58,237,0.6)"
                : "1px solid rgba(51,65,85,0.7)",
              textAlign: "left",
              boxShadow: tier.popular
                ? "0 8px 32px rgba(124,58,237,0.2)"
                : "none",
            }}
          >
            {tier.popular && (
              <span
                style={{
                  position: "absolute",
                  top: -12,
                  left: "50%",
                  transform: "translateX(-50%)",
                  padding: "3px 14px",
                  borderRadius: 999,
                  background: "linear-gradient(135deg, #7c3aed, #4ecdc4)",
                  color: "#fff",
                  fontSize: 11,
                  fontWeight: 700,
                  whiteSpace: "nowrap",
                  letterSpacing: "0.05em",
                }}
              >
                MOST POPULAR
              </span>
            )}

            {/* 티어명 */}
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.1em",
                color: tier.popular ? "#a78bfa" : "#64748b",
                textTransform: "uppercase",
              }}
            >
              {tier.name}
            </div>

            {/* 가격 */}
            <div
              style={{
                fontSize: "clamp(26px,4vw,34px)",
                fontWeight: 900,
                color: tier.popular ? "#e2e8f0" : "#94a3b8",
                lineHeight: 1,
              }}
            >
              {loading ? "…" : convertPrice(tier.krwPrice, currency, rates)}
            </div>

                  {/* 원화 가치 */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <span style={{ fontSize: 18 }}>🪙</span>
              <span
                style={{
                  fontSize: 15,
                  fontWeight: 700,
                  color: "#fbbf24",
                }}
              >
                {tier.coins} Coins
              </span>
            </div>

            <div style={{ fontSize: 13, color: "#64748b", lineHeight: 1.5 }}>
              {tier.description}
            </div>

            <div
              style={{
                marginTop: 4,
                padding: "10px 0",
                borderRadius: 10,
                background: tier.popular
                  ? "linear-gradient(135deg, #7c3aed, #4ecdc4)"
                  : "rgba(51,65,85,0.8)",
                color: tier.popular ? "#fff" : "#94a3b8",
                fontWeight: 700,
                fontSize: 14,
                textAlign: "center",
              }}
            >
              {tier.popular ? "Get Started →" : "Select Plan"}
            </div>
          </button>
        ))}
      </div>

      {/* 신뢰 바 */}
      <div
        style={{
          marginTop: 20,
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          gap: "6px 20px",
          opacity: 0.7,
        }}
      >
        {["🔒 SSL Secure", "💳 Stripe Verified", "🔄 30-day Guarantee", "🌍 80+ Countries"].map((item) => (
          <span key={item} style={{ fontSize: 12, color: "#475569" }}>
            {item}
          </span>
        ))}
      </div>
    </section>
  );
}
