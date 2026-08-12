// 앱(Google Play) 전용 가격표 정본.
//
// 웹 가격(worker/lib/paid-feature-registry.js)은 절대 건드리지 않는다. Play 수수료(15%)가
// 웹 PG(약 3%)보다 높아 앱 판매가만 웹 대비 20~30% 인상해 별도로 운영한다.
//
// 여기 amountKRW는 "확정가"이며 Play Console 등록가와 1:1로 일치해야 한다.
// 웹가 × 배수는 산출 근거일 뿐이므로 런타임에서 계산하지 않는다 — 계산하면 반올림 규칙이
// 바뀔 때 Play Console 등록가와 조용히 어긋난다. webAmountKRW는 대조·감사용으로만 둔다.
//
// ⚠️ 이 파일은 워커뿐 아니라 **클라이언트 번들에도 들어간다**(app/_lib/billing-client.ts 등이
//    앱 표시 금액을 계산하려고 import한다). 따라서 여기에 worker 전용 모듈(db.js, models.js,
//    env.js …)을 import하면 웹 빌드가 깨진다. **import 없는 순수 테이블로 유지할 것.**
//    코인 한도 같은 외부 값은 import하지 말고 인자로 받는다.
//
// 정합성은 scripts/verify-app-store-pricing.mjs가 레지스트리 가격 종류와 전수 대조한다.

export const APP_STORE_PROVIDER = "GOOGLE_PLAY";
export const APP_STORE_PRODUCT_TYPE_INAPP = "inapp";
export const APP_PASS_DURATION_DAYS = 30;

// 이 코인가 이하 콘텐츠는 앱에서 무료로 통과시킨다.
// 웹 ₩500(fortune-fish-gacha)은 인상해도 ₩625라 Play KRW 최저 판매가를 밑돌 수 있어
// SKU를 만들지 않는다. 웹은 ₩500 유료 그대로다.
// 음악 트랙 다운로드(10코인/₩1,000, lib/music-access-policy.js)도 같은 이유로 여기에 포함한다 —
// 웹가 인상분 ₩1,250 은 여전히 Play 최저가 근처라 SKU 를 만들지 않고 앱에서는 무료로 둔다.
// (웹 ₩300 → ₩1,000 인상 전에도 3코인이라 앱 무료였다. 이 값을 5로 되돌리면 앱에서 음악 구매가
//  Play 티어 미등록 503 으로 하드블록된다 — 되돌리지 말 것.)
export const APP_FREE_MAX_COIN_PRICE = 10;

const CONTENT_TIER_TABLE = Object.freeze([
  { productId: "cd_content_tier_01", amountKRW: 3900, webAmountKRW: 3000, coinPrices: Object.freeze([30]) },
  { productId: "cd_content_tier_02", amountKRW: 6000, webAmountKRW: 5000, coinPrices: Object.freeze([50]) },
  { productId: "cd_content_tier_03", amountKRW: 7500, webAmountKRW: 6000, coinPrices: Object.freeze([60]) },
  { productId: "cd_content_tier_04", amountKRW: 8900, webAmountKRW: 7000, coinPrices: Object.freeze([70]) },
  { productId: "cd_content_tier_05", amountKRW: 10900, webAmountKRW: 9000, coinPrices: Object.freeze([90]) },
  { productId: "cd_content_tier_06", amountKRW: 13000, webAmountKRW: 10000, coinPrices: Object.freeze([100]) },
  { productId: "cd_content_tier_07", amountKRW: 15000, webAmountKRW: 12000, coinPrices: Object.freeze([120]) },
  { productId: "cd_content_tier_08", amountKRW: 19000, webAmountKRW: 15000, coinPrices: Object.freeze([150]) },
  { productId: "cd_content_tier_09", amountKRW: 25000, webAmountKRW: 20000, coinPrices: Object.freeze([200]) },
  { productId: "cd_content_tier_10", amountKRW: 39000, webAmountKRW: 30000, coinPrices: Object.freeze([300]) },
  { productId: "cd_content_tier_11", amountKRW: 49000, webAmountKRW: 39000, coinPrices: Object.freeze([390]) },
  { productId: "cd_content_tier_12", amountKRW: 65000, webAmountKRW: 50000, coinPrices: Object.freeze([500]) },
  // 690코인(₩69,000)과 700코인(₩70,000)은 확정가가 ₩100 차이라 한 티어로 병합했다.
  { productId: "cd_content_tier_13", amountKRW: 89000, webAmountKRW: 70000, coinPrices: Object.freeze([690, 700]) },
]);

