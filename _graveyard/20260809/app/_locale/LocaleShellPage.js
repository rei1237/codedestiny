import Link from "next/link";
import { notFound } from "next/navigation";

const LOCALE_SHELL_TEXT_TRANSLATIONS = {
  ko: {
    "localeShell.001": "Code Destiny in English",
    "localeShell.002": "Open the English Experience",
    "localeShell.003": "Privacy Policy",
    "localeShell.004": "Terms of Service",
    "localeShell.005": "Code Destiny 日本語版",
    "localeShell.006": "日本語で占いを開く",
    "localeShell.007": "運営情報",
    "localeShell.008": "方法論",
    "localeShell.009": "よくある質問",
    "localeShell.010": "プライバシーポリシー",
    "localeShell.011": "利用規約",
    "localeShell.012": "Code Destiny 中文版",
    "localeShell.013": "用中文开启占卜",
    "localeShell.014": "关于我们",
    "localeShell.015": "方法论",
    "localeShell.016": "常见问题",
    "localeShell.017": "隐私政策",
    "localeShell.018": "服务条款",
  },
};

function localeShellText(key) {
  return LOCALE_SHELL_TEXT_TRANSLATIONS.ko[key] || "Translation pending";
}
const LOCALE_CONTENT = {
  "en-us": {
    langQuery: "en",
    title: localeShellText("localeShell.001"),
    lead:
      "Open Saju, Tarot, Zi Wei Dou Shu, Sukuyo astrology, and daily guidance in one calm English experience.",
    intro:
      "Your next reading begins from the main moonlit page, where the language engine keeps the active service flow in English.",
    cta: localeShellText("localeShell.002"),
    quickLinks: "Quick Links",
    links: [
      { href: "/about", label: "About" },
      { href: "/methodology", label: "Methodology" },
      { href: "/faq", label: "FAQ" },
      { href: "/privacy-policy", label: localeShellText("localeShell.003") },
      { href: "/terms-of-service", label: localeShellText("localeShell.004") },
    ],
  },
  "ja-jp": {
    langQuery: "ja",
    title: localeShellText("localeShell.005"),
    lead:
      "四柱推命、タロット、紫微斗数、宿曜占星術、今日の運勢まで、月明かりの中で静かに開けます。",
    intro:
      "いま必要な問いを持って、メイン画面へ進んでください。日本語の流れで、カードと星の言葉が次の一歩を照らします。",
    cta: localeShellText("localeShell.006"),
    quickLinks: "クイックリンク",
    links: [
      { href: "/about", label: localeShellText("localeShell.007") },
      { href: "/methodology", label: localeShellText("localeShell.008") },
      { href: "/faq", label: localeShellText("localeShell.009") },
      { href: "/privacy-policy", label: localeShellText("localeShell.010") },
      { href: "/terms-of-service", label: localeShellText("localeShell.011") },
    ],
  },
  "zh-cn": {
    langQuery: "zh-CN",
    title: localeShellText("localeShell.012"),
    lead:
      "八字、塔罗、紫微斗数、宿曜占星与今日运势，都可以在一片安静的月光里开启。",
    intro:
      "带着此刻的问题进入主画面，中文占卜流程会为你整理牌面、星象与下一步方向。",
    cta: localeShellText("localeShell.013"),
    quickLinks: "快速链接",
    links: [
      { href: "/about", label: localeShellText("localeShell.014") },
      { href: "/methodology", label: localeShellText("localeShell.015") },
      { href: "/faq", label: localeShellText("localeShell.016") },
      { href: "/privacy-policy", label: localeShellText("localeShell.017") },
      { href: "/terms-of-service", label: localeShellText("localeShell.018") },
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
          <h2 style={{ fontSize: "1.2rem", marginBottom: "10px" }}>{content.quickLinks}</h2>
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
