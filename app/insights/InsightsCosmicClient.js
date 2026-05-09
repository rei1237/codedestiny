"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { getApiBaseUrl } from "../_lib/api-config";

const PAGE_SIZE = 12;

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function buildCardImage(item) {
  const url = String(item?.featuredImage?.url || "").trim();
  const alt = String(item?.featuredImage?.alt || item?.title || "인사이트 대표 이미지").trim();
  return {
    url,
    alt,
  };
}

function sortTagLabel(sort) {
  return sort === "popular" ? "인기 글" : "최신 글";
}

export default function InsightsCosmicClient({
  initialItems = [],
  initialRecommended = [],
  initialCategories = [],
  initialTags = [],
  initialTotalCount = 0,
}) {
  const apiBase = useMemo(() => getApiBaseUrl(), []);
  const skipFirstLiveFetchRef = useRef(true);

  const [items, setItems] = useState(initialItems);
  const [recommended, setRecommended] = useState(initialRecommended);
  const [categories, setCategories] = useState(initialCategories);
  const [tags, setTags] = useState(initialTags);

  const [category, setCategory] = useState("");
  const [tag, setTag] = useState("");
  const [sort, setSort] = useState("latest");
  const [searchInput, setSearchInput] = useState("");
  const [query, setQuery] = useState("");

  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(Math.max(initialTotalCount, initialItems.length));
  const [hasMore, setHasMore] = useState(initialItems.length < initialTotalCount);

  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");

  async function fetchList(nextPage, append) {
    const endpoint = `${apiBase || ""}/api/insights`;
    const url = new URL(endpoint, window.location.origin);

    if (query) url.searchParams.set("q", query);
    if (category) url.searchParams.set("category", category);
    if (tag) url.searchParams.set("tag", tag);
    url.searchParams.set("sort", sort);
    url.searchParams.set("page", String(nextPage));
    url.searchParams.set("pageSize", String(PAGE_SIZE));

    const response = await fetch(url.toString(), {
      method: "GET",
      credentials: "include",
      cache: "no-store",
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(String(data?.message || "인사이트 목록을 불러오지 못했습니다."));
    }

    const nextItems = Array.isArray(data?.items) ? data.items : [];
    setItems((prev) => (append ? [...prev, ...nextItems] : nextItems));
    setRecommended(Array.isArray(data?.recommended) ? data.recommended : []);
    setCategories(Array.isArray(data?.categories) ? data.categories : []);
    setTags(Array.isArray(data?.tags) ? data.tags.slice(0, 80) : []);
    setTotalCount(Math.max(0, Number(data?.totalCount || 0) || 0));
    setHasMore(Boolean(data?.hasMore));
    setPage(nextPage);
  }

  useEffect(() => {
    let cancelled = false;

    const shouldSkipFirstFetch =
      skipFirstLiveFetchRef.current
      && initialItems.length >= PAGE_SIZE
      && !query
      && !category
      && !tag
      && sort === "latest";

    if (shouldSkipFirstFetch) {
      skipFirstLiveFetchRef.current = false;
      return () => {
        cancelled = true;
      };
    }

    skipFirstLiveFetchRef.current = false;

    async function run() {
      setLoading(true);
      setError("");
      try {
        await fetchList(1, false);
      } catch (fetchError) {
        if (!cancelled) {
          setError(String(fetchError?.message || "인사이트 목록을 불러오지 못했습니다."));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiBase, query, category, initialItems.length, sort, tag]);

  async function onLoadMore() {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    setError("");

    try {
      await fetchList(page + 1, true);
    } catch (fetchError) {
      setError(String(fetchError?.message || "더보기 로딩에 실패했습니다."));
    } finally {
      setLoadingMore(false);
    }
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#261547_0%,#100a1f_45%,#090612_100%)] text-slate-100">
      <section className="mx-auto w-full max-w-6xl px-4 py-8 md:px-6 md:py-10 space-y-6">
        <header className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 md:p-7 backdrop-blur">
          <p className="text-xs tracking-[0.18em] text-amber-200/80">FORTUNE INSIGHTS</p>
          <h1 className="mt-2 text-2xl md:text-4xl font-semibold leading-tight text-amber-50">운세 인사이트 허브</h1>
          <p className="mt-3 text-sm md:text-base text-slate-300 leading-7">
            사주, 자미두수, 숙요점, 타로, 점성술 인사이트를 카테고리별로 탐색하고
            실제 기능 페이지로 바로 이동할 수 있는 검색 친화형 허브입니다.
          </p>
          <p className="mt-3 text-xs text-slate-400">총 {totalCount.toLocaleString("ko-KR")}개 글</p>
        </header>

        <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 md:p-5 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-2">
            <input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") setQuery(searchInput.trim());
              }}
              placeholder="제목/설명/태그 검색"
              className="md:col-span-5 rounded-xl border border-white/15 bg-[#1a1230] px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-400"
            />
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className="md:col-span-2 rounded-xl border border-white/15 bg-[#1a1230] px-3 py-2.5 text-sm"
            >
              <option value="">카테고리 전체</option>
              {categories.map((value) => (
                <option key={value} value={value}>{value}</option>
              ))}
            </select>
            <select
              value={tag}
              onChange={(event) => setTag(event.target.value)}
              className="md:col-span-2 rounded-xl border border-white/15 bg-[#1a1230] px-3 py-2.5 text-sm"
            >
              <option value="">태그 전체</option>
              {tags.map((value) => (
                <option key={value} value={value}>{value}</option>
              ))}
            </select>
            <select
              value={sort}
              onChange={(event) => setSort(event.target.value)}
              className="md:col-span-2 rounded-xl border border-white/15 bg-[#1a1230] px-3 py-2.5 text-sm"
            >
              <option value="latest">최신순</option>
              <option value="popular">인기순</option>
            </select>
            <button
              type="button"
              onClick={() => setQuery(searchInput.trim())}
              className="md:col-span-1 rounded-xl border border-amber-300/40 bg-amber-300/10 px-3 py-2.5 text-sm hover:bg-amber-300/20"
            >
              검색
            </button>
          </div>
        </section>

        {recommended.length > 0 ? (
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-amber-100">추천 글</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {recommended.map((item) => {
                const image = buildCardImage(item);
                return (
                  <Link key={`recommend-${item.slug}`} href={`/insights/${item.slug}`} className="group rounded-2xl border border-amber-200/20 bg-amber-100/[0.05] overflow-hidden hover:border-amber-200/40 transition">
                    {image.url ? (
                      <img
                        src={image.url}
                        alt={image.alt}
                        loading="lazy"
                        decoding="async"
                        width={640}
                        height={400}
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        className="h-40 w-full object-cover"
                      />
                    ) : (
                      <div className="h-40 w-full bg-gradient-to-br from-amber-300/15 to-pink-300/10" />
                    )}
                    <div className="p-4">
                      <p className="text-[11px] text-amber-200/80">{item.category || "인사이트"} · {formatDate(item.publishedAt || item.updatedAt)}</p>
                      <h3 className="mt-2 text-sm font-semibold leading-6 text-slate-100 group-hover:text-amber-100">{item.title}</h3>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        ) : null}

        <section className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-slate-100">{sortTagLabel(sort)}</h2>
            <span className="text-xs text-slate-400">{items.length.toLocaleString("ko-KR")}개 표시</span>
          </div>

          {error ? (
            <div className="rounded-xl border border-rose-300/40 bg-rose-300/10 px-4 py-3 text-sm text-rose-100">{error}</div>
          ) : null}

          {loading ? (
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-12 text-sm text-slate-300">목록을 불러오는 중...</div>
          ) : null}

          {!loading && items.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-12 text-center text-sm text-slate-300">
              조건에 맞는 인사이트 글이 없습니다.
            </div>
          ) : null}

          {!loading && items.length > 0 ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {items.map((item) => {
                  const image = buildCardImage(item);
                  return (
                    <Link key={item.slug} href={`/insights/${item.slug}`} className="group rounded-2xl border border-white/10 bg-white/[0.03] overflow-hidden hover:border-amber-300/40 hover:bg-white/[0.05] transition">
                      {image.url ? (
                        <img
                          src={image.url}
                          alt={image.alt}
                          loading="lazy"
                          decoding="async"
                          width={704}
                          height={440}
                          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                          className="h-44 w-full object-cover"
                        />
                      ) : (
                        <div className="h-44 w-full bg-gradient-to-br from-indigo-300/10 to-sky-300/10" />
                      )}
                      <div className="p-4">
                        <p className="text-[11px] text-slate-400">{item.category || "인사이트"} · 조회 {Number(item.viewCount || 0).toLocaleString("ko-KR")}</p>
                        <h3 className="mt-2 text-base font-semibold leading-6 text-slate-100 group-hover:text-amber-100">{item.title}</h3>
                        {item.subtitle ? <p className="mt-2 text-sm text-slate-300 line-clamp-2">{item.subtitle}</p> : null}
                        <p className="mt-3 text-sm text-slate-300 line-clamp-3 leading-6">{item.excerpt}</p>
                        <p className="mt-3 text-xs text-slate-400">{formatDate(item.publishedAt || item.updatedAt)}</p>
                        {Array.isArray(item.tags) && item.tags.length > 0 ? (
                          <div className="mt-3 flex flex-wrap gap-1.5">
                            {item.tags.slice(0, 3).map((value) => (
                              <span key={`${item.slug}-${value}`} className="rounded-full border border-white/15 bg-white/5 px-2 py-0.5 text-[11px] text-slate-300">#{value}</span>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    </Link>
                  );
                })}
              </div>

              <div className="flex justify-center pt-2">
                {hasMore ? (
                  <button
                    type="button"
                    onClick={onLoadMore}
                    disabled={loadingMore}
                    className="rounded-xl border border-white/15 bg-white/5 px-5 py-2.5 text-sm text-slate-100 hover:bg-white/10 disabled:opacity-60"
                  >
                    {loadingMore ? "불러오는 중..." : "더보기"}
                  </button>
                ) : (
                  <p className="text-xs text-slate-500">마지막 글까지 모두 확인했습니다.</p>
                )}
              </div>
            </>
          ) : null}
        </section>
      </section>
    </main>
  );
}
