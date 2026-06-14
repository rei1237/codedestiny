import { siteSeo } from "./seo/siteSeo";

export const SITE_ORIGIN = siteSeo.siteUrl;

export const SEO_CORE_KEYWORDS = [
  "Code Destiny",
  "코드 데스티니",
  "꿀꿀 운세",
  "꿀꿀 만세력",
  "무료 사주",
  "만세력",
  "오늘의 운세",
  "무료 타로",
  "사주 궁합",
  "자미두수",
  "숙요점",
  "점성술",
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
