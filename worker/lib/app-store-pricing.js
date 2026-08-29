// 앱(Google Play) 전용 가격표 정본.
//
// 웹 가격(worker/lib/paid-feature-registry.js)은 절대 건드리지 않는다.
//
// 🔴 2026-08-29 개정 — **앱 판매가 = 웹 판매가다**(사용자 확정). 종전의 "웹 대비 20~30% 인상"은
// 콘텐츠 티어에서도 폐기했다(이용권은 2026-08-24 에 먼저 같아졌다). Play 수수료 15%를 그대로
// 부담한다는 뜻이며, 되돌리는 것도 정책 결정이다. 🔴 되돌릴 때는 **Play Console 등록가를 사람이
// 먼저 올린 뒤** 코드를 올린다 — 반대 순서면 그 사이가 "표시가 < 청구가" 정책 위반 구간이 된다.
//
// 여기 amountKRW는 "확정가"이며 Play Console 등록가와 1:1로 일치해야 한다. 지금은 webAmountKRW와
// 같은 값이지만 두 필드를 합치지 않는다 — 합치면 웹가를 고칠 때 Play Console 등록가(사람 손으로
// 등록한다)가 조용히 따라 움직인다. webAmountKRW는 대조·감사용으로 남기고, 동일성은
// scripts/verify-app-store-pricing.mjs가 오차 0으로 단언한다.
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
// 현재 해당하는 것은 음악 트랙 다운로드 하나뿐이다(10코인/₩1,000, lib/music-access-policy.js).
// ₩1,000 은 Play KRW 최저 판매가 근처라 SKU 를 만들지 않고 앱에서는 무료로 둔다.
// (웹 ₩300 → ₩1,000 인상 전에도 3코인이라 앱 무료였다. 이 값을 5로 되돌리면 앱에서 음악 구매가
//  Play 티어 미등록 503 으로 하드블록된다 — 되돌리지 말 것.)
// 2026-08-12: 여기 함께 있던 fortune-fish-gacha(5코인/₩500)는 무료로 전환돼 레지스트리에서 빠졌다.
export const APP_FREE_MAX_COIN_PRICE = 10;

// 2026-08-12 가격 티어 정비: 웹 가격 포인트가 16종 → 7종으로 줄면서 SKU 도 13개 → 7개가 됐다.
// 폐기된 6개(tier_03·04·05·07·08·12)는 대응하는 코인가가 레지스트리에서 사라졌기 때문이며,
// verify-app-store-pricing.mjs 가 "레지스트리에 없는 코인가만 가진 티어"를 실패시킨다.
// 🔴 productId 는 재사용 금지 — Play 는 한 번 만든 상품 ID 를 영구 점유한다. 폐기 SKU 를
// 다른 가격으로 되살리면 과거 구매자의 영수증이 새 가격을 가리키게 된다.
// 2026-08-29: 남은 티어의 amountKRW 를 전부 webAmountKRW 와 같은 값으로 내렸다(앱가 = 웹가).
const CONTENT_TIER_TABLE = Object.freeze([
  { productId: "cd_content_tier_01", amountKRW: 3000, webAmountKRW: 3000, coinPrices: Object.freeze([30]) },
  { productId: "cd_content_tier_02", amountKRW: 5000, webAmountKRW: 5000, coinPrices: Object.freeze([50]) },
  // 2026-08-27 부활: 타로 오라클 상담 8~10카드 티어(70코인/₩7,000). 같은 코인가를 쓰던 옛 SKU
  // cd_content_tier_04(₩8,900)는 2026-08-12 에 판매 중단됐고 Play 는 상품 ID 를 영구 점유하므로
  // 🔴 되살리지 않고 다음 빈 번호로 새로 만든다. Play Console 등록은 사람 손이다
  // (docs/pricing/PLAY_CONSOLE_TASKS.md). 등록 전까지 앱에서 이 구간만 티어 미등록 503 이다.
  { productId: "cd_content_tier_14", amountKRW: 7000, webAmountKRW: 7000, coinPrices: Object.freeze([70]) },
  { productId: "cd_content_tier_06", amountKRW: 10000, webAmountKRW: 10000, coinPrices: Object.freeze([100]) },
  { productId: "cd_content_tier_09", amountKRW: 20000, webAmountKRW: 20000, coinPrices: Object.freeze([200]) },
  { productId: "cd_content_tier_10", amountKRW: 30000, webAmountKRW: 30000, coinPrices: Object.freeze([300]) },
  // 아래 둘은 티어 사다리 밖 "전체 해금형 번들" 전용이다(상한 예외).
  { productId: "cd_content_tier_11", amountKRW: 39000, webAmountKRW: 39000, coinPrices: Object.freeze([390]) },
  { productId: "cd_content_tier_13", amountKRW: 70000, webAmountKRW: 70000, coinPrices: Object.freeze([700]) },
]);

// 이용권: 30일, 자동갱신 없음. 건당 커버 범위 안이면 몇 번이든 무료지만, 등급별 월 이용
// 한도(coin 단위, 웹 정본 MONTHLY_PASS_LIMITS)를 넘으면 그 사이클 안에서는 커버가 끊긴다.
//
// 🔴 2026-08-24 개정 — 이용권가는 앱 = 웹이다(사용자 확정). 2026-08-29 에 콘텐츠 티어도
// 같아지면서 이제 앱의 모든 SKU 가 웹가와 동일하다. Play 수수료 15%를 그대로 부담한다 —
// 의도된 선택이며, 되돌리려면 그것도 정책 결정이다.
// 옛 기준("커버 금액이 오른 비율만큼 이용권가도 올린다")은 폐기했다: 건당 상한이 30/50/100
// → 50/100/200 으로 오르면서 각 등급이 참조하는 콘텐츠 티어가 바뀌어 세 등급 전부 밴드를
// 벗어났고, 그때 고른 답이 "앱가를 웹가에 맞춘다"였다.
// 🔴 amountKRW 는 Play Console 등록가와 1:1 이어야 한다 — 이 값을 바꿨으면 Play Console
//    에서도 사람이 같은 값으로 바꿔야 한다. 가드: scripts/verify-app-store-pricing.mjs
//
// coinLimit 은 웹 정본(PASS_LIMITS, 건당 상한)과 같은 값이며, 커버 기능 집합은 앱·웹이
// 동일하다(canUseByPass 가 코인으로 판정하므로). 월 이용 한도는 앱 SKU 필드로는 노출하지
// 않는다(앱은 이용권 상품 자체를 판매할 뿐 콘텐츠별 소비를 다루지 않음).
const PASS_TIER_TABLE = Object.freeze([
  { passTier: "standard", productId: "cd_pass_standard_30d", amountKRW: 9900, webAmountKRW: 9900, coinLimit: 50 },
  { passTier: "premium", productId: "cd_pass_premium_30d", amountKRW: 29900, webAmountKRW: 29900, coinLimit: 100 },
  { passTier: "vvip", productId: "cd_pass_vvip_30d", amountKRW: 59000, webAmountKRW: 59000, coinLimit: 200 },
  { passTier: "family", productId: "cd_pass_family_30d", amountKRW: 149000, webAmountKRW: 149000, coinLimit: null },
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
