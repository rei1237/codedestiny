import type { Metadata } from "next";
import {
  buildOpenGraphImageUrl,
  getCanonicalUrl,
  isIndexableRoute,
  normalizePath,
} from "./seo.v2";

export const SEO_SITE_URL = "https://code-destiny.com";
export const SEO_DEFAULT_OG_IMAGE = `${SEO_SITE_URL}/og/code-destiny-og.png`;
export const SEO_HOME_TITLE = "무료 사주팔자 · 오늘의 운세 · 꿀꿀 운세 | 코드 데스티니";
export const SEO_TITLE_TEMPLATE = "%s | 꿀꿀 운세";

const SEO_REQUIRED_PLATFORM_KEYWORDS = [
  "코드 데스티니",
  "Code Destiny",
  "무료 운세",
  "숙요점",
  "사주팔자",
  "자미두수 명반",
  "타로 카드",
  "베다 점성술",
  "고품질 운세 리포트",
];

function mergeUniqueKeywords(input: string[] = []): string[] {
  return Array.from(
    new Set([...SEO_REQUIRED_PLATFORM_KEYWORDS, ...input.map((item) => String(item || "").trim()).filter(Boolean)]),
  );
}

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
  return getCanonicalUrl(pathOrUrl || "/");
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
  const path = normalizePath(options.path);
  const canonical = getCanonicalUrl(path);
  const title = path === "/" ? SEO_HOME_TITLE : String(options.title || "코드 데스티니 꿀꿀 운세").trim();
  const description = String(options.description || "").trim();
  const indexable = isIndexableRoute(path, Boolean(options.noindex));

  const hasHreflang = Boolean(options.hreflang && Object.keys(options.hreflang).length > 0);
  const languages: Record<string, string> = {};
  if (hasHreflang) {
    for (const [locale, localePath] of Object.entries(options.hreflang || {})) {
      languages[locale] = toAbsoluteUrl(localePath);
    }
  }

  const ogImage = buildOpenGraphImageUrl({
    image: options.ogImage || SEO_DEFAULT_OG_IMAGE,
    contentType: options.ogType === "article" ? "article" : "website",
  });
  const mergedKeywords = mergeUniqueKeywords(options.keywords || []);

  return {
    title: {
      absolute: title,
    },
    description,
    keywords: mergedKeywords,
    alternates: {
      canonical,
      ...(hasHreflang ? { languages } : {}),
    },
    robots: !indexable
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
      siteName: "Code Destiny | 꿀꿀 운세",
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
