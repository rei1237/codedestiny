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
import { ogLocaleFor } from "./i18n/locales";
import { ROBOTS_META } from "./seo/index-policy.mjs";
import { alternatesFor, toNextLanguages } from "./seo/hreflang.mjs";

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
  /** 페이지 로케일(ko 가 아닐 때만 넘긴다). og:locale 을 정한다. 생략하면 ko_KR. */
  locale?: string;
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

const SEO_DESCRIPTION_MIN_LENGTH = 50;
// 문장 끝: 라틴 구두점은 뒤가 공백이나 끝일 때만(3.5 같은 소수점 제외), 한중일 구두점은 그대로.
const SENTENCE_END = /[.!?]+["'”’)\]]*(?=\s|$)|[。！？]+[」』”）]*/g;

/**
 * 한계 안에 온전히 들어오는 마지막 문장까지. 너무 짧게 남으면 null 을 돌려 폭 절단에 맡긴다.
 * 하한은 폭 절반과 50자 — `scripts/verify-adsense-readiness.mjs` 가 50자 미만 설명을 빌드 실패로 본다.
 */
function cutAtSentenceBoundary(source: string, limit: number): string | null {
  let best = "";
  for (const match of source.matchAll(SENTENCE_END)) {
    const candidate = source.slice(0, (match.index ?? 0) + match[0].length);
    if (seoDisplayWidth(candidate) > limit) break;
    best = candidate;
  }
  return seoDisplayWidth(best) >= limit / 2 && best.length >= SEO_DESCRIPTION_MIN_LENGTH ? best : null;
}

/**
 * 폭 한계를 넘으면 먼저 문장 경계에서 끊는다(2026-11-14, 색인 229쪽의 설명이 `…` 로 끝났다).
 * 한계 안에 쓸 만한 문장 경계가 없을 때만 폭에서 자르고 `…` 를 붙인다. 이때 뒤쪽에 공백이
 * 있으면 거기까지 되돌려 단어를 쪼개지 않는다.
 */
export function truncateToDisplayWidth(text: string, limit = SEO_DESCRIPTION_WIDTH_LIMIT): string {
  const source = String(text || "").replace(/\s+/g, " ").trim();
  if (seoDisplayWidth(source) <= limit) return source;
  const atSentence = cutAtSentenceBoundary(source, limit);
  if (atSentence) return atSentence;
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

  // hreflang 집합은 사이트맵과 같은 함수 하나가 만든다(색인 형제만, 2개 미만이면 없음, x-default=ko).
  const languages: Record<string, string> = options.hreflang ? toNextLanguages(alternatesFor(options.hreflang)) : {};

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
      ? ROBOTS_META.INDEX
      : ROBOTS_META.NOINDEX,
    openGraph: {
      type: options.ogType || "website",
      title,
      description,
      url: canonical,
      siteName: siteSeo.brandName,
      locale: ogLocaleFor(options.locale),
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
