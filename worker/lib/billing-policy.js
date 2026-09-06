export const KRW_PER_COIN = 100;
export const MEMBERSHIP_CREDIT_PER_COIN = 10;
export const SINGLE_PURCHASE_DISCOUNT_RATE = 0;

export function normalizeCoinPrice(value) {
  const coinPrice = Number(value);
  if (!Number.isInteger(coinPrice) || coinPrice <= 0) return 0;
  return coinPrice;
}

export function normalizeKrwAmount(value) {
  const amountKRW = Number(value);
  if (!Number.isFinite(amountKRW) || amountKRW <= 0) return 0;
  return Math.floor(amountKRW);
}

export function calculateKrwAmountFromCoins(value) {
  const coinPrice = normalizeCoinPrice(value);
  if (coinPrice <= 0) return 0;
  return coinPrice * KRW_PER_COIN;
}

export function calculateCoinsFromKrwAmount(value) {
  const amountKRW = normalizeKrwAmount(value);
  if (amountKRW <= 0) return 0;
  return Math.ceil(amountKRW / KRW_PER_COIN);
}

export function normalizePaidFeaturePricingShape(pricing = {}) {
  const directAmountKRW = normalizeKrwAmount(
    pricing.amountKRW
      ?? pricing.amountKrw
      ?? pricing.krwAmount
      ?? pricing.cashPrice
      ?? pricing.paymentAmount
      ?? pricing.priceKRW
      ?? pricing.amount,
  );
  const directCoinPrice = normalizeCoinPrice(
    pricing.coinPrice
      ?? pricing.cost
      ?? pricing.amountCoins
      ?? pricing.priceCoins
      ?? pricing.coinCost,
  );
  const amountKRW = directAmountKRW || calculateKrwAmountFromCoins(directCoinPrice);
  const coinPrice = directCoinPrice || calculateCoinsFromKrwAmount(amountKRW);

  return {
    ...pricing,
    amountKRW,
    amountKrw: amountKRW,
    cashPrice: amountKRW,
    krwAmount: amountKRW,
    paymentAmount: amountKRW,
    cost: coinPrice,
    coinPrice,
    coinCost: coinPrice,
    amountCoins: coinPrice,
    priceCoins: coinPrice,
  };
}

export function calculateMembershipCreditCost(value) {
  const coinPrice = normalizeCoinPrice(value);
  return coinPrice > 0 ? coinPrice * MEMBERSHIP_CREDIT_PER_COIN : 0;
}

/**
 * 스테이징 전용 결제 테스트 청구금액을 정가에 적용한다.
 *
 * 🔴 **이 함수는 env 를 읽지 않는다.** 이 모듈은 lib/payment/server-feature-pricing.ts 를 통해
 *    클라이언트 번들에 들어가며, 그쪽 주석(13-16행)이 "Node 전용 API 없는 순수 모듈"임을 계약으로
 *    적어 두었다. 환경 판정은 서버 전용인 worker/lib/portone.js 의 resolveTestChargeAmountKRW 가 한다.
 *
 * 테스트 금액이 없거나(0) 정가보다 크면 **정가를 그대로 돌려준다** — 기본값이 정가인 fail-safe 다.
 */
export function applyTestChargeAmount(listPriceKRW, testChargeKRW) {
  const listPrice = normalizeKrwAmount(listPriceKRW);
  const testCharge = normalizeKrwAmount(testChargeKRW);
  if (listPrice <= 0 || testCharge <= 0) return listPrice;
  return Math.min(testCharge, listPrice);
}
