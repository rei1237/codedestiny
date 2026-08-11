import type { Metadata } from "next";
import { BASE_URL } from "./seo-site-urls";
import { isNoindexPath, normalizeSeoPath, siteSeo, toCanonicalUrl } from "./seo/siteSeo";

export const SEO_V2_SITE = {
  name: siteSeo.siteName,
  titleTemplate: siteSeo.titleTemplate,
  defaultTitle: siteSeo.defaultTitle,
  defaultDescription: siteSeo.defaultDescription,
  siteUrl: (
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.PUBLIC_SITE_URL ||
    process.env.SITE_URL ||
    siteSeo.siteUrl ||
    BASE_URL
  ).replace(/\/+$/, ""),
  locale: "ko_KR",
  author: siteSeo.siteName,
  publisher: siteSeo.siteName,
  defaultOgImage: siteSeo.defaultOgImage,
};

const PRIVATE_ROUTE_PATTERNS = [
  /^\/api(?:\/|$)/,
  /^\/api-hello-test(?:\/|$)/,
  /^\/admin(?:\/|$)/,
  /^\/auth(?:\/|$)/,
  /^\/login(?:\/|$)/,
  /^\/signup(?:\/|$)/,
  /^\/me(?:\/|$)/,
  /^\/my(?:\/|$)/,
  /^\/points(?:\/|$)/,
  /^\/profile(?:\/|$)/,
  /^\/payment(?:\/|$)/,
  /^\/payments(?:\/|$)/,
  /^\/checkout(?:\/|$)/,
  /^\/success(?:\/|$)/,
  /^\/fail(?:\/|$)/,
  /^\/premium-unlock(?:\/|$)/,
  /^\/dev-status(?:\/|$)/,
  /^\/debug(?:\/|$)/,
  /^\/test(?:\/|$)/,
  /^\/result(?:\/|$)/,
  /^\/results(?:\/|$)/,
  /\/play(?:\/|$)/,
  /\/stage(?:\/|$)/,
  /\/start(?:\/|$)/,
  /\/callback(?:\/|$)/,
];

const TRACKING_PARAMS = new Set([
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "fbclid",
  "gclid",
  "msclkid",
  "session",
  "token",
  "auth",
]);

export type SeoV2Content = {
  path: string;
  title?: string;
  description?: string;
  image?: string;
  contentType?: "website" | "article" | "collection" | "software" | "result";
  publishedTime?: string;
  modifiedTime?: string;
  author?: string;
  category?: string;
  tags?: string[];
  keywords?: string[];
  noindex?: boolean;
};

export function normalizePath(pathOrUrl: string): string {
  return normalizeSeoPath(pathOrUrl);
}

export function isPrivateRoute(pathOrUrl: string): boolean {
  const path = normalizePath(pathOrUrl);
  return isNoindexPath(path) || PRIVATE_ROUTE_PATTERNS.some((pattern) => pattern.test(path));
}

export function isIndexableRoute(pathOrUrl: string, noindex = false): boolean {
  return !noindex && !isPrivateRoute(pathOrUrl);
}

export function stripTrackingParams(url: string): string {
  const input = String(url || "").trim();
  if (!input) return SEO_V2_SITE.siteUrl;

  try {
    const parsed = new URL(input, SEO_V2_SITE.siteUrl);
    for (const key of Array.from(parsed.searchParams.keys())) {
      if (TRACKING_PARAMS.has(key.toLowerCase())) parsed.searchParams.delete(key);
    }
    parsed.hash = "";
    return parsed.toString();
  } catch {
    return getCanonicalUrl("/");
  }
}

export function normalizeUrl(pathOrUrl: string): string {
  const input = String(pathOrUrl || "").trim();
  if (!input) return SEO_V2_SITE.siteUrl;

  try {
    const parsed = /^https?:\/\//i.test(input)
      ? new URL(input)
      : new URL(normalizePath(input), SEO_V2_SITE.siteUrl);
    parsed.hash = "";
    if (parsed.pathname !== "/") parsed.pathname = parsed.pathname.replace(/\/+$/, "");
    return stripTrackingParams(parsed.toString());
  } catch {
    return SEO_V2_SITE.siteUrl;
  }
}

export function getCanonicalUrl(pathOrUrl: string): string {
  return toCanonicalUrl(pathOrUrl);
}

export function buildOpenGraphImageUrl(content?: Pick<SeoV2Content, "image" | "contentType">): string {
  const image = String(content?.image || "").trim();
  if (image) return normalizeUrl(image);

  if (content?.contentType === "article") return normalizeUrl("/og/insights-og.png");
  if (content?.contentType === "result") return normalizeUrl("/og/code-destiny-result-og.png");
  return normalizeUrl(SEO_V2_SITE.defaultOgImage);
}

export function buildSeoMetadataV2(content: SeoV2Content): Metadata {
  const canonical = getCanonicalUrl(content.path);
  const title = String(content.title || SEO_V2_SITE.defaultTitle).trim();
  const description = String(content.description || SEO_V2_SITE.defaultDescription).trim();
  const ogImage = buildOpenGraphImageUrl(content);
  const indexable = isIndexableRoute(content.path, content.noindex);

  return {
    metadataBase: new URL(SEO_V2_SITE.siteUrl),
    title,
    description,
    keywords: content.keywords || content.tags || [],
    alternates: {
      canonical,
    },
    robots: indexable
      ? {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
            "max-image-preview": "large",
            "max-snippet": -1,
            "max-video-preview": -1,
          },
        }
      : {
          index: false,
          follow: false,
          googleBot: {
            index: false,
            follow: false,
          },
        },
    openGraph: {
      type: content.contentType === "article" ? "article" : "website",
      siteName: SEO_V2_SITE.name,
      locale: SEO_V2_SITE.locale,
      title,
      description,
      url: canonical,
      images: [{ url: ogImage, width: 1200, height: 630, alt: title }],
      ...(content.publishedTime ? { publishedTime: content.publishedTime } : {}),
      ...(content.modifiedTime ? { modifiedTime: content.modifiedTime } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
    },
    authors: [{ name: content.author || SEO_V2_SITE.author }],
    publisher: SEO_V2_SITE.publisher,
    category: content.category,
  };
}

export function buildWebPageJsonLdV2(content: SeoV2Content) {
  const canonical = getCanonicalUrl(content.path);
  const title = String(content.title || SEO_V2_SITE.defaultTitle).trim();
  const description = String(content.description || SEO_V2_SITE.defaultDescription).trim();
  const image = buildOpenGraphImageUrl(content);

  return {
    "@context": "https://schema.org",
    "@type": content.contentType === "collection" ? "CollectionPage" : "WebPage",
    "@id": `${canonical}#webpage`,
    url: canonical,
    name: title,
    description,
    isPartOf: { "@id": `${SEO_V2_SITE.siteUrl}/#website` },
    about: { "@id": `${SEO_V2_SITE.siteUrl}/#organization` },
    primaryImageOfPage: {
      "@type": "ImageObject",
      url: image,
      width: 1200,
      height: 630,
    },
    inLanguage: "ko-KR",
  };
}
