import "../styles/globals.css";
import AppVersionGuard from "./components/AppVersionGuard";
import BuildInfoLogger from "./components/BuildInfoLogger";
import { ToastProvider } from "./components/Toast";
import { PaymentProcessingProvider } from "./components/PaymentProcessingContext";
import DeferredAdsense from "./components/DeferredAdsense";
import NavigationProvider from "./providers/NavigationProvider";
import AppChrome from "./components/AppChrome";
import { SEO_CORE_KEYWORDS } from "../lib/seo-metadata";

const notoSansKRVariable = "font-noto-sans-kr-offline";

const CANONICAL_ORIGIN = "https://code-destiny.com";

// Static metadata for static export
export const metadata = {
  charset: "utf-8",
  metadataBase: new URL("https://code-destiny.com"),
  applicationName: "꿀꿀 운세",
  title: {
    default: "꿀꿀 운세 | 무료 사주팔자 · 오늘의 운세 · 코드 데스티니",
    template: "%s | 꿀꿀 운세",
  },
  description:
    "꿀꿀 운세는 Code Destiny(코드 데스티니)가 제공하는 무료 운세, 숙요점, 사주팔자, 자미두수 명반, 타로 카드, 베다 점성술, 고품질 운세 리포트를 한곳에서 제공하는 통합 운세 플랫폼입니다.",
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
    icon: "/icons/꿀꿀 운세 로고.webp",
    shortcut: "/icons/꿀꿀 운세 로고.webp",
    apple: "/icons/꿀꿀 운세 로고.webp",
    other: [
      { rel: "icon", type: "image/webp", sizes: "1200x1200", url: "/icons/꿀꿀 운세 로고.webp" },
    ],
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "꿀꿀 운세",
    statusBarStyle: "default",
    startupImage: ["/icons/꿀꿀 운세 로고.webp"],
  },
  alternates: {
    canonical: "/",
    languages: {
      ko: "/",
      en: "/en",
      ja: "/ja",
      zh: "/zh",
      "x-default": "/",
    },
  },
  openGraph: {
    type: "website",
    locale: "ko_KR",
    alternateLocale: ["en_US", "ja_JP", "zh_CN"],
    url: "https://code-destiny.com",
    siteName: "꿀꿀 운세",
    title: "꿀꿀 운세 | 무료 사주팔자 · 오늘의 운세 · 코드 데스티니",
    description:
      "꿀꿀 운세는 Code Destiny(코드 데스티니)가 제공하는 무료 운세, 숙요점, 사주팔자, 자미두수 명반, 타로 카드, 베다 점성술, 고품질 운세 리포트를 한곳에서 제공하는 통합 운세 플랫폼입니다.",
    images: [
      {
        url: "https://code-destiny.com/icons/꿀꿀 운세 로고.webp",
        width: 1200,
        height: 630,
        alt: "꿀꿀 운세 - 무료 사주팔자, 자미두수 운세 분석",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "꿀꿀 운세 | 무료 사주팔자 · 오늘의 운세 · 코드 데스티니",
    description:
      "꿀꿀 운세는 Code Destiny(코드 데스티니)가 제공하는 무료 운세, 숙요점, 사주팔자, 자미두수 명반, 타로 카드, 베다 점성술, 고품질 운세 리포트를 한곳에서 제공하는 통합 운세 플랫폼입니다.",
    images: ["https://code-destiny.com/icons/꿀꿀 운세 로고.webp"],
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

// JSON-LD structured data
const jsonLd = JSON.stringify({
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": "https://code-destiny.com/#website",
      url: "https://code-destiny.com",
      name: "꿀꿀 운세",
      alternateName: ["코드 데스티니", "꿀꿀 운세", "꿀꿀 만세력", "codedestiny"],
      description: "사주·타로·자미두수·점성술을 연결해 해석하는 무료 운세 플랫폼",
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
      name: "꿀꿀 운세",
      alternateName: ["코드 데스티니", "꿀꿀 운세", "꿀꿀 만세력", "Ggulggul Manseryeok", "codedestiny"],
      url: "https://code-destiny.com",
      logo: {
        "@type": "ImageObject",
        "@id": "https://code-destiny.com/icons/꿀꿀 운세 로고.webp",
        url: "https://code-destiny.com/icons/꿀꿀 운세 로고.webp",
        contentUrl: "https://code-destiny.com/icons/꿀꿀 운세 로고.webp",
        width: 1200,
        height: 630,
        caption: "꿀꿀 운세 - Free Saju & Fortune Platform",
      },
      image: { "@id": "https://code-destiny.com/icons/꿀꿀 운세 로고.webp" },
    },
    {
      "@type": "SoftwareApplication",
      "@id": "https://code-destiny.com/#softwareapplication",
      name: "꿀꿀 운세",
      applicationCategory: "LifestyleApplication",
      operatingSystem: "Web",
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "KRW",
      },
      featureList: [
        "무료 운세",
        "숙요점",
        "사주팔자",
        "자미두수 명반",
        "타로 카드",
        "베다 점성술",
        "고품질 운세 리포트",
      ],
      applicationSubCategory: "Fortune & Astrology",
      inLanguage: ["ko", "en", "ja", "zh"],
      url: "https://code-destiny.com",
      publisher: { "@id": "https://code-destiny.com/#organization" },
    },
    {
      "@type": "WebPage",
      "@id": "https://code-destiny.com/#webpage",
      url: "https://code-destiny.com",
      name: "꿀꿀 운세 | 무료 사주팔자 · 오늘의 운세 · 코드 데스티니",
      isPartOf: { "@id": "https://code-destiny.com/#website" },
      about: { "@id": "https://code-destiny.com/#organization" },
      primaryImageOfPage: { "@id": "https://code-destiny.com/icons/꿀꿀 운세 로고.webp" },
      datePublished: "2024-01-01T00:00:00+09:00",
      dateModified: new Date().toISOString(),
      description:
        "꿀꿀 운세는 Code Destiny(코드 데스티니)가 제공하는 무료 운세, 숙요점, 사주팔자, 자미두수 명반, 타로 카드, 베다 점성술, 고품질 운세 리포트를 한곳에서 제공하는 통합 운세 플랫폼입니다.",
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
    <html lang="ko" dir="ltr" className={notoSansKRVariable}>
      <head>
        <link rel="alternate" type="application/rss+xml" title="Code Destiny Insights RSS" href="https://code-destiny.com/rss.xml" />
        <link rel="alternate" hrefLang="ko" href="https://code-destiny.com/" />
        <link rel="alternate" hrefLang="en" href="https://code-destiny.com/en/" />
        <link rel="alternate" hrefLang="ja" href="https://code-destiny.com/ja/" />
        <link rel="alternate" hrefLang="zh" href="https://code-destiny.com/zh/" />
        <link rel="alternate" hrefLang="x-default" href="https://code-destiny.com/" />
        <meta property="og:site_name" content="Code Destiny" />
        <meta property="og:locale" content="ko_KR" />
        <meta property="og:locale:alternate" content="en_US" />
        <meta property="og:locale:alternate" content="ja_JP" />
        <meta property="og:locale:alternate" content="zh_CN" />
        <meta name="yandex-verification" content="98b1cd43eb1188de" />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />
      </head>
      <body className={notoSansKRVariable}>
        <PaymentProcessingProvider>
          <NavigationProvider>
            <DeferredAdsense />
            <BuildInfoLogger />
            <AppVersionGuard />
            <ToastProvider />
            <AppChrome>
              {children}
            </AppChrome>
          </NavigationProvider>
        </PaymentProcessingProvider>
      </body>
    </html>
  );
}
