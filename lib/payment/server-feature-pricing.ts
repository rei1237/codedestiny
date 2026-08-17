// 프론트가 "이 기능의 가격이 얼마인가"를 **서버와 같은 함수로** 푸는 유일한 지점.
//
// 🔴 여기에 가격 숫자를 적지 말 것. 정본은 worker/lib/billing-feature-registry.js 의
//    getBillingFeaturePricing 하나이며, worker/routes/billing.js 가 coin-gate 응답을 만들 때
//    부르는 바로 그 함수다. 사본을 만들면 결제창 표시가와 실제 청구액이 조용히 갈라진다.
//
// 왜 app/_lib/serviceCoinPrice.ts 를 쓰지 않는가:
//   그쪽은 FEATURE_KEY_PRICE_TABLE[featureKey] 만 본다. 그래서 categoryKey+subFeatureKey 로만
//   오는 호출(손금 — categoryKey:"palm-reading" / subFeatureKey:"general")을 못 푼다.
//   "palm-reading" 은 가격표에 없고 "palm-reading-general" 이 있기 때문이다(실측).
//   getBillingFeaturePricing 은 카테고리·reason·별칭 경로를 전부 갖고 있어 서버와 답이 같다.
//
// 번들 안전성: billing-feature-registry.js 가 import 하는 것은 paid-feature-registry.js ·
//   billing-policy.js · lib/music-access-policy.js 뿐이고 셋 다 순수 데이터/함수 모듈이다
//   (Node 전용 API 없음). billing-client.ts 는 이미 worker/lib/app-store-pricing.js 와
//   paid-feature-registry.js 를 같은 방식으로 번들에 넣고 있다.
import { getBillingFeaturePricing } from "../../worker/lib/billing-feature-registry.js";

export type ServerFeaturePricingInput = {
  categoryKey?: string;
  subFeatureKey?: string;
  featureKey?: string;
  reason?: string;
};

export type ServerFeaturePricing = {
  featureKey: string;
  /** 코인 단위 가격. 표시는 언제나 KRW 로 환산한다(코인은 폐지된 개념). */
  cost: number;
  amountKRW: number;
  membershipCreditCost: number;
  /** 이용권으로 커버되지 않는 기능(프로필 카드 관리 등). 서버 정본: worker/routes/billing.js */
  passExcluded: boolean;
};

// 🔴 정본은 worker/payments/catalog.js 의 export const PASS_EXCLUDED_FEATURE_KEYS 다.
//    **import 하지 않는 이유**: catalog.js → ./errors.js → ../lib/db.js 로 mongoose 가 딸려와
//    클라이언트 번들에 Node 전용 코드가 들어간다(실측). 그래서 값만 옮겨 적는다.
//    두 목록이 갈라지면 이용권 미커버 기능이 스냅샷 즉시통과로 공짜가 되므로, 정합성은
//    scripts/verify-paid-gate-price-coverage.mjs 가 catalog.js 를 실제로 import 해 대조한다.
const PASS_EXCLUDED_FEATURE_KEYS = new Set(["profile-card-manage"]);

function toPositiveInt(value: unknown): number {
  const parsed = Math.floor(Number(value));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

/**
 * 서버 가격표에서 기능 가격을 푼다. 못 풀면 null — 호출부는 "모른다"로 다뤄야 하고,
 * 0 을 가격으로 렌더하면 안 된다.
 */
export function resolveServerFeaturePricing(input: ServerFeaturePricingInput): ServerFeaturePricing | null {
  // 🔴 try/catch 는 장식이 아니다. billing-feature-registry.js 의 requireSubFeaturePricing 은
  //    카테고리 서브피처가 가리키는 featureKey 가 가격표에 없으면 **throw** 한다. 그 예외가 여기서
  //    새어 나가면 resolveKnownCoinCost 가 죽고 유료 게이트 전체가 멈춘다.
  try {
    const resolved = getBillingFeaturePricing({
      categoryKey: input.categoryKey,
      subFeatureKey: input.subFeatureKey,
      featureKey: input.featureKey,
      reason: input.reason,
    }) as { ok?: boolean; pricing?: Record<string, unknown> } | null;

    if (!resolved?.ok || !resolved.pricing) return null;

    const pricing = resolved.pricing;
    const cost = toPositiveInt(pricing.cost ?? pricing.coinPrice);
    // 가격 0 은 "무료"가 아니라 "모른다"와 같게 다룬다 — 서버도 0 을 상품으로 인정하지 않는다
    // (worker/payments/catalog.js: "가격이 0 인 항목은 상품이 아니다").
    if (cost <= 0) return null;

    const featureKey = String(pricing.featureKey || input.featureKey || "").trim();
    const amountKRW = toPositiveInt(pricing.amountKRW ?? pricing.cashPrice) || cost * 100;

    return {
      featureKey,
      cost,
      amountKRW,
      membershipCreditCost: toPositiveInt(pricing.membershipCreditCost) || cost * 10,
      passExcluded: PASS_EXCLUDED_FEATURE_KEYS.has(featureKey),
    };
  } catch {
    return null;
  }
}
