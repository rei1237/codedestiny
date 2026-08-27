"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { getApiBaseUrl } from "../_lib/api-config";

const PAGE_SIZE = 12;
const INSIGHTS_COSMIC_CLIENT_TEXT_TRANSLATIONS = {
  ko: {
    "insightsCosmic.001": "이순신 사주",
    "insightsCosmic.002": "아이유 사주",
    "insightsCosmic.003": "BTS RM 사주",
    "insightsCosmic.004": "유명인 사주",
    "insightsCosmic.005": "연예인 사주",
    "insightsCosmic.006": "역사 인물 사주",
    "insightsCosmic.007": "사주 사례 모음",
    "insightsCosmic.008": "검색어를 입력하세요",
    "insightsCosmic.009": "전체 카테고리",
    "insightsCosmic.010": "전체 태그",
    "insightsCosmic.011": "최신순",
    "insightsCosmic.012": "인기순",
    "insightsCosmic.013": "조건에 맞는 인사이트가 없습니다.",
  },
  en: {
    "insightsCosmic.001": "Yi Sun-sin Saju",
    "insightsCosmic.002": "IU Saju",
    "insightsCosmic.003": "BTS RM Saju",
    "insightsCosmic.004": "Celebrity Saju",
    "insightsCosmic.005": "Entertainer Saju",
    "insightsCosmic.006": "Historical Figure Saju",
    "insightsCosmic.007": "Saju Case Collection",
    "insightsCosmic.008": "Enter a search term",
    "insightsCosmic.009": "All categories",
    "insightsCosmic.010": "All tags",
    "insightsCosmic.011": "Latest",
    "insightsCosmic.012": "Popular",
    "insightsCosmic.013": "No insights match these filters.",
  },
  ja: {
    "insightsCosmic.001": "李舜臣の四柱推命",
    "insightsCosmic.002": "IUの四柱推命",
    "insightsCosmic.003": "BTS RMの四柱推命",
    "insightsCosmic.004": "有名人の四柱推命",
    "insightsCosmic.005": "芸能人の四柱推命",
    "insightsCosmic.006": "歴史人物の四柱推命",
    "insightsCosmic.007": "四柱推命ケース集",
    "insightsCosmic.008": "検索語を入力してください",
    "insightsCosmic.009": "すべてのカテゴリー",
    "insightsCosmic.010": "すべてのタグ",
    "insightsCosmic.011": "新着順",
    "insightsCosmic.012": "人気順",
    "insightsCosmic.013": "条件に合うインサイトがありません。",
  },
};

function insightsCosmicClientText(key) {
  return INSIGHTS_COSMIC_CLIENT_TEXT_TRANSLATIONS.ko[key] || "Translation pending";
}

const FAMOUS_SAJU_POPULAR_KEYWORDS = [
  { label: insightsCosmicClientText("insightsCosmic.001"), href: "/insights/famous-saju/yi-sun-sin" },
  { label: insightsCosmicClientText("insightsCosmic.002"), href: "/insights/famous-saju/iu" },
  { label: insightsCosmicClientText("insightsCosmic.003"), href: "/insights/famous-saju/bts-rm" },
  { label: insightsCosmicClientText("insightsCosmic.004"), href: "/insights/famous-saju" },
  { label: insightsCosmicClientText("insightsCosmic.005"), href: "/insights/famous-saju" },
  { label: insightsCosmicClientText("insightsCosmic.006"), href: "/insights/famous-saju" },
  { label: insightsCosmicClientText("insightsCosmic.007"), href: "/insights/famous-saju" },
];
const CATEGORY_PRIORITY = ["사주", "자미두수", "숙요점", "타로", "점성술", "베다점", "궁합", "오늘의 운세", "신년운세", "룬", "오미쿠지", "기타"];

function normalizeText(value, maxLen = 6000) {
  return String(value || "").trim().slice(0, maxLen);
}

function toLowerNoSpace(value) {
  return normalizeText(value, 12000).toLowerCase().replace(/\s+/g, " ").trim();
}

