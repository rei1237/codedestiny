// 앱(Google Play) 전용 가격표 정본.
//
// 웹 가격(worker/lib/paid-feature-registry.js)은 절대 건드리지 않는다. Play 수수료(15%)가
// 웹 PG(약 3%)보다 높아 앱 판매가만 웹 대비 20~30% 인상해 별도로 운영한다.
//
// 여기 amountKRW는 "확정가"이며 Play Console 등록가와 1:1로 일치해야 한다.
// 웹가 × 배수는 산출 근거일 뿐이므로 런타임에서 계산하지 않는다 — 계산하면 반올림 규칙이
// 바뀔 때 Play Console 등록가와 조용히 어긋난다. webAmountKRW는 대조·감사용으로만 둔다.
//
// 정합성은 scripts/verify-app-store-pricing.mjs가 레지스트리 가격 종류와 전수 대조한다.

export const APP_STORE_PROVIDER = "GOOGLE_PLAY";
export const APP_STORE_PRODUCT_TYPE_INAPP = "inapp";
export const APP_PASS_DURATION_DAYS = 30;

// 이 코인가 이하 콘텐츠는 앱에서 무료로 통과시킨다.
// 웹 ₩500(fortune-fish-gacha)은 인상해도 ₩625라 Play KRW 최저 판매가를 밑돌 수 있어
// SKU를 만들지 않는다. 웹은 ₩500 유료 그대로다.
export const APP_FREE_MAX_COIN_PRICE = 5;

const CONTENT_TIER_TABLE = Object.freeze([
  { productId: "cd_content_tier_01", amountKRW: 3900, webAmountKRW: 3000, coinPrices: Object.freeze([30]) },
  { productId: "cd_content_tier_02", amountKRW: 6000, webAmountKRW: 5000, coinPrices: Object.freeze([50]) },
  { productId: "cd_content_tier_03", amountKRW: 7500, webAmountKRW: 6000, coinPrices: Object.freeze([60]) },
  { productId: "cd_content_tier_04", amountKRW: 8900, webAmountKRW: 7000, coinPrices: Object.freeze([70]) },
  { productId: "cd_content_tier_05", amountKRW: 10900, webAmountKRW: 9000, coinPrices: Object.freeze([90]) },
  { productId: "cd_content_tier_06", amountKRW: 12900, webAmountKRW: 10000, coinPrices: Object.freeze([100]) },
  { productId: "cd_content_tier_07", amountKRW: 14900, webAmountKRW: 12000, coinPrices: Object.freeze([120]) },
  { productId: "cd_content_tier_08", amountKRW: 18900, webAmountKRW: 15000, coinPrices: Object.freeze([150]) },
  { productId: "cd_content_tier_09", amountKRW: 24900, webAmountKRW: 20000, coinPrices: Object.freeze([200]) },
  { productId: "cd_content_tier_10", amountKRW: 38900, webAmountKRW: 30000, coinPrices: Object.freeze([300]) },
  { productId: "cd_content_tier_11", amountKRW: 48900, webAmountKRW: 39000, coinPrices: Object.freeze([390]) },
  { productId: "cd_content_tier_12", amountKRW: 62900, webAmountKRW: 50000, coinPrices: Object.freeze([500]) },
  // 690코인(₩69,000)과 700코인(₩70,000)은 확정가가 ₩100 차이라 한 티어로 병합했다.
  { productId: "cd_content_tier_13", amountKRW: 89000, webAmountKRW: 70000, coinPrices: Object.freeze([690, 700]) },
]);

const PASS_TIER_TABLE = Object.freeze([
  { passTier: "standard", productId: "cd_pass_standard_30d", amountKRW: 12000, webAmountKRW: 9900 },
  { passTier: "premium", productId: "cd_pass_premium_30d", amountKRW: 37900, webAmountKRW: 29900 },
  { passTier: "vvip", productId: "cd_pass_vvip_30d", amountKRW: 73900, webAmountKRW: 59000 },
  { passTier: "family", productId: "cd_pass_family_30d", amountKRW: 369000, webAmountKRW: 300000 },
]);

const CONTENT_TIER_BY_COIN_PRICE = (() => {
  const map = new Map();
  for (const tier of CONTENT_TIER_TABLE) {
    for (const coinPrice of tier.coinPrices) map.set(coinPrice, tier);
  }
  return map;
})();

const PRODUCT_BY_ID = (() => {
  const map = new Map();
  for (const tier of CONTENT_TIER_TABLE) map.set(tier.productId, { kind: "content", ...tier });
  for (const pass of PASS_TIER_TABLE) map.set(pass.productId, { kind: "pass", ...pass });
  return map;
})();

function toCoinPrice(value) {
  const coinPrice = Math.floor(Number(value));
  return Number.isFinite(coinPrice) && coinPrice > 0 ? coinPrice : 0;
}

export function isAppFreeCoinPrice(value) {
  const coinPrice = toCoinPrice(value);
  return coinPrice > 0 && coinPrice <= APP_FREE_MAX_COIN_PRICE;
}

/**
 * 웹 코인가 → 앱 콘텐츠 티어. 등록되지 않은 가격대면 null을 반환하므로
 * 호출부는 fail-closed로 처리해야 한다(임의 가격으로 결제시키면 안 된다).
 */
export function resolveAppContentTier(coinPrice) {
  return CONTENT_TIER_BY_COIN_PRICE.get(toCoinPrice(coinPrice)) || null;
}

export function resolveAppPassProduct(passTier) {
  const tier = String(passTier || "").trim().toLowerCase();
  return PASS_TIER_TABLE.find((row) => row.passTier === tier) || null;
}

export function findAppStoreProductById(productId) {
  return PRODUCT_BY_ID.get(String(productId || "").trim()) || null;
}

export function listAppStoreProducts() {
  return [...PRODUCT_BY_ID.values()];
}

export function listAppContentTiers() {
  return [...CONTENT_TIER_TABLE];
}

export function listAppPassProducts() {
  return [...PASS_TIER_TABLE];
}
