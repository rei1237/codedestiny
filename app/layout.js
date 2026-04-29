import "../styles/globals.css";
import "../styles/disclaimer-banner.css";
import { Noto_Sans_KR } from "next/font/google";
import Link from "next/link";
import AppVersionGuard from "./components/AppVersionGuard";
import SiteFooterHub from "./components/SiteFooterHub";
import InternalLinksHub from "./components/InternalLinksHub";
import AuthWidget from "./components/AuthWidget";
import DisclaimerBanner from "./components/DisclaimerBanner";
import { ToastProvider } from "./components/Toast";
import { PaymentProcessingProvider } from "./components/PaymentProcessingContext";
import { SEO_CORE_KEYWORDS } from "../lib/seo-metadata";

const notoSansKR = Noto_Sans_KR({
  weight: ["300", "400", "500", "700"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-noto-sans-kr",
  preload: true,
});

const CANONICAL_ORIGIN = "https://code-destiny.com";

// Static metadata for static export
export const metadata = {
  metadataBase: new URL("https://code-destiny.com"),
  applicationName: "꿀꿀 만세력",
  title: {
    default: "무료 사주팔자 · 자미두수 운세 분석 · AI 타로 | 코드 데스티니",
    template: "%s | 코드 데스티니",
  },
  description:
    "생년월일 기반 무료 사주팔자, 자미두수 운세 분석, AI 타로, 점성술, 궁합을 한곳에서 제공하는 통합 운세 문서 플랫폼입니다.",
  keywords: SEO_CORE_KEYWORDS,
  creator: "Code Destiny",
  publisher: "Code Destiny",
  category: "Fortune & Astrology",
  classification: "Fortune telling, astrology, saju, tarot",
  referrer: "origin-when-cross-origin",
  formatDetection: {
    email: false,
    telephone: false,
    address: false,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  icons: {
    icon: "/icons/favicon.ico",
    shortcut: "/icons/favicon.ico",
    apple: "/icons/apple-touch-icon.png",
    other: [
      { rel: "icon", type: "image/png", sizes: "32x32", url: "/icons/favicon-32x32.png" },
      { rel: "icon", type: "image/png", sizes: "16x16", url: "/icons/favicon-16x16.png" },
    ],
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "꿀꿀 만세력",
    statusBarStyle: "default",
    startupImage: ["/icons/apple-touch-icon.png"],
  },
  alternates: {
    canonical: "/",
    languages: {
      "ko-KR": "/",
      "en-US": "/en-us",
      "ja-JP": "/ja-jp",
      "zh-CN": "/zh-cn",
      "hi-IN": "/hi-in",
      "es-ES": "/es-es",
      "fr-FR": "/fr-fr",
      "de-DE": "/de-de",
      "nl-NL": "/nl-nl",
      "ms-MY": "/ms-my",
    },
  },
  openGraph: {
    type: "website",
    locale: "ko_KR",
    alternateLocale: ["en_US", "ja_JP", "zh_CN", "hi_IN", "es_ES", "fr_FR", "de_DE", "nl_NL", "ms_MY"],
    url: "https://code-destiny.com",
    siteName: "꿀꿀 만세력",
    title: "무료 사주팔자 · 자미두수 운세 분석 · AI 타로 | 코드 데스티니",
    description:
      "생년월일 기반 무료 사주팔자, 자미두수 운세 분석, AI 타로, 점성술, 궁합을 한곳에서 제공하는 통합 운세 문서 플랫폼입니다.",
    images: [
      {
        url: "https://code-destiny.com/icons/og-image.png",
        width: 1200,
        height: 630,
        alt: "코드 데스티니 - 무료 사주팔자, 자미두수 운세 분석",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "무료 사주팔자 · 자미두수 운세 분석 · AI 타로 | 코드 데스티니",
    description:
      "생년월일 기반 무료 사주팔자, 자미두수 운세 분석, AI 타로, 점성술, 궁합을 한곳에서 제공하는 통합 운세 문서 플랫폼입니다.",
    images: ["https://code-destiny.com/icons/og-image.png"],
    creator: "@codedestiny",
  },
  verification: {
    yandex: "98b1cd43eb1188de",
  },
  other: {
    "naver-site-verification": "b0fd5fe51988d4063ba5ae1875a97d5531bc1a1e",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#070b1f" },
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
  ],
  colorScheme: "dark light",
};

const headerNavItems = [
  { href: "/", label: "홈" },
  { href: "/saju/basic", label: "기초사주" },
  { href: "/saju/lifebook", label: "만세력" },
  { href: "/saju/love-secret", label: "연애비밀" },
  { href: "/tarot", label: "타로" },
  { href: "/tarot/year", label: "타로년운" },
  { href: "/oracle", label: "오라클" },
  { href: "/insights", label: "가이드" },
  { href: "/points", label: "포인트" },
];

// JSON-LD structured data
const jsonLd = JSON.stringify({
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": "https://code-destiny.com/#website",
      url: "https://code-destiny.com",
      name: "꿀꿀 만세력 (Code Destiny)",
      description: "생년월일 기반 무료 사주팔자, 자미두수 운세 분석, AI 타로",
      publisher: { "@type": "Organization", "@id": "https://code-destiny.com/#organization" },
      potentialAction: {
        "@type": "SearchAction",
        target: "https://code-destiny.com/?q={search_term_string}",
        "query-input": "required name=search_term_string",
      },
      inLanguage: "ko",
    },
    {
      "@type": "Organization",
      "@id": "https://code-destiny.com/#organization",
      name: "Code Destiny (꿀꿀 만세력)",
      url: "https://code-destiny.com",
      logo: {
        "@type": "ImageObject",
        "@id": "https://code-destiny.com/icons/og-image.png",
        url: "https://code-destiny.com/icons/og-image.png",
        contentUrl: "https://code-destiny.com/icons/og-image.png",
        width: 1200,
        height: 630,
        caption: "Code Destiny - Free Saju & Fortune Platform",
      },
      image: { "@id": "https://code-destiny.com/icons/og-image.png" },
    },
    {
      "@type": "WebPage",
      "@id": "https://code-destiny.com/#webpage",
      url: "https://code-destiny.com",
      name: "무료 사주팔자 · 자미두수 운세 분석 · AI 타로 | 코드 데스티니",
      isPartOf: { "@id": "https://code-destiny.com/#website" },
      about: { "@id": "https://code-destiny.com/#organization" },
      primaryImageOfPage: { "@id": "https://code-destiny.com/icons/og-image.png" },
      datePublished: "2024-01-01T00:00:00+09:00",
      dateModified: new Date().toISOString(),
      description:
        "생년월일 기반 무료 사주팔자, 자미두수 운세 분석, AI 타로, 점성술, 궁합을 한곳에서 제공하는 통합 운세 문서 플랫폼입니다.",
      inLanguage: "ko",
      potentialAction: {
        "@type": "ReadAction",
        target: ["https://code-destiny.com"],
      },
    },
  ],
});

// Simplified layout for static export
export default function RootLayout({ children }) {
  return (
    <html lang="ko" dir="ltr" className={notoSansKR.variable}>
      <head>
        <link rel="preconnect" href="https://code-destiny.com" />
        <link rel="alternate" type="application/rss+xml" title="Code Destiny Insights RSS" href="https://code-destiny.com/rss.xml" />
        <link rel="alternate" hrefLang="ko-KR" href="https://code-destiny.com/" />
        <link rel="alternate" hrefLang="en-US" href="https://code-destiny.com/en-us/" />
        <link rel="alternate" hrefLang="ja-JP" href="https://code-destiny.com/ja-jp/" />
        <link rel="alternate" hrefLang="zh-CN" href="https://code-destiny.com/zh-cn/" />
        <link rel="alternate" hrefLang="hi-IN" href="https://code-destiny.com/hi-in/" />
        <link rel="alternate" hrefLang="es-ES" href="https://code-destiny.com/es-es/" />
        <link rel="alternate" hrefLang="fr-FR" href="https://code-destiny.com/fr-fr/" />
        <link rel="alternate" hrefLang="de-DE" href="https://code-destiny.com/de-de/" />
        <link rel="alternate" hrefLang="nl-NL" href="https://code-destiny.com/nl-nl/" />
        <link rel="alternate" hrefLang="ms-MY" href="https://code-destiny.com/ms-my/" />
        <link rel="alternate" hrefLang="x-default" href="https://code-destiny.com/" />
        <meta property="og:site_name" content="Code Destiny" />
        <meta property="og:locale" content="ko_KR" />
        <meta property="og:locale:alternate" content="en_US" />
        <meta property="og:locale:alternate" content="ja_JP" />
        <meta property="og:locale:alternate" content="zh_CN" />
        <meta property="og:locale:alternate" content="hi_IN" />
        <meta property="og:locale:alternate" content="es_ES" />
        <meta property="og:locale:alternate" content="fr_FR" />
        <meta property="og:locale:alternate" content="de_DE" />
        <meta property="og:locale:alternate" content="nl_NL" />
        <meta property="og:locale:alternate" content="ms_MY" />
        <meta name="yandex-verification" content="98b1cd43eb1188de" />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />
      </head>
      <body>
        <PaymentProcessingProvider>
          <AppVersionGuard />
          <ToastProvider />
          <header
            style={{
              position: "sticky",
              top: 0,
              zIndex: 50,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "0 16px",
              height: "52px",
              background: "rgba(7, 11, 31, 0.88)",
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
              borderBottom: "1px solid rgba(124, 58, 237, 0.2)",
            }}
          >
            <Link
              href="/"
              style={{
                fontWeight: 900,
                fontSize: "16px",
                letterSpacing: "-0.02em",
                background: "linear-gradient(135deg, #a78bfa, #4ecdc4)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
                textDecoration: "none",
              }}
            >
              ✦ Code Destiny
            </Link>
            <AuthWidget />
          </header>
          <nav
            aria-label="주요 내비게이션"
            style={{
              position: "sticky",
              top: "52px",
              zIndex: 45,
              display: "flex",
              gap: "8px",
              alignItems: "center",
              overflowX: "auto",
              whiteSpace: "nowrap",
              padding: "8px 12px",
              borderBottom: "1px solid rgba(124, 58, 237, 0.16)",
              background: "rgba(10, 14, 37, 0.88)",
              backdropFilter: "blur(10px)",
              WebkitBackdropFilter: "blur(10px)",
            }}
          >
            {headerNavItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  textDecoration: "none",
                  color: "#dbe5ff",
                  border: "1px solid rgba(148,163,184,0.25)",
                  borderRadius: "999px",
                  padding: "5px 12px",
                  fontSize: "0.85rem",
                  lineHeight: 1.2,
                  background: "rgba(15,23,42,0.7)",
                }}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div>{children}</div>
          <DisclaimerBanner />
          <InternalLinksHub />
          <SiteFooterHub />
        </PaymentProcessingProvider>
      </body>
    </html>
  );
}
