import {
  COIN_GATE_PER_USE_REASON_COSTS,
  FEATURE_KEY_REASON_COSTS,
  FEATURE_KEY_PRICE_TABLE,
  UNLOCK_PRODUCT_BY_FEATURE_KEY,
  getPaidFeatureBillingType,
  normalizePaidFeatureKey,
} from "./paid-feature-registry.js";
import {
  calculateMembershipCreditCost,
  KRW_PER_COIN,
  MEMBERSHIP_CREDIT_PER_COIN,
  normalizePaidFeaturePricingShape,
} from "./billing-policy.js";
import { resolveMusicTrackUnlockPricing } from "../../lib/music-access-policy.js";

// 이 표가 소유하는 고유 정보는 (categoryKey, subFeatureKey) → featureKey 매핑과 카테고리 라벨뿐이다.
// 가격(cost)과 사유(reason)는 FEATURE_KEY_PRICE_TABLE 에서 파생한다 — 여기에 숫자를 다시 적으면
// 정본과 조용히 갈라진다(아래 FEATURE_REASON_PRICING_MAP 이 이미 같은 방식으로 파생하고 있다).
const BILLING_FEATURE_CATEGORIES = Object.freeze({
  "palm-reading": Object.freeze({
    categoryKey: "palm-reading",
    label: "손금 분석",
    featureKey: "palm-reading",
    subFeatures: Object.freeze({
      // 판독 + 심층 해석 통합 상품. aiConsult 는 레거시 호환용으로만 남는다.
      general: Object.freeze({ featureKey: "palm-reading-general" }),
      aiConsult: Object.freeze({ featureKey: "palm-reading-ai-consult" }),
    }),
  }),
  "stonehenge-runes": Object.freeze({
    categoryKey: "stonehenge-runes",
    label: "스톤헨지 룬점",
    featureKey: "stonehenge-runes",
    subFeatures: Object.freeze({
      "spread-1": Object.freeze({ featureKey: "stonehenge-runes-single" }),
      "spread-3": Object.freeze({ featureKey: "stonehenge-runes-triad" }),
      "spread-5": Object.freeze({ featureKey: "stonehenge-runes-deep" }),
      "spread-12": Object.freeze({ featureKey: "stonehenge-runes-yearly" }),
      "ai-prompt": Object.freeze({ featureKey: "stonehenge-runes-ai-prompt" }),
    }),
  }),
  "animal-totem": Object.freeze({
    categoryKey: "animal-totem",
    label: "애니멀 토템",
    featureKey: "animal-totem",
    subFeatures: Object.freeze({
      basic: Object.freeze({ featureKey: "animal-totem-basic" }),
      deep: Object.freeze({ featureKey: "animal-totem-deep" }),
    }),
  }),
});

/**
 * 카테고리 서브피처의 가격 정본은 FEATURE_KEY_PRICE_TABLE 하나다.
 * 못 찾으면 조용히 null 을 돌려주지 않고 터뜨린다 — resolveCategorySubFeature 가
 * resolveByFeatureKey 보다 먼저 타므로, 키 오타로 null 이 떨어지면 legacy-pricing 의
 * 13후보 폴백이 "다른 상품의 가격"을 집어 든다.
 */
function requireSubFeaturePricing(categoryKey, subFeatureKey, subFeature) {
  const spec = FEATURE_KEY_PRICE_TABLE[subFeature?.featureKey] || null;
  if (!spec) {
    throw new Error(
      `[billing-feature-registry] ${categoryKey}.${subFeatureKey} 가 가리키는 ` +
        `featureKey "${subFeature?.featureKey}" 가 FEATURE_KEY_PRICE_TABLE 에 없습니다.`,
    );
  }
  return spec;
}

