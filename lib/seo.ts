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

/**
 * SERP 설명은 글자 수가 아니라 **픽셀 폭**으로 잘린다(데스크톱 약 920px). 한중일 글자는
 * 라틴의 약 2배 폭이라, 글자 수 기준으로 맞춘 문구는 한국어에서 한계의 두 배가 나간다.
 * 2026-08-27 dist 실측: 색인 388개 중 183개가 폭 160 을 넘었고 최대 277 이었다.
 *
 * 폭은 UAX#11 의 Wide/Fullwidth 를 2, 나머지를 1 로 세는 근사값이다(Ambiguous 는 1).
 * 같은 기준을 `scripts/verify-adsense-readiness.mjs` 의 EAST_ASIAN_WIDE 가 강제한다.
 */
export const SEO_DESCRIPTION_WIDTH_LIMIT = 160;
const EAST_ASIAN_WIDE = /[\u1100-\u115F\u2E80-\u303E\u3041-\u33FF\u3400-\u4DBF\u4E00-\u9FFF\uA000-\uA4CF\uAC00-\uD7A3\uF900-\uFAFF\uFE30-\uFE6F\uFF00-\uFF60\uFFE0-\uFFE6]/;

export function seoDisplayWidth(text: string): number {
  return [...String(text)].reduce((total, char) => total + (EAST_ASIAN_WIDE.test(char) ? 2 : 1), 0);
}

/** 폭 한계에서 자르되, 뒤쪽에 공백이 있으면 거기까지 되돌려 단어를 쪼개지 않는다. */
export function truncateToDisplayWidth(text: string, limit = SEO_DESCRIPTION_WIDTH_LIMIT): string {
  const source = String(text || "").replace(/\s+/g, " ").trim();
  if (seoDisplayWidth(source) <= limit) return source;
  let out = "";
  let used = 0;
  for (const char of source) {
    const next = used + (EAST_ASIAN_WIDE.test(char) ? 2 : 1);
    if (next > limit - 1) break;
    out += char;
    used = next;
  }
  const lastSpace = out.lastIndexOf(" ");
  if (lastSpace > limit / 3) out = out.slice(0, lastSpace);
  return `${out.replace(/[\s·,]+$/, "")}…`;
}

export function buildSeoMetadata(options: BuildSeoMetadataOptions): Metadata {
  const path = normalizeSeoPath(options.path);
  const page = getPublicSeoPageByPath(path);
  const canonical = toCanonicalUrl(path);
  const title = String(options.title || page?.title || siteSeo.defaultTitle).trim();
  const description = truncateToDisplayWidth(
    String(options.description || page?.description || siteSeo.defaultDescription),
  );
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
      siteName: siteSeo.brandName,
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
