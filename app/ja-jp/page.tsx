export const metadata = {
  title: "Code Destiny｜無料タロット＆運勢（日本）",
  description:
    "Code Destiny は無料のタロット体験と運勢コンテンツを提供します。このページは日本（ja-JP）向けに最適化され、地域SEOシグナルを強化します。",
  alternates: {
    canonical: "/ja-jp",
  },
  openGraph: {
    title: "Code Destiny｜無料タロット＆運勢（日本）",
    description: "日本（ja-JP）向けの無料タロット体験と運勢コンテンツ。",
    url: "https://code-destiny.com/ja-jp",
    siteName: "Code Destiny",
    type: "website",
  },
};

import { LocaleFaq } from "../components/LocaleFaq";

export default function JaJpLanding() {
  return (
    <main style={{ maxWidth: "960px", margin: "0 auto", padding: "28px 16px 52px", color: "#e2e8f0" }}>
      <h1 style={{ fontSize: "34px", fontWeight: 800, marginBottom: "10px" }}>
        Code Destiny — タロット & 運勢（日本）
      </h1>
      <p style={{ opacity: 0.9, lineHeight: 1.75, marginBottom: "18px" }}>
        Tarot Healing 体験と運勢コンテンツを探索しましょう。このページは日本（ja-JP）向けに、検索エンジンが言語と地域意図を理解しやすいように設計されています。
      </p>
      <p style={{ opacity: 0.86, lineHeight: 1.75, marginBottom: "18px" }}>
        まずはガイド付きのタロット体験から始めて、次に Destiny Points やポリシーページを確認してください。
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
          Tarot Healing を始める
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
        <h2 style={{ fontSize: "18px", fontWeight: 800, marginBottom: "8px" }}>ポリシー & サポート</h2>
        <nav style={{ display: "flex", gap: "12px", flexWrap: "wrap" }} aria-label="ポリシーと連絡先">
          <a href="/privacy-policy" style={{ color: "#93c5fd", textDecoration: "underline" }}>
            プライバシーポリシー
          </a>
          <a href="/terms-of-service" style={{ color: "#93c5fd", textDecoration: "underline" }}>
            利用規約
          </a>
          <a href="/contact-us" style={{ color: "#93c5fd", textDecoration: "underline" }}>
            お問い合わせ
          </a>
        </nav>
      </section>

      <LocaleFaq locale="ja-JP" canonicalUrl="https://code-destiny.com/ja-jp" />
    </main>
  );
}

