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

/**
 * 동적 OG 카드 URL 을 만든다(워커 라우트 `GET /api/og`).
 *
 * 🔴 기존 정적 OG 를 대체하지 않는다. 이미 공유된 페이지의 og:image 를 갈아 끼워도 카카오는
 * **페이지 URL** 을 키로 캐시한 옛 카드를 계속 보여 준다. 신규 페이지에만 쓸 것.
 *
 * badge 는 워커의 프리셋 키다(saju·tarot·astrology·ziwei·dream·compatibility·fortune·insight).
 * 모르는 키는 워커가 조용히 기본값으로 떨어뜨린다.
 *
 * 결과를 buildSeoMetadata / SeoV2Content 의 image 로 넘겨도 안전하다 — normalizeUrl 이 지우는
 * 것은 TRACKING_PARAMS(utm_*·fbclid·session·token 등)뿐이고 title/desc/badge/theme 는 남는다.
 */
export function buildDynamicOgImageUrl(input: {
  title: string;
  description?: string;
  badge?: "saju" | "tarot" | "astrology" | "ziwei" | "dream" | "compatibility" | "fortune" | "insight";
  theme?: "dark" | "light";
}): string {
  const params = new URLSearchParams();
  params.set("title", String(input.title || "").trim());
  if (input.description) params.set("desc", input.description.trim());
  if (input.badge) params.set("badge", input.badge);
  if (input.theme) params.set("theme", input.theme);
  return `${SEO_V2_SITE.siteUrl}/api/og?${params.toString()}`;
}
