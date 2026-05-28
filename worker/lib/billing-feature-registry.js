import {
  COIN_GATE_PER_USE_REASON_COSTS,
  FEATURE_KEY_PRICE_TABLE,
  UNLOCK_PRODUCT_BY_FEATURE_KEY,
  normalizePaidFeatureKey,
} from "./paid-feature-registry.js";

const BILLING_FEATURE_CATEGORIES = Object.freeze({
  "palm-reading": Object.freeze({
    categoryKey: "palm-reading",
    label: "손금 분석",
    featureKey: "palm-reading",
    subFeatures: Object.freeze({
      general: Object.freeze({ featureKey: "palm-reading-general", cost: 50, reason: "손금 전체운 분석" }),
      love: Object.freeze({ featureKey: "palm-reading-love", cost: 30, reason: "손금 연애운 분석" }),
      wealth: Object.freeze({ featureKey: "palm-reading-wealth", cost: 30, reason: "손금 재물운 분석" }),
      career: Object.freeze({ featureKey: "palm-reading-career", cost: 30, reason: "손금 직업운 분석" }),
      personality: Object.freeze({ featureKey: "palm-reading-personality", cost: 30, reason: "손금 성격 분석" }),
      relationship: Object.freeze({ featureKey: "palm-reading-relationship", cost: 30, reason: "손금 관계 패턴 분석" }),
    }),
  }),
  "stonehenge-runes": Object.freeze({
    categoryKey: "stonehenge-runes",
    label: "스톤헨지 룬점",
    featureKey: "stonehenge-runes",
    subFeatures: Object.freeze({
      "spread-1": Object.freeze({ featureKey: "stonehenge-runes-single", cost: 30, reason: "스톤헨지 룬 1-룬 리딩" }),
      "spread-3": Object.freeze({ featureKey: "stonehenge-runes-triad", cost: 50, reason: "스톤헨지 룬 3-룬 리딩" }),
      "spread-5": Object.freeze({ featureKey: "stonehenge-runes-deep", cost: 70, reason: "스톤헨지 룬 5-룬 리딩" }),
      "spread-12": Object.freeze({ featureKey: "stonehenge-runes-yearly", cost: 120, reason: "스톤헨지 룬 12-룬 리딩" }),
    }),
  }),
  "animal-totem": Object.freeze({
    categoryKey: "animal-totem",
    label: "애니멀 토템",
    featureKey: "animal-totem",
    subFeatures: Object.freeze({
      basic: Object.freeze({ featureKey: "animal-totem-basic", cost: 30, reason: "애니멀 토템 리딩" }),
      deep: Object.freeze({ featureKey: "animal-totem-deep", cost: 60, reason: "애니멀 토템 심화 리딩" }),
    }),
  }),
});

const LEGACY_FEATURE_ALIAS_MAP = Object.freeze({
  // Palm
  "palm-reading-general": Object.freeze({ categoryKey: "palm-reading", subFeatureKey: "general" }),
  "palm-reading-love": Object.freeze({ categoryKey: "palm-reading", subFeatureKey: "love" }),
  "palm-reading-wealth": Object.freeze({ categoryKey: "palm-reading", subFeatureKey: "wealth" }),
  "palm-reading-career": Object.freeze({ categoryKey: "palm-reading", subFeatureKey: "career" }),
  "palm-reading-personality": Object.freeze({ categoryKey: "palm-reading", subFeatureKey: "personality" }),
  "palm-reading-relationship": Object.freeze({ categoryKey: "palm-reading", subFeatureKey: "relationship" }),

  // Rune
  stonehengerunes: Object.freeze({ categoryKey: "stonehenge-runes", subFeatureKey: "spread-3" }),
  openruneoracle: Object.freeze({ categoryKey: "stonehenge-runes", subFeatureKey: "spread-3" }),
  "stonehenge-runes-single": Object.freeze({ categoryKey: "stonehenge-runes", subFeatureKey: "spread-1" }),
  "stonehenge-runes-triad": Object.freeze({ categoryKey: "stonehenge-runes", subFeatureKey: "spread-3" }),
  "stonehenge-runes-deep": Object.freeze({ categoryKey: "stonehenge-runes", subFeatureKey: "spread-5" }),
  "stonehenge-runes-yearly": Object.freeze({ categoryKey: "stonehenge-runes", subFeatureKey: "spread-12" }),

  // Animal totem
  "animal-totem": Object.freeze({ categoryKey: "animal-totem", subFeatureKey: "basic" }),
  "animal-totem-basic": Object.freeze({ categoryKey: "animal-totem", subFeatureKey: "basic" }),
  "animal-totem-deep": Object.freeze({ categoryKey: "animal-totem", subFeatureKey: "deep" }),
  openanimaltotem: Object.freeze({ categoryKey: "animal-totem", subFeatureKey: "basic" }),
});

