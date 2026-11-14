"use client";

import { useEffect, useId, useState } from "react";
import { getApiBaseUrl } from "@/app/_lib/api-config";
import { reviewCardRewardLabel } from "@/js/review-reward-copy.mjs";
import styles from "./ReviewProof.module.css";

// 결정 지점 신뢰 블록: 가격·시작 버튼 근처에 구매 인증 후기만 보여 준다(운영진 등록 후기 제외).
// 🔴 클라이언트에서만 받는 데이터라 AggregateRating·JSON-LD를 만들지 않는다. 후기 본문은 분석 이벤트로 보내지 않는다.
// 후기가 없거나 받지 못하면 코드로 확인한 사실(TrustFacts)만 보여 준다. 결과 화면에는 두지 않는다.

export type ReviewProofBrand = "ggulggul" | "yeongnyangi";
export type ReviewProofMode = "facts" | "cards" | "summary";
export type ReviewProofItem = {
  id: string;
  rating: number;
  title: string;
  body: string;
  quickTags: string[];
  displayedAt: string;
  rewarded: boolean;
};
export type ReviewProofData = { total: number; average: number | null; items: ReviewProofItem[] };
export type ReviewProofState = { status: "loading" } | { status: "error" } | ({ status: "ready" } & ReviewProofData);

const CARD_LIMIT = 3;
export const REVIEW_PROOF_DISCLAIMER = "개인 경험에 따른 후기이며 결과를 보장하지 않습니다.";
export const REVIEW_PROOF_COPY = {
  reviewsTitle: "구매한 분들의 후기",
  factsTitle: "결제부터 결과까지 이렇게 진행돼요",
  verifiedBadge: "구매 인증",
  more: "후기 더 보기",
  summary: (average: number, total: number) => `평균 별점 ${average.toFixed(1)}점 · 구매 인증 후기 ${total}개`,
  starsLabel: (rating: number) => `별점 5점 만점에 ${rating}점`,
};

type Fact = { text: string };
type FactLink = { label: string; href: string };
// 각 문장은 코드로 확인한 사실이다. 근거가 바뀌면 문장도 함께 고친다.
export const REVIEW_PROOF_FACTS: Record<ReviewProofBrand, { facts: Fact[]; links: (sampleHref?: string) => FactLink[] }> = {
  ggulggul: {
    facts: [
      // PriceBadge(시작 버튼 옆) · billing-client 결제창 "결제 금액 {amount}"
      { text: "가격은 시작 버튼 옆에 먼저 보여 드리고, 결제창에서 결제 금액을 한 번 더 확인한 뒤 결제해요." },
      // lib/records/service-registry.js 에 세 상담이 등록돼 있다
      { text: "완성된 상담은 결제한 계정의 보관함에 저장돼 다시 열어 볼 수 있어요." },
      // usePaidResume + worker/lib/consultation-recovery-task.js
      { text: "화면을 닫아도 결제한 상담은 사라지지 않아요. 다시 열면 이어서 쓰고, 오래 비워 두면 서버가 마저 완성해 보관함에 저장해요." },
      // 이용약관 12조(환불): 결과 미제공·시스템 오류 시 확인 후 재생성 또는 환불
      { text: "결과를 받지 못했다면 확인한 뒤 다시 만들어 드리거나 환불 기준에 따라 처리해요." },
    ],
    links: (sampleHref) => [
      { label: "환불 안내 보기", href: "/refund-policy/" },
      ...(sampleHref ? [{ label: "실제 결과 예시 보기", href: sampleHref }] : []),
    ],
  },
  yeongnyangi: {
    facts: [
      // YeongnyangiCheckout "추가 결제 금액" · 가격 안내 FAQ
      { text: "결제창에서 총액과 적용 수단을 한 번 더 확인한 뒤에 결제돼요." },
      // 가격 안내 FAQ "결제하고 나면 결과는 언제, 어디서 보나요?" (서버 큐 생성)
      { text: "결제가 확인되면 영냥이가 상담을 쓰기 시작해요. 화면을 닫아도 같은 계정의 내\u00a0상담에서 이어서 확인할 수 있어요." },
      // 가격 안내 FAQ "상담이 만들어지지 않으면 어떻게 되나요?"
      { text: "상담이 만들어지지 않으면 내\u00a0상담에서 진행 상태를 확인하고, 문제가 계속되면 문의해 주세요. 환불 기준은 환불 정책을 따라요." },
    ],
    links: (sampleHref) => [
      { label: "환불 정책 보기", href: "/refund-policy/" },
      { label: "문의하기", href: "/contact/#payment-help" },
      ...(sampleHref ? [{ label: "실제 상담 예시 보기", href: sampleHref }] : []),
    ],
  },
};

