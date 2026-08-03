/**
 * generatePageMetadata — 사주·타로·오라클 등 서비스 페이지에서
 * generateMetadata()를 구현할 때 사용하는 공통 헬퍼.
 *
 * 역할:
 *  1. process.env.NEXT_PUBLIC_SITE_URL 기반 canonical URL 자동 생성 (슬래시 정규화 포함)
 *  2. hreflang 언어 대안 구성 (명시된 경우만)
 *  3. OpenGraph / Twitter Card 기본값 병합
 *  4. SoftwareApplication JSON-LD 데이터 반환 (page.tsx에서 <script> 삽입용)
 *
 * 사용 예시 (app/saju/basic/page.tsx):
 *   export async function generateMetadata() {
 *     return generatePageMetadata({
 *       path: "/saju/basic",
 *       title: pageCopy.title,
 *       description: pageCopy.description,
 *       keywords: pageCopy.keywords,
 *       featureList: pageCopy.featureList,
 *     });
 *   }
 */

import { siteSeo } from "./seo/siteSeo";
import { mergeKeywords, SEO_CORE_KEYWORDS, toAbsoluteUrl } from "./seo-metadata";
import { getSeoProfileKeywords } from "./seo/entity-registry.mjs";
import { buildOpenGraphImageUrl, getCanonicalUrl, isIndexableRoute, normalizePath } from "./seo.v2";

const SITE_ORIGIN = siteSeo.siteUrl.replace(/\/$/, "");
const DEFAULT_OG_IMAGE_URL = siteSeo.defaultOgImage;

/** 경로 끝 슬래시를 제거해 canonical 중복 방지 */
function normalizeCanonicalPath(path: string): string {
  const raw = String(path || "").trim();
  const noQuery = raw.split("?")[0].split("#")[0] || "/";
  const withLeadingSlash = noQuery.startsWith("/") ? noQuery : `/${noQuery}`;
  const compact = withLeadingSlash.replace(/\/{2,}/g, "/");
  const clean = compact.length > 1 ? compact.replace(/\/+$/, "") : compact;
  return clean || "/";
}

