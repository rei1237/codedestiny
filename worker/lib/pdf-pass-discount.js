import {
  calculateKrwAmountFromCoins,
  calculateMembershipCreditCost,
} from "./billing-policy.js";
import {
  FAMILY_PASS_MAX_COVERED_COIN,
  PASS_TIERS,
  normalizePassTier,
} from "./profile-limits.js";
import {
  PAID_FEATURE_BILLING_TYPES,
  getPaidFeatureBillingType,
} from "./paid-feature-registry.js";

function toCoinPrice(value) {
  const coinPrice = Number(value);
  if (!Number.isFinite(coinPrice) || coinPrice <= 0) return 0;
  return Math.floor(coinPrice);
}

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

export function applyPdfPassDiscountToPricing(pricing = {}, entitlement = {}) {
  if (!isPdfFeaturePricing(pricing)) return pricing;

  const originalCoinPrice = toCoinPrice(pricing?.originalCoinPrice || pricing?.coinPrice || pricing?.cost);
  const passLimit = getPassDiscountCoinLimit(entitlement);
  const discountCoins = Math.min(originalCoinPrice, passLimit);
  if (originalCoinPrice <= 0 || discountCoins <= 0) return pricing;

  const finalCoinPrice = Math.max(0, originalCoinPrice - discountCoins);
  const amountKRW = calculateKrwAmountFromCoins(finalCoinPrice);
  const membershipCreditCost = calculateMembershipCreditCost(finalCoinPrice);
  const discount = {
    type: "pdf_membership_pass_discount",
    tier: String(entitlement?.tier || "").trim(),
    passTier: normalizePassTier(entitlement?.passTier || entitlement?.tier),
    originalCoinPrice,
    discountCoins,
    finalCoinPrice,
    freeByFamily: isFamilyPassEntitlement(entitlement),
  };

  return {
    ...pricing,
    originalCost: originalCoinPrice,
    originalCoinPrice,
    cost: finalCoinPrice,
    coinPrice: finalCoinPrice,
    amountKRW,
    cashPrice: amountKRW,
    krwAmount: amountKRW,
    membershipCreditCost,
    displayPrice: `${finalCoinPrice.toLocaleString("ko-KR")}\uCF54\uC778`,
    passDiscount: discount,
    pricingPolicy: {
      ...(pricing?.pricingPolicy || {}),
      pdfPassDiscount: discount,
    },
  };
}