// 이용권: 30일, 자동갱신 없음. 건당 커버 범위 안이면 몇 번이든 무료지만, 등급별 월 누적
// 한도(coin 단위, 웹 정본 MONTHLY_PASS_LIMITS)를 넘으면 그 사이클 안에서는 커버가 끊긴다.
// 앱 가격은 그 등급이 커버하는 금액이 오른 비율만큼 올린다 — 값과 혜택이 비례해야
// "앱은 왜 더 비싼가"가 설명된다. coinLimit은 웹 정본(PASS_LIMITS, 건당 상한)과 같은 값이며,
// 커버 기능 집합은 앱·웹이 동일하다(canUseByPass가 코인으로 판정하므로). 월 누적 한도는
// 앱 SKU 필드로는 노출하지 않는다(앱은 이용권 상품 자체를 판매할 뿐 콘텐츠별 소비를 다루지 않음).
const PASS_TIER_TABLE = Object.freeze([
  // 커버 3,000→3,900(+30.0%) → 이용권도 9,900→13,000(+31.3%)
  { passTier: "standard", productId: "cd_pass_standard_30d", amountKRW: 13000, webAmountKRW: 9900, coinLimit: 30 },
  // 커버 5,000→6,000(+20.0%) → 이용권도 +20.4%
  { passTier: "premium", productId: "cd_pass_premium_30d", amountKRW: 36000, webAmountKRW: 29900, coinLimit: 50 },
  // 커버 10,000→13,000(+30.0%) → 이용권도 +28.6%
  { passTier: "vvip", productId: "cd_pass_vvip_30d", amountKRW: 75900, webAmountKRW: 59000, coinLimit: 100 },
  // 전체 커버라 대응 티어가 없다 → 콘텐츠 티어 평균 인상률(+25% 부근)을 따른다.
  { passTier: "family", productId: "cd_pass_family_30d", amountKRW: 185000, webAmountKRW: 149000, coinLimit: null },
]);

const CONTENT_TIER_BY_COIN_PRICE = (() => {
  const map = new Map();
  for (const tier of CONTENT_TIER_TABLE) {
    for (const coinPrice of tier.coinPrices) map.set(coinPrice, tier);
  }
  return map;
})();

// 가장 비싼 콘텐츠 티어의 코인가. 이용권 한도가 이 값 이상이면 전 티어를 덮는다(= 무제한).
const MAX_CONTENT_TIER_COIN_PRICE = Math.max(
  ...CONTENT_TIER_TABLE.flatMap((tier) => tier.coinPrices),
);

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

/**
 * 이용권 커버 한도(코인) → 앱에서 표시할 원화.
 *
 * 이용권 판정은 코인으로 하고(canUseByPass), 원화는 표시용일 뿐이다. 웹은 코인×100을
 * 쓰지만 앱은 같은 기능이 더 비싸므로 그 티어의 앱 확정가를 보여줘야 한다
 * (standard가 커버하는 30코인 기능 = 웹 3,000원 = 앱 3,900원).
 *
 * 앱 한도 상수를 따로 두지 않고 파생시키는 이유: 웹 PASS_LIMITS가 바뀌면 앱 표시도
 * 자동으로 따라가야 한다. 상수를 2벌 두면 조용히 어긋난다.
 *
 * 한도와 정확히 같은 티어가 없을 수도 있으므로(웹 한도가 티어 경계와 어긋나게 바뀌는 경우)
 * "한도 이하에서 가장 비싼 티어"를 찾는다 — 그게 이 이용권이 실제로 커버하는 최고 금액이다.
 *
 * null을 반환하는 경우(호출부는 "전체 이용 가능" 등으로 처리):
 *   - 한도가 모든 티어를 덮는다(family 등) → "N원 이하"라는 표현 자체가 무의미하다.
 *     여기서 최고 티어가를 돌려주면 호출부가 family 검사를 빠뜨렸을 때
 *     "89,000원 이하 기능 무료"처럼 잘못 안내하게 되므로 함수가 먼저 막는다.
 *   - 커버하는 티어가 하나도 없다.
 */
export function resolveAppPassCoverageKRW(coinLimit) {
  const limit = toCoinPrice(coinLimit);
  if (!limit) return null;
  if (limit >= MAX_CONTENT_TIER_COIN_PRICE) return null;
  let covered = null;
  for (const tier of CONTENT_TIER_TABLE) {
    for (const coinPrice of tier.coinPrices) {
      if (coinPrice > limit) continue;
      if (!covered || tier.amountKRW > covered.amountKRW) covered = tier;
    }
  }
  return covered ? covered.amountKRW : null;
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
