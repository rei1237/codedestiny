export type PexelsSectionImage = {
  src: string;
  alt: string;
  credit?: string;
  creditUrl?: string;
  source: "pexels" | "fallback";
  status?: "ok" | "missing-key" | "unauthorized" | "forbidden" | "rate-limited" | "server-error" | "empty" | "network-error";
};

type PexelsPhoto = {
  src?: { landscape?: string; large?: string; medium?: string };
  alt?: string;
  photographer?: string;
  photographer_url?: string;
  url?: string;
  width?: number;
  height?: number;
};

const cache = new Map<string, { expiresAt: number; image: PexelsSectionImage }>();
const fallbackImages = {
  career: "/fuctionassets/유명인 사주 분석.webp",
  love: "/fuctionassets/flower4.webp",
  wealth: "/fuctionassets/funtion_wealth.webp",
  health: "/fuctionassets/meditation.webp",
  default: "/fuctionassets/premiumstar.webp",
} as const;

function getPexelsApiKey() {
  return process.env.PEXELS_API_KEY || process.env.PEXELS_APIKEY || process.env.PEXES_APIKEY || "";
}

function getFailureStatus(status: number): PexelsSectionImage["status"] {
  if (status === 401) return "unauthorized";
  if (status === 403) return "forbidden";
  if (status === 429) return "rate-limited";
  if (status >= 500) return "server-error";
  return "empty";
}

export async function getPexelsSectionImage(query: string, section: keyof typeof fallbackImages = "default"): Promise<PexelsSectionImage> {
  const cacheKey = `${section}:${query}`;
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.image;

  const fallback: PexelsSectionImage = {
    src: fallbackImages[section] || fallbackImages.default,
    alt: `${query} 상징 이미지`,
    source: "fallback",
  };

  const apiKey = getPexelsApiKey();
  if (!apiKey) return { ...fallback, status: "missing-key" };

  try {
    const url = new URL("https://api.pexels.com/v1/search");
    url.searchParams.set("query", query);
    url.searchParams.set("per_page", "1");
    url.searchParams.set("orientation", "landscape");
    const response = await fetch(url, {
      headers: { Authorization: apiKey },
      next: { revalidate: 60 * 60 * 24 * 7 },
    });
    if (!response.ok) return { ...fallback, status: getFailureStatus(response.status) };
    const data = await response.json().catch(() => null) as { photos?: PexelsPhoto[] } | null;
    const photo = data?.photos?.[0];
    const src = photo?.src?.landscape || photo?.src?.large || photo?.src?.medium;
    if (!src) return { ...fallback, status: "empty" };
    const image = {
      src,
      alt: photo?.alt || fallback.alt,
      credit: photo?.photographer,
      creditUrl: photo?.photographer_url || photo?.url,
      source: "pexels" as const,
      status: "ok" as const,
    };
    cache.set(cacheKey, { expiresAt: Date.now() + 1000 * 60 * 60 * 24 * 7, image });
    return image;
  } catch {
    return { ...fallback, status: "network-error" };
  }
}
