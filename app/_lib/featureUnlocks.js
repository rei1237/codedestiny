export const FLOWER_UNLOCK_COST = 200;

export const FLOWER_ROUTE_LOCK_KEY_MAP = Object.freeze({
  "flower/destiny": "flower-destiny",
  "flower/astrology": "flower-astro",
  "flower/jamidusu": "flower-ziwei",
  "flower/sukuyo": "flower-sukuyo",
});

// 운명의 꽃 아틀리에는 20,000원 1회 해금으로 모든 꽃 소스를 함께 연다.
const LOCK_ALIAS_MAP = Object.freeze({
  "olympus-profile-fc": ["olympus-fc"],
  "olympus-fc": ["olympus-profile-fc"],
  "flower-fc": ["flower-destiny", "flower-astro", "flower-ziwei", "flower-sukuyo"],
  "flower-destiny": ["flower-fc"],
  "flower-astro": ["flower-fc"],
  "flower-ziwei": ["flower-fc"],
  "flower-sukuyo": ["flower-fc"],
});

export const FLOWER_KNOWN_LOCK_KEYS = Object.freeze([
  "flower-destiny",
  "flower-astro",
  "flower-ziwei",
  "flower-sukuyo",
]);

export function resolveUnlockAliasKeys(rawKey) {
  const base = String(rawKey || "").trim();
  if (!base) return [];

  const map = Object.create(null);
  map[base] = true;

  const aliases = LOCK_ALIAS_MAP[base] || [];
  for (let i = 0; i < aliases.length; i += 1) {
    map[aliases[i]] = true;
  }

  return Object.keys(map);
}

export function isUnlockSatisfied(unlockedFeatures, requiredKey) {
  const unlockedSet = new Set(
    Array.isArray(unlockedFeatures)
      ? unlockedFeatures.map((value) => String(value || "").trim()).filter(Boolean)
      : []
  );

  const aliases = resolveUnlockAliasKeys(requiredKey);
  for (let i = 0; i < aliases.length; i += 1) {
    if (unlockedSet.has(aliases[i])) return true;
  }
  return false;
}

export function isFlowerRouteSlug(slug) {
  return Object.prototype.hasOwnProperty.call(FLOWER_ROUTE_LOCK_KEY_MAP, String(slug || ""));
}
