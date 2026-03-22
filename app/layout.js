import "../styles/globals.css";
import { headers } from "next/headers";
import WebVitalsConsole from "./components/WebVitalsConsole";

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
  let basePath = stripLocalePrefix(currentPathname);
  const supported = new Set([
    "/",
    "/tarot/healing",
    "/points",
    "/login",
    "/signup",
    "/about",
    "/insights",
    "/privacy-policy",
    "/terms-of-service",
    "/faq",
    "/contact-us",
  ]);
  if (!supported.has(basePath)) {
    basePath = "/";
  }
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
    alternateName: "연이의 꿀꿀 만세력",
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
    name: "무료 사주 타로 운세 | 연이의 꿀꿀 만세력",
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
  title: {
    default: "연이의 꿀꿀 만세력 | 무료 사주 타로 운세 점성술 궁합",
    template: "%s | 연이의 꿀꿀 만세력",
  },
  description:
    "무료 사주 타로 운세 플랫폼. AI 타로, 자미두수, 점성술, 주역, 숙요점, 동물 관상 등 20가지 이상의 운세 서비스를 한 곳에서. Free Saju Tarot Horoscope Fortune.",
  keywords: [
    "무료사주", "타로", "운세", "궁합", "점성술", "자미두수", "주역",
    "숙요점", "동물관상", "MBTI궁합", "해몽", "화투점",
    "free tarot", "saju", "horoscope", "astrology", "fortune telling",
    "zi wei dou shu", "vedic astrology", "jyotish", "I Ching",
  ],
  alternates: {
    canonical: "https://code-destiny.com",
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
    alternateLocale: ["en_US", "ja_JP", "zh_CN"],
    url: "https://code-destiny.com",
    siteName: "연이의 꿀꿀 만세력",
    title: "연이의 꿀꿀 만세력 | 무료 사주 타로 운세",
    description: "생년월일로 보는 무료 사주팔자·AI 타로·자미두수·점성술·숙요점·궁합.",
    images: [
      {
        url: "https://code-destiny.com/icons/honeypig.webp",
        width: 1200,
        height: 630,
        alt: "연이의 꿀꿀 만세력 — 무료 사주 타로 운세 플랫폼",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "연이의 꿀꿀 만세력 | 무료 사주 타로 운세",
    description: "AI 타로·점성술·자미두수 등 20+ 운세 서비스 무료 제공",
    images: ["https://code-destiny.com/icons/honeypig.webp"],
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
    googleBot: { index: true, follow: true },
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/icons/honeypig.webp",
  },
};

export default async function RootLayout({ children }) {
  const headerStore = await headers();
  const requestPath = normalizePathname(
    headerStore.get("x-pathname") || headerStore.get("next-url") || "/",
  );
  const locale = detectLocaleFromPath(requestPath);
  const normalizedPath = normalizePathname(requestPath);
  const routeBasePath = stripLocalePrefix(normalizedPath);
  const canonicalLocalePath = locale.slug ? `${locale.slug}${routeBasePath === "/" ? "" : routeBasePath}` : routeBasePath;
  const canonicalHref = new URL(canonicalLocalePath, CANONICAL_ORIGIN).toString();
  const hideFooter = false;
  const hreflangLinks = buildHreflangAlternates(requestPath);
  const jsonLd = buildJsonLd({ locale, canonicalHref });
  const websiteSchemaJsonLd = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": "https://code-destiny.com/#website",
    name: "Code Destiny — 연이의 꿀꿀 만세력",
    alternateName: ["꿀꿀 만세력", "Code Destiny"],
    url: "https://code-destiny.com",
    description: "무료 사주팔자·AI 타로·자미두수·점성술·숙요점·궁합 서비스. 10개 언어 지원.",
    inLanguage: ["ko", "en", "ja", "zh", "hi", "es", "fr", "de", "nl", "ms"],
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: "https://code-destiny.com/insights?q={search_term_string}",
      },
      "query-input": "required name=search_term_string",
    },
    publisher: {
      "@type": "Organization",
      "@id": "https://code-destiny.com/#organization",
      name: "Code Destiny",
      url: "https://code-destiny.com",
    },
  });

  return (
    <html lang={locale.htmlLang}>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
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
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: websiteSchemaJsonLd }} />
        <meta name="adsense-script-slot" content="ADSENSE_APPROVAL_SCRIPT_SLOT" />
        <meta name="adsense-unit-slot" content="ADSENSE_AD_UNIT_SLOT" />
      </head>
      <body>
        <WebVitalsConsole />
        <div>{children}</div>
        {!hideFooter && (
          <footer
            style={{
              marginTop: "40px",
              padding: "20px 16px 28px",
              borderTop: "1px solid rgba(148, 163, 184, 0.28)",
              fontSize: "14px",
              textAlign: "center",
              color: "#cbd5e1",
              background: "rgba(15, 23, 42, 0.9)",
            }}
          >
            <p style={{ marginBottom: "8px" }}>© 2026 Code Destiny. All rights reserved.</p>
            <nav
              aria-label="정책 페이지 바로가기"
              style={{ display: "flex", gap: "14px", justifyContent: "center", flexWrap: "wrap" }}
            >
              <a
                href="https://code-destiny.com/about"
                style={{ color: "#e2e8f0", textDecoration: "underline" }}
              >
                About
              </a>
              <a
                href="https://code-destiny.com/insights"
                style={{ color: "#e2e8f0", textDecoration: "underline" }}
              >
                Insights
              </a>
              <a
                href="https://code-destiny.com/privacy-policy"
                style={{ color: "#e2e8f0", textDecoration: "underline" }}
              >
                Privacy Policy
              </a>
              <a
                href="https://code-destiny.com/terms-of-service"
                style={{ color: "#e2e8f0", textDecoration: "underline" }}
              >
                Terms of Service
              </a>
              <a
                href="https://code-destiny.com/faq"
                style={{ color: "#e2e8f0", textDecoration: "underline" }}
              >
                FAQ
              </a>
              <a
                href="https://code-destiny.com/contact-us"
                style={{ color: "#e2e8f0", textDecoration: "underline" }}
              >
                Contact Us
              </a>
            </nav>
          </footer>
        )}
      </body>
    </html>
  );
}
