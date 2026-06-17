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