const LEGACY_FEATURE_ALIAS_MAP = Object.freeze({
  // Palm
  "palm-reading-general": Object.freeze({ categoryKey: "palm-reading", subFeatureKey: "general" }),
  "palm-reading-ai-consult": Object.freeze({ categoryKey: "palm-reading", subFeatureKey: "aiConsult" }),

  // Rune
  stonehengerunes: Object.freeze({ categoryKey: "stonehenge-runes", subFeatureKey: "spread-3" }),
  openruneoracle: Object.freeze({ categoryKey: "stonehenge-runes", subFeatureKey: "spread-3" }),
  "stonehenge-runes-single": Object.freeze({ categoryKey: "stonehenge-runes", subFeatureKey: "spread-1" }),
  "stonehenge-runes-triad": Object.freeze({ categoryKey: "stonehenge-runes", subFeatureKey: "spread-3" }),
  "stonehenge-runes-deep": Object.freeze({ categoryKey: "stonehenge-runes", subFeatureKey: "spread-5" }),
  "stonehenge-runes-yearly": Object.freeze({ categoryKey: "stonehenge-runes", subFeatureKey: "spread-12" }),
  "stonehenge-runes-ai-prompt": Object.freeze({ categoryKey: "stonehenge-runes", subFeatureKey: "ai-prompt" }),

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

function isGenericCoinGateFeatureKey(featureKey) {
  const key = normalizeKey(featureKey);
  return key === "coin-gate-per-use"
    || key === "paid-service"
    || key === "paid_service"
    || key === "default"
    || key === "service";
}

function buildReasonPricingMap(pricingEntries) {
  const table = Object.create(null);

  for (let i = 0; i < pricingEntries.length; i += 1) {
    const item = pricingEntries[i] || null;
    const reason = String(item?.reason || "").trim();
    const pricing = normalizePaidFeaturePricingShape(item || {});
    const cost = Number(pricing.cost);
    if (!reason || !Number.isFinite(cost) || cost <= 0) continue;
    if (!table[reason]) table[reason] = { ...item, ...pricing, reason, cost };
  }

  return Object.freeze(table);
}

const FEATURE_REASON_PRICING_MAP = buildReasonPricingMap(
  Object.entries(FEATURE_KEY_PRICE_TABLE).map(([featureKey, spec]) => ({
    featureKey,
    reason: spec?.reason,
    cost: spec?.cost,
    amountKRW: spec?.amountKRW,
  })),
);

const UNLOCK_REASON_PRICING_MAP = buildReasonPricingMap(
  Object.values(UNLOCK_PRODUCT_BY_FEATURE_KEY).map((spec) => ({
    featureKey: spec?.featureKey,
    reason: spec?.reason,
    cost: spec?.cost,
    amountKRW: spec?.amountKRW,
  })),
);

function toPricingShape({ categoryKey, categoryLabel, subFeatureKey, featureKey, cost, amountKRW, reason }) {
  const pricing = normalizePaidFeaturePricingShape({ cost, amountKRW });
  const coinPrice = pricing.coinPrice;
  const resolvedAmountKRW = pricing.amountKRW;
  const membershipCreditCost = calculateMembershipCreditCost(coinPrice);
  const billingType = getPaidFeatureBillingType(featureKey);
  return {
    categoryKey,
    categoryLabel,
    subFeatureKey,
    featureKey,
    cost: coinPrice,
    coinPrice,
    displayUnit: "KRW",
    displayPrice: `${resolvedAmountKRW.toLocaleString("ko-KR")}원`,
    reason: String(reason || "").trim(),
    currency: "KRW",
    amountKRW: resolvedAmountKRW,
    cashPrice: resolvedAmountKRW,
    krwAmount: resolvedAmountKRW,
    paymentAmount: resolvedAmountKRW,
    membershipCreditCost,
    pricingPolicy: {
      krwPerCoin: KRW_PER_COIN,
      membershipCreditPerCoin: MEMBERSHIP_CREDIT_PER_COIN,
    },
    paymentMode: "single_purchase",
    coinDisplayOnly: false,
    pricingBasis: "KRW",
    billingType,
    accessKind: billingType,
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

  const spec = requireSubFeaturePricing(category.categoryKey, normalizedSubFeature, subFeature);

  return toPricingShape({
    categoryKey: category.categoryKey,
    categoryLabel: category.label,
    subFeatureKey: normalizedSubFeature,
    featureKey: subFeature.featureKey,
    cost: spec.cost,
    amountKRW: spec.amountKRW,
    reason: spec.reason,
  });
}

function resolveByFeatureKey(featureKey) {
  const requestedFeatureKey = normalizeText(featureKey);
  if (!requestedFeatureKey) return null;
  const normalizedFeatureKey = normalizePaidFeatureKey(requestedFeatureKey);

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
      amountKRW: Number(featureSpec.amountKRW),
      reason: String(featureSpec.reason || "Paid feature unlock"),
    });
  }

  const musicTrackSpec = resolveMusicTrackUnlockPricing(normalizedFeatureKey);
  if (musicTrackSpec) {
    return toPricingShape({
      categoryKey: "music-track",
      categoryLabel: "Code Destiny Music",
      subFeatureKey: normalizeKey(normalizedFeatureKey) || "default",
      featureKey: normalizedFeatureKey,
      cost: Number(musicTrackSpec.cost),
      amountKRW: Number(musicTrackSpec.amountKRW),
      reason: String(musicTrackSpec.reason || "Code Destiny music full track unlock"),
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
    amountKRW: Number(unlockSpec.amountKRW),
    reason: String(unlockSpec.reason || "Paid feature unlock"),
  });
}

function resolveByFeatureReason(featureKey, reason) {
  const requestedFeatureKey = normalizeText(featureKey);
  const normalizedFeatureKey = normalizePaidFeatureKey(requestedFeatureKey);
  const normalizedReason = normalizeText(reason);
  if (!normalizedFeatureKey || !normalizedReason) return null;

  const reasonTable = FEATURE_KEY_REASON_COSTS[normalizedFeatureKey] || null;
  const reasonPricing = normalizePaidFeaturePricingShape(reasonTable?.[normalizedReason] || {});
  const cost = Number(reasonPricing.cost);
  if (!Number.isFinite(cost) || cost <= 0) return null;

  return toPricingShape({
    categoryKey: "legacy-feature",
    categoryLabel: "레거시 기능",
    subFeatureKey: normalizeKey(normalizedFeatureKey) || "default",
    featureKey: normalizedFeatureKey,
    cost,
    amountKRW: reasonPricing.amountKRW,
    reason: normalizedReason,
  });
}

function resolveByReason(reason) {
  const normalizedReason = normalizeText(reason);
  if (!normalizedReason) return null;

  const featureReasonPricing = FEATURE_REASON_PRICING_MAP[normalizedReason] || null;
  if (featureReasonPricing) {
    return toPricingShape({
      categoryKey: "legacy-feature",
      categoryLabel: "레거시 기능",
      subFeatureKey: normalizeKey(featureReasonPricing.featureKey) || "default",
      featureKey: String(featureReasonPricing.featureKey),
      cost: Number(featureReasonPricing.cost),
      amountKRW: Number(featureReasonPricing.amountKRW),
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
      amountKRW: Number(unlockReasonPricing.amountKRW),
      reason: normalizedReason,
    });
  }

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

  if (isGenericCoinGateFeatureKey(normalized.featureKey) && normalized.reason) {
    const fromReason = resolveByReason(normalized.reason);
    if (fromReason) {
      return {
        ok: true,
        pricing: fromReason,
        source: "generic-feature-reason",
      };
    }
  }

  if (normalized.featureKey && !isGenericCoinGateFeatureKey(normalized.featureKey)) {
    const fromFeatureReason = resolveByFeatureReason(normalized.featureKey, normalized.reason);
    if (fromFeatureReason) {
      return {
        ok: true,
        pricing: fromFeatureReason,
        source: "feature-key-reason",
      };
    }

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
  const subFeatures = Object.entries(category.subFeatures).map(([subFeatureKey, subFeature]) => {
    const spec = requireSubFeaturePricing(category.categoryKey, subFeatureKey, subFeature);
    const pricing = normalizePaidFeaturePricingShape(spec);
    return {
      subFeatureKey,
      featureKey: subFeature.featureKey,
      cost: pricing.cost,
      coinPrice: pricing.coinPrice,
      amountKRW: pricing.amountKRW,
      cashPrice: pricing.amountKRW,
      krwAmount: pricing.amountKRW,
      paymentAmount: pricing.amountKRW,
      reason: String(spec.reason || ""),
      currency: "KRW",
      pricingBasis: "KRW",
    };
  });

  return {
    categoryKey: category.categoryKey,
    label: category.label,
    featureKey: category.featureKey,
    subFeatures,
  };
}

export function listBillingFeatures() {
  const categories = Object.values(BILLING_FEATURE_CATEGORIES).map((category) => toCategoryResponse(category));
  const legacyEntries = Object.entries(FEATURE_KEY_PRICE_TABLE).map(([featureKey, featureSpec]) => {
    const pricing = normalizePaidFeaturePricingShape(featureSpec || {});
    return {
      featureKey,
      cost: pricing.cost,
      coinPrice: pricing.coinPrice,
      amountKRW: pricing.amountKRW,
      cashPrice: pricing.amountKRW,
      krwAmount: pricing.amountKRW,
      paymentAmount: pricing.amountKRW,
      reason: String(featureSpec?.reason || "Paid feature unlock"),
      currency: "KRW",
      pricingBasis: "KRW",
    };
  });
  const unlockEntries = Object.values(UNLOCK_PRODUCT_BY_FEATURE_KEY).map((featureSpec) => {
    const pricing = normalizePaidFeaturePricingShape(featureSpec || {});
    return {
      featureKey: String(featureSpec?.featureKey || "").trim(),
      cost: pricing.cost,
      coinPrice: pricing.coinPrice,
      amountKRW: pricing.amountKRW,
      cashPrice: pricing.amountKRW,
      krwAmount: pricing.amountKRW,
      paymentAmount: pricing.amountKRW,
      reason: String(featureSpec?.reason || "Paid feature unlock"),
      currency: "KRW",
      pricingBasis: "KRW",
    };
  });
  const seenFeatureKeys = new Set();
  const legacyFeatureTable = [...legacyEntries, ...unlockEntries]
    .filter((entry) => Number.isFinite(entry.cost) && entry.cost > 0)
    .filter((entry) => {
      if (!entry.featureKey || seenFeatureKeys.has(entry.featureKey)) return false;
      seenFeatureKeys.add(entry.featureKey);
      return true;
    })
    .sort((a, b) => a.featureKey.localeCompare(b.featureKey));

  return {
    categories,
    legacyFeatureTable,
  };
}
