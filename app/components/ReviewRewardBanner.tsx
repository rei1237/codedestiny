"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { getApiBaseUrl } from "../_lib/api-config";
import { REVIEW_REWARD_IMAGE, REVIEW_WRITE_URL, reviewRewardCopy, reviewRewardLabel } from "@/js/review-reward-copy.mjs";
import "@/styles/review-reward.css";

export type ReviewRewardPolicy = { amount: number; currency: string; trigger: string };

export default function ReviewRewardBanner({ policy, onWrite }: {
  policy?: ReviewRewardPolicy | null;
  onWrite?: () => void;
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

  return (
    <section className="cd-review-invite" aria-label="후기 작성과 월정석 보상 안내">
      <div className="cd-review-invite__copy">
        <h2>{reviewRewardCopy.title}</h2>
        <p>{reviewRewardCopy.description}</p>
        <p className="cd-review-invite__reward" aria-live="polite">{reviewRewardLabel(policy === undefined ? loadedPolicy : policy)}</p>
        <p className="cd-review-invite__detail">{reviewRewardCopy.detail}</p>
        {onWrite ? <button type="button" className="cd-review-invite__action" onClick={onWrite}>{reviewRewardCopy.action}</button>
          : <Link href={REVIEW_WRITE_URL} className="cd-review-invite__action">{reviewRewardCopy.action}</Link>}
      </div>
      <Image src={REVIEW_REWARD_IMAGE} alt={reviewRewardCopy.imageAlt} width={240} height={240} className="cd-review-invite__image" />
    </section>
  );
}
