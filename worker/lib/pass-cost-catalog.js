import { FEATURE_KEY_REASON_COSTS, COIN_GATE_PER_USE_REASON_COSTS, PIG_COIN_UNLOCK_PRODUCTS } from "./paid-feature-registry.js";
import { listProducts, resolveProduct } from "../payments/catalog.js";

// Include every payable path, including reason-specific courses and old unlock IDs.
// Keeping a historical-only entry here is conservative: absent evidence closes sales.
export function listPassCostProducts(plan) {
  const products = new Map();
  const add = (product) => {
    const tierAllowed = !product.familyPassOnly || plan?.tier === "family";
    if (tierAllowed && !product.passExcluded && !product.directOnly && product.priceCoins > 0 && product.priceCoins <= plan.maxCoveredCoin) {
      products.set(product.featureKey, product);
    }
  };
  listProducts().forEach(add);
  for (const [productId, spec] of Object.entries(PIG_COIN_UNLOCK_PRODUCTS)) {
    if (spec.amountKRW > 0) add(resolveProduct({ productId }));
  }
  for (const [featureKey, reasons] of Object.entries(FEATURE_KEY_REASON_COSTS)) {
    for (const reason of Object.keys(reasons)) {
      const product = resolveProduct({ featureKey, reason });
      add({ ...product, featureKey: `${featureKey}::${reason}` });
    }
  }
  for (const [reason, pricing] of Object.entries(COIN_GATE_PER_USE_REASON_COSTS)) {
    const cost = typeof pricing === "number" ? pricing : pricing.cost;
    add({ featureKey: `coin-gate-per-use::${reason}`, priceKRW: cost * 100, priceCoins: cost });
  }
  return [...products.values()];
}
