import Link from "next/link";
import { notFound } from "next/navigation";

const LOCALE_CONTENT = {
  "en-us": {
    langQuery: "en",
    title: "Code Destiny in English",
    lead:
      "Explore Saju, Tarot, Ziwei, and Astrology in one place. We are actively improving English localization for core content.",
    intro:
      "This page is the English locale hub. You can start from the main experience in English mode and access policy and methodology pages while full localization continues.",
    cta: "Open Main Experience in English",
    links: [
      { href: "/about", label: "About" },
      { href: "/methodology", label: "Methodology" },
      { href: "/faq", label: "FAQ" },
      { href: "/privacy-policy", label: "Privacy Policy" },
      { href: "/terms-of-service", label: "Terms of Service" },
    ],
  },
  "ja-jp": {
    langQuery: "ja",
    title: "Code Destiny 日本語ガイド",
    lead:
      "四柱推命、タロット、紫微斗数、西洋占星術を一つのサービスで利用できます。主要コンテンツの日本語翻訳を継続中です。",
    intro:
      "このページは日本語ロケールの入口です。日本語モードでメイン画面へ進み、運営方針・方法論・FAQを確認できます。",
    cta: "日本語モードでメインへ進む",
    links: [
      { href: "/about", label: "運営情報" },
      { href: "/methodology", label: "方法論" },
      { href: "/faq", label: "よくある質問" },
      { href: "/privacy-policy", label: "プライバシーポリシー" },
      { href: "/terms-of-service", label: "利用規約" },
    ],
  },
  "zh-cn": {
    langQuery: "zh-CN",
    title: "Code Destiny 简体中文入口",
    lead:
      "在一个平台体验四柱八字、塔罗、紫微斗数与占星服务。核心内容的中文本地化正在持续完善。",
    intro:
      "本页面是简体中文入口。你可以先进入中文模式主界面，并查看平台介绍、方法论、常见问题与政策页面。",
    cta: "进入中文模式主页面",
    links: [
      { href: "/about", label: "关于我们" },
      { href: "/methodology", label: "方法论" },
      { href: "/faq", label: "常见问题" },
      { href: "/privacy-policy", label: "隐私政策" },
      { href: "/terms-of-service", label: "服务条款" },
    ],
  },
};

export function createLocaleMetadata(localeSlug) {
  const content = LOCALE_CONTENT[localeSlug];
  if (!content) return {};

  const canonicalPath = `/${localeSlug}`;
  return {
    title: content.title,
    description: content.lead,
    alternates: {
      canonical: canonicalPath,
    },
    openGraph: {
      title: content.title,
      description: content.lead,
      url: `https://code-destiny.com${canonicalPath}`,
    },
  };
}

export function createLocaleShellPage(localeSlug) {
  return function LocaleLandingPage() {
    const content = LOCALE_CONTENT[localeSlug];
    if (!content) {
      notFound();
    }

    return (
      <main style={{ maxWidth: "900px", margin: "0 auto", padding: "40px 20px 72px" }}>
        <h1 style={{ fontSize: "2rem", lineHeight: 1.3, marginBottom: "14px" }}>{content.title}</h1>
        <p style={{ fontSize: "1.05rem", lineHeight: 1.8, marginBottom: "14px" }}>{content.lead}</p>
        <p style={{ lineHeight: 1.8, marginBottom: "28px" }}>{content.intro}</p>

        <Link
          href={`/?lang=${encodeURIComponent(content.langQuery)}`}
          style={{
            display: "inline-block",
            background: "#111827",
            color: "#ffffff",
            padding: "12px 18px",
            borderRadius: "10px",
            textDecoration: "none",
            marginBottom: "30px",
            fontWeight: 600,
          }}
        >
          {content.cta}
        </Link>

        <section>
          <h2 style={{ fontSize: "1.2rem", marginBottom: "10px" }}>Quick Links</h2>
          <ul style={{ paddingLeft: "18px", lineHeight: 1.9 }}>
            {content.links.map((link) => (
              <li key={link.href}>
                <Link href={link.href}>{link.label}</Link>
              </li>
            ))}
          </ul>
        </section>
      </main>
    );
  };
}
