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
