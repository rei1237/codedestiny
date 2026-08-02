import { siteSeo } from "./seo/siteSeo";

export const SITE_ORIGIN = siteSeo.siteUrl;

// 브랜드(꿀꿀 운세 / 코드 데스티니) × 운세 종류를 조합한 키워드를 정본으로 둔다.
// 브랜드 단독 검색과 "꿀꿀 운세 사주"처럼 브랜드+종류로 찾는 유입을 한 배열로 커버한다.
export const SEO_CORE_KEYWORDS = [
  // 브랜드
  "Code Destiny",
  "코드 데스티니",
  "코드데스티니",
  "꿀꿀 운세",
  "꿀꿀운세",
  "꿀꿀 만세력",
  // 브랜드 + 운세 종류
  "꿀꿀 운세 사주",
  "꿀꿀 운세 타로",
  "꿀꿀 운세 궁합",
  "꿀꿀 운세 자미두수",
  "꿀꿀 운세 숙요점",
  "꿀꿀 운세 점성술",
  "꿀꿀 운세 만세력",
  "꿀꿀 운세 꿈해몽",
  "코드 데스티니 사주",
  "코드 데스티니 타로",
  "코드 데스티니 운세",
  // 운세 종류 (무료 수식어 포함)
  "무료 사주",
  "무료 만세력",
  "무료 타로",
  "무료 궁합",
  "무료 자미두수",
  "무료 숙요점",
  "무료 점성술",
  "무료 베다 점성술",
  "무료 꿈해몽",
  "오늘의 운세",
  "사주 궁합",
  "자미두수",
  "숙요점",
  "베다점",
  "나크샤트라",
  "점성술 운세",
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
