"use client";

import { useState } from "react";
import { useCoinGate } from "@/app/hooks/useCoinGate";
import { usePaidResume } from "@/app/hooks/usePaidResume";
import { resolveServerFeaturePricing } from "@/lib/payment/server-feature-pricing";

const FEATURE_KEY = "psychotest-reading";
const PRICING = resolveServerFeaturePricing({ featureKey: FEATURE_KEY });

export default function PaidPsychotestLink({ href, className, children }: { href: string; className?: string; children: React.ReactNode }) {
  const { ensurePaidAccess, isPaying } = useCoinGate();
  const [error, setError] = useState("");
  const buildResume = usePaidResume(FEATURE_KEY, (args) => {
    const target = typeof args.href === "string" ? args.href : "";
    if (!target) return false;
    window.location.assign(target);
    return true;
  });

  async function open() {
    if (isPaying || !PRICING) return;
    setError("");
    const result = await ensurePaidAccess({
      resume: buildResume({ href }),
      featureKey: FEATURE_KEY,
      coinPrice: PRICING.cost,
      cost: PRICING.cost,
      amountKRW: PRICING.amountKRW,
      reason: "심리테스트 티저 해석",
      requestId: `${FEATURE_KEY}:${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    });
    if (result.ok) window.location.assign(href);
    else if (result.code !== "PAYMENT_CANCELLED") setError(result.message || "결제를 완료하지 못했어요. 잠시 후 다시 시도해 주세요.");
  }

  return <>
    <button type="button" className={className} disabled={isPaying || !PRICING} onClick={() => void open()}>
      {isPaying ? "이용권 확인 중" : children}
    </button>
    {error ? <p role="alert" className="mt-2 text-sm text-rose-600">{error}</p> : null}
  </>;
}
