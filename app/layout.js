import "../styles/globals.css";
import "../styles/disclaimer-banner.css";
import { Noto_Sans_KR } from "next/font/google";
import { headers } from "next/headers";

const notoSansKR = Noto_Sans_KR({
  weight: ["300", "400", "500", "700"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-noto-sans-kr",
  preload: true,
});
import Link from "next/link";
import AppVersionGuard from "./components/AppVersionGuard";
import SiteFooterHub from "./components/SiteFooterHub";
import InternalLinksHub from "./components/InternalLinksHub";
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

const ROUTE_SEO_PROFILES = [
  {
    match: /^\/$/,
    title: "무료 사주팔자 · 자미두수 운세 분석 · AI 타로 | 코드 데스티니",
    description:
      "생년월일 기반 무료 사주팔자, 자미두수 운세 분석, AI 타로, 점성술, 궁합을 한곳에서 제공하는 통합 운세 문서 플랫폼입니다.",
    keywords: ["무료 사주", "자미두수 운세 분석", "AI 타로", "운세"],
    image: "https://code-destiny.com/icons/og-image.png",
  },
  {
    match: /^\/saju(\/|$)/,
    title: "무료 사주 운세 분석 | 코드 데스티니",
    description:
      "무료 사주 운세 분석과 대운·세운 흐름, 합충형파해 해석을 구조적으로 제공하는 사주 전문 페이지입니다.",
    keywords: ["무료 사주", "사주 운세 분석", "합충형파해", "대운"],
    image: "https://code-destiny.com/icons/og-image.png",
  },
  {
    match: /^\/ziwei(\/|$)/,
    title: "자미두수 운세 분석 | 코드 데스티니",
    description:
      "명궁·신궁·12궁 기반 자미두수 운세 분석과 사화, 대한 흐름을 깊이 있게 제공하는 자미두수 전문 페이지입니다.",
    keywords: ["자미두수 운세 분석", "명궁", "신궁", "12궁"],
    image: "https://code-destiny.com/icons/og-image.png",
  },
  {
    match: /^\/tarot(\/|$)/,
    title: "무료 타로 리딩 · 사주 결합 운세 분석 | 코드 데스티니",
    description:
      "연애·재회·힐링·연간운 등 다양한 타로 스프레드와 사주 보조 해석을 함께 제공하는 무료 타로 운세 페이지입니다.",
    keywords: ["무료 타로", "타로 리딩", "사주 결합", "운세 분석"],
    image: "https://code-destiny.com/icons/og-image.png",
  },
  {
    match: /^\/astrology(\/|$)/,
    title: "점성술 차트 · 자미두수 교차 운세 분석 | 코드 데스티니",
    description:
      "태양·달·상승궁과 행성 흐름을 기반으로 점성술과 동양 명리 해석을 연결한 운세 분석 페이지입니다.",
    keywords: ["점성술", "코즈믹 차트", "자미두수 운세 분석", "행성"],
    image: "https://code-destiny.com/icons/og-image.png",
  },
  {
    match: /^\/oracle(\/|$)/,
    title: "오라클 운세 · 무료 사주 연계 해석 | 코드 데스티니",
    description:
      "화투점, 찻잎점, 주석점 등 오라클 리딩을 무료 사주 해석과 함께 제공하는 복합 운세 페이지입니다.",
    keywords: ["오라클", "화투점", "찻잎점", "무료 사주"],
    image: "https://code-destiny.com/icons/og-image.png",
  },
  {
    match: /^\/(insights|high-value)(\/|$)/,
    title: "무료 사주 · 자미두수 운세 분석 정보 문서 | 코드 데스티니",
    description:
      "무료 사주, 자미두수 운세 분석, 타로, 점성술 관련 장문 가이드와 FAQ를 제공하는 정보성 문서 허브입니다.",
    keywords: ["무료 사주", "자미두수 운세 분석", "FAQ", "가이드"],
    image: "https://code-destiny.com/icons/og-image.png",
  },
];

function resolveRouteSeo(pathname) {
  const normalized = normalizePathname(pathname);
  for (const profile of ROUTE_SEO_PROFILES) {
    if (profile.match.test(normalized)) return profile;
  }
  return ROUTE_SEO_PROFILES[0];
}

function normalizePathname(input) {
  if (!input) return "/";

  let pathname = "";

  try {
    if (input.startsWith("http://") || input.startsWith("https://")) {
      pathname = new URL(input).pathname || "/";
    } else {
      pathname = String(input).split("?")[0].split("#")[0] || "/";
    }
  } catch {
    return "/";
  }

  const withLeadingSlash = pathname.startsWith("/") ? pathname : `/${pathname}`;
  const compact = withLeadingSlash.replace(/\/{2,}/g, "/");
  const withoutTrailing = compact.length > 1 ? compact.replace(/\/+$/, "") : compact;
  return withoutTrailing || "/";
}

function detectLocaleFromPath(pathname) {
  const normalized = normalizePathname(pathname).toLowerCase();
  const match = LOCALES.find(
    (locale) => locale.slug && (normalized === locale.slug || normalized.startsWith(`${locale.slug}/`)),
  );
  return match || LOCALES[0];
}

function stripLocalePrefix(pathname) {
  const normalized = normalizePathname(pathname);
  const normalizedLower = normalized.toLowerCase();
  for (const locale of LOCALES) {
    if (!locale.slug) continue;
    const localeSlugLower = locale.slug.toLowerCase();
    if (normalizedLower === localeSlugLower) return "/";
    if (normalizedLower.startsWith(`${localeSlugLower}/`)) {
      return normalized.slice(locale.slug.length) || "/";
    }
  }
  return normalized;
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

export async function generateMetadata() {
  const headerStore = await headers();
  const requestPath = normalizePathname(
    headerStore.get("x-pathname") || headerStore.get("next-url") || "/",
  );
  const locale = detectLocaleFromPath(requestPath);
  const routeBasePath = stripLocalePrefix(normalizePathname(requestPath));
  const routeSeo = resolveRouteSeo(routeBasePath);
  const routeMetaCode = `${locale.key.toLowerCase()}-${(routeBasePath === "/" ? "home" : routeBasePath.slice(1)).replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "") || "root"}`;
  const routeTitleMarker = `[layout:${routeMetaCode}]`;
  const routeDescriptionMarker = `레이아웃경로코드:${routeMetaCode}`;
  const uniqueLayoutTitle = `${routeSeo.title} ${routeTitleMarker}`;
  const uniqueLayoutDescription = routeSeo.description.includes(routeDescriptionMarker)
    ? routeSeo.description
    : `${routeSeo.description}${routeSeo.description.endsWith(".") ? " " : ". "}${routeDescriptionMarker}.`;
  const canonicalLocalePath = locale.slug
    ? `${locale.slug}${routeBasePath === "/" ? "" : routeBasePath}`
    : routeBasePath;
  const canonicalHref = new URL(canonicalLocalePath, CANONICAL_ORIGIN).toString();

  return {
    metadataBase: new URL("https://code-destiny.com"),
    applicationName: "꿀꿀 만세력",
    title: {
      default: uniqueLayoutTitle,
      template: `%s ${routeTitleMarker} | 꿀꿀 만세력`,
    },
    description: uniqueLayoutDescription,
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
      ...routeSeo.keywords,
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
      // 페이지별 generateMetadata가 canonical을 오버라이드하며, 없는 페이지는 여기서 동적 생성된 값이 적용됨
      canonical: canonicalHref,
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
      url: canonicalHref,
      siteName: "코드 데스티니 꿀꿀 만세력",
      title: uniqueLayoutTitle,
      description: uniqueLayoutDescription,
      images: [
        {
          url: routeSeo.image,
          width: 1200,
          height: 630,
          alt: uniqueLayoutTitle,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: uniqueLayoutTitle,
      description: uniqueLayoutDescription,
      images: [routeSeo.image],
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
}

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
        {/* canonical은 generateMetadata()에서 단일 출력 — JSX 중복 제거 */}
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
        {!isFullscreenRoute && <InternalLinksHub />}
        {!hideFooter && <SiteFooterHub />}
      </body>
    </html>
  );
}

