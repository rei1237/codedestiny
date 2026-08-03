import { siteSeo } from "./seo/siteSeo";

export const SITE_ORIGIN = siteSeo.siteUrl;

// Google은 meta keywords를 순위 신호로 사용하지 않습니다. 전역 키워드를 모든
// URL에 반복하지 않고, 실제 제목·설명·보이는 본문과 URL별 레지스트리로 검색
// 의도를 소유합니다. 브랜드 별칭은 Organization/WebSite와 브랜드 소개에 둡니다.
export const SEO_CORE_KEYWORDS: string[] = [];

export function toAbsoluteUrl(pathOrUrl: string): string {
  const safeInput = String(pathOrUrl || "/").trim();
  if (!safeInput) return SITE_ORIGIN;

  try {
    if (/^https?:\/\//i.test(safeInput)) {
      const parsed = new URL(safeInput);
      parsed.hash = "";
      return parsed.toString();
    }
  } catch {
    return new URL("/", SITE_ORIGIN).toString();
  }

  const normalizedPath = safeInput.startsWith("/") ? safeInput : `/${safeInput}`;
  return new URL(normalizedPath, SITE_ORIGIN).toString();
}

export function mergeKeywords(...sources: Array<string[] | undefined | null>): string[] {
  const seen = new Set<string>();
  const merged: string[] = [];

  for (const source of sources) {
    if (!Array.isArray(source)) continue;
    for (const keyword of source) {
      const value = String(keyword || "").trim();
      if (!value || seen.has(value)) continue;
      seen.add(value);
      merged.push(value);
    }
  }

  return merged;
}