/** 구매 인증 후기 수에 따른 표시 방식: 0건 사실 안내, 1~2건 카드만, 3건 이상 평균·개수·카드. */
export function reviewProofMode(count: number): ReviewProofMode {
  const n = Number.isFinite(count) ? Math.floor(count) : 0;
  if (n >= 3) return "summary";
  if (n >= 1) return "cards";
  return "facts";
}

const text = (value: unknown) => (typeof value === "string" ? value.trim() : "");
const clampRating = (value: unknown) => Math.min(5, Math.max(1, Math.round(Number(value) || 0)));
const postedMonth = (value: string) => {
  const match = /^(\d{4})-(\d{2})/.exec(value);
  return match ? `${match[1]}.${match[2]}` : "";
};

export function normalizeReviewProof(summary: any, list: any): ReviewProofData {
  const items: ReviewProofItem[] = (Array.isArray(list?.items) ? list.items : [])
    .filter((item: any) => item && item.isVerifiedPurchase === true)
    .slice(0, CARD_LIMIT)
    .map((item: any) => ({
      id: text(item.id),
      rating: clampRating(item.rating),
      title: text(item.title),
      body: text(item.body),
      quickTags: Array.isArray(item.quickTags) ? item.quickTags.map(text).filter(Boolean) : [],
      displayedAt: text(item.displayedAt),
      rewarded: item.rewarded === true,
    }))
    .filter((item: ReviewProofItem) => item.id && (item.body || item.title || item.quickTags.length));
  const total = Math.max(0, Math.floor(Number(summary?.total) || 0));
  const average = Number(summary?.average);
  return { total, average: Number.isFinite(average) && average > 0 ? average : null, items };
}

const resolved = new Map<string, ReviewProofData>();
const pending = new Map<string, Promise<ReviewProofData>>();

export function loadReviewProof(productId: string): Promise<ReviewProofData> {
  const existing = pending.get(productId);
  if (existing) return existing;
  const base = getApiBaseUrl() || "";
  const query = `productId=${encodeURIComponent(productId)}&verifiedOnly=1`;
  const request = Promise.all([
    fetch(`${base}/api/reviews/summary?${query}`, { method: "GET" }),
    fetch(`${base}/api/reviews?${query}&sort=latest&page=1&limit=${CARD_LIMIT}`, { method: "GET" }),
  ])
    .then(async ([summaryRes, listRes]) => {
      if (!summaryRes.ok || !listRes.ok) throw new Error("REVIEW_PROOF_UNAVAILABLE");
      const [summary, list] = await Promise.all([summaryRes.json(), listRes.json()]);
      if (!summary?.ok || !list?.ok) throw new Error("REVIEW_PROOF_UNAVAILABLE");
      const data = normalizeReviewProof(summary, list);
      resolved.set(productId, data);
      return data;
    })
    .catch((error) => {
      pending.delete(productId);
      throw error;
    });
  pending.set(productId, request);
  return request;
}

type ViewProps = {
  brand: ReviewProofBrand;
  productId: string;
  state: ReviewProofState;
  sampleHref?: string;
  headingLevel?: 2 | 3;
  headingId?: string;
};

