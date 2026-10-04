"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { getApiBaseUrl } from "../_lib/api-config";
import { REVIEW_REWARD_IMAGE, REVIEW_WRITE_URL, reviewRewardCopy, reviewRewardLabel, paidReviewCopy, reviewRewardWorthLabel } from "@/js/review-reward-copy.mjs";
import { KRW_PER_MONTHLY_CREDIT } from "@/lib/payment/coin-pricing";
import "@/styles/review-reward.css";

export type ReviewRewardPolicy = { amount: number; currency: string; trigger: string };

export default function ReviewRewardBanner({ policy, onWrite, brand = 'ggulggul', afterResult = false, locale = 'ko' }: {
  policy?: ReviewRewardPolicy | null;
  onWrite?: () => void;
  brand?: 'ggulggul' | 'yeongnyangi';
  afterResult?: boolean;
  locale?: string;
}) {
  const [loadedPolicy, setLoadedPolicy] = useState<ReviewRewardPolicy | null>(null);
  useEffect(() => {
    if (policy !== undefined) return;
    const controller = new AbortController();
    fetch(`${getApiBaseUrl() || ""}/api/reviews/products`, { signal: controller.signal })
      .then(async (response) => response.ok ? response.json() : null)
      .then((data) => { if (!controller.signal.aborted) setLoadedPolicy(data?.rewardPolicy || null); })
      .catch(() => {});
    return () => controller.abort();
  }, [policy]);

  const copy = afterResult ? paidReviewCopy(brand, locale) : reviewRewardCopy;
  const resolvedPolicy = policy === undefined ? loadedPolicy : policy;
  const worth = afterResult ? reviewRewardWorthLabel(resolvedPolicy, KRW_PER_MONTHLY_CREDIT, locale) : '';
  const reward = afterResult && locale !== 'ko' ? resolvedPolicy?.currency === 'moonstone' && resolvedPolicy.trigger === 'approved' && Number.isSafeInteger(resolvedPolicy.amount) && resolvedPolicy.amount > 0 ? `${resolvedPolicy.amount} moonstones after publication approval` : 'Moonstones after publication approval' : reviewRewardLabel(resolvedPolicy);
  return (
    <section className={`cd-review-invite${afterResult ? ' cd-review-invite--result' : ''}`} data-review-character={afterResult ? brand : undefined} aria-label={locale === 'ko' ? "후기 작성과 월정석 보상 안내" : 'Review and moonstone reward'}>
      <div className="cd-review-invite__copy">
        <h2>{copy.title}</h2>
        <p>{copy.description}</p>
        <p className="cd-review-invite__reward" aria-live="polite">{reward}{worth && <span className="cd-review-invite__worth"> · {worth}</span>}</p>
        <p className="cd-review-invite__detail">{copy.detail}</p>
        {onWrite ? <button type="button" className="cd-review-invite__action" onClick={onWrite}>{copy.action}</button>
          : <Link href={REVIEW_WRITE_URL} className="cd-review-invite__action">{copy.action}</Link>}
      </div>
      <Image src={afterResult ? paidReviewCopy(brand, locale).image : REVIEW_REWARD_IMAGE} alt={afterResult ? paidReviewCopy(brand, locale).name : reviewRewardCopy.imageAlt} width={240} height={240} className="cd-review-invite__image" />
    </section>
  );
}
