"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { getApiBaseUrl } from "../_lib/api-config";
import { REVIEW_REWARD_IMAGE, REVIEW_WRITE_URL, reviewRewardCopy, reviewRewardLabel, paidReviewCopy, reviewRewardWorthLabel } from "@/js/review-reward-copy.mjs";
import { KRW_PER_MONTHLY_CREDIT } from "@/lib/payment/coin-pricing";
import "@/styles/review-reward.css";

export type ReviewRewardPolicy = { amount: number; valueKRW?: number; currency: string; trigger: string };

// 결과 뒤 후기 배너는 화면에 하나만 둔다(DESIGN.md §5). 공유·이미지 안내 컴포넌트가
// 각자 배너를 붙여 한 결과 화면에 두 번 뜨던 것을, 먼저 마운트된 하나만 보이게 한다.
const resultBannerOwners: symbol[] = [];
const resultBannerListeners = new Set<() => void>();
function useResultBannerOwner(enabled: boolean) {
  const [owner, setOwner] = useState(!enabled);
  useEffect(() => {
    if (!enabled) return;
    const token = Symbol("review-banner");
    const update = () => setOwner(resultBannerOwners[0] === token);
    resultBannerOwners.push(token);
    resultBannerListeners.add(update);
    resultBannerListeners.forEach((listener) => listener());
    return () => {
      resultBannerOwners.splice(resultBannerOwners.indexOf(token), 1);
      resultBannerListeners.delete(update);
      resultBannerListeners.forEach((listener) => listener());
    };
  }, [enabled]);
  return owner;
}

export default function ReviewRewardBanner({ policy, onWrite, brand = 'ggulggul', afterResult = false, locale = 'ko' }: {
  policy?: ReviewRewardPolicy | null;
  onWrite?: () => void;
  brand?: 'ggulggul' | 'yeongnyangi';
  afterResult?: boolean;
  locale?: string;
}) {
  const [loadedPolicy, setLoadedPolicy] = useState<ReviewRewardPolicy | null>(null);
  const owner = useResultBannerOwner(afterResult);
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
  const worth = reviewRewardWorthLabel(resolvedPolicy, KRW_PER_MONTHLY_CREDIT, locale);
  const reward = afterResult && locale !== 'ko' ? resolvedPolicy?.currency === 'moonstone' && resolvedPolicy.trigger === 'approved' && Number.isSafeInteger(resolvedPolicy.amount) && resolvedPolicy.amount > 0 ? `${resolvedPolicy.amount} moonstones after publication approval` : 'Moonstones after publication approval' : reviewRewardLabel(resolvedPolicy);
  if (!owner) return null;
  return (
    <section className={`cd-review-invite${afterResult ? ' cd-review-invite--result' : ''}`} data-review-character={afterResult ? brand : undefined} aria-label={locale === 'ko' ? "후기 작성과 월정석 보상 안내" : 'Review and moonstone reward'}>
      <div className="cd-review-invite__copy">
        <h2>{copy.title}</h2>
        <p>{copy.description}</p>
        <p className="cd-review-invite__reward" aria-live="polite">{reward}{worth && <span className="cd-review-invite__worth"> · {worth}</span>}</p>
        <p className="cd-review-invite__detail">{copy.detail}</p>
        {!afterResult && <p className="cd-review-invite__detail">지급일부터 30일 · 월정석 사용이 가능한 대상 상품에서 사용 · 이용권 구매 및 현금 교환 제외</p>}
        {onWrite ? <button type="button" className="cd-review-invite__action" onClick={onWrite}>{copy.action}</button>
          : <Link href={REVIEW_WRITE_URL} className="cd-review-invite__action">{copy.action}</Link>}
      </div>
      <Image src={afterResult ? paidReviewCopy(brand, locale).image : REVIEW_REWARD_IMAGE} alt={reviewRewardCopy.imageAlt} width={360} height={240} className="cd-review-invite__image" />
    </section>
  );
}