function normalizeCodeSegment(value: string): string {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

function buildRouteMetaCode(path: string, variantKey?: string, inLanguage?: string): string {
  const normalizedPath = normalizeCodeSegment(path.replace(/\//g, "-")) || "home";
  const normalizedVariant = normalizeCodeSegment(variantKey || "");
  const normalizedLang = normalizeCodeSegment(inLanguage || "ko-kr") || "ko-kr";
  return [normalizedPath, normalizedVariant, normalizedLang].filter(Boolean).join("__");
}

function appendUniqueTitle(title: string, routeCode: string): string {
  void routeCode;
  return String(title || "").trim();
}

function appendUniqueDescription(description: string, routeCode: string): string {
  void routeCode;
  return String(description || "").trim();
}

function normalizeMetaText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function pickFirstImageUrl(value: unknown): string {
  if (!Array.isArray(value) || value.length === 0) return "";
  const first = value[0];
  if (typeof first === "string") return first.trim();
  if (first && typeof first === "object" && "url" in first) {
    return normalizeMetaText((first as { url?: unknown }).url);
  }
  return "";
}

type HreflangPathMap = Partial<{
  ko: string;
  ja: string;
  zh: string;
  en: string;
  "x-default": string;
}>;

export interface FortunePageMeta {
  /** 루트 기준 경로. 예: "/saju/basic" */
  path: string;
  title: string;
  description: string;
  keywords?: ReadonlyArray<string> | string[];
  /** OG 이미지 절대 URL. 없으면 사이트 기본 이미지 사용 */
  image?: string;
  /** SoftwareApplication featureList */
  featureList?: ReadonlyArray<string> | string[];
  /** 서비스 카테고리. 기본값: "LifestyleApplication" */
  applicationCategory?: string;
  /** 무료 접근 여부가 실제 기능 정책으로 확인된 경우에만 명시한다. */
  isAccessibleForFree?: boolean;
  /** 실제 가격·접근 조건이 확인된 경우에만 명시하는 Offer 데이터. */
  offer?: Record<string, unknown>;
  /** 게시일 (ISO Date string). 기본값: undefined */
  publishedAt?: string;
  /** 수정일 (ISO Date string). 없으면 current date */
  updatedAt?: string;
  /** 콘텐츠 언어. 기본값: "ko-KR" */
  inLanguage?: string;
  /** 같은 path 내 query/topic 등 변형 페이지를 구분하는 키 */
  variantKey?: string;
  /**
   * 번역이 실제 존재하는 경우에만 전달한다.
   * 미전역 페이지에서 가짜 alternates를 생성하지 않기 위해 기본값은 undefined.
   */
  hreflangPaths?: HreflangPathMap;
}

/** Next.js generateMetadata()에서 반환할 수 있는 메타데이터 객체를 만든다 */
export function generatePageMetadata(opts: FortunePageMeta) {
  const {
    path,
    title,
    description,
    keywords = [],
    image,
    publishedAt,
    updatedAt,
    inLanguage = "ko-KR",
    variantKey,
    hreflangPaths,
  } = opts;

  const canonicalPath = normalizePath(path);
  const canonicalUrl = getCanonicalUrl(canonicalPath);
  const routeMetaCode = buildRouteMetaCode(canonicalPath, variantKey, inLanguage);
  const uniqueTitle = appendUniqueTitle(title, routeMetaCode);
  const uniqueDescription = appendUniqueDescription(description, routeMetaCode);

  const ogImage = buildOpenGraphImageUrl({ image: image || DEFAULT_OG_IMAGE_URL });

  const languagesMap: Record<string, string> = {};
  if (hreflangPaths) {
    for (const [lang, localizedPath] of Object.entries(hreflangPaths)) {
      if (!localizedPath) continue;
      languagesMap[lang] = getCanonicalUrl(String(localizedPath));
    }
  }
  const hasLanguages = Object.keys(languagesMap).length > 0;

  return {
    title: uniqueTitle,
    description: uniqueDescription,
    keywords: mergeKeywords(getSeoProfileKeywords(canonicalPath), [...(keywords ?? [])], SEO_CORE_KEYWORDS),
    alternates: {
      canonical: canonicalUrl,
      ...(hasLanguages ? { languages: languagesMap } : {}),
    },
    openGraph: {
      type: "website" as const,
      locale: inLanguage.replace("-", "_"),
      url: canonicalUrl,
      title: uniqueTitle,
      description: uniqueDescription,
      siteName: siteSeo.siteName,
      images: [{ url: ogImage, width: 1200, height: 630, alt: uniqueTitle }],
      ...(publishedAt ? { publishedTime: new Date(publishedAt).toISOString() } : {}),
      ...(updatedAt ? { modifiedTime: new Date(updatedAt).toISOString() } : {}),
    },
    twitter: {
      card: "summary_large_image" as const,
      title: uniqueTitle,
      description: uniqueDescription,
      images: [ogImage],
    },
    robots: {
      index: isIndexableRoute(canonicalPath),
      follow: isIndexableRoute(canonicalPath),
      googleBot: {
        index: isIndexableRoute(canonicalPath),
        follow: isIndexableRoute(canonicalPath),
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1,
      },
    },
  };
}

/** page.tsx 내 <script> 삽입용 SoftwareApplication JSON-LD 데이터를 반환한다 */
export function buildFortuneJsonLd(opts: FortunePageMeta): string {
  const {
    path,
    title,
    description,
    keywords = [],
    image,
    featureList = [],
    applicationCategory = "LifestyleApplication",
    inLanguage = "ko-KR",
    isAccessibleForFree,
    offer,
    publishedAt,
    updatedAt,
    variantKey,
  } = opts;

  const canonicalPath = normalizePath(path);
  const url = getCanonicalUrl(canonicalPath);
  const routeMetaCode = buildRouteMetaCode(canonicalPath, variantKey, inLanguage);
  const uniqueTitle = appendUniqueTitle(title, routeMetaCode);
  const uniqueDescription = appendUniqueDescription(description, routeMetaCode);
  const ogImage = buildOpenGraphImageUrl({ image: image || DEFAULT_OG_IMAGE_URL });
  const now = new Date().toISOString();

  const data = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "SoftwareApplication",
        "@id": `${url}#app`,
        name: uniqueTitle,
        description: uniqueDescription,
        url,
        applicationCategory,
        operatingSystem: "Web",
        inLanguage,
        author: { "@id": `${SITE_ORIGIN}/#organization` },
        publisher: { "@id": `${SITE_ORIGIN}/#organization` },
        image: { "@type": "ImageObject", url: ogImage },
        ...(typeof isAccessibleForFree === "boolean" ? { isAccessibleForFree } : {}),
        ...(offer && typeof offer === "object" ? { offers: offer } : {}),
        ...(featureList.length > 0 ? { featureList } : {}),
        ...(keywords.length > 0 ? { keywords: keywords.join(", ") } : {}),
        ...(publishedAt ? { datePublished: new Date(publishedAt).toISOString() } : {}),
        dateModified: updatedAt ? new Date(updatedAt).toISOString() : now,
      },
      {
        // 현재 페이지를 WebPage로도 선언해 구글이 페이지 목적을 코드로 파악하게 함
        "@type": "WebPage",
        "@id": `${url}#webpage`,
        url,
        name: uniqueTitle,
        description: uniqueDescription,
        inLanguage,
        isPartOf: { "@id": `${SITE_ORIGIN}/#website` },
        potentialAction: { "@type": "ReadAction", target: [url] },
      },
    ],
  };

  return JSON.stringify(data);
}

