export const metadata = {
  title: "Code Destiny｜免費塔羅與運勢體驗（台灣）",
  description:
    "Code Destiny 提供免費的塔羅體驗、運勢內容與占星靈感功能。本頁面面向台灣（zh-TW），用於強化語言與地區 SEO 訊號。",
  keywords: ["免費塔羅", "塔羅牌", "運勢", "占星", "塔羅療癒", "線上塔羅", "Code Destiny"],
  alternates: {
    canonical: "/zh-tw",
  },
  openGraph: {
    title: "Code Destiny｜免費塔羅與運勢體驗（台灣）",
    description: "台灣（zh-TW）向的免費塔羅體驗與運勢內容。",
    url: "https://code-destiny.com/zh-tw",
    siteName: "Code Destiny",
    type: "website",
  },
};

import { LocaleFaq } from "../components/LocaleFaq";

export default function ZhTwLanding() {
  return (
    <main style={{ maxWidth: "960px", margin: "0 auto", padding: "28px 16px 52px", color: "#e2e8f0" }}>
      <h1 style={{ fontSize: "34px", fontWeight: 800, marginBottom: "10px" }}>
        Code Destiny — 塔羅與運勢（台灣）
      </h1>
      <p style={{ opacity: 0.9, lineHeight: 1.75, marginBottom: "18px" }}>
        探索塔羅療癒體驗與運勢內容。本頁面面向台灣（zh-TW），協助搜尋引擎理解語言與地區意圖。
      </p>
      <p style={{ opacity: 0.86, lineHeight: 1.75, marginBottom: "18px" }}>
        先從塔羅療癒體驗開始，再探索 Destiny Points。此頁面提供清楚的入口與本地化語言訊號，提升自然搜尋表現。
      </p>

      <section style={{ display: "grid", gap: "10px", marginBottom: "18px" }}>
        <a
          href="/tarot/healing"
          style={{
            display: "block",
            padding: "14px 16px",
            borderRadius: "14px",
            background: "rgba(15, 23, 42, 0.8)",
            border: "1px solid rgba(148, 163, 184, 0.25)",
            color: "#e2e8f0",
            textDecoration: "none",
            fontWeight: 700,
          }}
        >
          開始塔羅療癒體驗
        </a>
        <a
          href="/points"
          style={{
            display: "block",
            padding: "14px 16px",
            borderRadius: "14px",
            background: "rgba(15, 23, 42, 0.8)",
            border: "1px solid rgba(148, 163, 184, 0.25)",
            color: "#e2e8f0",
            textDecoration: "none",
            fontWeight: 700,
          }}
        >
          Destiny Points
        </a>
      </section>

      <section
        style={{
          background: "rgba(2, 6, 23, 0.55)",
          border: "1px solid rgba(148, 163, 184, 0.18)",
          borderRadius: "14px",
          padding: "16px",
        }}
      >
        <h2 style={{ fontSize: "18px", fontWeight: 800, marginBottom: "8px" }}>政策與支援</h2>
        <nav style={{ display: "flex", gap: "12px", flexWrap: "wrap" }} aria-label="政策與聯絡">
          <a href="/privacy-policy" style={{ color: "#93c5fd", textDecoration: "underline" }}>
            隱私權政策
          </a>
          <a href="/terms-of-service" style={{ color: "#93c5fd", textDecoration: "underline" }}>
            服務條款
          </a>
          <a href="/contact-us" style={{ color: "#93c5fd", textDecoration: "underline" }}>
            聯絡我們
          </a>
        </nav>
      </section>

      <LocaleFaq locale="zh-TW" canonicalUrl="https://code-destiny.com/zh-tw" />
    </main>
  );
}

