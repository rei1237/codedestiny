"use client";

import { useServerPrice, type ServerPriceInput } from "@/app/hooks/useServerPrice";
import { useTPick } from "@/lib/i18n/useT";

/**
 * 서버 정본 가격 배지 (표시 전용 아일랜드 — 결제 동작 없음).
 * 서버 가격 조회 실패 시 fallbackLabel/fallbackCoins로 강등, 그것도 없으면 렌더하지 않음.
 */
export function PriceBadge({
  prefix = "",
  suffix = "",
  className,
  ...priceInput
}: ServerPriceInput & {
  prefix?: string;
  suffix?: string;
  className?: string;
}) {
  const { label, loading } = useServerPrice(priceInput);
  // 🔴 useT 가 아니라 useTPick — 사전이 아직 안 왔을 때 useT 는 "번역을 준비 중입니다" 를
  //    돌려준다. 이 배지는 첫 페인트에 17곳이 함께 뜨므로 그 자리표시자가 그대로 보인다.
  const pick = useTPick();

  if (!label) {
    if (!loading && !priceInput.featureKey && !priceInput.subFeatureKey && !priceInput.categoryKey) return null;
    return (
      <span
        className={className || "inline-flex items-center rounded-full border border-amber-200/25 bg-amber-100/10 px-3 py-1 text-xs font-bold text-amber-100/60"}
        aria-live="polite"
      >
        {loading ? pick("preview.priceLoading", "가격 확인 중") : pick("preview.priceUnknown", "가격 확인 필요")}
      </span>
    );
  }

  return (
    <span
      className={className || "inline-flex items-center rounded-full border border-amber-200/35 bg-amber-100/10 px-3 py-1 text-xs font-bold text-amber-100"}
      aria-label={`이용 가격 ${label}`}
    >
      {prefix}
      {label}
      {suffix}
    </span>
  );
}
