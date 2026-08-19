"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, BadgeCheck, PenLine, RefreshCw, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { getApiBaseUrl } from "../_lib/api-config";
import { authFetch } from "../_lib/auth-client";
import YeonSpriteFrame from "@/components/yeon/YeonSpriteFrame";

type SortKey = "latest" | "rating_desc" | "rating_asc";

interface ReviewCard {
  id: string;
  authorName: string;
  authorImage: string;
  productId: string;
  productName: string;
  rating: number;
  title: string;
  body: string;
  isVerifiedPurchase: boolean;
  displayedAt: string;
}

interface ProductOption {
  productId: string;
  name: string;
  summary: string;
  href: string;
  total: number;
  average: number;
}

interface EligibleProduct {
  productId: string;
  productName: string;
  href: string;
  usedAt: string;
  alreadyReviewed: boolean;
}

interface Summary {
  total: number;
  average: number;
  distribution: Record<string, number>;
}

const SORT_OPTIONS: Array<{ value: SortKey; label: string }> = [
  { value: "latest", label: "최신순" },
  { value: "rating_desc", label: "높은 평점순" },
  { value: "rating_asc", label: "낮은 평점순" },
];

const PAGE_SIZE = 12;
const EMPTY_SUMMARY: Summary = { total: 0, average: 0, distribution: {} };

