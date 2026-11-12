// 테스트용: 2026-11-12 무료 전환된 키를 이 테스트 파일 안에서만 유료로 되돌린다.
// 무료 우회 앞에 남겨 둔 구 결제·증빙 경로(무료 목록에서 빠지면 다시 살아나는 경로)를 계속 지키기 위함이다.
// 무료 우회 자체는 __tests__/worker/free-promo-c1-route-bypass.test.js 가 진짜 정책으로 검증한다.
export async function mockFreePolicyAsPaid(jest, paidKeys) {
  const real = await import("../../lib/payment/free-fortune-policy.mjs");
  const paid = new Set(paidKeys.map((key) => real.normalizeFreeFortuneFeatureKey(key)));
  const normalize = (raw) => {
    const key = real.normalizeFreeFortuneFeatureKey(raw);
    return paid.has(key) ? "" : key;
  };
  jest.unstable_mockModule("../../lib/payment/free-fortune-policy.mjs", () => ({
    ...real,
    normalizeFreeFortuneFeatureKey: normalize,
    isFreeFortuneFeatureKey: (raw) => Boolean(normalize(raw)),
  }));
}
