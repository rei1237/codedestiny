/**
 * generatePageMetadata — 사주·타로·오라클 등 서비스 페이지에서
 * generateMetadata()를 구현할 때 사용하는 공통 헬퍼.
 *
 * 역할:
 *  1. process.env.NEXT_PUBLIC_SITE_URL 기반 canonical URL 자동 생성 (슬래시 정규화 포함)
 *  2. hreflang 언어 대안 자동 구성
 *  3. OpenGraph / Twitter Card 기본값 병합
 *  4. SoftwareApplication JSON-LD 데이터 반환 (page.tsx에서 <script> 삽입용)
 *
 * 사용 예시 (app/saju/basic/page.tsx):
 *   export async function generateMetadata() {
 *     return generatePageMetadata({
 *       path: "/saju/basic",
 *       title: "무료 사주 풀이 | 사주팔자 기초",
 *       description: "생년월일·시간으로 보는 정확한 사주팔자 무료 풀이.",
 *       keywords: ["무료 사주", "사주팔자", "사주 풀이"],
 *       featureList: ["사주팔자 기초 분석", "오행 균형 해석", "10개 언어 지원"],
 *     });
 *   }
 */

import { mergeKeywords, SEO_CORE_KEYWORDS, toAbsoluteUrl } from "./seo-metadata";

const SITE_ORIGIN =
  (process.env.NEXT_PUBLIC_SITE_URL || "https://code-destiny.com").replace(/\/$/, "");

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
  const marker = `[route:${routeCode}]`;
  if (title.includes(marker)) return title;
  return `${title} ${marker}`;
}

function appendUniqueDescription(description: string, routeCode: string): string {
  const marker = `경로코드:${routeCode}`;
  if (description.includes(marker)) return description;
  const normalized = description.trim();
  const separator = normalized.endsWith(".") ? " " : ". ";
  return `${normalized}${separator}${marker}.`;
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

const LOCALE_PREFIXES: Array<{ prefix: string; hrefLang: string }> = [
  { prefix: "", hrefLang: "ko" },
  { prefix: "/en-us", hrefLang: "en" },
  { prefix: "/ja-jp", hrefLang: "ja" },
  { prefix: "/zh-cn", hrefLang: "zh-Hans" },
];

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
  /** 게시일 (ISO Date string). 기본값: undefined */
  publishedAt?: string;
  /** 수정일 (ISO Date string). 없으면 current date */
  updatedAt?: string;
  /** 콘텐츠 언어. 기본값: "ko-KR" */
  inLanguage?: string;
  /** 같은 path 내 query/topic 등 변형 페이지를 구분하는 키 */
  variantKey?: string;
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
  } = opts;

  const canonicalPath = normalizeCanonicalPath(path);
  const canonicalUrl = `${SITE_ORIGIN}${canonicalPath === "/" ? "" : canonicalPath}`;
  const routeMetaCode = buildRouteMetaCode(canonicalPath, variantKey, inLanguage);
  const uniqueTitle = appendUniqueTitle(title, routeMetaCode);
  const uniqueDescription = appendUniqueDescription(description, routeMetaCode);

  const ogImage = image || `${SITE_ORIGIN}/icons/꿀꿀 운세 로고.webp`;

  // hreflang 언어 대안 맵 (Next.js alternates.languages 형식)
  const languagesMap: Record<string, string> = {};
  for (const locale of LOCALE_PREFIXES) {
    const localizedPath = locale.prefix
      ? `${locale.prefix}${canonicalPath === "/" ? "" : canonicalPath}`
      : canonicalPath;
    languagesMap[locale.hrefLang] = `${SITE_ORIGIN}${localizedPath}`;
  }
  languagesMap["x-default"] = canonicalUrl;

  return {
    title: uniqueTitle,
    description: uniqueDescription,
    keywords: mergeKeywords([...(keywords ?? [])], SEO_CORE_KEYWORDS),
    alternates: {
      canonical: canonicalUrl,
      languages: languagesMap,
    },
    openGraph: {
      type: "website" as const,
      locale: inLanguage.replace("-", "_"),
      url: canonicalUrl,
      title: uniqueTitle,
      description: uniqueDescription,
      siteName: "꿀꿀 만세력",
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
      index: true,
      follow: true,
      googleBot: { index: true, follow: true, "max-snippet": -1 },
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
    publishedAt,
    updatedAt,
    variantKey,
  } = opts;

  const canonicalPath = normalizeCanonicalPath(path);
  const url = `${SITE_ORIGIN}${canonicalPath === "/" ? "" : canonicalPath}`;
  const routeMetaCode = buildRouteMetaCode(canonicalPath, variantKey, inLanguage);
  const uniqueTitle = appendUniqueTitle(title, routeMetaCode);
  const uniqueDescription = appendUniqueDescription(description, routeMetaCode);
  const ogImage = image || `${SITE_ORIGIN}/icons/꿀꿀 운세 로고.webp`;
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
        isAccessibleForFree: true,
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "KRW",
          availability: "https://schema.org/InStock",
          url,
        },
        author: { "@id": `${SITE_ORIGIN}/about#author` },
        publisher: { "@id": `${SITE_ORIGIN}/#organization` },
        image: { "@type": "ImageObject", url: ogImage },
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
  const mergedTitle = uniqueTitle || rawTitle || "Code Destiny";
  const mergedDescription = uniqueDescription || rawDescription;
  const imageCandidate =
    pickFirstImageUrl(openGraph?.images) ||
    pickFirstImageUrl(twitter?.images) ||
    `${SITE_ORIGIN}/icons/꿀꿀 운세 로고.webp`;
  const absoluteImage = toAbsoluteUrl(imageCandidate);
  const locale = languageHint.replace("-", "_");

  return {
    ...metadata,
    ...(uniqueTitle ? { title: uniqueTitle } : {}),
    ...(uniqueDescription ? { description: uniqueDescription } : {}),
    openGraph: {
      ...(openGraph || {}),
      type: normalizeMetaText(openGraph?.type) || "website",
      locale,
      url: normalizeMetaText(openGraph?.url) || canonical,
      siteName: normalizeMetaText(openGraph?.siteName) || "꿀꿀 만세력",
      title: appendUniqueTitle(normalizeMetaText(openGraph?.title) || mergedTitle, routeMetaCode),
      description: appendUniqueDescription(
        normalizeMetaText(openGraph?.description) || mergedDescription,
        routeMetaCode,
      ),
      images:
        openGraph?.images ||
        [
          {
            url: absoluteImage,
            width: 1200,
            height: 630,
            alt: mergedTitle,
          },
        ],
    },
    twitter: {
      ...(twitter || {}),
      card: normalizeMetaText(twitter?.card) || "summary_large_image",
      title: appendUniqueTitle(normalizeMetaText(twitter?.title) || mergedTitle, routeMetaCode),
      description: appendUniqueDescription(
        normalizeMetaText(twitter?.description) || mergedDescription,
        routeMetaCode,
      ),
      images: (twitter?.images as unknown) || [absoluteImage],
    },
    alternates: {
      ...(alternates || {}),
      canonical,
    },
  };
}
