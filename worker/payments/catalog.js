/**
 * 단계 ① 상품. **순수 함수, I/O 0.**
 *
 * 가격의 정본은 여전히 worker/lib/paid-feature-registry.js 이고 이 파일은 그것을 **감싸기만** 한다.
 * 정본을 옮기거나 복제하지 않는다 — verify:paid-feature-billing-policy 가 등록소를 가격 정본으로
 * 고정하고 있고, "worker billing 이 자체 회당결제 목록을 들고 있으면 안 된다"까지 단언한다.
 *
 * 구 코드가 이 자리에서 무거웠던 이유는 도메인이 복잡해서가 아니라, 기능별 예외
 * (isProfileCardManage · PDF 할인 · passExcluded)가 **가격표가 아니라 제어흐름**에 흩어져 있었기
 * 때문이다. 여기서는 전부 상품 스펙 한 덩어리로 접혀 나가고, 호출부는 분기하지 않는다.
 *
 * DB 를 읽지 않으므로 admission 슬롯을 **0개** 쓴다. GET /api/billing/features 가 Mongo 왕복 0으로
 * 내려갈 수 있는 이유가 이것이다.
 */
import {
  FEATURE_KEY_PRICE_TABLE,
  PAID_FEATURE_BILLING_TYPES,
  PIG_COIN_UNLOCK_PRODUCTS,
  getPaidFeatureBillingType,
  normalizePaidFeatureKey,
  resolveFeatureReasonCost,
} from "../lib/paid-feature-registry.js";
import {
  calculateMembershipCreditCost,
  normalizePaidFeaturePricingShape,
} from "../lib/billing-policy.js";
import { paymentError } from "./errors.js";

/* 🔴 이용권으로 **결제할 수 없는** 기능. 등급과 무관하다(family 포함).
   featureKey 별 예외 분기를 호출부에 두지 말 것 — 과거 buildPassPaymentDecision 에서 `&& !isProfileCardManage`
   식으로 제외를 되풀었다가, 프로필 카드가 premium/vvip 에게 "이용권 커버됨 + 결제수단 전부 숨김"으로
   뜬 뒤 소비 단계에서 거부되는 막다른 길이 됐다. 판정은 이 집합 하나뿐이다.
   (family 무료는 이용권 결제가 아니라 정책 계층의 0원 바이패스로 처리된다 — profile-card-mutation-policy.js) */
export const PASS_EXCLUDED_FEATURE_KEYS = Object.freeze(["profile-card-manage"]);
const PASS_EXCLUDED_SET = new Set(PASS_EXCLUDED_FEATURE_KEYS);

/* featureKey → unlock 상품 id. PIG_COIN_UNLOCK_PRODUCTS 는 id 로 키가 잡혀 있어서
   featureKey 만 들고 온 호출부를 위해 역인덱스를 한 번 만들어 둔다(모듈 로드 시 1회). */
const UNLOCK_PRODUCT_ID_BY_FEATURE_KEY = Object.freeze(
  Object.entries(PIG_COIN_UNLOCK_PRODUCTS).reduce((acc, [productId, spec]) => {
    const key = normalizePaidFeatureKey(spec?.featureKey);
    if (key && !acc[key]) acc[key] = productId;
    return acc;
  }, Object.create(null)),
);

function lookupSpec(productId, featureKey) {
  if (productId && PIG_COIN_UNLOCK_PRODUCTS[productId]) {
    return { spec: PIG_COIN_UNLOCK_PRODUCTS[productId], productId };
  }
  if (!featureKey) return null;
  if (FEATURE_KEY_PRICE_TABLE[featureKey]) {
    return { spec: FEATURE_KEY_PRICE_TABLE[featureKey], productId: featureKey };
  }
  const unlockId = UNLOCK_PRODUCT_ID_BY_FEATURE_KEY[featureKey];
  if (unlockId) return { spec: PIG_COIN_UNLOCK_PRODUCTS[unlockId], productId: unlockId };
  return null;
}

/**
 * 상품 스펙을 확정한다. DB 를 보지 않으므로 사용자·보유상태와 무관하게 항상 같은 답이 나온다.
 *
 * @param {{ productId?: string, featureKey?: string, reason?: string }} input
 * @returns {{
 *   productId: string, featureKey: string, billingType: string,
 *   priceKRW: number, priceCoins: number, monthlyCost: number,
 *   label: string, passExcluded: boolean,
 * }}
 * @throws {PaymentError} PRODUCT_NOT_FOUND
 */
export function resolveProduct(input = {}) {
  const rawProductId = String(input.productId || "").trim();
  const featureKey = normalizePaidFeatureKey(input.featureKey || rawProductId);
  const found = lookupSpec(rawProductId, featureKey);
  if (!found) {
    throw paymentError("PRODUCT_NOT_FOUND", "상품 정보를 찾을 수 없습니다.", {
      productId: rawProductId,
      featureKey,
    });
  }

  const canonicalFeatureKey = normalizePaidFeatureKey(found.spec.featureKey || featureKey);
  // reason 별 가격이 등록소에 있으면 그게 이긴다(같은 기능이 진입 경로마다 값이 다른 상품이 있다).
  const reasonCost = resolveFeatureReasonCost(canonicalFeatureKey, input.reason);
  const shaped = normalizePaidFeaturePricingShape(
    reasonCost ? { ...found.spec, cost: reasonCost, amountKRW: 0 } : found.spec,
  );

  const priceCoins = Math.max(0, Math.floor(Number(shaped.coinPrice) || 0));
  const priceKRW = Math.max(0, Math.floor(Number(shaped.amountKRW) || 0));
  if (priceKRW <= 0 || priceCoins <= 0) {
    // 가격이 0 인 항목은 상품이 아니다 — 무료 경로가 결제 컨텍스트로 새어 들어온 것이므로 막는다.
    throw paymentError("PRODUCT_NOT_FOUND", "결제 가능한 가격이 없습니다.", {
      productId: found.productId,
      featureKey: canonicalFeatureKey,
    });
  }

  return Object.freeze({
    productId: found.productId,
    featureKey: canonicalFeatureKey,
    billingType: getPaidFeatureBillingType(canonicalFeatureKey) || PAID_FEATURE_BILLING_TYPES.PER_USE,
    priceKRW,
    priceCoins,
    monthlyCost: calculateMembershipCreditCost(priceCoins),
    label: String(found.spec.reason || "").trim(),
    passExcluded: PASS_EXCLUDED_SET.has(canonicalFeatureKey),
  });
}

/** 상품이 존재하고 결제 가능한가. 예외를 흐름 제어로 쓰지 않으려는 호출부용. */
export function hasProduct(input = {}) {
  try {
    resolveProduct(input);
    return true;
  } catch {
    return false;
  }
}

/**
 * GET /api/billing/features 의 응답 본체. **Mongo 왕복 0.**
 * 구 구현은 이 목록을 내려주면서도 스냅샷을 읽어 슬롯을 썼다.
 */
export function listProducts() {
  const seen = new Set();
  const items = [];
  for (const key of Object.keys(FEATURE_KEY_PRICE_TABLE)) {
    if (seen.has(key)) continue;
    seen.add(key);
    try {
      items.push(resolveProduct({ featureKey: key }));
    } catch {
      // 가격 0 인 레거시 항목은 목록에서 조용히 빠진다(위 resolveProduct 의 판정과 같은 기준).
    }
  }
  return items;
}

export const __catalogTestUtils = { UNLOCK_PRODUCT_ID_BY_FEATURE_KEY, lookupSpec };
