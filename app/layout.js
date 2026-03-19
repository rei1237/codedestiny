import "../styles/globals.css";
import { headers } from "next/headers";

const CANONICAL_ORIGIN = "https://code-destiny.com";
const LOCALES = [
  { key: "ko-KR", slug: "", htmlLang: "ko", label: "Korean" },
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
    "/privacy-policy",
    "/terms-of-service",
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
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Code Destiny",
    url: CANONICAL_ORIGIN,
    inLanguage: locale.key,
  };

  const organization = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Code Destiny",
    url: CANONICAL_ORIGIN,
  };

  const webpage = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    url: canonicalHref,
    inLanguage: locale.key,
    name: "Code Destiny",
    isPartOf: { "@id": CANONICAL_ORIGIN },
  };

  return JSON.stringify([website, organization, webpage]);
}

export const metadata = {
  metadataBase: new URL("https://code-destiny.com"),
  title: {
    default: "Code Destiny | 무료 사주 타로 운세",
    template: "%s | Code Destiny",
  },
  description:
    "Code Destiny는 무료 사주, 타로, 운세, 궁합 콘텐츠를 제공하는 서비스입니다. 개인정보처리방침, 이용약관, 문의 채널을 투명하게 제공합니다.",
  keywords: [
    "Code Destiny",
    "사주",
    "타로",
    "운세",
    "개인정보처리방침",
    "이용약관",
    "문의하기",
    "무료 운세",
  ],
  alternates: {
    canonical: "/",
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
  },
};

export default async function RootLayout({ children }) {
  const headerStore = await headers();
  const requestPath = normalizePathname(
    headerStore.get("x-pathname") || headerStore.get("next-url") || "/",
  );
  const canonicalHref = new URL(requestPath, CANONICAL_ORIGIN).toString();
  const hideFooter = false;
  const locale = detectLocaleFromPath(requestPath);
  const hreflangLinks = buildHreflangAlternates(requestPath);
  const jsonLd = buildJsonLd({ locale, canonicalHref });

  return (
    <html lang={locale.htmlLang}>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <link rel="canonical" href={canonicalHref} />
        {hreflangLinks.map((link) => (
          <link key={link.hrefLang} rel="alternate" hrefLang={link.hrefLang} href={link.href} />
        ))}
        <meta property="og:site_name" content="Code Destiny" />
        <meta property="og:locale" content={locale.key.replace("-", "_")} />
        {LOCALES.filter((l) => l.key !== locale.key).map((l) => (
          <meta key={l.key} property="og:locale:alternate" content={l.key.replace("-", "_")} />
        ))}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />
        <meta name="adsense-script-slot" content="ADSENSE_APPROVAL_SCRIPT_SLOT" />
        <meta name="adsense-unit-slot" content="ADSENSE_AD_UNIT_SLOT" />
      </head>
      <body>
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
