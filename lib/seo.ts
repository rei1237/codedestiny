import type { Metadata } from "next";

export const SEO_SITE_URL = "https://code-destiny.com";
export const SEO_DEFAULT_OG_IMAGE = `${SEO_SITE_URL}/og/code-destiny-og.png`;
export const SEO_HOME_TITLE = "무료 사주팔자 · 오늘의 운세 · 꿀꿀 만세력 | 코드 데스티니";
export const SEO_TITLE_TEMPLATE = "%s | 코드 데스티니";

function cleanPath(path: string): string {
  const raw = String(path || "/").trim();
  if (!raw) return "/";

  const withoutQuery = raw.split("?")[0].split("#")[0] || "/";
  const withLeadingSlash = withoutQuery.startsWith("/") ? withoutQuery : `/${withoutQuery}`;
  const compact = withLeadingSlash.replace(/\/{2,}/g, "/");
  if (compact === "/") return "/";
  return compact.replace(/\/+$/, "") || "/";
}

export function toAbsoluteUrl(pathOrUrl: string): string {
  const value = String(pathOrUrl || "").trim();
  if (!value) return SEO_SITE_URL;

  if (value.startsWith("http://") || value.startsWith("https://")) {
    try {
      return new URL(value).toString();
    } catch {
      return SEO_SITE_URL;
    }
  }

  return `${SEO_SITE_URL}${cleanPath(value) === "/" ? "" : cleanPath(value)}`;
}

export type BuildSeoMetadataOptions = {
  path: string;
  title: string;
  description: string;
  keywords?: string[];
  noindex?: boolean;
  ogImage?: string;
  ogType?: "website" | "article";
  publishedTime?: string;
  modifiedTime?: string;
  hreflang?: Record<string, string>;
};

export function buildSeoMetadata(options: BuildSeoMetadataOptions): Metadata {
  const path = cleanPath(options.path);
  const canonical = toAbsoluteUrl(path);
  const title = path === "/" ? SEO_HOME_TITLE : String(options.title || "코드 데스티니").trim();
  const description = String(options.description || "").trim();
  const noindex = Boolean(options.noindex);

  const hasHreflang = Boolean(options.hreflang && Object.keys(options.hreflang).length > 0);
  const languages: Record<string, string> = {};
  if (hasHreflang) {
    for (const [locale, localePath] of Object.entries(options.hreflang || {})) {
      languages[locale] = toAbsoluteUrl(localePath);
    }
  }

  const ogImage = toAbsoluteUrl(options.ogImage || SEO_DEFAULT_OG_IMAGE);

  return {
    title: {
      absolute: title,
    },
    description,
    keywords: options.keywords || [],
    alternates: {
      canonical,
      ...(hasHreflang ? { languages } : {}),
    },
    robots: noindex
      ? {
          index: false,
          follow: false,
          googleBot: {
            index: false,
            follow: false,
          },
        }
      : {
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
    openGraph: {
      type: options.ogType || "website",
      title,
      description,
      url: canonical,
      siteName: "Code Destiny",
      locale: "ko_KR",
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
      ...(options.publishedTime ? { publishedTime: options.publishedTime } : {}),
      ...(options.modifiedTime ? { modifiedTime: options.modifiedTime } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
    },
  };
}
