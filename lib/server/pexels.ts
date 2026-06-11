export type PexelsSectionImage = {
  src: string;
  alt: string;
  credit?: string;
  creditUrl?: string;
  source: "pexels" | "fallback";
  status?: "ok" | "missing-key" | "unauthorized" | "forbidden" | "rate-limited" | "server-error" | "empty" | "network-error";
};

type PexelsPhoto = {
  src?: { landscape?: string; large2x?: string; large?: string; medium?: string };
  alt?: string;
  photographer?: string;
  photographer_url?: string;
  url?: string;
  width?: number;
  height?: number;
};

const cache = new Map<string, { expiresAt: number; image: PexelsSectionImage }>();
const fallbackImages = {
  saju: "/fuctionassets/saju.webp",
  tarot: "/fuctionassets/tarolove.webp",
  astrology: "/fuctionassets/jumsung.webp",
  ziwei: "/fuctionassets/jami.webp",
  sukuyo: "/fuctionassets/sukyo.webp",
  vedic: "/fuctionassets/veda.webp",
  dream: "/fuctionassets/heamong.webp",
  famous: "/fuctionassets/유명인 사주 분석.webp",
  career: "/fuctionassets/유명인 사주 분석.webp",
  love: "/fuctionassets/flower4.webp",
  wealth: "/fuctionassets/funtion_wealth.webp",
  health: "/fuctionassets/meditation.webp",
  default: "/fuctionassets/premiumstar.webp",
} as const;

export type PexelsImageSectionKey = keyof typeof fallbackImages;

const cosmicImageRequests: Record<PexelsImageSectionKey, { query: string; fallbackAlt: string }> = {
  saju: { query: "mystical astrology stars cosmic sky five elements", fallbackAlt: "사주 명리와 별빛이 흐르는 우주 이미지" },
  tarot: { query: "mystic tarot cards stars nebula night sky", fallbackAlt: "타로 카드와 별빛이 어우러진 신비 이미지" },
  astrology: { query: "astrology zodiac stars cosmic night sky", fallbackAlt: "점성술 차트와 별빛 우주 이미지" },
  ziwei: { query: "purple galaxy stars cosmic astrology chart", fallbackAlt: "자미두수 명반을 닮은 은하 이미지" },
  sukuyo: { query: "moon stars mystical night sky constellation", fallbackAlt: "달과 별자리의 숙요점 이미지" },
  vedic: { query: "vedic astrology stars cosmic temple night", fallbackAlt: "베다점성술과 밤하늘의 신비 이미지" },
  dream: { query: "dreamy moon stars mystical fog night sky", fallbackAlt: "꿈과 달빛이 감도는 신비 이미지" },
  famous: { query: "mystical cosmic portrait silhouette stars", fallbackAlt: "유명인 사주를 상징하는 별빛 초상 이미지" },
  career: { query: "cosmic stage spotlight stars destiny", fallbackAlt: "별빛 무대와 커리어 운의 이미지" },
  love: { query: "mystical stars soft light cosmic love", fallbackAlt: "별빛 관계 운의 신비 이미지" },
  wealth: { query: "gold stars cosmic abundance mystical", fallbackAlt: "금빛 별과 재물운의 신비 이미지" },
  health: { query: "meditation stars cosmic calm night", fallbackAlt: "고요한 별빛과 회복 운의 이미지" },
  default: { query: "mystical cosmos stars nebula night sky", fallbackAlt: "우주와 별빛이 흐르는 신비 이미지" },
};

function getPexelsApiKey() {
  return (
    process.env.PEXELS_API_KEY ||
    process.env.NEXT_PUBLIC_PEXELS_API_KEY ||
    process.env.REACT_APP_PEXELS_API_KEY ||
    process.env.VITE_PEXELS_API_KEY ||
    process.env.PEXELS_APIKEY ||
    process.env.PEXES_APIKEY ||
    ""
  ).trim();
}

function getFailureStatus(status: number): PexelsSectionImage["status"] {
  if (status === 401) return "unauthorized";
  if (status === 403) return "forbidden";
  if (status === 429) return "rate-limited";
  if (status >= 500) return "server-error";
  return "empty";
}

