export const metadata = {
  title: "免费紫微斗数·八字·塔罗占卜 | CODE DESTINY",
  description:
    "一站式体验紫微斗数、八字、塔罗与合盘分析。支持多语言，立即获取你的命运地图与今日运势。",
  keywords: [
    "紫微斗数 免费",
    "紫微命盘",
    "八字算命",
    "生辰八字",
    "免费塔罗牌",
    "爱情塔罗",
    "今日运势",
    "合盘分析",
    "东方占星",
    "命运地图",
    "免费算命网站",
    "四柱命理",
    "命理分析",
    "财运测试",
    "韩国算命",
  ],
  alternates: {
    canonical: "/zh-cn",
  },
  openGraph: {
    title: "免费紫微斗数与八字塔罗｜CODE DESTINY",
    description: "融合东方命理与现代占卜，快速生成你的个人命盘与关系解析。",
    url: "https://code-destiny.com/zh-cn",
    siteName: "CODE DESTINY",
    locale: "zh_CN",
    type: "website",
    images: [
      {
        url: "https://code-destiny.com/icons/honeypig-512.png",
        width: 512,
        height: 512,
        alt: "紫微斗数与八字综合命盘页面",
      },
    ],
  },
};

import Link from "next/link";
import { LocaleFaq } from "../components/LocaleFaq";
import { LocaleSeoLinks } from "../components/LocaleSeoLinks";
import { SeoStructuredData } from "../components/SeoStructuredData";

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
      <LocaleSeoLinks />

      <section style={{ display: "grid", gap: "10px", marginBottom: "18px" }}>
        <Link
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
        </Link>
        <Link
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
        </Link>
        <Link
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
        </Link>
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
          <Link href="/privacy-policy" style={{ color: "#93c5fd", textDecoration: "underline" }}>
            隐私政策
          </Link>
          <Link href="/terms-of-service" style={{ color: "#93c5fd", textDecoration: "underline" }}>
            服务条款
          </Link>
          <Link href="/contact-us" style={{ color: "#93c5fd", textDecoration: "underline" }}>
            联系我们
          </Link>
        </nav>
      </section>

      <LocaleFaq locale="zh-CN" canonicalUrl="https://code-destiny.com/zh-cn" />
      <SeoStructuredData
        locale="zh-CN"
        pagePath="/zh-cn"
        pageName="免费紫微斗数·八字·塔罗占卜"
        description="提供紫微斗数、八字、塔罗和合盘分析的中文页面。"
      />
    </main>
  );
}

