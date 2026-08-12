/**
 * 레거시 바디 → 가격 해석. **구 checkout 과 같은 정본(billing-feature-registry)을 같은 순서로 탄다.**
 *
 * 왜 catalog(resolveProduct)가 아닌가: 컷오버 어댑터의 첫 배선은 catalog 를 썼는데, catalog 는
 * (productId → featureKey → reason) 3입력만 받아 구 해석의 mode/reportMode/categoryKey/subFeatureKey
 * 변형 가격을 잃는다 — 모드별 가격이 다른 기능의 단건 결제가 400(금액 불일치)으로 막히는 라이브
 * 결함이었다(2026-08-12). 여기서는 구 billing.js resolvePricingFromBody(:3358-3408)의 체인을
 * 그대로 승계한다: 6필드 1차 해석 → 비일반 키면 채택 → 아니면 13후보를 featureKey 로 재해석.
 * 후보 목록·일반키 판정을 바꾸면 구 라우트와 다른 가격이 나온다 — 목록은 테스트가 고정한다.
 */
import { getBillingFeaturePricing } from "../lib/billing-feature-registry.js";
import { paymentError } from "./errors.js";

const GENERIC_FEATURE_KEYS = new Set(["", "coin-gate-per-use", "paid-service", "paid_service", "default", "service"]);

export function isGenericLegacyFeatureKey(featureKey) {
  return GENERIC_FEATURE_KEYS.has(String(featureKey || "").trim().toLowerCase());
}

// 구 resolvePricingFromBody 의 후보 순서 그대로. 순서를 바꾸면 같은 바디가 다른 상품이 된다.
export const LEGACY_FEATURE_CANDIDATE_FIELDS = Object.freeze([
  "featureKey",
  "subFeatureKey",
  "paidFeatureKey",
  "billingFeatureKey",
  "unlockFeatureKey",
  "accessFeatureKey",
  "serviceKey",
  "productId",
  "contentKey",
  "reportType",
  "reportMode",
  "mode",
  "action",
]);

export function resolveLegacyPricingResult(body = {}) {
  const baseInput = {
    categoryKey: body?.categoryKey,
    subFeatureKey: body?.subFeatureKey,
    featureKey: body?.featureKey,
    reason: body?.reason,
    mode: body?.mode,
    reportMode: body?.reportMode,
  };
  const initial = getBillingFeaturePricing(baseInput);
  if (initial?.ok && !isGenericLegacyFeatureKey(initial?.pricing?.featureKey)) {
    return initial;
  }

  const seen = new Set();
  for (const field of LEGACY_FEATURE_CANDIDATE_FIELDS) {
    const candidate = String(body?.[field] || "").trim();
    if (!candidate || isGenericLegacyFeatureKey(candidate)) continue;
    const lower = candidate.toLowerCase();
    if (seen.has(lower)) continue;
    seen.add(lower);
    const resolved = getBillingFeaturePricing({
      ...baseInput,
      categoryKey: "",
      subFeatureKey: "",
      featureKey: candidate,
    });
    if (resolved?.ok && !isGenericLegacyFeatureKey(resolved?.pricing?.featureKey)) {
      return resolved;
    }
  }
  return initial;
}

/**
 * 어댑터 공용 형태로 정규화한다. createOrder/spendMoonstone 이 읽는 필드만 갖는 product 형.
 * @returns {{ productId, featureKey, priceKRW, priceCoins, monthlyCost, label, pricing }}
 */
export function resolveLegacyProduct(body = {}) {
  const result = resolveLegacyPricingResult(body);
  if (!result?.ok || !result.pricing) {
    throw paymentError("PRODUCT_NOT_FOUND", "결제 가능한 상품을 찾지 못했습니다.", {
      featureKey: String(body?.featureKey || ""),
    });
  }
  const pricing = result.pricing;
  const priceCoins = Math.max(0, Math.floor(Number(pricing.cost || pricing.coinPrice || 0)));
  const priceKRW = Math.max(0, Math.floor(Number(pricing.amountKRW ?? pricing.cashPrice ?? priceCoins * 100)));
  const monthlyCost = Math.max(0, Math.floor(Number(pricing.membershipCreditCost ?? priceCoins)));
  if (priceKRW <= 0 || priceCoins <= 0) {
    throw paymentError("PRODUCT_NOT_FOUND", "가격이 정의되지 않은 상품입니다.", {
      featureKey: String(pricing.featureKey || ""),
    });
  }
  return {
    productId: String(pricing.featureKey || ""),
    featureKey: String(pricing.featureKey || ""),
    priceKRW,
    priceCoins,
    monthlyCost,
    label: String(pricing.label || pricing.title || pricing.featureKey || ""),
    pricing,
  };
}
