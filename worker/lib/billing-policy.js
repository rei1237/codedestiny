export const KRW_PER_COIN = 100;
export const MEMBERSHIP_CREDIT_PER_COIN = 10;

export function normalizeCoinPrice(value) {
  const coinPrice = Number(value);
  if (!Number.isInteger(coinPrice) || coinPrice <= 0) return 0;
  return coinPrice;
}

export function calculateKrwAmountFromCoins(value) {
  const coinPrice = normalizeCoinPrice(value);
  return coinPrice > 0 ? coinPrice * KRW_PER_COIN : 0;
}

export function calculateMembershipCreditCost(value) {
  const coinPrice = normalizeCoinPrice(value);
  return coinPrice > 0 ? coinPrice * MEMBERSHIP_CREDIT_PER_COIN : 0;
}