export function withUniqueRouteMetadata(
  path: string,
  metadata: Record<string, unknown>,
  options?: { variantKey?: string; inLanguage?: string },
) {
  const canonicalPath = normalizeCanonicalPath(path);
  const indexable = isIndexableRoute(canonicalPath);
  const rawTitle = normalizeMetaText(metadata?.title);
  const rawDescription = normalizeMetaText(metadata?.description);
  const languageHint =
    options?.inLanguage ||
    normalizeMetaText((metadata?.openGraph as Record<string, unknown> | undefined)?.locale).replace("_", "-") ||
    "ko-KR";
  const routeMetaCode = buildRouteMetaCode(canonicalPath, options?.variantKey, languageHint);

  const uniqueTitle = rawTitle ? appendUniqueTitle(rawTitle, routeMetaCode) : rawTitle;
  const uniqueDescription = rawDescription
    ? appendUniqueDescription(rawDescription, routeMetaCode)
    : rawDescription;

  const openGraph = (metadata?.openGraph as Record<string, unknown> | undefined) || undefined;
  const twitter = (metadata?.twitter as Record<string, unknown> | undefined) || undefined;
  const alternates = (metadata?.alternates as Record<string, unknown> | undefined) || undefined;
  const canonical = normalizeMetaText(alternates?.canonical) || toAbsoluteUrl(canonicalPath);
  const mergedTitle = uniqueTitle || rawTitle || siteSeo.defaultTitle;
  const mergedDescription = uniqueDescription || rawDescription;
  const imageCandidate =
    pickFirstImageUrl(openGraph?.images) ||
    pickFirstImageUrl(twitter?.images) ||
    DEFAULT_OG_IMAGE_URL;
  const absoluteImage = toAbsoluteUrl(imageCandidate);
  const locale = languageHint.replace("-", "_");
  const openGraphImages = Array.isArray(openGraph?.images)
    ? openGraph.images
    : [
        {
          url: absoluteImage,
          width: 1200,
          height: 630,
          alt: mergedTitle,
        },
      ];
  const twitterImages = Array.isArray(twitter?.images) ? twitter.images : [absoluteImage];

  return {
    ...metadata,
    ...(uniqueTitle ? { title: uniqueTitle } : {}),
    ...(uniqueDescription ? { description: uniqueDescription } : {}),
    openGraph: {
      ...(openGraph || {}),
      type: normalizeMetaText(openGraph?.type) || "website",
      locale,
      url: normalizeMetaText(openGraph?.url) || canonical,
      siteName: normalizeMetaText(openGraph?.siteName) || siteSeo.siteName,
      title: appendUniqueTitle(normalizeMetaText(openGraph?.title) || mergedTitle, routeMetaCode),
      description: appendUniqueDescription(
        normalizeMetaText(openGraph?.description) || mergedDescription,
        routeMetaCode,
      ),
      images: openGraphImages,
    },
    twitter: {
      ...(twitter || {}),
      card: normalizeMetaText(twitter?.card) || "summary_large_image",
      title: appendUniqueTitle(normalizeMetaText(twitter?.title) || mergedTitle, routeMetaCode),
      description: appendUniqueDescription(
        normalizeMetaText(twitter?.description) || mergedDescription,
        routeMetaCode,
      ),
      images: twitterImages,
    },
    alternates: {
      ...(alternates || {}),
      canonical,
    },
    robots: indexable
      ? metadata?.robots || {
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
  };
}