function normalizeKey(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizeText(value) {
  return String(value || "").trim();
}

function buildReasonPricingMap(pricingEntries) {
  const table = Object.create(null);

  for (let i = 0; i < pricingEntries.length; i += 1) {
    const item = pricingEntries[i] || null;
    const reason = String(item?.reason || "").trim();
    const cost = Number(item?.cost);
    if (!reason || !Number.isFinite(cost) || cost <= 0) continue;
    if (!table[reason]) table[reason] = { ...item, reason, cost };
  }

  return Object.freeze(table);
}

const FEATURE_REASON_PRICING_MAP = buildReasonPricingMap(
  Object.entries(FEATURE_KEY_PRICE_TABLE).map(([featureKey, spec]) => ({
    featureKey,
    reason: spec?.reason,
    cost: spec?.cost,
  })),
);

const UNLOCK_REASON_PRICING_MAP = buildReasonPricingMap(
  Object.values(UNLOCK_PRODUCT_BY_FEATURE_KEY).map((spec) => ({
    featureKey: spec?.featureKey,
    reason: spec?.reason,
    cost: spec?.cost,
  })),
);

function toPricingShape({ categoryKey, categoryLabel, subFeatureKey, featureKey, cost, reason }) {
  return {
    categoryKey,
    categoryLabel,
    subFeatureKey,
    featureKey,
    cost: Number(cost),
    reason: String(reason || "").trim(),
    currency: "KRW",
    cashPrice: null,
  };
}

function resolveCategorySubFeature(categoryKey, subFeatureKey) {
  const normalizedCategory = normalizeKey(categoryKey);
  const normalizedSubFeature = normalizeKey(subFeatureKey);
  if (!normalizedCategory || !normalizedSubFeature) return null;

  const category = BILLING_FEATURE_CATEGORIES[normalizedCategory] || null;
  if (!category) return null;

  const subFeature = category.subFeatures[normalizedSubFeature] || null;
  if (!subFeature) return null;

  return toPricingShape({
    categoryKey: category.categoryKey,
    categoryLabel: category.label,
    subFeatureKey: normalizedSubFeature,
    featureKey: subFeature.featureKey,
    cost: subFeature.cost,
    reason: subFeature.reason,
  });
}

function resolveByFeatureKey(featureKey) {
  const requestedFeatureKey = normalizeText(featureKey);
  if (!requestedFeatureKey) return null;
  const normalizedFeatureKey = normalizePaidFeatureKey(requestedFeatureKey);

  if (normalizedFeatureKey === "saju_love_book_pdf") {
    return null;
  }

  const alias = LEGACY_FEATURE_ALIAS_MAP[normalizeKey(requestedFeatureKey)]
    || LEGACY_FEATURE_ALIAS_MAP[normalizeKey(normalizedFeatureKey)]
    || null;
  if (alias) {
    const aliased = resolveCategorySubFeature(alias.categoryKey, alias.subFeatureKey);
    if (aliased) return aliased;
  }

  const featureSpec = FEATURE_KEY_PRICE_TABLE[normalizedFeatureKey] || null;
  if (featureSpec) {
    return toPricingShape({
      categoryKey: "legacy-feature",
      categoryLabel: "레거시 기능",
      subFeatureKey: normalizeKey(normalizedFeatureKey) || "default",
      featureKey: normalizedFeatureKey,
      cost: Number(featureSpec.cost),
      reason: String(featureSpec.reason || "Paid feature unlock"),
    });
  }

  const unlockSpec = UNLOCK_PRODUCT_BY_FEATURE_KEY[normalizedFeatureKey] || null;
  if (!unlockSpec) return null;

  return toPricingShape({
    categoryKey: "unlock-feature",
    categoryLabel: "영구 해금",
    subFeatureKey: normalizeKey(normalizedFeatureKey) || "default",
    featureKey: normalizedFeatureKey,
    cost: Number(unlockSpec.cost),
    reason: String(unlockSpec.reason || "Paid feature unlock"),
  });
}

function resolveByReason(reason) {
  const normalizedReason = normalizeText(reason);
  if (!normalizedReason) return null;

  const cost = Number(COIN_GATE_PER_USE_REASON_COSTS[normalizedReason]);
  if (Number.isFinite(cost) && cost > 0) {
    return toPricingShape({
      categoryKey: "coin-gate-per-use",
      categoryLabel: "회당 결제",
      subFeatureKey: "reason-mapped",
      featureKey: "coin-gate-per-use",
      cost,
      reason: normalizedReason,
    });
  }

  const featureReasonPricing = FEATURE_REASON_PRICING_MAP[normalizedReason] || null;
  if (featureReasonPricing) {
    return toPricingShape({
      categoryKey: "legacy-feature",
      categoryLabel: "레거시 기능",
      subFeatureKey: normalizeKey(featureReasonPricing.featureKey) || "default",
      featureKey: String(featureReasonPricing.featureKey),
      cost: Number(featureReasonPricing.cost),
      reason: normalizedReason,
    });
  }

  const unlockReasonPricing = UNLOCK_REASON_PRICING_MAP[normalizedReason] || null;
  if (unlockReasonPricing) {
    return toPricingShape({
      categoryKey: "unlock-feature",
      categoryLabel: "영구 해금",
      subFeatureKey: normalizeKey(unlockReasonPricing.featureKey) || "default",
      featureKey: String(unlockReasonPricing.featureKey),
      cost: Number(unlockReasonPricing.cost),
      reason: normalizedReason,
    });
  }

  return null;
}

export function normalizeBillingFeatureRequest(input = {}) {
  return {
    categoryKey: normalizeText(input.categoryKey),
    subFeatureKey: normalizeText(input.subFeatureKey),
    featureKey: normalizeText(input.featureKey),
    reason: normalizeText(input.reason),
  };
}

export function getBillingFeaturePricing(input = {}) {
  const normalized = normalizeBillingFeatureRequest(input);

  if (normalized.featureKey === "saju_love_book_pdf" && normalized.reason) {
    const fromReason = resolveByReason(normalized.reason);
    if (fromReason) {
      return {
        ok: true,
        pricing: {
          ...fromReason,
          featureKey: "saju_love_book_pdf",
          subFeatureKey: normalizeKey(String(input?.mode || input?.reportMode || fromReason.subFeatureKey || "solo")) || fromReason.subFeatureKey,
        },
        source: "reason-with-canonical-love-book-feature",
      };
    }
  }

  if (normalized.categoryKey && normalized.subFeatureKey) {
    const fromCategory = resolveCategorySubFeature(normalized.categoryKey, normalized.subFeatureKey);
    if (fromCategory) {
      return {
        ok: true,
        pricing: fromCategory,
        source: "category-subfeature",
      };
    }
  }

  if (normalized.featureKey) {
    const fromFeature = resolveByFeatureKey(normalized.featureKey);
    if (fromFeature) {
      return {
        ok: true,
        pricing: fromFeature,
        source: "feature-key",
      };
    }
  }

  if (normalized.reason) {
    const fromReason = resolveByReason(normalized.reason);
    if (fromReason) {
      return {
        ok: true,
        pricing: fromReason,
        source: "reason",
      };
    }
  }

  return {
    ok: false,
    code: "PRICE_NOT_FOUND",
    message: "요청한 기능의 서버 가격표를 찾을 수 없습니다.",
  };
}

export function assertFeatureEnabled(pricing) {
  if (!pricing) {
    return {
      ok: false,
      code: "PRICE_NOT_FOUND",
      message: "요청한 기능의 서버 가격표를 찾을 수 없습니다.",
    };
  }

  return {
    ok: true,
  };
}

function toCategoryResponse(category) {
  const subFeatures = Object.entries(category.subFeatures).map(([subFeatureKey, subFeature]) => ({
    subFeatureKey,
    featureKey: subFeature.featureKey,
    cost: Number(subFeature.cost),
    reason: String(subFeature.reason || ""),
    currency: "KRW",
    cashPrice: null,
  }));

  return {
    categoryKey: category.categoryKey,
    label: category.label,
    featureKey: category.featureKey,
    subFeatures,
  };
}

export function listBillingFeatures() {
  const categories = Object.values(BILLING_FEATURE_CATEGORIES).map((category) => toCategoryResponse(category));
  const legacyFeatureTable = Object.entries(FEATURE_KEY_PRICE_TABLE)
    .map(([featureKey, featureSpec]) => ({
      featureKey,
      cost: Number(featureSpec?.cost || 0),
      reason: String(featureSpec?.reason || "Paid feature unlock"),
      currency: "KRW",
      cashPrice: null,
    }))
    .filter((entry) => Number.isFinite(entry.cost) && entry.cost > 0)
    .sort((a, b) => a.featureKey.localeCompare(b.featureKey));

  return {
    categories,
    legacyFeatureTable,
  };
}
