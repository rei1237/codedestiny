export const LOVE_CODE_FEATURE_KEY = "love-code" as const;
export const LOVE_CODE_PRODUCT_ID = "unlock.love-code" as const;
export const LEGACY_LOVE_CODE_FEATURE_KEYS = ["loveSimulation", "openLoveSimulation"] as const;

const LOVE_CODE_KEY_SET = new Set<string>([LOVE_CODE_FEATURE_KEY, ...LEGACY_LOVE_CODE_FEATURE_KEYS]);

export function normalizeLoveCodeFeatureKey(value: unknown): string {
  const key = String(value || "").trim();
  return LOVE_CODE_KEY_SET.has(key) ? LOVE_CODE_FEATURE_KEY : key;
}

export function isLoveCodeFeatureKey(value: unknown): boolean {
  return normalizeLoveCodeFeatureKey(value) === LOVE_CODE_FEATURE_KEY;
}
