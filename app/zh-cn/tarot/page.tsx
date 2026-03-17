export const metadata = {
  title: "免费在线塔罗｜塔罗疗愈与运势解读 - Code Destiny",
  description:
    "在 Code Destiny 体验免费在线塔罗：塔罗疗愈、运势提示与行动建议。适合快速抽牌与自我整理。",
  keywords: ["免费在线塔罗", "塔罗牌", "塔罗抽牌", "塔罗疗愈", "运势解读", "在线抽牌", "Code Destiny"],
  alternates: {
    canonical: "/zh-cn/tarot",
  },
  openGraph: {
    title: "免费在线塔罗｜塔罗疗愈与运势解读 - Code Destiny",
    description: "免费在线塔罗体验：塔罗疗愈、运势提示与行动建议。",
    url: "https://code-destiny.com/zh-cn/tarot",
    siteName: "Code Destiny",
    type: "website",
  },
};

import { LocaleFaq } from "../../components/LocaleFaq";

export default function ZhCnTarotLanding() {
  const faqIntro = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "免费在线塔罗",
    url: "https://code-destiny.com/zh-cn/tarot",
    inLanguage: "zh-CN",
    isPartOf: { "@type": "WebSite", name: "Code Destiny", url: "https://code-destiny.com" },
  });

  return (
    <main style={{ maxWidth: "960px", margin: "0 auto", padding: "28px 16px 52px", color: "#e2e8f0" }}>
      <h1 style={{ fontSize: "34px", fontWeight: 900, marginBottom: "10px" }}>免费在线塔罗</h1>
      <p style={{ opacity: 0.9, lineHeight: 1.75, marginBottom: "14px" }}>
        Code Destiny 提供简单、清晰的<strong>在线塔罗抽牌</strong>入口。你可以从塔罗疗愈开始，用四张牌整理当下情绪、压力与行动方向。
      </p>
      <p style={{ opacity: 0.86, lineHeight: 1.75, marginBottom: "18px" }}>
        建议：先完成一次塔罗疗愈体验，再结合你的现实目标，写下 1 个可执行的下一步行动。
      </p>

      <section style={{ display: "grid", gap: "10px", marginBottom: "18px" }}>
        <a
          href="/tarot/healing"
          style={{
            display: "block",
            padding: "14px 16px",
            borderRadius: "14px",
            background: "linear-gradient(90deg, rgba(30, 64, 175, 0.9), rgba(37, 99, 235, 0.92))",
            border: "1px solid rgba(96, 165, 250, 0.45)",
            color: "#eff6ff",
            textDecoration: "none",
            fontWeight: 900,
          }}
        >
          开始塔罗疗愈抽牌（4 张牌）
        </a>
        <a
          href="/zh-cn"
          style={{
            display: "block",
            padding: "14px 16px",
            borderRadius: "14px",
            background: "rgba(15, 23, 42, 0.8)",
            border: "1px solid rgba(148, 163, 184, 0.25)",
            color: "#e2e8f0",
            textDecoration: "none",
            fontWeight: 800,
          }}
        >
          返回中国区首页
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
        <h2 style={{ fontSize: "18px", fontWeight: 900, marginBottom: "8px" }}>关于塔罗疗愈</h2>
        <ul style={{ margin: 0, paddingLeft: "18px", lineHeight: 1.8, opacity: 0.9 }}>
          <li>第 1 张：当前情绪与压力来源</li>
          <li>第 2 张：内在资源与支持</li>
          <li>第 3 张：需要面对的关键点</li>
          <li>第 4 张：下一步行动建议</li>
        </ul>
      </section>

      <LocaleFaq locale="zh-CN" canonicalUrl="https://code-destiny.com/zh-cn/tarot" />

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: faqIntro }} />
    </main>
  );
}

