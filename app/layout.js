import "../styles/globals.css";
import "../styles/disclaimer-banner.css";
import { Noto_Sans_KR } from "next/font/google";
import { headers } from "next/headers";

const notoSansKR = Noto_Sans_KR({
  weight: ["300", "400", "500", "700"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-noto-sans-kr",
  preload: false,
  adjustFontFallback: true,
});
import Link from "next/link";
import AppVersionGuard from "./components/AppVersionGuard";
import SiteFooterHub from "./components/SiteFooterHub";
import AuthWidget from "./components/AuthWidget";
import DisclaimerBanner from "./components/DisclaimerBanner";
import { ToastProvider } from "./components/Toast";
import DeferredAdsense from "./components/DeferredAdsense";
import { SEO_CORE_KEYWORDS } from "../lib/seo-metadata";

export const dynamic = "force-dynamic";

const CANONICAL_ORIGIN = "https://code-destiny.com";
const LOCALES = [
  { key: "ko-KR", slug: "", htmlLang: "ko", label: "Korean" },
  { key: "en-US", slug: "/en-us", htmlLang: "en", label: "English" },
  { key: "ja-JP", slug: "/ja-jp", htmlLang: "ja", label: "Japanese" },
  { key: "zh-CN", slug: "/zh-cn", htmlLang: "zh-CN", label: "Chinese (Simplified)" },
  { key: "hi-IN", slug: "/hi-in", htmlLang: "hi", label: "Hindi" },
  { key: "es-ES", slug: "/es-es", htmlLang: "es", label: "Spanish" },
  { key: "fr-FR", slug: "/fr-fr", htmlLang: "fr", label: "French" },
  { key: "de-DE", slug: "/de-de", htmlLang: "de", label: "German" },
  { key: "nl-NL", slug: "/nl-nl", htmlLang: "nl", label: "Dutch" },
  { key: "ms-MY", slug: "/ms-my", htmlLang: "ms", label: "Malay" },
];

function normalizePathname(input) {
  if (!input) return "/";

  try {
    if (input.startsWith("http://") || input.startsWith("https://")) {
      return new URL(input).pathname || "/";
    }
  } catch {
    return "/";
  }

  const pathname = input.startsWith("/") ? input : `/${input}`;
  return pathname || "/";
}

function detectLocaleFromPath(pathname) {
  const normalized = normalizePathname(pathname).toLowerCase();
  const match = LOCALES.find(
    (locale) => locale.slug && (normalized === locale.slug || normalized.startsWith(`${locale.slug}/`)),
  );
  return match || LOCALES[0];
}

function stripLocalePrefix(pathname) {
  const normalized = normalizePathname(pathname).toLowerCase();
  for (const locale of LOCALES) {
    if (!locale.slug) continue;
    if (normalized === locale.slug) return "/";
    if (normalized.startsWith(`${locale.slug}/`)) return normalized.slice(locale.slug.length) || "/";
  }
  return normalized || "/";
}

function buildHreflangAlternates(currentPathname) {
  const basePath = stripLocalePrefix(currentPathname);
  const alternates = [];

  for (const locale of LOCALES) {
    const hrefPath = locale.slug ? `${locale.slug}${basePath === "/" ? "" : basePath}` : basePath;
    alternates.push({
      hrefLang: locale.key,
      href: new URL(hrefPath, CANONICAL_ORIGIN).toString(),
    });
  }

  alternates.push({
    hrefLang: "x-default",
    href: new URL(basePath, CANONICAL_ORIGIN).toString(),
  });

  return alternates;
}

function buildJsonLd({ locale, canonicalHref }) {
  const website = {
    "@type": "WebSite",
    "@id": "https://code-destiny.com/#website",
    name: "CODE DESTINY",
    alternateName: "꿀꿀 만세력",
    url: CANONICAL_ORIGIN,
    description: "무료 사주팔자·AI 타로·자미두수·점성술·숙요점·궁합 서비스. 10개 언어 지원.",
    inLanguage: LOCALES.map((l) => l.key),
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${CANONICAL_ORIGIN}/insights?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
    publisher: { "@id": "https://code-destiny.com/#organization" },
  };

  const organization = {
    "@type": "Organization",
    "@id": "https://code-destiny.com/#organization",
    name: "Code Destiny",
    url: CANONICAL_ORIGIN,
    logo: {
      "@type": "ImageObject",
      url: "https://code-destiny.com/icons/honeypig.webp",
      width: 512,
      height: 512,
    },
  };

  const webpage = {
    "@type": "WebPage",
    "@id": `${canonicalHref}#webpage`,
    url: canonicalHref,
    inLanguage: locale.key,
    name: "무료 사주 타로 운세 | 꿀꿀 만세력",
    description: "생년월일로 보는 무료 사주팔자·AI 타로·자미두수·점성술·궁합",
    isPartOf: { "@id": "https://code-destiny.com/#website" },
    potentialAction: {
      "@type": "ReadAction",
      target: [canonicalHref],
    },
  };

  return JSON.stringify({
    "@context": "https://schema.org",
    "@graph": [website, organization, webpage],
  });
}

export const metadata = {
  metadataBase: new URL("https://code-destiny.com"),
  applicationName: "꿀꿀 만세력",
  title: {
    default: "무료 사주팔자 · 타로 · 오늘의 운세 | 코드 데스티니(Code Destiny) 꿀꿀 만세력",
    template: "%s | 꿀꿀 만세력",
  },
  description:
    "생년월일로 보는 무료 사주팔자·타로 리딩·오늘의 운세. 자미두수·점성술·숙요점·궁합·신년운세·토정비결·꿈해몽·대운 분석까지. 코드 데스티니(Code Destiny) 꿀꿀 만세력 — 동서양 운세 무료 통합 플랫폼.",
  creator: "Code Destiny",
  publisher: "Code Destiny",
  category: "Fortune & Astrology",
  classification: "Fortune telling, astrology, saju, tarot",
  referrer: "origin-when-cross-origin",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  keywords: [
    // 한국어 핵심 (중복 제거: 타로·운세는 SEO_CORE에서 무료 변형으로 커버)
    "무료사주", "타로", "운세", "궁합", "점성술", "자미두수", "주역",
    "숙요점", "동물관상", "MBTI궁합", "해몽", "화투점",
    // 무료 + 정확도 의도 키워드 (사람들이 선호하는 검색어)
    "ai 사주", "ai 타로", "사주풀이", "심층 사주",
    // 영어 검색어
    "free tarot", "free horoscope", "free fortune telling", "accurate horoscope",
    "saju", "horoscope", "astrology", "fortune telling",
    "zi wei dou shu", "vedic astrology", "jyotish", "I Ching",
    ...SEO_CORE_KEYWORDS,
  ],
  alternates: {
    // canonical은 RootLayout에서 pathname 기반으로 동적 생성됨 — 여기서는 hreflang 언어 대안만 선언
    languages: {
      ko: "https://code-destiny.com/",
      en: "https://code-destiny.com/en-us",
      ja: "https://code-destiny.com/ja-jp",
      "zh-CN": "https://code-destiny.com/zh-cn",
      hi: "https://code-destiny.com/hi-in",
      es: "https://code-destiny.com/es-es",
      fr: "https://code-destiny.com/fr-fr",
      de: "https://code-destiny.com/de-de",
      nl: "https://code-destiny.com/nl-nl",
      ms: "https://code-destiny.com/ms-my",
      "x-default": "https://code-destiny.com/",
    },
  },
  openGraph: {
    type: "website",
    locale: "ko_KR",
    alternateLocale: ["en_US", "ja_JP", "zh_CN", "hi_IN", "es_ES", "fr_FR", "de_DE", "nl_NL", "ms_MY"],
    url: "https://code-destiny.com",
    siteName: "코드 데스티니 꿀꿀 만세력",
    title: "무료 사주팔자·타로·오늘의 운세 | 코드 데스티니",
    description: "생년월일 하나로 사주팔자·타로·자미두수·점성술·궁합·신년운세를 무료로. 코드 데스티니(Code Destiny) 꿀꿀 만세력.",
    images: [
      {
        url: "https://code-destiny.com/icons/og-image.png",
        width: 1200,
        height: 630,
        alt: "코드 데스티니 꿀꿀 만세력",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "코드 데스티니 — 무료 사주·타로·운세",
    description: "무료 사주팔자·타로·궁합·신년운세 통합 — 코드 데스티니(Code Destiny)",
    images: ["https://code-destiny.com/icons/og-image.png"],
  },
  verification: {
    google: process.env.NEXT_PUBLIC_SITE_VERIFY_GOOGLE || undefined,
    yandex: process.env.NEXT_PUBLIC_SITE_VERIFY_YANDEX || undefined,
    other: {
      "naver-site-verification": process.env.NEXT_PUBLIC_SITE_VERIFY_NAVER || undefined,
      "msvalidate.01": process.env.NEXT_PUBLIC_SITE_VERIFY_BING || undefined,
      "baidu-site-verification": process.env.NEXT_PUBLIC_SITE_VERIFY_BAIDU || undefined,
    },
  },
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/icons/honeypig.webp",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({ children }) {
  let DevWebVitalsConsole = null;
  if (process.env.NODE_ENV !== "production") {
    const mod = await import("./components/WebVitalsConsole");
    DevWebVitalsConsole = mod.default;
  }

  const headerStore = await headers();
  const requestPath = normalizePathname(
    headerStore.get("x-pathname") || headerStore.get("next-url") || "/",
  );
  const locale = detectLocaleFromPath(requestPath);
  const normalizedPath = normalizePathname(requestPath);
  const routeBasePath = stripLocalePrefix(normalizedPath);
  const canonicalLocalePath = locale.slug ? `${locale.slug}${routeBasePath === "/" ? "" : routeBasePath}` : routeBasePath;
  const canonicalHref = new URL(canonicalLocalePath, CANONICAL_ORIGIN).toString();
  const isTrustDocRoute = [
    "/high-value",
    "/insights",
    "/faq",
    "/about",
    "/contact-us",
    "/privacy-policy",
    "/terms-of-service",
    "/methodology",
  ].some((prefix) => routeBasePath === prefix || routeBasePath.startsWith(`${prefix}/`));
  const shouldLoadAdsense = !isTrustDocRoute;
  const isFullscreenRoute = routeBasePath === "/saju/love-simulation";

  const headerNavItems = [
    { href: "/", label: "홈" },
    { href: "/insights", label: "인사이트" },
    { href: "/high-value", label: "가치 문서" },
    { href: "/high-value/category/ultimate-guide", label: "가이드" },
    { href: "/high-value/category/informational-article", label: "정보글" },
    { href: "/high-value/category/faq-page", label: "FAQ" },
    { href: "/methodology", label: "방법론" },
  ];
  const hideFooter = false;
  const hreflangLinks = buildHreflangAlternates(requestPath);
  const jsonLd = buildJsonLd({ locale, canonicalHref });

  return (
    <html lang={locale.htmlLang} className={notoSansKR.variable}>
      <head>
        {/* 성능: 외부 오리진 사전 연결 (next/font 자체호스팅으로 fonts.googleapis/gstatic 불필요) */}
        <link rel="preconnect" href="https://code-destiny.com" />
        <link rel="canonical" href={canonicalHref} />
        <link rel="alternate" type="application/rss+xml" title="Code Destiny Insights RSS" href="https://code-destiny.com/rss.xml" />
        {hreflangLinks.map((link) => (
          <link key={link.hrefLang} rel="alternate" hrefLang={link.hrefLang} href={link.href} />
        ))}
        <meta property="og:site_name" content="Code Destiny" />
        <meta property="og:locale" content={locale.key.replace("-", "_")} />
        {LOCALES.filter((l) => l.key !== locale.key).map((l) => (
          <meta key={l.key} property="og:locale:alternate" content={l.key.replace("-", "_")} />
        ))}
        <meta name="yandex-verification" content="98b1cd43eb1188de" />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />
      </head>
      <body>
        {/* Google AdSense Auto Ads - defer after interaction/idle to protect mobile LCP/TBT */}
        {shouldLoadAdsense ? <DeferredAdsense /> : null}
        <AppVersionGuard />
        {DevWebVitalsConsole ? <DevWebVitalsConsole /> : null}
        <ToastProvider />
        {/* 전역 인증 상태 헤더 */}
        {!isFullscreenRoute && (
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
        )}
        {!isFullscreenRoute && (
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
        )}
        <div>{children}</div>
        <DisclaimerBanner />
        {!hideFooter && !isFullscreenRoute && <SiteFooterHub />}
      </body>
    </html>
  );
}

