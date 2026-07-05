import "../styles/globals.css";
import "../styles/theme-tokens.css";
import { ToastProvider } from "./components/Toast";
import { PaymentProcessingProvider } from "./components/PaymentProcessingContext";
import { Suspense } from "react";
import NavigationProvider from "./providers/NavigationProvider";
import UserSessionProvider from "./providers/UserSessionProvider";
import AppChrome from "./components/AppChrome";
import RuntimeClientGuards from "./components/RuntimeClientGuards";
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
      "ko-KR": "/",
      ja: "/ja/",
      "ja-JP": "/ja/",
      "zh-CN": "/zh/",
      zh: "/zh/",
      en: "/en/",
      "en-US": "/en/",
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
  // verification: Google Search Console 등록 후 아래 주석을 해제하고 실제 코드를 넣을 것.
  // GSC(https://search.google.com/search-console) → 속성 추가 → "HTML 태그" 방식의 content 값.
  // 정적 홈(index.html)의 <head>에도 동일한 <meta name="google-site-verification">를 넣어야 함(루트 index.html 수정 후 npm run sync:public).
  // verification: {
  //   google: "GOOGLE_SITE_VERIFICATION_CODE_HERE",
  // },
  other: {
    // 두 코드 모두 유지: 정적 index.html(구 등록분)과 Next 레이아웃(신 등록분)이 서로 다른
    // 네이버 서치어드바이저 확인 코드를 쓰고 있었음. 어느 쪽 등록이 유효한지 확인 전까지 병기.
    "naver-site-verification": [
      "b0fd5fe51988d4063ba5ae1875a97d5531bc1a1e",
      "7b6c0226cae15c61e2582eea0d9378e241ef2167",
    ],
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
        <link rel="preload" as="font" href="https://assets.code-destiny.com/Mulmaru.woff2" type="font/woff2" crossOrigin="anonymous" />
        <link rel="preload" as="image" href="https://assets.code-destiny.com/%EB%A7%88%EC%95%BC%EC%A0%90.webp" />
        <link rel="alternate" type="application/rss+xml" title={ROOT_LAYOUT_COPY.ko.insightsRssTitle} href="https://code-destiny.com/rss.xml" />
        <link rel="alternate" hrefLang="ko" href="https://code-destiny.com/" />
        <link rel="alternate" hrefLang="ja" href="https://code-destiny.com/ja/" />
        <link rel="alternate" hrefLang="zh-CN" href="https://code-destiny.com/zh/" />
        <link rel="alternate" hrefLang="en" href="https://code-destiny.com/en/" />
        <link rel="alternate" hrefLang="x-default" href="https://code-destiny.com/" />
        <meta property="og:site_name" content={siteSeo.siteName} />
        <meta property="og:locale" content="ko_KR" />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdGraph) }} />
        {/* 정적 허브와 동일한 연이/네오 테마 키 공유 — hydration 전에 html 속성으로 반영 (FOUC 방지) */}
        <script
          dangerouslySetInnerHTML={{
            __html: "try{if(localStorage.getItem('fortuneThemeModeStateV1')==='neo'){document.documentElement.dataset.cdTheme='neo';}}catch(e){}",
          }}
        />
      </head>
      <body className={notoSansKRVariable}>
        <PaymentProcessingProvider>
          <Suspense>
            <UserSessionProvider>
              <NavigationProvider>
                <RuntimeClientGuards />
                <ToastProvider />
                <AppChrome>{children}</AppChrome>
              </NavigationProvider>
            </UserSessionProvider>
          </Suspense>
        </PaymentProcessingProvider>
      </body>
    </html>
  );
}
