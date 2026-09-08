"use client";
import { useServerPrice } from "@/app/hooks/useServerPrice";
import type { VisualDetail } from "@/js/feature-detail-panels.mjs";

export default function FeatureIntroductionActions({ detail }: { detail: Pick<VisualDetail, "featureKey" | "featureKeyTo" | "accessType" | "href" | "ctaLabel"> }) {
  const price = useServerPrice({ featureKey: detail.featureKey || undefined });
  const upper = useServerPrice({ featureKey: detail.featureKeyTo || undefined });
  const range = detail.featureKeyTo && upper.amountKRW > price.amountKRW ? `${price.label} ~ ${upper.label}` : price.label;
  const label = detail.accessType === "free" ? "무료 기능" : price.loading || (detail.featureKeyTo && upper.loading) ? "이용 가격 확인 중" : range || "기능에서 이용 조건 확인";
  return <section aria-label="기능 시작하기" className="featureIntroductionActions">
    <p role="status" className="mb-4 text-sm text-[#d5c8da]">{label}</p>
    <a href={detail.href} className="flex min-h-12 items-center justify-center rounded-xl bg-[#f6dfb7] px-5 py-3 text-center font-bold text-[#20142d] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#f6dfb7]">{detail.ctaLabel}</a>
  </section>;
}
