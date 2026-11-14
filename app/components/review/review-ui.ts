// 후기 작성 UI 공용 값. 결과 화면 작성기(QuickReviewComposer)와 /reviews 작성 폼(ReviewsClient)이
// 같은 태그를 쓰게 하고, 초안 저장 규칙을 한 곳에 둔다.
//
// 🔴 빠른 태그는 worker/routes/reviews.js 의 REVIEW_QUICK_TAGS 화이트리스트 부분집합이어야 한다.
//    목록에 없는 태그는 서버가 조용히 버린다. __tests__/ui/review-consent-flow.test.mjs 가 정적으로 맞춰 본다.
// 🔴 별점에 따라 태그·초대 문구를 바꾸지 않는다(감정별 초대 변경 금지). 긍정·아쉬움을 같은 수로 늘 함께 보인다.
import { useMemo } from "react";

export const REVIEW_RATING_LABELS: Readonly<Record<number, string>> = Object.freeze({
  1: "별로예요",
  2: "아쉬워요",
  3: "보통이에요",
  4: "좋아요",
  5: "최고예요",
});

export const REVIEW_POSITIVE_TAGS = ["풀이가 자세해서 좋아요", "설명이 이해하기 쉬웠어요", "앞으로의 방향에 도움 됐어요"] as const;
export const REVIEW_IMPROVE_TAGS = ["조금 아쉬웠어요", "기대와 달랐어요", "더 구체적이면 좋겠어요"] as const;
export const REVIEW_QUICK_TAGS: readonly string[] = Object.freeze([...REVIEW_POSITIVE_TAGS, ...REVIEW_IMPROVE_TAGS]);

const PRODUCT_SLUG = /^[a-z0-9][a-z0-9-]{0,59}$/;

/** 후기 카탈로그 slug 만 통과시킨다. 콘텐츠 ID·임의 문자열은 URL 에 싣지 않는다. */
export function safeReviewProductId(value: unknown): string {
  const text = typeof value === "string" ? value.trim() : "";
  return PRODUCT_SLUG.test(text) ? text : "";
}

/** /reviews 작성 폼으로 가는 경로. 상품을 알면 그 상품을 미리 고른다. */
export function reviewWriteHref(productId?: string): string {
  const slug = safeReviewProductId(productId);
  return slug ? `/reviews/?write=1&product=${slug}` : "/reviews/?write=1";
}

export type ReviewDraft = { rating: number; tags: string[]; body: string };

export const REVIEW_DRAFT_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const DRAFT_BODY_MAX = 1000;

export function reviewDraftKey(productId: string): string {
  return `cd_review_draft_v1:${productId}`;
}

function draftStorage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

export function isEmptyReviewDraft(draft: ReviewDraft | null | undefined): boolean {
  return !draft || (!draft.rating && !draft.tags.length && !draft.body.trim());
}

/** 저장된 초안. 없거나·깨졌거나·7일이 지났으면 null(지난 것은 지운다). */
export function readReviewDraft(productId: string, now = Date.now()): ReviewDraft | null {
  const slug = safeReviewProductId(productId);
  const storage = draftStorage();
  if (!slug || !storage) return null;
  try {
    const raw = storage.getItem(reviewDraftKey(slug));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const savedAt = Number(parsed?.savedAt);
    if (!Number.isFinite(savedAt) || now - savedAt > REVIEW_DRAFT_TTL_MS || savedAt > now + 60_000) {
      storage.removeItem(reviewDraftKey(slug));
      return null;
    }
    const rating = Number.isInteger(parsed?.rating) && parsed.rating >= 1 && parsed.rating <= 5 ? parsed.rating : 0;
    const tags = Array.isArray(parsed?.tags) ? parsed.tags.filter((tag: unknown) => typeof tag === "string" && REVIEW_QUICK_TAGS.includes(tag)) : [];
    const body = typeof parsed?.body === "string" ? parsed.body.slice(0, DRAFT_BODY_MAX) : "";
    const draft = { rating, tags: [...new Set<string>(tags)], body };
    return isEmptyReviewDraft(draft) ? null : draft;
  } catch {
    return null;
  }
}

/** 이 기기에만 저장한다. 비어 있으면 지운다. 저장소를 못 쓰면 조용히 넘어간다. */
export function writeReviewDraft(productId: string, draft: ReviewDraft, now = Date.now()): void {
  const slug = safeReviewProductId(productId);
  const storage = draftStorage();
  if (!slug || !storage) return;
  try {
    if (isEmptyReviewDraft(draft)) {
      storage.removeItem(reviewDraftKey(slug));
      return;
    }
    storage.setItem(reviewDraftKey(slug), JSON.stringify({
      savedAt: now,
      rating: draft.rating,
      tags: draft.tags,
      body: draft.body.slice(0, DRAFT_BODY_MAX),
    }));
  } catch {
    // 저장 공간이 없거나 막힌 브라우저 — 초안 없이도 작성은 된다.
  }
}

export function clearReviewDraft(productId: string): void {
  const slug = safeReviewProductId(productId);
  const storage = draftStorage();
  if (!slug || !storage) return;
  try { storage.removeItem(reviewDraftKey(slug)); } catch { /* 지우지 못해도 7일 뒤 만료된다. */ }
}

/** 상품별 초안 읽기·저장·삭제(localStorage `cd_review_draft_v1:<productId>`, 7일 만료). */
export function useReviewDraft(productId: string) {
  return useMemo(() => ({
    read: () => readReviewDraft(productId),
    save: (draft: ReviewDraft) => writeReviewDraft(productId, draft),
    clear: () => clearReviewDraft(productId),
  }), [productId]);
}
