import {
  buildOpenGraphImageUrl,
  getCanonicalUrl,
  isPrivateRoute,
  normalizeUrl,
  stripTrackingParams,
  type SeoV2Content,
} from "./seo.v2";

export type ShareMetadataV2 = {
  title: string;
  text: string;
  url: string;
  canonicalUrl: string;
  image: string;
  contentType: string;
  contentId?: string;
  shareable: boolean;
};

export function buildUtmShareUrl(url: string, source = "share"): string {
  const parsed = new URL(normalizeUrl(url));
  parsed.searchParams.set("utm_source", source);
  parsed.searchParams.set("utm_medium", "share");
  parsed.searchParams.set("utm_campaign", "public_share");
  return parsed.toString();
}

export function getShareUrl(path: string, options: { source?: string; withUtm?: boolean } = {}) {
  const canonicalUrl = getCanonicalUrl(path);
  return options.withUtm ? buildUtmShareUrl(canonicalUrl, options.source) : canonicalUrl;
}

export function getShareMetadata(content: SeoV2Content & { contentId?: string }): ShareMetadataV2 {
  const canonicalUrl = getCanonicalUrl(content.path);
  const shareable = !isPrivateRoute(content.path) && !content.noindex;
  const title = String(content.title || "Code Destiny").trim();
  const text = String(content.description || "").trim();

  return {
    title,
    text,
    url: getShareUrl(canonicalUrl, { withUtm: true }),
    canonicalUrl: stripTrackingParams(canonicalUrl),
    image: buildOpenGraphImageUrl(content),
    contentType: content.contentType || "website",
    contentId: content.contentId,
    shareable,
  };
}

export function trackShareEvent(eventName: string, payload: Record<string, unknown>) {
  if (typeof window === "undefined") return;

  const analytics = (window as unknown as { gtag?: (...args: unknown[]) => void; dataLayer?: unknown[] });
  if (typeof analytics.gtag === "function") {
    analytics.gtag("event", eventName, payload);
    return;
  }

  if (Array.isArray(analytics.dataLayer)) {
    analytics.dataLayer.push({ event: eventName, ...payload });
  }
}
