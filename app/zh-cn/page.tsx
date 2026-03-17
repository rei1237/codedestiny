export const metadata = {
  title: "Code Destiny｜免费塔罗与运势体验",
  description:
    "Code Destiny 提供免费的塔罗体验、运势内容与占星灵感功能。探索塔罗疗愈（Tarot Healing）、Destiny Points，并查看透明的隐私与条款页面。",
  keywords: [
    "免费塔罗",
    "塔罗牌",
    "运势",
    "占星",
    "塔罗疗愈",
    "在线塔罗",
    "Code Destiny",
  ],
  alternates: {
    canonical: "/zh-cn",
  },
  openGraph: {
    title: "Code Destiny｜免费塔罗与运势体验",
    description: "免费塔罗体验与运势内容。探索塔罗疗愈与 Destiny Points。",
    url: "https://code-destiny.com/zh-cn",
    siteName: "Code Destiny",
    type: "website",
  },
};

import { LocaleFaq } from "../components/LocaleFaq";

export default function ZhCnLanding() {
  return (
    <main style={{ maxWidth: "960px", margin: "0 auto", padding: "28px 16px 52px", color: "#e2e8f0" }}>
      <h1 style={{ fontSize: "34px", fontWeight: 800, marginBottom: "10px" }}>Code Destiny — 塔罗与运势（中国）</h1>
      <p style={{ opacity: 0.9, lineHeight: 1.75, marginBottom: "18px" }}>
        探索塔罗疗愈体验与运势内容。本页面面向中国地区（zh-CN），用于帮助搜索引擎理解语言与地区意图。
      </p>
      <p style={{ opacity: 0.86, lineHeight: 1.75, marginBottom: "18px" }}>
        如果你正在寻找<strong>免费在线塔罗</strong>、<strong>运势解读</strong>或占星灵感内容，Code Destiny 提供快速、清晰的体验入口。
        你可以先从塔罗疗愈开始，再查看 Destiny Points 或政策页面。
      </p>

      <section style={{ display: "grid", gap: "10px", marginBottom: "18px" }}>
        <a
          href="/zh-cn/tarot"
          style={{
            display: "block",
            padding: "14px 16px",
            borderRadius: "14px",
            background: "linear-gradient(90deg, rgba(30, 64, 175, 0.9), rgba(37, 99, 235, 0.92))",
            border: "1px solid rgba(96, 165, 250, 0.45)",
            color: "#eff6ff",
            textDecoration: "none",
            fontWeight: 800,
          }}
        >
          免费在线塔罗入口（推荐）
        </a>
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
          开始塔罗疗愈体验
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
        <h2 style={{ fontSize: "18px", fontWeight: 800, marginBottom: "8px" }}>政策与支持</h2>
        <p style={{ lineHeight: 1.75, opacity: 0.9, marginBottom: "10px" }}>
          我们提供透明的隐私与条款页面，以及联系渠道。
        </p>
        <nav style={{ display: "flex", gap: "12px", flexWrap: "wrap" }} aria-label="政策与联系">
          <a href="/privacy-policy" style={{ color: "#93c5fd", textDecoration: "underline" }}>
            隐私政策
          </a>
          <a href="/terms-of-service" style={{ color: "#93c5fd", textDecoration: "underline" }}>
            服务条款
          </a>
          <a href="/contact-us" style={{ color: "#93c5fd", textDecoration: "underline" }}>
            联系我们
          </a>
        </nav>
      </section>

      <LocaleFaq locale="zh-CN" canonicalUrl="https://code-destiny.com/zh-cn" />
    </main>
  );
}

