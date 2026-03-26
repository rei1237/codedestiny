export const SITE_ORIGIN = "https://code-destiny.com";

export const SEO_CORE_KEYWORDS = [
  // 기본 검색어
  "사주",
  "타로",
  // 무료 의도 키워드 (high-intent: 실제 검색 패턴 반영)
  "무료 사주",
  "무료 운세",
  "무료 타로",
  "무료 궁합",
  "자미두수 무료",
  "무료 점성술",
  // 정확도 의도 키워드 (accuracy-seekers)
  "정확한 운세",
  "정확한 사주",
  // 일시 기반 시즌 키워드 (high daily/seasonal volume)
  "오늘 운세",
  "2026 신년운세",
  "신년 운세",
  // 브랜드 키워드
  "꿀꿀 운세",
  "꿀꿀 사주",
  "꿀꿀 만세력",
  "Code: Destiny",
  // 전문 분야
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