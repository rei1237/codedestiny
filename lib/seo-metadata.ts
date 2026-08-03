import { siteSeo } from "./seo/siteSeo";

export const SITE_ORIGIN = siteSeo.siteUrl;

// 전역 메타는 실제 브랜드 식별자만 둔다. 서비스·무료·롱테일 키워드는
// URL별 엔터티 레지스트리와 페이지 본문에서 검색 의도에 맞게 소유한다.
export const SEO_CORE_KEYWORDS = [
  "CODE DESTINY",
  "Code Destiny",
  "CodeDestiny",
  "code-destiny",
  "코드데스티니",
  "코드 데스티니",
  "CODEDESTINY",
  "꿀꿀 운세",
  "꿀꿀운세",
  "꿀꿀 만세력",
  "꿀꿀만세력",
];

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
