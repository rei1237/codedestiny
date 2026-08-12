// 코인은 폐지된 레거시 내부 계산 단위다. 사용자에게는 항상 통화(기본 KRW)로만 표시한다.
// 서버 기준값은 worker/lib/billing-policy.js의 KRW_PER_COIN과 반드시 일치해야 한다.
export const KRW_PER_COIN = 100;

export function coinsToKrw(coins: number | null | undefined): number {
  const value = Number(coins);
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.round(value) * KRW_PER_COIN;
}

export function formatKrwFromCoins(coins: number | null | undefined, locale = "ko"): string {
  const amount = coinsToKrw(coins);
  // ko는 기존 표기(…원) 유지, 그 외 로케일은 통화 코드 표기(KRW …)로 노출
  if (String(locale).toLowerCase().startsWith("ko")) {
    return `${amount.toLocaleString("ko-KR")}원`;
  }
  return `KRW ${amount.toLocaleString("en-US")}`;
}

// 월정석 1개 = 10원. 서버의 MEMBERSHIP_CREDIT_PER_COIN(=10)으로 나눈 값이며
// worker/lib/billing-policy.js와 반드시 일치해야 한다.
export const KRW_PER_MONTHLY_CREDIT = 10;

export function monthlyCreditsToKrw(credits: number | null | undefined): number {
  const value = Number(credits);
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.floor(value) * KRW_PER_MONTHLY_CREDIT;
}

export function formatKrwFromMonthlyCredits(credits: number | null | undefined, locale = "ko"): string {
  const amount = monthlyCreditsToKrw(credits);
  if (String(locale).toLowerCase().startsWith("ko")) {
    return `${amount.toLocaleString("ko-KR")}원`;
  }
  return `KRW ${amount.toLocaleString("en-US")}`;
}
