import { resolveProduct } from "../payments/catalog.js";
import { HONEY_PASS_POLICY, normalizePassTier } from "./profile-limits.js";
import {
  LEGACY_PASS_POLICY_VERSION, PRIOR_PASS_POLICY_VERSION, PREVIOUS_PASS_POLICY_VERSION,
  CURRENT_PASS_POLICY_VERSION, priorPassPlan, previousPassPlan, currentPassPlan,
} from "../../lib/payment/pass-policy.js";

const SECTION_NAMES = Object.freeze({ section_daewun: "사주 대운 분석", section_summary: "라이트 사주 풀이" });
const text = value => typeof value === "string" ? value.trim() : "";

// Only server product data enters new snapshots; checkout body labels are never authoritative.
export function productNameForSnapshot(product, purchaseType = "SELF") {
  let name = SECTION_NAMES[product?.featureKey] || "";
  if (!name && !product?.consultationSnapshot && product?.fulfillmentType !== "service_pack") {
    try { name = resolveProduct({ featureKey: product?.featureKey, productId: product?.productId }).label; }
    catch { /* Server-only dynamic and retired products retain their own label. */ }
  }
  name ||= text(product?.label || product?.reason) || resolveOrderProductName(product);
  return purchaseType === "GIFT" ? `${name} 선물` : name;
}

/** Pure read: old orders remain readable without rewriting the order or its PG receipt. */
export function resolveOrderProductName(order = {}) {
  order = order || {};
  const snapshot = order.pricingSnapshot || {};
  if (text(snapshot.productName)) return text(snapshot.productName);
  if (order.purchaseType === "GIFT") {
    return `${text(order.metadata?.giftDraft?.productSnapshot?.name) || text(snapshot.packSnapshot?.label) || "이용권"} 선물`;
  }
  if (text(snapshot.packSnapshot?.label)) return text(snapshot.packSnapshot.label);
  if (order.paymentType === "membership_pass") {
    if (text(snapshot.orderName)) return text(snapshot.orderName);
    const tier = normalizePassTier(order.subscriptionTier);
    const version = order.metadata?.passPolicyVersion || LEGACY_PASS_POLICY_VERSION;
    const reader = { [PRIOR_PASS_POLICY_VERSION]: priorPassPlan, [PREVIOUS_PASS_POLICY_VERSION]: previousPassPlan,
      [CURRENT_PASS_POLICY_VERSION]: currentPassPlan }[version];
    if (Number(order.metadata?.durationMonths || 1) === 1) {
      const name = reader?.(tier)?.name || (version === LEGACY_PASS_POLICY_VERSION && HONEY_PASS_POLICY[tier]?.label
        ? `${HONEY_PASS_POLICY[tier].label} 30일` : "");
      if (name) return name;
    }
    return text(order.subscriptionTier) || "이용권";
  }
  const sectionName = SECTION_NAMES[order.featureKey];
  if (sectionName) return sectionName;
  if (text(snapshot.reason)) return text(snapshot.reason);
  try {
    const product = resolveProduct({ productId: text(order.productId), featureKey: text(order.featureKey) });
    if (product.label) return product.label;
  } catch { /* Retired products keep their original name when one was stored. */ }
  return text(snapshot.orderName) || text(order.featureKey || order.productId) || "디지털 운세 콘텐츠";
}

// Preserve the existing PG 40-byte limit without cutting a UTF-8 character.
export function paymentOrderName(productName) {
  const encoder = new TextEncoder();
  let result = "";
  for (const character of text(productName)) {
    if (encoder.encode(result + character).length > 40) break;
    result += character;
  }
  return result.trim() || "Code Destiny";
}

// History summaries need names, not private birth data or a full PG response.
export const ORDER_PRODUCT_NAME_PROJECTION = Object.freeze({
  "pricingSnapshot.productName": 1, "pricingSnapshot.orderName": 1, "pricingSnapshot.reason": 1,
  "pricingSnapshot.packSnapshot.label": 1, "metadata.giftDraft.productSnapshot.name": 1,
  "metadata.passPolicyVersion": 1, "metadata.durationMonths": 1, purchaseType: 1,
});
