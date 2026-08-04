import type { Metadata } from "next";
import { SEO_CORE_KEYWORDS, mergeKeywords } from "./seo-metadata";
import { getSeoProfileKeywords } from "./seo/entity-registry.mjs";
import {
  getPublicSeoPageByPath,
  isNoindexPath,
  normalizeSeoPath,
  siteSeo,
  toCanonicalUrl,
} from "./seo/siteSeo";

export const SEO_SITE_URL = siteSeo.siteUrl;
export const SEO_DEFAULT_OG_IMAGE = siteSeo.defaultOgImage;
export const SEO_HOME_TITLE = siteSeo.defaultTitle;
export const SEO_TITLE_TEMPLATE = siteSeo.titleTemplate;

export function toAbsoluteUrl(pathOrUrl: string): string {
  return toCanonicalUrl(pathOrUrl || "/");
}

export type BuildSeoMetadataOptions = {
  path: string;
  title?: string;
  description?: string;
  keywords?: string[];
  noindex?: boolean;
  ogImage?: string;
  ogType?: "website" | "article";
  publishedTime?: string;
  modifiedTime?: string;
  hreflang?: Record<string, string>;
};

export function buildSeoMetadata(options: BuildSeoMetadataOptions): Metadata {
  const path = normalizeSeoPath(options.path);
  const page = getPublicSeoPageByPath(path);
  const canonical = toCanonicalUrl(path);
  const title = String(options.title || page?.title || siteSeo.defaultTitle).trim();
  const description = String(options.description || page?.description || siteSeo.defaultDescription).trim();
  const indexable = !options.noindex && !isNoindexPath(path);
  const image = options.ogImage || page?.ogImage || siteSeo.defaultOgImage;
  const keywords = mergeKeywords(
    SEO_CORE_KEYWORDS,
    getSeoProfileKeywords(path),
    page?.keywords,
    options.keywords,
  );

  const languages: Record<string, string> = {};
  if (options.hreflang) {
    for (const [locale, localePath] of Object.entries(options.hreflang)) {
      if (!localePath) continue;
      languages[locale] = toCanonicalUrl(localePath);
    }
  }

  return {
    metadataBase: new URL(siteSeo.siteUrl),
    title: { absolute: title },
    description,
    keywords,
    alternates: {
      canonical,
      ...(Object.keys(languages).length > 0 ? { languages } : {}),
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
      type: options.ogType || "website",
      title,
      description,
      url: canonical,
      siteName: siteSeo.siteName,
      locale: "ko_KR",
      images: [
        {
          url: image,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
      ...(options.publishedTime ? { publishedTime: options.publishedTime } : {}),
      ...(options.modifiedTime ? { modifiedTime: options.modifiedTime } : {}),
    },
    twitter: {
      card: siteSeo.twitterCard,
      title,
      description,
      images: [image],
    },
  };
}
