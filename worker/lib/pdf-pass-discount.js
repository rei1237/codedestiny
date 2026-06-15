import {
  FAMILY_PASS_MAX_COVERED_COIN,
  PASS_TIERS,
  normalizePassTier,
} from "./profile-limits.js";
import {
  PAID_FEATURE_BILLING_TYPES,
  getPaidFeatureBillingType,
} from "./paid-feature-registry.js";

function isActiveEntitlement(entitlement = {}) {
  if (!entitlement || entitlement.isActive !== true) return false;
  const expiresAt = entitlement.expiresAt ? new Date(entitlement.expiresAt) : null;
  return !(expiresAt && Number.isFinite(expiresAt.getTime()) && expiresAt.getTime() < Date.now());
}

export function isFamilyPassEntitlement(entitlement = {}) {
  if (!isActiveEntitlement(entitlement)) return false;
  const passTier = normalizePassTier(entitlement.passTier || entitlement.tier);
  return passTier === PASS_TIERS.FAMILY || String(entitlement.tier || "").trim().toLowerCase() === "family";
}

export function isPdfFeaturePricing(pricing = {}) {
  const type = String(pricing?.billingType || pricing?.accessKind || "").trim().toLowerCase();
  if (type === PAID_FEATURE_BILLING_TYPES.PDF) return true;
  return getPaidFeatureBillingType(pricing?.featureKey) === PAID_FEATURE_BILLING_TYPES.PDF;
}

export function getPassDiscountCoinLimit(entitlement = {}) {
  if (!isActiveEntitlement(entitlement)) return 0;
  if (isFamilyPassEntitlement(entitlement)) return FAMILY_PASS_MAX_COVERED_COIN;
  return Math.max(0, Math.floor(Number(entitlement.maxCoveredCoin || entitlement.freeLimit || entitlement.passLimit || 0)));
}

export function applyPdfPassDiscountToPricing(pricing = {}) {
  return pricing;
}