function formatRelativeTime(value: string): string {
  if (!value) return "";
  const parsed = new Date(value).getTime();
  if (!Number.isFinite(parsed)) return "";

  const diffMs = Date.now() - parsed;
  if (diffMs < 60_000) return "방금 전";

  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 60) return `${minutes}분 전`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}일 전`;

  const months = Math.floor(days / 30);
  if (months < 12) return `${months}개월 전`;

  return `${Math.floor(months / 12)}년 전`;
}

function Stars({ rating, label }: { rating: number; label?: string }) {
  return (
    <span
      className="text-sm tracking-tight text-[#d4a017] dark:text-[#ead089]"
      aria-label={label || `별점 ${rating}점 만점 5점`}
    >
      {"★".repeat(Math.max(0, Math.min(5, rating)))}
      <span className="text-[#e4c8d4] dark:text-[#5a3348]">{"★".repeat(Math.max(0, 5 - rating))}</span>
    </span>
  );
}

function Avatar({ name, image }: { name: string; image: string }) {
  if (image) {
    return (
      <Image
        src={image}
        alt={`${name} 프로필 이미지`}
        width={40}
        height={40}
        unoptimized
        className="h-10 w-10 shrink-0 rounded-full object-cover"
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#f4bed1] text-sm font-semibold text-[#b31955] dark:bg-[#4a1230] dark:text-[#f4bed1]"
    >
      {name.slice(0, 1) || "?"}
    </span>
  );
}

function ReviewCardView({ review }: { review: ReviewCard }) {
  return (
    <article className="flex h-full flex-col rounded-2xl border border-[#f0d4de] bg-white p-5 shadow-[0_8px_24px_-18px_rgba(179,25,85,0.45)] dark:border-[#5a3348] dark:bg-[#2b0c1f]">
      <header className="flex items-start gap-3">
        <Avatar name={review.authorName} image={review.authorImage} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-[#3c1830] dark:text-[#fff1f7]">{review.authorName}</p>
          <div className="mt-0.5 flex items-center gap-2">
            <Stars rating={review.rating} />
            <span className="text-xs text-[#8a6478] dark:text-[#c99cb2]">{formatRelativeTime(review.displayedAt)}</span>
          </div>
        </div>
      </header>

      {review.title ? (
        <h3 className="mt-4 break-keep text-sm font-semibold text-[#3c1830] dark:text-[#fff1f7]">{review.title}</h3>
      ) : null}

      <p className="mt-2 flex-1 whitespace-pre-wrap break-keep text-sm leading-7 text-[#5c3a4d] dark:text-[#f0d0de]">
        {review.body}
      </p>

      <footer className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-[#f7e6ec] pt-3 dark:border-[#4a2438]">
        <span className="text-xs text-[#8a6478] dark:text-[#c99cb2]">상품: {review.productName}</span>
        {review.isVerifiedPurchase ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-[#fdf0f5] px-2 py-0.5 text-xs font-medium text-[#b31955] dark:bg-[#4a1230] dark:text-[#f4bed1]">
            <BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" />
            구매 인증
          </span>
        ) : null}
      </footer>
    </article>
  );
}

export default function ReviewsClient() {
  const apiBase = useMemo(() => getApiBaseUrl(), []);

  const [productFilter, setProductFilter] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("latest");
  const [verifiedOnly, setVerifiedOnly] = useState(false);

  const [reviews, setReviews] = useState<ReviewCard[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [summary, setSummary] = useState<Summary>(EMPTY_SUMMARY);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState("");
  const [mobileExpanded, setMobileExpanded] = useState(false);

  const [writerOpen, setWriterOpen] = useState(false);
  const [eligible, setEligible] = useState<EligibleProduct[]>([]);
  const [eligibleState, setEligibleState] = useState<"idle" | "loading" | "ready" | "guest" | "error">("idle");
  const [formProductId, setFormProductId] = useState("");
  const [formRating, setFormRating] = useState(5);
  const [formTitle, setFormTitle] = useState("");
  const [formBody, setFormBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [formNotice, setFormNotice] = useState("");

  const loadProducts = useCallback(async () => {
    try {
      const res = await fetch(`${apiBase || ""}/api/reviews/products`, { method: "GET" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return;
      setProducts(Array.isArray(data?.items) ? data.items : []);
    } catch {
      setProducts([]);
    }
  }, [apiBase]);

  const loadSummary = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (productFilter) params.set("productId", productFilter);
      const res = await fetch(`${apiBase || ""}/api/reviews/summary?${params.toString()}`, { method: "GET" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return;
      setSummary({
        total: Number(data?.total || 0),
        average: Number(data?.average || 0),
        distribution: data?.distribution && typeof data.distribution === "object" ? data.distribution : {},
      });
    } catch {
      setSummary(EMPTY_SUMMARY);
    }
  }, [apiBase, productFilter]);

  const loadReviews = useCallback(async (targetPage: number, append: boolean) => {
    setLoading(true);
    setListError("");
    try {
      const params = new URLSearchParams({ page: String(targetPage), limit: String(PAGE_SIZE), sort: sortKey });
      if (productFilter) params.set("productId", productFilter);
      if (verifiedOnly) params.set("verifiedOnly", "1");

      const res = await fetch(`${apiBase || ""}/api/reviews?${params.toString()}`, { method: "GET" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setListError("리뷰를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.");
        return;
      }

      const items: ReviewCard[] = Array.isArray(data?.items) ? data.items : [];
      setReviews((prev) => (append ? [...prev, ...items] : items));
      setTotalPages(Number(data?.pagination?.totalPages || 1));
      setPage(targetPage);
    } catch {
      setListError("리뷰를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setLoading(false);
    }
  }, [apiBase, productFilter, sortKey, verifiedOnly]);

  useEffect(() => { void loadProducts(); }, [loadProducts]);
  useEffect(() => { void loadSummary(); }, [loadSummary]);
  useEffect(() => {
    setMobileExpanded(false);
    void loadReviews(1, false);
  }, [loadReviews]);

  const openWriter = useCallback(async () => {
    setWriterOpen(true);
    setFormError("");
    setFormNotice("");
    setEligibleState("loading");

    try {
      const res = await authFetch("/api/reviews/eligibility", { method: "GET" });
      if (res.status === 401) {
        setEligibleState("guest");
        return;
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setEligibleState("error");
        return;
      }
      const items: EligibleProduct[] = Array.isArray(data?.items) ? data.items : [];
      setEligible(items);
      setFormProductId(items.find((item) => !item.alreadyReviewed)?.productId || "");
      setEligibleState("ready");
    } catch {
      setEligibleState("error");
    }
  }, []);

  const submitReview = useCallback(async () => {
    if (!formProductId) {
      setFormError("리뷰를 남길 상품을 선택해 주세요.");
      return;
    }
    if (formBody.trim().length < 20) {
      setFormError("후기는 20자 이상 작성해 주세요.");
      return;
    }

    setSubmitting(true);
    setFormError("");
    try {
      const res = await authFetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: formProductId,
          rating: formRating,
          title: formTitle.trim(),
          body: formBody.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFormError(String(data?.message || "리뷰를 등록하지 못했습니다."));
        return;
      }

      setFormNotice("리뷰가 등록되었습니다. 검토 후 반영됩니다.");
      setFormTitle("");
      setFormBody("");
      setEligible((prev) => prev.map((item) => (
        item.productId === formProductId ? { ...item, alreadyReviewed: true } : item
      )));
    } catch {
      setFormError("리뷰를 등록하지 못했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setSubmitting(false);
    }
  }, [formBody, formProductId, formRating, formTitle]);

  const visibleOnMobile = mobileExpanded ? reviews : reviews.slice(0, 3);
  const writableProducts = eligible.filter((item) => !item.alreadyReviewed);

  return (
    <div className="min-h-screen bg-[#fffaf7] text-[#3c1830] dark:bg-[#1a0a14] dark:text-[#fff1f7]">
      {/* 몰입형: 전역 헤더·푸터 없이 자체 상단바 */}
      <header className="sticky top-0 z-30 border-b border-[#f0d4de] bg-[#fffaf7]/95 backdrop-blur dark:border-[#4a2438] dark:bg-[#1a0a14]/95">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link
            href="/"
            aria-label="홈으로 돌아가기"
            className="inline-flex min-h-[44px] items-center gap-1.5 text-sm font-medium text-[#70445c] hover:text-[#b31955] dark:text-[#c99cb2] dark:hover:text-[#f4bed1]"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            홈
          </Link>
          <span className="flex items-center gap-1.5">
            <YeonSpriteFrame
              frame={1}
              ariaLabel="꽃돼지 연이"
              className="h-8 w-8 shrink-0 rounded-full sm:h-9 sm:w-9"
            />
            <p className="text-sm font-semibold">실시간 사용자 리뷰</p>
          </span>
          <button
            type="button"
            onClick={() => { void openWriter(); }}
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-[#b31955] px-4 text-sm font-semibold text-white hover:bg-[#951245] dark:bg-[#f4bed1] dark:text-[#3c1830] dark:hover:bg-[#e9a7c0]"
          >
            <PenLine className="h-4 w-4" aria-hidden="true" />
            리뷰 쓰기
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-16 pt-8 sm:px-6">
        <section className="rounded-3xl border border-[#f0d4de] bg-white px-5 py-7 dark:border-[#5a3348] dark:bg-[#2b0c1f] sm:px-8">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#b31955] dark:text-[#f4bed1]">Reviews</p>
          <div className="mt-3 flex flex-wrap items-end gap-x-4 gap-y-2">
            <p className="text-4xl font-black leading-none">{summary.average ? summary.average.toFixed(1) : "-"}</p>
            <div>
              <Stars rating={Math.round(summary.average)} label={`평균 별점 ${summary.average}점`} />
              <p className="mt-1 text-sm text-[#70445c] dark:text-[#c99cb2]">
                총 {summary.total.toLocaleString("ko-KR")}개의 리뷰
              </p>
            </div>
          </div>

          <ul className="mt-5 space-y-1.5">
            {[5, 4, 3, 2, 1].map((star) => {
              const count = Number(summary.distribution?.[String(star)] || 0);
              const ratio = summary.total ? Math.round((count / summary.total) * 100) : 0;
              return (
                <li key={star} className="flex items-center gap-3 text-xs text-[#70445c] dark:text-[#c99cb2]">
                  <span className="w-8 shrink-0">{star}점</span>
                  <span className="h-2 flex-1 overflow-hidden rounded-full bg-[#f7e6ec] dark:bg-[#4a2438]">
                    <span
                      className="block h-full rounded-full bg-[#d4a017] dark:bg-[#ead089]"
                      style={{ width: `${ratio}%` }}
                    />
                  </span>
                  <span className="w-10 shrink-0 text-right">{count}</span>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="mt-6 space-y-3" aria-label="리뷰 필터">
          <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
            <button
              type="button"
              onClick={() => setProductFilter("")}
              className={`min-h-[36px] shrink-0 rounded-full border px-3 text-xs font-medium transition-colors ${
                productFilter === ""
                  ? "border-[#b31955] bg-[#b31955] text-white dark:border-[#f4bed1] dark:bg-[#f4bed1] dark:text-[#3c1830]"
                  : "border-[#f0d4de] bg-white text-[#70445c] hover:border-[#e0aec2] dark:border-[#5a3348] dark:bg-[#2b0c1f] dark:text-[#c99cb2]"
              }`}
            >
              전체
            </button>
            {products.filter((product) => product.total > 0).map((product) => (
              <button
                key={product.productId}
                type="button"
                onClick={() => setProductFilter(product.productId)}
                className={`min-h-[36px] shrink-0 rounded-full border px-3 text-xs font-medium transition-colors ${
                  productFilter === product.productId
                    ? "border-[#b31955] bg-[#b31955] text-white dark:border-[#f4bed1] dark:bg-[#f4bed1] dark:text-[#3c1830]"
                    : "border-[#f0d4de] bg-white text-[#70445c] hover:border-[#e0aec2] dark:border-[#5a3348] dark:bg-[#2b0c1f] dark:text-[#c99cb2]"
                }`}
              >
                {product.name} ({product.total})
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <label className="sr-only" htmlFor="review-sort">리뷰 정렬</label>
            <select
              id="review-sort"
              value={sortKey}
              onChange={(event) => setSortKey(event.target.value as SortKey)}
              className="min-h-[40px] rounded-lg border border-[#f0d4de] bg-white px-3 text-sm text-[#3c1830] outline-none focus:border-[#b31955] dark:border-[#5a3348] dark:bg-[#2b0c1f] dark:text-[#fff1f7]"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>

            <label className="inline-flex min-h-[40px] cursor-pointer items-center gap-2 text-sm text-[#70445c] dark:text-[#c99cb2]">
              <input
                type="checkbox"
                checked={verifiedOnly}
                onChange={(event) => setVerifiedOnly(event.target.checked)}
                className="h-4 w-4 rounded border-[#e0aec2] accent-[#b31955]"
              />
              구매 인증 리뷰만
            </label>
          </div>
        </section>

        {listError ? (
          <p className="mt-6 rounded-xl border border-[#f0c4d2] bg-[#fdf0f5] px-4 py-3 text-sm text-[#b31955] dark:border-[#7a3050] dark:bg-[#3a0e28] dark:text-[#f4bed1]">
            {listError}
          </p>
        ) : null}

        {!loading && reviews.length === 0 && !listError ? (
          <p className="mt-10 text-center text-sm text-[#70445c] dark:text-[#c99cb2]">
            아직 등록된 리뷰가 없습니다. 첫 번째 후기를 남겨 주세요.
          </p>
        ) : null}

        {/* 모바일: 최근 3개만 노출 → 전체보기로 확장 / 데스크톱: 전체 그리드 */}
        <section className="mt-6" aria-label="리뷰 목록">
          <div className="grid gap-4 sm:hidden">
            {visibleOnMobile.map((review) => (
              <ReviewCardView key={review.id} review={review} />
            ))}
          </div>
          {!mobileExpanded && reviews.length > 3 ? (
            <button
              type="button"
              onClick={() => setMobileExpanded(true)}
              className="mt-4 inline-flex min-h-[44px] w-full items-center justify-center rounded-xl border border-[#f0d4de] bg-white text-sm font-medium text-[#b31955] hover:border-[#e0aec2] dark:border-[#5a3348] dark:bg-[#2b0c1f] dark:text-[#f4bed1] sm:hidden"
            >
              리뷰 전체보기 ({summary.total.toLocaleString("ko-KR")}) &rsaquo;
            </button>
          ) : null}

          <div className="hidden gap-4 sm:grid sm:grid-cols-2 lg:grid-cols-3">
            {reviews.map((review) => (
              <ReviewCardView key={review.id} review={review} />
            ))}
          </div>
        </section>

        {page < totalPages ? (
          <div className="mt-8 text-center">
            <button
              type="button"
              onClick={() => { void loadReviews(page + 1, true); }}
              disabled={loading}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-[#f0d4de] bg-white px-6 text-sm font-medium text-[#b31955] hover:border-[#e0aec2] disabled:opacity-50 dark:border-[#5a3348] dark:bg-[#2b0c1f] dark:text-[#f4bed1]"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} aria-hidden="true" />
              더 보기
            </button>
          </div>
        ) : null}
      </main>

      {writerOpen ? (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-6">
          <div
            role="dialog"
            aria-modal="true"
            aria-label="리뷰 작성"
            className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-[#f0d4de] bg-[#fffaf7] p-5 dark:border-[#5a3348] dark:bg-[#24081a] sm:rounded-3xl sm:p-6"
          >
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <YeonSpriteFrame
                  frame={4}
                  ariaLabel="꽃돼지 연이"
                  className="h-11 w-11 shrink-0 rounded-full sm:h-12 sm:w-12"
                />
                <h2 className="text-base font-semibold">리뷰 쓰기</h2>
              </span>
              <button
                type="button"
                onClick={() => setWriterOpen(false)}
                aria-label="리뷰 작성 닫기"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full text-[#70445c] hover:bg-[#f7e6ec] dark:text-[#c99cb2] dark:hover:bg-[#3a0e28]"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            {eligibleState === "loading" ? (
              <p className="mt-6 text-sm text-[#70445c] dark:text-[#c99cb2]">이용 내역을 확인하는 중입니다...</p>
            ) : null}

            {eligibleState === "guest" ? (
              <div className="mt-6 space-y-4">
                <p className="text-sm leading-7 text-[#70445c] dark:text-[#c99cb2]">
                  리뷰를 작성하려면 로그인이 필요합니다.
                </p>
                <Link
                  href="/login"
                  className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-[#b31955] px-5 text-sm font-semibold text-white hover:bg-[#951245] dark:bg-[#f4bed1] dark:text-[#3c1830]"
                >
                  로그인하기
                </Link>
              </div>
            ) : null}

            {eligibleState === "error" ? (
              <p className="mt-6 text-sm leading-7 text-[#b31955] dark:text-[#f4bed1]">
                이용 내역을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.
              </p>
            ) : null}

            {eligibleState === "ready" && eligible.length === 0 ? (
              <p className="mt-6 text-sm leading-7 text-[#70445c] dark:text-[#c99cb2]">
                이 상품을 구매한 사용자만 리뷰를 작성할 수 있습니다. 상담이나 리포트를 이용하신 뒤에
                후기를 남겨 주세요.
              </p>
            ) : null}

            {eligibleState === "ready" && eligible.length > 0 ? (
              <div className="mt-5 space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-[#70445c] dark:text-[#c99cb2]" htmlFor="review-product">
                    이용하신 상품
                  </label>
                  <select
                    id="review-product"
                    value={formProductId}
                    onChange={(event) => setFormProductId(event.target.value)}
                    className="min-h-[44px] w-full rounded-lg border border-[#f0d4de] bg-white px-3 text-sm outline-none focus:border-[#b31955] dark:border-[#5a3348] dark:bg-[#2b0c1f] dark:text-[#fff1f7]"
                  >
                    <option value="">상품을 선택하세요</option>
                    {eligible.map((item) => (
                      <option key={item.productId} value={item.productId} disabled={item.alreadyReviewed}>
                        {item.productName}{item.alreadyReviewed ? " (작성 완료)" : ""}
                      </option>
                    ))}
                  </select>
                  {writableProducts.length === 0 ? (
                    <p className="text-xs text-[#8a6478] dark:text-[#c99cb2]">
                      이용하신 모든 상품에 이미 후기를 남기셨습니다.
                    </p>
                  ) : null}
                </div>

                <div className="space-y-1">
                  <span className="text-xs font-medium text-[#70445c] dark:text-[#c99cb2]">별점을 선택해주세요</span>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setFormRating(star)}
                        aria-label={`별점 ${star}점 선택`}
                        className={`min-h-[44px] px-1 text-2xl leading-none transition-colors ${
                          star <= formRating
                            ? "text-[#d4a017] dark:text-[#ead089]"
                            : "text-[#e4c8d4] hover:text-[#d4a017] dark:text-[#5a3348]"
                        }`}
                      >
                        ★
                      </button>
                    ))}
                    <span className="ml-2 text-sm text-[#70445c] dark:text-[#c99cb2]">{formRating}.0</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-[#70445c] dark:text-[#c99cb2]" htmlFor="review-title">
                    제목 (선택)
                  </label>
                  <input
                    id="review-title"
                    value={formTitle}
                    onChange={(event) => setFormTitle(event.target.value)}
                    maxLength={60}
                    className="min-h-[44px] w-full rounded-lg border border-[#f0d4de] bg-white px-3 text-sm outline-none focus:border-[#b31955] dark:border-[#5a3348] dark:bg-[#2b0c1f] dark:text-[#fff1f7]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-[#70445c] dark:text-[#c99cb2]" htmlFor="review-body">
                    후기 (최소 20자)
                  </label>
                  <textarea
                    id="review-body"
                    value={formBody}
                    onChange={(event) => setFormBody(event.target.value)}
                    rows={6}
                    maxLength={1000}
                    placeholder="어떤 점이 도움이 되었는지 구체적으로 적어주시면 다른 분들에게 큰 도움이 됩니다."
                    className="w-full rounded-lg border border-[#f0d4de] bg-white px-3 py-2 text-sm leading-7 outline-none focus:border-[#b31955] dark:border-[#5a3348] dark:bg-[#2b0c1f] dark:text-[#fff1f7]"
                  />
                  <p className="text-right text-xs text-[#8a6478] dark:text-[#c99cb2]">{formBody.trim().length} / 1000</p>
                </div>

                {formError ? <p className="text-sm text-[#b31955] dark:text-[#f4bed1]">{formError}</p> : null}
                {formNotice ? <p className="text-sm text-[#1f7a4d] dark:text-[#8fe0b4]">{formNotice}</p> : null}

                <button
                  type="button"
                  onClick={() => { void submitReview(); }}
                  disabled={submitting || writableProducts.length === 0}
                  className="min-h-[48px] w-full rounded-full bg-[#b31955] text-sm font-semibold text-white hover:bg-[#951245] disabled:opacity-50 dark:bg-[#f4bed1] dark:text-[#3c1830] dark:hover:bg-[#e9a7c0]"
                >
                  {submitting ? "등록 중..." : "리뷰 등록"}
                </button>

                <p className="text-xs leading-6 text-[#8a6478] dark:text-[#c99cb2]">
                  등록한 후기는 바로 공개되지 않고 운영진 검수를 거쳐 반영됩니다.
                </p>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