function stripHtml(value) {
  return String(value || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function splitTags(value) {
  if (Array.isArray(value)) {
    return value
      .map((item) => normalizeText(item, 80))
      .filter(Boolean);
  }

  const raw = normalizeText(value, 500);
  if (!raw) return [];

  return raw
    .split(/[#,|/\n\r\t]+|\s*,\s*/g)
    .map((item) => normalizeText(item, 80))
    .filter(Boolean);
}

function inferCategoryLabel(item) {
  const bag = `${normalizeText(item?.categoryLabel, 120)} ${normalizeText(item?.categoryName, 120)} ${normalizeText(item?.categorySlug, 120)} ${normalizeText(item?.category, 120)} ${normalizeText(item?.type, 80)} ${normalizeText(item?.kind, 80)} ${normalizeText(item?.title, 240)} ${splitTags(item?.tags).join(" ")}`;

  if (/자미두수|ziwei|명궁|궁위|관록궁/i.test(bag)) return "자미두수";
  if (/숙요|27숙|영친|안괴|업태/i.test(bag)) return "숙요점";
  if (/타로|tarot|arcana|카드|스프레드/i.test(bag)) return "타로";
  if (/베다|vedic|라그나|나크샤트라|다샤/i.test(bag)) return "베다점";
  if (/점성술|astrology|출생차트|상승궁|하우스/i.test(bag)) return "점성술";
  if (/궁합|compatibility|인연|관계/i.test(bag)) return "궁합";
  if (/오늘|daily/i.test(bag)) return "오늘의 운세";
  if (/신년|new\s*year|yearly/i.test(bag)) return "신년운세";
  if (/룬|rune/i.test(bag)) return "룬";
  if (/오미쿠지|omikuji/i.test(bag)) return "오미쿠지";
  if (/사주|명리|오행|십성|대운|일간/i.test(bag)) return "사주";
  return normalizeText(item?.category || item?.categoryLabel || "기타", 120) || "기타";
}

function estimateReadingTime(body, fallback = 1) {
  const chars = stripHtml(body).replace(/\s+/g, "").length;
  if (!chars) return Math.max(1, Number(fallback || 1) || 1);
  return Math.max(1, Math.ceil(chars / 520));
}

function normalizePost(raw) {
  const title = normalizeText(raw?.title, 240);
  const excerpt = normalizeText(raw?.excerpt || raw?.summary || raw?.description || raw?.subtitle, 420);
  const body = normalizeText(raw?.body || raw?.content || raw?.contentHtml || raw?.contentMarkdown || "", 200000);
  const tags = Array.from(new Set([
    ...splitTags(raw?.tags),
    ...splitTags(raw?.tag),
  ])).slice(0, 20);

  const publishedAt = raw?.publishedAt || raw?.createdAt || null;
  const updatedAt = raw?.updatedAt || null;
  const categoryLabel = inferCategoryLabel(raw);
  const serviceLink = normalizeText(
    raw?.serviceLink
      || raw?.ctaServiceRoute
      || raw?.targetRoute
      || raw?.cta?.links?.[0]?.href
      || raw?.internalLinks?.[0]?.href
      || "",
    220,
  );

  return {
    id: normalizeText(raw?._id || raw?.id || raw?.slug, 120),
    slug: normalizeText(raw?.slug, 240),
    title,
    excerpt,
    subtitle: normalizeText(raw?.subtitle, 240),
    body,
    // 정적 허브(app/insights/page.js)는 본문 대신 축약 검색 인덱스를 넘긴다.
    // `/api/insights` 응답에는 이 필드가 없고 `body` 가 오므로 filterPosts 가 둘 다 받는다.
    searchText: normalizeText(raw?.searchText, 2000),
    category: categoryLabel,
    categoryLabel,
    tags,
    coverImage: normalizeText(raw?.coverImage || raw?.featuredImage?.url || raw?.thumbnailUrl, 1200),
    coverImageAlt: normalizeText(raw?.featuredImage?.alt || title || "운세 인사이트 이미지", 280),
    serviceLink,
    ctaLabel: normalizeText(raw?.ctaLabel || raw?.cta?.title || "관련 운세 보기", 100),
    seoTitle: normalizeText(raw?.seoTitle || raw?.metaTitle || raw?.seo?.metaTitle || title, 240),
    seoDescription: normalizeText(raw?.seoDescription || raw?.metaDescription || raw?.seo?.metaDescription || excerpt, 320),
    isPublished: raw?.isPublished === undefined ? String(raw?.status || "published") === "published" : Boolean(raw?.isPublished),
    isFeatured: Boolean(raw?.isFeatured),
    publishedAt,
    updatedAt,
    viewCount: Math.max(0, Number(raw?.viewCount || 0) || 0),
    readingTime: Math.max(1, Number(raw?.readingTime || 0) || estimateReadingTime(body, 1)),
  };
}

function sortPosts(items, sort) {
  const cloned = [...items];
  cloned.sort((a, b) => {
    if (sort === "popular") {
      if ((b.viewCount || 0) !== (a.viewCount || 0)) return (b.viewCount || 0) - (a.viewCount || 0);
    }

    const timeA = new Date(a.publishedAt || a.updatedAt || 0).getTime();
    const timeB = new Date(b.publishedAt || b.updatedAt || 0).getTime();
    return timeB - timeA;
  });
  return cloned;
}

function filterPosts(items, { query, category, tag, sort }) {
  const q = toLowerNoSpace(query);
  const targetCategory = normalizeText(category, 120);
  const targetTag = normalizeText(tag, 80);

  const filtered = items.filter((item) => {
    if (targetCategory && item.categoryLabel !== targetCategory && item.category !== targetCategory) return false;
    if (targetTag && !item.tags.includes(targetTag)) return false;

    if (!q) return true;
    const bag = toLowerNoSpace([
      item.title,
      item.excerpt,
      item.searchText || stripHtml(item.body),
      item.categoryLabel,
      item.tags.join(" "),
    ].join(" "));
    return bag.includes(q);
  });

  return sortPosts(filtered, sort);
}

function buildDynamicCategories(items) {
  const existing = new Set(items.map((item) => item.categoryLabel).filter(Boolean));
  const ordered = CATEGORY_PRIORITY.filter((label) => existing.has(label));

  const remaining = Array.from(existing)
    .filter((value) => !ordered.includes(value))
    .sort((a, b) => a.localeCompare(b, "ko"));

  return [...ordered, ...remaining];
}

function buildDynamicTags(items) {
  const tags = new Set();
  for (const item of items) {
    for (const tag of item.tags) tags.add(tag);
  }
  return Array.from(tags).sort((a, b) => a.localeCompare(b, "ko")).slice(0, 120);
}

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
  const url = String(item?.coverImage || item?.featuredImage?.url || "").trim();
  const alt = String(item?.coverImageAlt || item?.featuredImage?.alt || item?.title || "인사이트 대표 이미지").trim();
  const fallbackUrl = resolveCardFallbackImage(item);
  return {
    url: url || fallbackUrl,
    alt,
    fallbackUrl,
  };
}

function resolveCardFallbackImage(item) {
  const bag = [
    item?.slug,
    item?.title,
    item?.category,
    item?.categoryLabel,
    Array.isArray(item?.tags) ? item.tags.join(" ") : "",
  ].join(" ").toLowerCase();
  if (/famous-saju|유명인/.test(bag)) return "/fuctionassets/유명인 사주 분석.webp";
  if (/자미|ziwei|명궁|궁위|사화/.test(bag)) return "/fuctionassets/jami.webp";
  if (/숙요|sukuyo|27숙|영친|안괴|업태/.test(bag)) return "/fuctionassets/sukyo.webp";
  if (/타로|tarot|arcana|카드|스프레드/.test(bag)) return "/fuctionassets/tarolove.webp";
  if (/베다|vedic|라그나|나크샤트라/.test(bag)) return "/fuctionassets/veda.webp";
  if (/점성|astrology|zodiac|태양궁|달궁|상승궁/.test(bag)) return "/fuctionassets/jumsung.webp";
  if (/꿈|dream|해몽/.test(bag)) return "/fuctionassets/heamong.webp";
  if (/재물|wealth|돈|금전|수입/.test(bag)) return "/fuctionassets/돈밝히는 연이.webp";
  if (/건강|health|회복|명상/.test(bag)) return "/fuctionassets/meditation.webp";
  if (/사주|명리|오행|십성|대운|일간|만세력|manseoryeok/.test(bag)) return "/fuctionassets/saju.webp";
  return "/fuctionassets/premiumstar.webp";
}

function handleCardImageError(event) {
  const fallbackUrl = event.currentTarget.getAttribute("data-fallback-src") || "";
  if (!fallbackUrl || event.currentTarget.dataset.fallbackApplied === "true") return;
  event.currentTarget.dataset.fallbackApplied = "true";
  event.currentTarget.src = fallbackUrl;
}

function sortTagLabel(sort) {
  return sort === "popular" ? "인기 글" : "최신 글";
}

export default function InsightsCosmicClient({
  initialItems = [],
  initialAllItems = [],
  initialRecommended = [],
  initialCategories = [],
  initialTags = [],
  initialTotalCount = 0,
  initialFamousSajuItems = [],
}) {
  const apiBase = useMemo(() => getApiBaseUrl(), []);
  const seedPool = useMemo(() => {
    const source = initialAllItems.length > 0 ? initialAllItems : initialItems;
    return source.map(normalizePost).filter((item) => item.slug && item.title && item.isPublished);
  }, [initialAllItems, initialItems]);
  const skipFirstLiveFetchRef = useRef(seedPool.length >= PAGE_SIZE);

  const [apiMode, setApiMode] = useState(false);
  const [apiItems, setApiItems] = useState(initialItems.map(normalizePost));
  const [apiRecommended, setApiRecommended] = useState(initialRecommended.map(normalizePost));
  const [apiCategories, setApiCategories] = useState(Array.isArray(initialCategories) ? initialCategories : []);
  const [apiTags, setApiTags] = useState(Array.isArray(initialTags) ? initialTags : []);
  const [apiTotalCount, setApiTotalCount] = useState(Math.max(initialTotalCount, initialItems.length));

  const [category, setCategory] = useState("");
  const [tag, setTag] = useState("");
  const [sort, setSort] = useState("latest");
  const [searchInput, setSearchInput] = useState("");
  const [query, setQuery] = useState("");

  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(seedPool.length > PAGE_SIZE);

  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [lazySeedPool, setLazySeedPool] = useState([]);

  useEffect(() => {
    let cancelled = false;

    async function loadSeedFallback() {
      if (seedPool.length > 0) {
        if (!cancelled) setLazySeedPool([]);
        return;
      }

      try {
        const mod = await import("./seed-articles");
        const source = Array.isArray(mod?.INSIGHT_SEED_ARTICLES) ? mod.INSIGHT_SEED_ARTICLES : [];
        const normalized = source.map(normalizePost).filter((item) => item.slug && item.title && item.isPublished);
        if (!cancelled && normalized.length > 0) setLazySeedPool(normalized);
      } catch {
        if (!cancelled) setLazySeedPool([]);
      }
    }

    loadSeedFallback();
    return () => {
      cancelled = true;
    };
  }, [seedPool.length]);

  const mergedSeedPool = useMemo(() => {
    if (lazySeedPool.length > 0) return lazySeedPool;
    return seedPool;
  }, [lazySeedPool, seedPool]);

  const localFiltered = useMemo(() => {
    return filterPosts(mergedSeedPool, { query, category, tag, sort });
  }, [mergedSeedPool, query, category, sort, tag]);

  const localItems = useMemo(() => localFiltered.slice(0, page * PAGE_SIZE), [localFiltered, page]);
  const localHasMore = localFiltered.length > localItems.length;
  const localRecommended = useMemo(() => {
    const featured = sortPosts(mergedSeedPool.filter((item) => item.isFeatured), "latest").slice(0, 6);
    if (featured.length > 0) return featured;
    return sortPosts(mergedSeedPool, "popular").slice(0, 6);
  }, [mergedSeedPool]);
  const localCategories = useMemo(() => {
    const dynamic = buildDynamicCategories(mergedSeedPool);
    return dynamic.length > 0 ? dynamic : (Array.isArray(initialCategories) ? initialCategories : []);
  }, [initialCategories, mergedSeedPool]);
  const localTags = useMemo(() => {
    const dynamic = buildDynamicTags(mergedSeedPool);
    return dynamic.length > 0 ? dynamic : (Array.isArray(initialTags) ? initialTags : []);
  }, [initialTags, mergedSeedPool]);

  const activeItems = apiMode ? apiItems : localItems;
  const activeRecommended = apiMode ? apiRecommended : localRecommended;
  const activeCategories = apiMode ? apiCategories : localCategories;
  const activeTags = apiMode ? apiTags : localTags;
  const activeTotalCount = apiMode ? apiTotalCount : localFiltered.length;
  const activeHasMore = apiMode ? hasMore : localHasMore;
  const categoryTabs = useMemo(() => {
    const labels = Array.from(new Set(["유명인 사주", ...activeCategories].filter(Boolean)));
    return ["", ...labels];
  }, [activeCategories]);
  const famousSajuItems = useMemo(() => {
    return initialFamousSajuItems.map(normalizePost).filter((item) => item.slug && item.title).slice(0, 6);
  }, [initialFamousSajuItems]);

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

    const nextItems = Array.isArray(data?.items) ? data.items.map(normalizePost) : [];
    const nextRecommended = Array.isArray(data?.recommended) ? data.recommended.map(normalizePost) : [];
    const nextTotalCount = Math.max(0, Number(data?.totalCount || 0) || 0);

    if (nextTotalCount <= 0 && seedPool.length > 0) {
      setApiMode(false);
      setPage(1);
      setHasMore(localFiltered.length > PAGE_SIZE);
      return;
    }

    setApiMode(true);
    setApiItems((prev) => (append ? [...prev, ...nextItems] : nextItems));
    setApiRecommended(nextRecommended);
    setApiCategories(Array.isArray(data?.categories) ? data.categories : buildDynamicCategories(nextItems));
    setApiTags(Array.isArray(data?.tags) ? data.tags.slice(0, 120) : buildDynamicTags(nextItems));
    setApiTotalCount(nextTotalCount);
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
          setApiMode(false);
          setPage(1);
          setHasMore(localFiltered.length > PAGE_SIZE);
          setError(String(fetchError?.message || "인사이트 목록을 불러오지 못했습니다. 시드 데이터로 계속 탐색할 수 있습니다."));
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
    if (loadingMore) return;
    if (apiMode && !hasMore) return;
    if (!apiMode && !localHasMore) return;

    if (!apiMode) {
      setPage((prev) => prev + 1);
      return;
    }

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
          <p className="mt-3 text-sm md:text-base text-slate-200 leading-7">
            흩어진 질문이 조용히 한 줄로 모이도록,
            사주와 타로, 별의 언어를 차분한 해석 순서로 정리했습니다.
          </p>
          <p className="mt-2 text-sm text-slate-300 leading-7">
            사주, 자미두수, 숙요점, 타로, 점성술의 결을 함께 살피며
            지금 필요한 선택의 감각을 천천히 비춰볼 수 있습니다.
          </p>
          <p className="mt-3 text-xs text-slate-400">총 {activeTotalCount.toLocaleString("ko-KR")}개 글</p>
        </header>

        <nav className="flex gap-2 overflow-x-auto pb-1" aria-label="운세 인사이트 카테고리">
          {categoryTabs.map((value) => {
            const active = category === value;
            return (
              <button
                key={value || "all"}
                type="button"
                onClick={() => {
                  setCategory(value);
                  setTag("");
                  setPage(1);
                }}
                className={`shrink-0 rounded-full border px-3.5 py-2 text-sm font-semibold transition ${
                  active
                    ? "border-amber-200 bg-amber-100/15 text-amber-50"
                    : "border-white/15 bg-white/[0.04] text-slate-200 hover:border-amber-200/45 hover:text-amber-100"
                }`}
              >
                {value || "전체"}
              </button>
            );
          })}
        </nav>

        {famousSajuItems.length > 0 ? (
          <section className="overflow-hidden rounded-3xl border border-amber-200/20 bg-[linear-gradient(135deg,rgba(251,191,36,0.11),rgba(168,85,247,0.08),rgba(15,23,42,0.08))]">
            <div className="grid gap-5 p-4 md:p-6 lg:grid-cols-[0.85fr_1.15fr]">
              <div className="flex min-w-0 flex-col justify-between gap-5">
                <div>
                  <p className="text-xs font-semibold tracking-[0.18em] text-amber-200/80">FAMOUS SAJU MAGAZINE</p>
                  <h2 className="mt-2 text-2xl font-semibold leading-tight text-white">유명인 사주 분석</h2>
                  <p className="mt-3 text-sm leading-7 text-slate-300">
                    공개 자료로 확인 가능한 생년월일만 조심스럽게 놓고, 역사 인물과 대중문화 인물의 선택과 상징을 사주 언어로 읽습니다.
                  </p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-amber-100">인기 키워드</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {FAMOUS_SAJU_POPULAR_KEYWORDS.map((keyword) => (
                      <Link
                        key={keyword.label}
                        href={keyword.href}
                        className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-slate-200 transition hover:border-amber-200/50 hover:text-amber-100"
                      >
                        {keyword.label}
                      </Link>
                    ))}
                  </div>
                </div>
                <Link
                  href="/insights/famous-saju"
                  className="inline-flex w-fit items-center justify-center rounded-lg border border-amber-200/40 bg-amber-100/15 px-4 py-2 text-sm font-semibold text-amber-50 transition hover:bg-amber-100/25"
                >
                  유명인 사주 전체 보기
                </Link>
              </div>

              <div className="grid min-w-0 gap-3 sm:grid-cols-2">
                {famousSajuItems.slice(0, 4).map((item) => {
                  const image = buildCardImage(item);
                  const href = item.serviceLink || `/insights/${item.slug}`;
                  return (
                    <Link
                      key={`famous-${item.slug}`}
                      href={href}
                      className="group overflow-hidden rounded-2xl border border-white/10 bg-white/[0.055] transition hover:border-amber-200/45 hover:bg-white/[0.08]"
                    >
                      {image.url ? (
                        <img
                          src={image.url}
                          alt={image.alt}
                          loading="lazy"
                          decoding="async"
                          width={640}
                          height={360}
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                          data-fallback-src={image.fallbackUrl}
                          onError={handleCardImageError}
                          className="h-36 w-full object-cover sm:h-32"
                        />
                      ) : (
                        <div className="h-36 w-full bg-gradient-to-br from-amber-300/20 to-fuchsia-300/10 sm:h-32" />
                      )}
                      <div className="p-4">
                        <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
                          <span>{formatDate(item.publishedAt || item.updatedAt)}</span>
                          <span>약 {Math.max(1, Number(item.readingTime || 1))}분 읽기</span>
                        </div>
                        <h3 className="mt-2 text-base font-semibold leading-6 text-white group-hover:text-amber-100">{item.title}</h3>
                        <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-300">{item.excerpt}</p>
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {item.tags.slice(0, 3).map((value) => (
                            <span key={`${item.slug}-${value}`} className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] text-slate-300">
                              #{value}
                            </span>
                          ))}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          </section>
        ) : null}

        <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 md:p-5 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-2">
            <input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") setQuery(searchInput.trim());
              }}
              placeholder={insightsCosmicClientText("insightsCosmic.008")}
              className="md:col-span-5 rounded-xl border border-white/20 bg-[#1a1230] px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-400 focus:border-amber-300/60 focus:outline-none"
            />
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className="md:col-span-2 rounded-xl border border-white/20 bg-[#1a1230] px-3 py-2.5 text-sm text-slate-100 focus:border-amber-300/60 focus:outline-none"
            >
              <option value="">{insightsCosmicClientText("insightsCosmic.009")}</option>
              {activeCategories.map((value) => (
                <option key={value} value={value}>{value}</option>
              ))}
            </select>
            <select
              value={tag}
              onChange={(event) => setTag(event.target.value)}
              className="md:col-span-2 rounded-xl border border-white/20 bg-[#1a1230] px-3 py-2.5 text-sm text-slate-100 focus:border-amber-300/60 focus:outline-none"
            >
              <option value="">{insightsCosmicClientText("insightsCosmic.010")}</option>
              {activeTags.map((value) => (
                <option key={value} value={value}>{value}</option>
              ))}
            </select>
            <select
              value={sort}
              onChange={(event) => setSort(event.target.value)}
              className="md:col-span-2 rounded-xl border border-white/20 bg-[#1a1230] px-3 py-2.5 text-sm text-slate-100 focus:border-amber-300/60 focus:outline-none"
            >
              <option value="latest">{insightsCosmicClientText("insightsCosmic.011")}</option>
              <option value="popular">{insightsCosmicClientText("insightsCosmic.012")}</option>
            </select>
            <button
              type="button"
              onClick={() => setQuery(searchInput.trim())}
              className="md:col-span-1 rounded-xl border border-amber-300/40 bg-amber-300/15 px-3 py-2.5 text-sm text-amber-50 transition hover:bg-amber-300/30 focus:outline-none focus:ring-2 focus:ring-amber-300/50"
            >
              검색
            </button>
          </div>
        </section>

        {activeRecommended.length > 0 ? (
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-amber-100">추천 글</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {activeRecommended.map((item) => {
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
                        data-fallback-src={image.fallbackUrl}
                        onError={handleCardImageError}
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
            <span className="text-xs text-slate-400">{activeItems.length.toLocaleString("ko-KR")}개 표시</span>
          </div>

          {error ? (
            <div className="rounded-xl border border-rose-300/40 bg-rose-300/10 px-4 py-3 text-sm text-rose-100">{error}</div>
          ) : null}

          {loading ? (
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-12 text-sm text-slate-300">목록을 불러오는 중...</div>
          ) : null}

          {!loading && activeItems.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-12 text-center text-sm text-slate-300">
              <p>{insightsCosmicClientText("insightsCosmic.013")}</p>
              <p className="mt-2 text-slate-400">검색어를 조금 넓히거나, 다른 카테고리의 인사이트를 살펴보세요.</p>
            </div>
          ) : null}

          {!loading && activeItems.length > 0 ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {activeItems.map((item) => {
                  const image = buildCardImage(item);
                  const serviceLink = normalizeText(item.serviceLink, 240);
                  const ctaLabel = normalizeText(item.ctaLabel, 80) || "관련 운세 보기";
                  return (
                    <article key={item.slug} className="group rounded-2xl border border-white/10 bg-white/[0.03] overflow-hidden hover:border-amber-300/40 hover:bg-white/[0.05] transition">
                      {image.url ? (
                        <img
                          src={image.url}
                          alt={image.alt}
                          loading="lazy"
                          decoding="async"
                          width={704}
                          height={440}
                          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                          data-fallback-src={image.fallbackUrl}
                          onError={handleCardImageError}
                          className="h-44 w-full object-cover"
                        />
                      ) : (
                        <div className="h-44 w-full bg-gradient-to-br from-indigo-300/10 to-sky-300/10" />
                      )}
                      <div className="p-4">
                        <p className="text-[11px] text-slate-400">{item.categoryLabel || item.category || "인사이트"} · 조회 {Number(item.viewCount || 0).toLocaleString("ko-KR")}</p>
                        <h3 className="mt-2 text-base font-semibold leading-6 text-slate-100 group-hover:text-amber-100">{item.title}</h3>
                        {item.subtitle ? <p className="mt-2 text-sm text-slate-300 line-clamp-2">{item.subtitle}</p> : null}
                        <p className="mt-3 text-sm text-slate-300 line-clamp-3 leading-6">{item.excerpt}</p>
                        <p className="mt-3 text-xs text-slate-400">{formatDate(item.publishedAt || item.updatedAt)} · 약 {Math.max(1, Number(item.readingTime || 1))}분 읽기</p>
                        {Array.isArray(item.tags) && item.tags.length > 0 ? (
                          <div className="mt-3 flex flex-wrap gap-1.5">
                            {item.tags.slice(0, 5).map((value) => (
                              <span key={`${item.slug}-${value}`} className="rounded-full border border-white/15 bg-white/5 px-2 py-0.5 text-[11px] text-slate-300">#{value}</span>
                            ))}
                          </div>
                        ) : null}

                        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                          <Link
                            href={`/insights/${item.slug}`}
                            className="inline-flex items-center justify-center rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-xs text-slate-100 hover:bg-white/15"
                          >
                            상세 글 보기
                          </Link>
                          {serviceLink ? (
                            <Link
                              href={serviceLink}
                              className="inline-flex items-center justify-center rounded-lg border border-amber-300/40 bg-amber-300/15 px-3 py-2 text-xs text-amber-50 hover:bg-amber-300/30"
                            >
                              {ctaLabel}
                            </Link>
                          ) : (
                            <Link
                              href="/insights"
                              className="inline-flex items-center justify-center rounded-lg border border-amber-300/25 bg-amber-300/10 px-3 py-2 text-xs text-amber-100"
                            >
                              관련 글 더 보기
                            </Link>
                          )}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>

              <div className="flex justify-center pt-2">
                {activeHasMore ? (
                  <button
                    type="button"
                    onClick={onLoadMore}
                    disabled={loadingMore && apiMode}
                    className="rounded-xl border border-white/15 bg-white/5 px-5 py-2.5 text-sm text-slate-100 hover:bg-white/10 disabled:opacity-60"
                  >
                    {loadingMore && apiMode ? "불러오는 중..." : "더보기"}
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