function normalizeQuery(query: string, section: PexelsImageSectionKey) {
  const raw = String(query || "").trim();
  if (!raw) return cosmicImageRequests[section]?.query || cosmicImageRequests.default.query;
  if (/[\uac00-\ud7a3]/.test(raw)) return cosmicImageRequests[section]?.query || cosmicImageRequests.default.query;
  const lowered = raw.toLowerCase();
  if (!/(cosmic|cosmos|star|stars|nebula|galaxy|moon|mystic|mystical|astrology|zodiac)/i.test(lowered)) {
    return `${raw} cosmic stars mystical`;
  }
  return raw;
}

function inferInsightSection(input: unknown): PexelsImageSectionKey {
  const source = input && typeof input === "object" ? input as Record<string, unknown> : {};
  const bag = [
    source.slug,
    source.title,
    source.subtitle,
    source.excerpt,
    source.description,
    source.category,
    source.categoryLabel,
    source.categoryName,
    Array.isArray(source.tags) ? source.tags.join(" ") : "",
    Array.isArray(source.keywords) ? source.keywords.join(" ") : "",
    Array.isArray(source.relatedKeywords) ? source.relatedKeywords.join(" ") : "",
  ].join(" ").toLowerCase();

  if (/유명인|celebrity|famous-saju/.test(bag)) return "famous";
  if (/자미|ziwei|명궁|궁위|사화/.test(bag)) return "ziwei";
  if (/숙요|sukuyo|27숙|영친|안괴|업태/.test(bag)) return "sukuyo";
  if (/타로|tarot|arcana|카드|스프레드/.test(bag)) return "tarot";
  if (/베다|vedic|라그나|나크샤트라/.test(bag)) return "vedic";
  if (/점성|astrology|zodiac|태양궁|달궁|상승궁/.test(bag)) return "astrology";
  if (/꿈|dream|해몽/.test(bag)) return "dream";
  if (/연애|궁합|관계|재회|love|compatibility/.test(bag)) return "love";
  if (/재물|wealth|돈|금전|수입/.test(bag)) return "wealth";
  if (/건강|health|회복|명상/.test(bag)) return "health";
  if (/직업|커리어|career|사업|성공|무대/.test(bag)) return "career";
  if (/사주|명리|오행|십성|대운|일간/.test(bag)) return "saju";
  return "default";
}

export function resolvePexelsInsightImageRequest(input: unknown) {
  const section = inferInsightSection(input);
  return {
    section,
    query: cosmicImageRequests[section]?.query || cosmicImageRequests.default.query,
    fallbackAlt: cosmicImageRequests[section]?.fallbackAlt || cosmicImageRequests.default.fallbackAlt,
  };
}

export async function getPexelsSectionImage(query: string, section: PexelsImageSectionKey = "default"): Promise<PexelsSectionImage> {
  const safeSection = fallbackImages[section] ? section : "default";
  const safeQuery = normalizeQuery(query, safeSection);
  const cacheKey = `${safeSection}:${safeQuery}`;
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.image;

  const fallback: PexelsSectionImage = {
    src: fallbackImages[safeSection] || fallbackImages.default,
    alt: cosmicImageRequests[safeSection]?.fallbackAlt || `${safeQuery} 상징 이미지`,
    source: "fallback",
  };

  const apiKey = getPexelsApiKey();
  if (!apiKey) return { ...fallback, status: "missing-key" };

  try {
    const url = new URL("https://api.pexels.com/v1/search");
    url.searchParams.set("query", safeQuery);
    url.searchParams.set("per_page", "8");
    url.searchParams.set("orientation", "landscape");
    url.searchParams.set("size", "large");
    url.searchParams.set("locale", "en-US");
    const response = await fetch(url, {
      headers: { Authorization: apiKey },
      next: { revalidate: 60 * 60 * 24 * 7 },
    } as RequestInit & { next?: { revalidate: number } });
    if (!response.ok) return { ...fallback, status: getFailureStatus(response.status) };
    const data = await response.json().catch(() => null) as { photos?: PexelsPhoto[] } | null;
    const photos = Array.isArray(data?.photos) ? data.photos : [];
    const photo = photos.find((item) => item?.src?.landscape || item?.src?.large2x || item?.src?.large || item?.src?.medium);
    const src = photo?.src?.landscape || photo?.src?.large2x || photo?.src?.large || photo?.src?.medium;
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

export async function getPexelsInsightImage(input: unknown): Promise<PexelsSectionImage> {
  const request = resolvePexelsInsightImageRequest(input);
  const image = await getPexelsSectionImage(request.query, request.section);
  if (image.source === "fallback" && request.fallbackAlt) {
    return { ...image, alt: request.fallbackAlt };
  }
  return image;
}
