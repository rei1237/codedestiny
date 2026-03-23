export const SITE_ORIGIN = "https://code-destiny.com";

export const SEO_CORE_KEYWORDS = [
  "사주",
  "운세",
  "타로",
  "무료 사주",
  "자미두수 무료",
  "무료 타로",
  "꿀꿀 운세",
  "꿀꿀 사주",
  "신년 운세",
  "무료 점성술",
  "꿀꿀 만세력",
  "Code: Destiny",
  "명리학",
];

export function toAbsoluteUrl(pathOrUrl: string): string {
  const safeInput = String(pathOrUrl || "/").trim();
  if (!safeInput) {
    return SITE_ORIGIN;
  }

  try {
    if (safeInput.startsWith("http://") || safeInput.startsWith("https://")) {
      return new URL(safeInput).toString();
    }
  } catch {
    return new URL("/", SITE_ORIGIN).toString();
  }

  const normalizedPath = safeInput.startsWith("/") ? safeInput : `/${safeInput}`;
  return new URL(normalizedPath, SITE_ORIGIN).toString();
}

export function mergeKeywords(
  ...sources: Array<string[] | undefined | null>
): string[] {
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