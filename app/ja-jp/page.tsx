export const metadata = {
  title: "無料四柱推命・紫微斗数・タロット占い | CODE DESTINY",
  description:
    "四柱推命、紫微斗数、タロット、相性診断を一つのサイトで無料体験。今日の運勢と恋愛運を今すぐチェック。",
  keywords: [
    "無料占い",
    "四柱推命 無料",
    "紫微斗数 無料",
    "タロット占い 無料",
    "恋愛運 占い",
    "復縁タロット",
    "相性診断",
    "生年月日 占い",
    "今日の運勢",
    "東洋占星術",
    "韓国占い",
    "命盤 作成",
    "当たる占い",
    "宿曜占星術",
    "ベーダ占星術",
  ],
  alternates: {
    canonical: "/ja-jp",
  },
  openGraph: {
    title: "無料で本格占い｜四柱推命・紫微斗数・タロット",
    description: "東洋占術の命盤分析とタロットを統合。恋愛・仕事・相性を無料で詳しく鑑定。",
    url: "https://code-destiny.com/ja-jp",
    siteName: "CODE DESTINY",
    locale: "ja_JP",
    type: "website",
    images: [
      {
        url: "https://code-destiny.com/icons/honeypig-512.png",
        width: 512,
        height: 512,
        alt: "四柱推命と紫微斗数の無料鑑定ページ",
      },
    ],
  },
};

import Link from "next/link";
import { LocaleFaq } from "../components/LocaleFaq";
import { LocaleSeoLinks } from "../components/LocaleSeoLinks";
import { SeoStructuredData } from "../components/SeoStructuredData";

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
      <LocaleSeoLinks />

      <section style={{ display: "grid", gap: "10px", marginBottom: "18px" }}>
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
          Tarot Healing を始める
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
        <h2 style={{ fontSize: "18px", fontWeight: 800, marginBottom: "8px" }}>ポリシー & サポート</h2>
        <nav style={{ display: "flex", gap: "12px", flexWrap: "wrap" }} aria-label="ポリシーと連絡先">
          <Link href="/privacy-policy" style={{ color: "#93c5fd", textDecoration: "underline" }}>
            プライバシーポリシー
          </Link>
          <Link href="/terms-of-service" style={{ color: "#93c5fd", textDecoration: "underline" }}>
            利用規約
          </Link>
          <Link href="/contact-us" style={{ color: "#93c5fd", textDecoration: "underline" }}>
            お問い合わせ
          </Link>
        </nav>
      </section>

      <LocaleFaq locale="ja-JP" canonicalUrl="https://code-destiny.com/ja-jp" />
      <SeoStructuredData
        locale="ja-JP"
        pagePath="/ja-jp"
        pageName="無料四柱推命・紫微斗数・タロット占い"
        description="四柱推命、紫微斗数、タロット、相性診断を無料で提供する日本語向けページ。"
      />
    </main>
  );
}

