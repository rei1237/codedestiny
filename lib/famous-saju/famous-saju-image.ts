import imageCache from "./image-cache.json";

// 유명인 사주 히어로 이미지 정적 인라인 헬퍼.
// - Pexels 호출은 빌드 스크립트(scripts/fetch-saju-images.mjs)에서만 발생하고,
//   결과 URL·크레딧이 image-cache.json에 저장된다.
// - 페이지(런타임/정적 산출물)는 이 JSON만 읽으므로 API 키도 호출 코드도 남지 않는다.
// - 캐시에 없는 slug는 기존 og:image webp로 폴백한다.

export type FamousSajuHeroImage = {
  src: string;
  alt: string;
  credit: string;
  creditUrl: string;
  source: "pexels" | "fallback";
};

// 유명인 사주 대표 og webp (실패/미수집 slug 폴백)
export const FAMOUS_SAJU_OG_FALLBACK = "/fuctionassets/%EC%9C%A0%EB%AA%85%EC%9D%B8%20%EC%82%AC%EC%A3%BC%20%EB%B6%84%EC%84%9D.webp";

// 일간(오행) → Pexels 검색 쿼리(물상 기반). 같은 일간은 같은 쿼리 → 같은 이미지(재현성 보장).
export const dayElementImageQuery: Record<string, string> = {
  목: "moonlit forest tree night stars mystical",
  화: "warm candle flame glow night stars mystical",
  토: "serene mountain earth twilight stars mystical",
  금: "silver metal moonlight night stars mystical",
  수: "deep water moon reflection night stars mystical",
};

export function resolveDayElementQuery(dayElement: string) {
  return dayElementImageQuery[dayElement] || "cosmic night sky stars mystical silhouette";
}

type CacheEntry = {
  src?: string;
  alt?: string;
  photographer?: string;
  photographerUrl?: string;
};

const bySlug: Record<string, CacheEntry> = (imageCache as { bySlug?: Record<string, CacheEntry> }).bySlug || {};

export function getFamousSajuHeroImage(slug: string, dayMasterImagery?: string): FamousSajuHeroImage {
  const entry = bySlug[slug];
  if (entry && entry.src) {
    return {
      src: entry.src,
      alt: entry.alt || dayMasterImagery || "유명인 사주를 상징하는 별빛 이미지",
      credit: entry.photographer || "",
      creditUrl: entry.photographerUrl || "",
      source: "pexels",
    };
  }
  return {
    src: FAMOUS_SAJU_OG_FALLBACK,
    alt: dayMasterImagery || "유명인 사주 분석 대표 이미지",
    credit: "",
    creditUrl: "",
    source: "fallback",
  };
}
