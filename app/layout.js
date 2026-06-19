import "../styles/globals.css";
import AppVersionGuard from "./components/AppVersionGuard";
import BuildInfoLogger from "./components/BuildInfoLogger";
import { ToastProvider } from "./components/Toast";
import { PaymentProcessingProvider } from "./components/PaymentProcessingContext";
import { Suspense } from "react";
import DeferredAdsense from "./components/DeferredAdsense";
import LegacyAuthTokenCleanup from "./components/LegacyAuthTokenCleanup";
import NavigationProvider from "./providers/NavigationProvider";
import AppChrome from "./components/AppChrome";
import DevPaymentTester from "./components/DevPaymentTester";
import { SEO_CORE_KEYWORDS } from "../lib/seo-metadata";
import { siteSeo } from "../lib/seo/siteSeo";
import {
  buildOrganizationJsonLd,
  buildWebPageJsonLd,
  buildWebsiteJsonLd,
} from "../lib/structured-data";

const notoSansKRVariable = "font-noto-sans-kr-offline";

export const metadata = {
  charset: "utf-8",
  metadataBase: new URL(siteSeo.siteUrl),
  applicationName: siteSeo.siteName,
  title: {
    default: siteSeo.defaultTitle,
    template: siteSeo.titleTemplate,
  },
  description: siteSeo.defaultDescription,
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
    title: siteSeo.defaultTitle,
    description: siteSeo.defaultDescription,
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
    title: siteSeo.defaultTitle,
    description: siteSeo.defaultDescription,
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

const jsonLdGraph = {
  "@context": "https://schema.org",
  "@graph": [
    buildOrganizationJsonLd(),
    buildWebsiteJsonLd(),
    buildWebPageJsonLd({
      title: siteSeo.defaultTitle,
      description: siteSeo.defaultDescription,
      path: "/",
    }),
  ],
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko" dir="ltr" className={notoSansKRVariable}>
      <head>
        <link rel="alternate" type="application/rss+xml" title="Code Destiny Insights RSS" href="https://code-destiny.com/rss.xml" />
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
