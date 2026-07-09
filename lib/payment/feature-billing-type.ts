// 프론트용 과금 유형 분류기.
// source of truth = worker/lib/paid-feature-registry.js (getPaidFeatureBillingType).
// 결제 오버레이/모달 문구를 "1회당 결제(per-use)" vs "영구 해금(unlock)"으로
// 구분하기 위해, 워커 레지스트리의 판정 함수를 그대로 재사용한다(미러링 아님 → 드리프트 없음).
import {
  getPaidFeatureBillingType,
  PAID_FEATURE_BILLING_TYPES,
} from "../../worker/lib/paid-feature-registry.js";

export type PaidFeatureBillingType = "per-use" | "unlock" | "pdf";

/**
 * featureKey를 결제 문구용 과금 유형으로 판정한다.
 * - unlock(영구 해금) 기능만 "unlock"으로 분류.
 * - PDF 리포트는 1회 생성물이므로 문구상 per-use와 동일하게 다뤄도 되지만,
 *   호출부가 필요 시 구분할 수 있도록 "pdf"를 그대로 노출한다.
 * - 레지스트리에 없어 유형을 알 수 없으면 기본값 "per-use"
 *   (미분류 유료 기능 대부분이 회당 결제이고, 해금 전용 문구가 잘못 노출되는 것을 막는 안전한 기본값).
 */
export function resolvePaidFeatureBillingType(featureKey: unknown): PaidFeatureBillingType {
  const resolved = getPaidFeatureBillingType(String(featureKey || ""));
  if (resolved === PAID_FEATURE_BILLING_TYPES.UNLOCK) return "unlock";
  if (resolved === PAID_FEATURE_BILLING_TYPES.PDF) return "pdf";
  return "per-use";
}

/** 해금(영구 잠금 해제) 전용 문구를 써야 하는 기능인지. per-use/pdf/미분류는 모두 false. */
export function isUnlockBillingFeature(featureKey: unknown): boolean {
  return resolvePaidFeatureBillingType(featureKey) === "unlock";
}
