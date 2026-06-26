import "../styles/globals.css";
import AppVersionGuard from "./components/AppVersionGuard";
import BuildInfoLogger from "./components/BuildInfoLogger";
import { ToastProvider } from "./components/Toast";
import { PaymentProcessingProvider } from "./components/PaymentProcessingContext";
import { Suspense } from "react";
import DeferredAdsense from "./components/DeferredAdsense";
import LegacyAuthTokenCleanup from "./components/LegacyAuthTokenCleanup";
import LocaleRuntimeBridge from "./components/LocaleRuntimeBridge";
import NavigationProvider from "./providers/NavigationProvider";
import AppChrome from "./components/AppChrome";
import DevPaymentTester from "./components/DevPaymentTester";
import { SEO_CORE_KEYWORDS } from "../lib/seo-metadata";
import { siteSeo } from "../lib/seo/siteSeo";
import {
  buildOrganizationJsonLd,
  buildWebPageJsonLd,
} from "../lib/structured-data";

const notoSansKRVariable = "font-noto-sans-kr-offline";

const ROOT_LAYOUT_COPY = {
  ko: {
    insightsRssTitle: "Code Destiny Insights RSS",
  },
  en: {
    insightsRssTitle: "Code Destiny Insights RSS",
  },
  ja: {
    insightsRssTitle: "Code Destiny Insights RSS",
  },
  zh: {
    insightsRssTitle: "Code Destiny Insights RSS",
  },
};

const ROOT_SEO = {
  title: "꿀꿀 운세 | 무료 사주팔자·타로·궁합 — Code Destiny",
  description:
    "꿀꿀 운세(구 꿀꿀 만세력) — 생년월일 하나로 무료 사주팔자, 타로, 궁합, 자미두수, 신년운세까지. 코드 데스티니(Code Destiny).",
  ogTitle: "꿀꿀 운세 | 무료 사주·타로·궁합 — Code Destiny",
  ogDescription:
    "꿀꿀 운세 — 생년월일 하나로 사주팔자, 타로, 자미두수, 궁합, 신년운세를 재밌고 정확하게 보는 코드 데스티니 공식 서비스.",
};

export const metadata = {
  charset: "utf-8",
  metadataBase: new URL(siteSeo.siteUrl),
  applicationName: siteSeo.siteName,
  title: {
    default: ROOT_SEO.title,
    template: siteSeo.titleTemplate,
  },
  description: ROOT_SEO.description,
  keywords: SEO_CORE_KEYWORDS,
  creator: siteSeo.siteName,
  publisher: siteSeo.siteName,
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
    icon: "/icons/%EA%BF%80%EA%BF%80%20%EC%9A%B4%EC%84%B8%20%EB%A1%9C%EA%B3%A0.webp",
    shortcut: "/icons/%EA%BF%80%EA%BF%80%20%EC%9A%B4%EC%84%B8%20%EB%A1%9C%EA%B3%A0.webp",
    apple: "/icons/%EA%BF%80%EA%BF%80%20%EC%9A%B4%EC%84%B8%20%EB%A1%9C%EA%B3%A0.webp",
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: siteSeo.siteName,
    statusBarStyle: "default",
  },
  alternates: {
    canonical: "/",
    languages: {
      ko: "/",
      "x-default": "/",
    },
  },
  openGraph: {
    type: "website",
    locale: "ko_KR",
    url: siteSeo.siteUrl,
    siteName: siteSeo.siteName,
    title: ROOT_SEO.ogTitle,
    description: ROOT_SEO.ogDescription,
    images: [
      {
        url: siteSeo.defaultOgImage,
        width: 1200,
        height: 630,
        alt: "Code Destiny 무료 사주 타로 오늘의 운세 플랫폼",
      },
    ],
  },
  twitter: {
    card: siteSeo.twitterCard,
    title: ROOT_SEO.ogTitle,
    description: ROOT_SEO.ogDescription,
    images: [siteSeo.defaultOgImage],
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

const BRAND_WEBSITE_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "꿀꿀 운세 — Code Destiny",
  alternateName: ["꿀꿀 만세력", "코드 데스티니", "Code Destiny"],
  url: "https://code-destiny.com",
  description: "생년월일로 무료 사주팔자·타로·궁합·신년운세를 제공하는 한국 운세 플랫폼",
  potentialAction: {
    "@type": "SearchAction",
    target: {
      "@type": "EntryPoint",
      urlTemplate: "https://code-destiny.com/?q={search_term_string}",
    },
    "query-input": "required name=search_term_string",
  },
};

const jsonLdGraph = {
  "@context": "https://schema.org",
  "@graph": [
    buildOrganizationJsonLd(),
    BRAND_WEBSITE_JSON_LD,
    buildWebPageJsonLd({
      title: ROOT_SEO.title,
      description: ROOT_SEO.description,
      path: "/",
    }),
  ],
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko" dir="ltr" className={notoSansKRVariable}>
      <head>
        <link rel="alternate" type="application/rss+xml" title={ROOT_LAYOUT_COPY.ko.insightsRssTitle} href="https://code-destiny.com/rss.xml" />
        <link rel="alternate" hrefLang="ko" href="https://code-destiny.com/" />
        <link rel="alternate" hrefLang="x-default" href="https://code-destiny.com/" />
        <meta property="og:site_name" content={siteSeo.siteName} />
        <meta property="og:locale" content="ko_KR" />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdGraph) }} />
      </head>
      <body className={notoSansKRVariable}>
        <PaymentProcessingProvider>
          <Suspense>
            <NavigationProvider>
              <DeferredAdsense />
              <LocaleRuntimeBridge />
              <LegacyAuthTokenCleanup />
              <BuildInfoLogger />
              <AppVersionGuard />
              <ToastProvider />
              <AppChrome>{children}</AppChrome>
              <DevPaymentTester />
            </NavigationProvider>
          </Suspense>
        </PaymentProcessingProvider>
      </body>
    </html>
  );
}
