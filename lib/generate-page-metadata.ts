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

const LOCALE_PREFIXES: Array<{ prefix: string; hrefLang: string }> = [
  { prefix: "", hrefLang: "ko" },
  { prefix: "/en-us", hrefLang: "en" },
  { prefix: "/ja-jp", hrefLang: "ja" },
  { prefix: "/zh-cn", hrefLang: "zh-Hans" },
  { prefix: "/hi-in", hrefLang: "hi" },
  { prefix: "/es-es", hrefLang: "es" },
  { prefix: "/fr-fr", hrefLang: "fr" },
  { prefix: "/de-de", hrefLang: "de" },
  { prefix: "/nl-nl", hrefLang: "nl" },
  { prefix: "/ms-my", hrefLang: "ms" },
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
  } = opts;

  const canonicalPath = normalizeCanonicalPath(path);
  const canonicalUrl = `${SITE_ORIGIN}${canonicalPath === "/" ? "" : canonicalPath}`;

  const ogImage = image || `${SITE_ORIGIN}/icons/honeypig.webp`;

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
    title,
    description,
    keywords: mergeKeywords([...(keywords ?? [])], SEO_CORE_KEYWORDS),
    alternates: {
      canonical: canonicalUrl,
      languages: languagesMap,
    },
    openGraph: {
      type: "website" as const,
      locale: inLanguage.replace("-", "_"),
      url: canonicalUrl,
      title,
      description,
      siteName: "꿀꿀 만세력",
      images: [{ url: ogImage, width: 1200, height: 630, alt: title }],
      ...(publishedAt ? { publishedTime: new Date(publishedAt).toISOString() } : {}),
      ...(updatedAt ? { modifiedTime: new Date(updatedAt).toISOString() } : {}),
    },
    twitter: {
      card: "summary_large_image" as const,
      title,
      description,
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
  } = opts;

  const canonicalPath = normalizeCanonicalPath(path);
  const url = `${SITE_ORIGIN}${canonicalPath === "/" ? "" : canonicalPath}`;
  const ogImage = image || `${SITE_ORIGIN}/icons/honeypig.webp`;
  const now = new Date().toISOString();

  const data = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "SoftwareApplication",
        "@id": `${url}#app`,
        name: title,
        description,
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
        name: title,
        description,
        inLanguage,
        isPartOf: { "@id": `${SITE_ORIGIN}/#website` },
        potentialAction: { "@type": "ReadAction", target: [url] },
      },
    ],
  };

  return JSON.stringify(data);
}