export function ReviewProofView({ brand, productId, state, sampleHref, headingLevel = 2, headingId = "review-proof-title" }: ViewProps) {
  const rootClass = `${styles.root} ${brand === "yeongnyangi" ? styles.yeongnyangi : styles.ggulggul}`;
  if (state.status === "loading") return <div className={`${rootClass} ${styles.loading}`} aria-hidden="true" />;

  const Heading = headingLevel === 3 ? "h3" : "h2";
  const items = state.status === "ready" ? state.items : [];
  const mode = state.status === "ready" && items.length ? reviewProofMode(state.total) : "facts";

  if (mode === "facts") {
    const facts = REVIEW_PROOF_FACTS[brand];
    return (
      <section className={rootClass} aria-labelledby={headingId} data-review-proof="facts">
        <Heading id={headingId} className={styles.title}>{REVIEW_PROOF_COPY.factsTitle}</Heading>
        <ul className={styles.facts}>
          {facts.facts.map((fact) => <li key={fact.text}>{fact.text}</li>)}
        </ul>
        <p className={styles.links}>
          {facts.links(sampleHref).map((link) => <a key={link.href} className={styles.link} href={link.href}>{link.label}</a>)}
        </p>
      </section>
    );
  }

  const ready = state as Extract<ReviewProofState, { status: "ready" }>;
  const rewardLabel = reviewCardRewardLabel("ko");
  return (
    <section className={rootClass} aria-labelledby={headingId} data-review-proof={mode}>
      <Heading id={headingId} className={styles.title}>{REVIEW_PROOF_COPY.reviewsTitle}</Heading>
      {mode === "summary" && ready.average !== null ? (
        <p className={styles.summary}>{REVIEW_PROOF_COPY.summary(ready.average, ready.total)}</p>
      ) : null}
      <ul className={styles.cards}>
        {items.map((item) => (
          <li key={item.id} className={styles.card}>
            <p className={styles.meta}>
              <span className={styles.stars} aria-hidden="true">{"★".repeat(item.rating) + "☆".repeat(5 - item.rating)}</span>
              <span className={styles.srOnly}>{REVIEW_PROOF_COPY.starsLabel(item.rating)}</span>
              {postedMonth(item.displayedAt) ? <span>{postedMonth(item.displayedAt)}</span> : null}
            </p>
            {item.title ? <p className={styles.cardTitle}>{item.title}</p> : null}
            {item.body || item.quickTags.length ? <p className={styles.body}>{item.body || item.quickTags.join(" · ")}</p> : null}
            <p className={styles.badges}>
              <span className={styles.badge}>{REVIEW_PROOF_COPY.verifiedBadge}</span>
              {item.rewarded ? <span className={styles.badge}>{rewardLabel}</span> : null}
            </p>
          </li>
        ))}
      </ul>
      <p className={styles.disclaimer}>{REVIEW_PROOF_DISCLAIMER}</p>
      <p className={styles.links}>
        <a className={styles.link} href={`/reviews/?product=${encodeURIComponent(productId)}`}>{REVIEW_PROOF_COPY.more}</a>
      </p>
    </section>
  );
}

type Props = { brand: ReviewProofBrand; productId: string; sampleHref?: string; headingLevel?: 2 | 3 };

export default function ReviewProof({ brand, productId, sampleHref, headingLevel }: Props) {
  const headingId = `review-proof-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const [state, setState] = useState<ReviewProofState>(() => {
    const cached = resolved.get(productId);
    return cached ? { status: "ready", ...cached } : { status: "loading" };
  });

  useEffect(() => {
    const cached = resolved.get(productId);
    if (cached) {
      setState({ status: "ready", ...cached });
      return;
    }
    let alive = true;
    setState({ status: "loading" });
    loadReviewProof(productId).then(
      (data) => { if (alive) setState({ status: "ready", ...data }); },
      () => { if (alive) setState({ status: "error" }); },
    );
    return () => { alive = false; };
  }, [productId]);

  return <ReviewProofView brand={brand} productId={productId} state={state} sampleHref={sampleHref} headingLevel={headingLevel} headingId={headingId} />;
}
