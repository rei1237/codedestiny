import { connectDb } from "../lib/db.js";
import { Insight } from "../lib/models.js";
import { createHttpError, getRoutePath, handleRouteError, json, methodNotAllowed, notFound } from "../lib/http.js";
import { readCmsThroughCache } from "../lib/cms-cache.js";
import {
  INSIGHT_PUBLIC_CACHE_TTL_SECONDS,
  INSIGHT_PUBLIC_LIST_KEY,
  INSIGHT_PUBLIC_STALE_TTL_SECONDS,
  insightDetailCacheKey,
} from "../lib/insight-public-cache.js";

const PUBLIC_ALLOWED_HTML_TAGS = new Set([
  "article",
  "section",
  "h1",
  "h2",
  "h3",
  "h4",
  "p",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "ul",
  "ol",
  "li",
  "blockquote",
  "code",
  "pre",
  "hr",
  "a",
  "img",
  "br",
]);

function normalizeText(value, maxLen = 3000) {
  return String(value || "").trim().slice(0, maxLen);
}

function stripHtml(value) {
  return String(value || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function buildExcerpt(item) {
  const fromSummary = normalizeText(item?.summary, 400);
  if (fromSummary) return fromSummary;

  const fromExcerpt = normalizeText(item?.excerpt, 400);
  if (fromExcerpt) return fromExcerpt;

  const fromBody = stripHtml(item?.contentHtml).slice(0, 220);
  return fromBody;
}

function escapeHtmlAttr(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function extractHtmlAttr(attrs, name) {
  const pattern = new RegExp(`\\s${name}\\s*=\\s*(\"([^\"]*)\"|'([^']*)'|([^\\s>]+))`, "i");
  const matched = String(attrs || "").match(pattern);
  if (!matched) return "";
  return String(matched[2] || matched[3] || matched[4] || "").trim();
}

function sanitizeHref(rawHref) {
  const href = String(rawHref || "").trim();
  if (!href) return "";

  const lowered = href.toLowerCase().replace(/[\u0000-\u001f\u007f\s]+/g, "");
  if (lowered.startsWith("javascript:") || lowered.startsWith("vbscript:") || lowered.startsWith("data:")) {
    return "";
  }

  if (
    lowered.startsWith("http://")
    || lowered.startsWith("https://")
    || lowered.startsWith("mailto:")
    || lowered.startsWith("tel:")
    || lowered.startsWith("/")
    || lowered.startsWith("#")
    || lowered.startsWith("?")
  ) {
    return href;
  }

  return "";
}

function sanitizeSrc(rawSrc) {
  const src = String(rawSrc || "").trim();
  if (!src) return "";

  const lowered = src.toLowerCase().replace(/[\u0000-\u001f\u007f\s]+/g, "");
  if (lowered.startsWith("javascript:") || lowered.startsWith("vbscript:") || lowered.startsWith("data:")) {
    return "";
  }

  if (lowered.startsWith("http://") || lowered.startsWith("https://") || lowered.startsWith("/")) {
    return src;
  }

  return "";
}

function sanitizeNumericDimension(rawValue) {
  const value = Number(String(rawValue || "").trim());
  if (!Number.isFinite(value)) return "";
  const normalized = Math.max(1, Math.min(8192, Math.floor(value)));
  return String(normalized);
}

function sanitizeInsightHtml(rawHtml) {
  let html = String(rawHtml || "");

  html = html
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<\s*(script|style|iframe|object|embed|meta|link|base|form|input|button|textarea|select)[\s\S]*?<\s*\/\s*\1\s*>/gi, "")
    .replace(/<\s*(script|style|iframe|object|embed|meta|link|base|form|input|button|textarea|select)\b[^>]*\/?>/gi, "");

  html = html.replace(/<\/?([a-z0-9-]+)([^>]*)>/gi, (fullTag, rawName, rawAttrs = "") => {
    const tagName = String(rawName || "").toLowerCase();
    if (!PUBLIC_ALLOWED_HTML_TAGS.has(tagName)) return "";

    if (fullTag.startsWith("</")) {
      return `</${tagName}>`;
    }

    if (tagName === "a") {
      const href = sanitizeHref(extractHtmlAttr(rawAttrs, "href"));
      if (!href) return "<a>";
      return `<a href="${escapeHtmlAttr(href)}" rel="noopener noreferrer nofollow" target="_blank">`;
    }

    if (tagName === "img") {
      const src = sanitizeSrc(extractHtmlAttr(rawAttrs, "src"));
      if (!src) return "";

      const alt = escapeHtmlAttr(extractHtmlAttr(rawAttrs, "alt") || "");
      const width = sanitizeNumericDimension(extractHtmlAttr(rawAttrs, "width"));
      const height = sanitizeNumericDimension(extractHtmlAttr(rawAttrs, "height"));
      const loading = String(extractHtmlAttr(rawAttrs, "loading") || "").toLowerCase() === "eager" ? "eager" : "lazy";

      const attrs = [
        `src="${escapeHtmlAttr(src)}"`,
        `alt="${alt}"`,
        `loading="${loading}"`,
      ];

      if (width) attrs.push(`width="${width}"`);
      if (height) attrs.push(`height="${height}"`);

      return `<img ${attrs.join(" ")}>`;
    }

    return `<${tagName}>`;
  });

  return html.trim();
}

function parsePositiveInt(value, fallback, min, max) {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.max(min, Math.min(max, Math.floor(num)));
}

function splitTags(value) {
  if (Array.isArray(value)) {
    return value
      .map((item) => normalizeText(item, 80))
      .filter(Boolean);
  }

  const raw = normalizeText(value, 1000);
  if (!raw) return [];

  return raw
    .split(/[#,|/\n\r\t]+|\s*,\s*/g)
    .map((item) => normalizeText(item, 80))
    .filter(Boolean);
}

function normalizeBool(value, fallback = false) {
  if (typeof value === "boolean") return value;
  const normalized = String(value || "").trim().toLowerCase();
  if (["1", "true", "yes", "y", "published", "active"].includes(normalized)) return true;
  if (["0", "false", "no", "n", "draft", "archived", "private"].includes(normalized)) return false;
  return fallback;
}

function inferCategoryLabel(item) {
  const bag = `${normalizeText(item?.categoryLabel, 120)} ${normalizeText(item?.categoryName, 120)} ${normalizeText(item?.categorySlug, 120)} ${normalizeText(item?.category, 120)} ${normalizeText(item?.type, 80)} ${normalizeText(item?.kind, 80)} ${normalizeText(item?.title, 240)} ${splitTags(item?.tags).join(" ")}`;

  if (/자미|ziwei|명궁|궁위/i.test(bag)) return "자미두수";
  if (/숙요|27숙|영친|업태|안괴/i.test(bag)) return "숙요점";
  if (/타로|arcan|스프레드|카드/i.test(bag)) return "타로";
  if (/베다|vedic|라그나|나크샤트라|다샤/i.test(bag)) return "베다점";
  if (/점성|astrology|태양궁|상승궁|하우스/i.test(bag)) return "점성술";
  if (/궁합|compatibility|연애/i.test(bag)) return "궁합";
  if (/오늘|daily/i.test(bag)) return "오늘의 운세";
  if (/신년|new\s*year|yearly/i.test(bag)) return "신년운세";
  if (/룬|rune/i.test(bag)) return "룬";
  if (/오미쿠지|omikuji/i.test(bag)) return "오미쿠지";
  if (/사주|명리|오행|십성|대운|일간/i.test(bag)) return "사주";

  return normalizeText(item?.category || item?.categoryLabel || "기타", 120) || "기타";
}

function estimateReadingTime(rawText) {
  const text = stripHtml(rawText);
  const chars = text.replace(/\s+/g, "").length;
  return Math.max(1, Math.ceil(chars / 520));
}

function normalizeInsightPost(item) {
  const body = normalizeText(item?.contentHtml || item?.content || item?.body || "", 600000);
  const tags = Array.from(new Set([
    ...splitTags(item?.tags),
    ...splitTags(item?.tag),
  ])).slice(0, 30);

  const categoryLabel = inferCategoryLabel(item);
  const status = String(item?.status || "").trim().toLowerCase();
  const isPublished = status
    ? status === "published"
    : normalizeBool(item?.isPublished, true);

  return {
    _id: String(item?._id || ""),
    slug: normalizeText(item?.slug, 240),
    title: normalizeText(item?.title, 240),
    subtitle: normalizeText(item?.subtitle, 400),
    excerpt: buildExcerpt(item),
    body,
    category: categoryLabel,
    categoryLabel,
    tags,
    featuredImage: {
      url: normalizeText(item?.thumbnailUrl || item?.featuredImage?.url, 1000),
      alt: normalizeText(item?.featuredImage?.alt || item?.title, 300),
      width: Math.max(0, Number(item?.featuredImage?.width || 0) || 0),
      height: Math.max(0, Number(item?.featuredImage?.height || 0) || 0),
    },
    serviceLink: normalizeText(item?.serviceLink || item?.ctaServiceRoute || item?.targetRoute || item?.cta?.links?.[0]?.href || item?.internalLinks?.[0]?.href, 220),
    ctaLabel: normalizeText(item?.ctaLabel || item?.cta?.title, 120),
    canonicalUrl: normalizeText(item?.seo?.canonicalUrl || item?.canonicalUrl, 1000),
    metaTitle: normalizeText(item?.seo?.metaTitle || item?.metaTitle, 240),
    metaDescription: normalizeText(item?.seo?.metaDescription || item?.metaDescription, 600),
    ogTitle: normalizeText(item?.seo?.ogTitle || item?.ogTitle, 240),
    ogDescription: normalizeText(item?.seo?.ogDescription || item?.ogDescription, 600),
    ogImage: normalizeText(item?.seo?.ogImage || item?.ogImage, 1000),
    twitterTitle: normalizeText(item?.twitterTitle, 240),
    twitterDescription: normalizeText(item?.twitterDescription, 600),
    twitterImage: normalizeText(item?.twitterImage, 1000),
    isFeatured: normalizeBool(item?.isFeatured, false),
    noIndex: normalizeBool(item?.noIndex, false),
    isPublished,
    viewCount: Math.max(0, Number(item?.viewCount || 0) || 0),
    readingTime: Math.max(1, Number(item?.readingTime || 0) || estimateReadingTime(body)),
    publishedAt: item?.publishedAt || null,
    updatedAt: item?.updatedAt || null,
    createdAt: item?.createdAt || null,
    status,
    type: normalizeText(item?.type, 80),
  };
}

function isPublicInsight(item) {
  const status = String(item?.status || "").trim().toLowerCase();
  if (status === "scheduled") {
    const publishedAtMs = new Date(item?.publishedAt || 0).getTime();
    return Number.isFinite(publishedAtMs) && publishedAtMs <= Date.now();
  }
  if (status) return status === "published";
  return normalizeBool(item?.isPublished, true);
}

function buildPublicInsightStatusQuery(now = new Date()) {
  return {
    $or: [
      { status: "published" },
      { status: "scheduled", publishedAt: { $lte: now } },
    ],
  };
}

function normalizeSearchText(value) {
  return String(value || "").toLowerCase().replace(/\s+/g, " ").trim();
}

function buildSearchBag(item) {
  return normalizeSearchText([
    item.title,
    item.subtitle,
    item.excerpt,
    stripHtml(item.body),
    item.categoryLabel,
    item.tags.join(" "),
  ].join(" "));
}

function buildListQuery(request) {
  const url = new URL(request.url);
  const params = url.searchParams;

  const q = normalizeText(params.get("q"), 120);
  const category = normalizeText(params.get("category"), 120);
  const tag = normalizeText(params.get("tag"), 80);
  const sort = normalizeText(params.get("sort"), 20).toLowerCase() === "popular" ? "popular" : "latest";
  const page = parsePositiveInt(params.get("page"), 1, 1, 100000);
  const pageSize = parsePositiveInt(params.get("pageSize"), 12, 1, 48);
  const featuredOnly = String(params.get("featured") || "") === "1";
  const excludeNoIndex = String(params.get("excludeNoIndex") || "") === "1";

  return {
    q,
    category,
    tag,
    sort,
    page,
    pageSize,
    featuredOnly,
    excludeNoIndex,
  };
}

function serializeInsightCard(item) {
  return {
    _id: String(item?._id || ""),
    slug: normalizeText(item?.slug, 240),
    title: normalizeText(item?.title, 240),
    subtitle: normalizeText(item?.subtitle, 400),
    excerpt: buildExcerpt(item),
    category: normalizeText(item?.category, 120),
    tags: Array.isArray(item?.tags) ? item.tags.map((tag) => normalizeText(tag, 80)).filter(Boolean) : [],
    featuredImage: {
      url: normalizeText(item?.thumbnailUrl || item?.featuredImage?.url, 1000),
      alt: normalizeText(item?.featuredImage?.alt, 300),
      width: Math.max(0, Number(item?.featuredImage?.width || 0) || 0),
      height: Math.max(0, Number(item?.featuredImage?.height || 0) || 0),
    },
    canonicalUrl: normalizeText(item?.seo?.canonicalUrl || item?.canonicalUrl, 1000),
    isFeatured: Boolean(item?.isFeatured),
    noIndex: Boolean(item?.noIndex),
    viewCount: Math.max(0, Number(item?.viewCount || 0) || 0),
    readingTime: Math.max(0, Number(item?.readingTime || 0) || 0),
    publishedAt: item?.publishedAt || null,
    updatedAt: item?.updatedAt || null,
    createdAt: item?.createdAt || null,
  };
}

function buildShareUrl(request, slug) {
  const origin = new URL(request.url).origin;
  return `${origin}/insights/${encodeURIComponent(slug)}`;
}

/** 공개 조회 응답에 히트/미스/stale 을 싣는다. stale 은 DB 실패로 옛 값을 냈다는 뜻이라 장애를 가리지 않게 구분한다. */
function publicCacheHeaders({ loaded, stale }) {
  return { "X-CD-Cache": stale ? "stale" : loaded ? "miss" : "hit" };
}

async function handleInsightsList(request, env) {
  const { q, category, tag, sort, page, pageSize, featuredOnly, excludeNoIndex } = buildListQuery(request);

  // 캐시는 정규화된 전체 문서 집합 하나(키 1개)다. 필터·정렬·페이지는 요청마다 JS 로 하므로 쿼리스트링이
  // 키에 들어가지 않고, 관리자 저장은 purgeInsightPublicCache 가 이 키를 정확히 지운다.
  // 🔴 isPublicInsight 는 캐시 밖에서 건다 — 예약 발행은 "읽는 시점"의 시각으로 판정해야 한다.
  let loaded = false;
  const { value: normalizedRaw, stale } = await readCmsThroughCache({
    key: INSIGHT_PUBLIC_LIST_KEY,
    ttlSeconds: INSIGHT_PUBLIC_CACHE_TTL_SECONDS,
    staleTtlSeconds: INSIGHT_PUBLIC_STALE_TTL_SECONDS,
    load: async () => {
      loaded = true;
      await connectDb(env);
      const raw = await Insight.find({
        $or: [{ type: "fortune_insight" }, { type: { $exists: false } }, { type: "" }],
      })
        .select("slug title subtitle summary excerpt content contentHtml body category categoryLabel categoryName categorySlug tags tag featuredImage thumbnailUrl canonicalUrl seo isFeatured noIndex viewCount readingTime publishedAt updatedAt createdAt status isPublished cta ctaLabel ctaServiceRoute targetRoute serviceLink internalLinks type kind")
        .limit(6000)
        .lean();
      return raw.map((item) => normalizeInsightPost(item));
    },
  });

  const normalizedAll = normalizedRaw
    .filter((item) => item.slug && item.title && isPublicInsight(item));

  const qNorm = normalizeSearchText(q);

  let filtered = normalizedAll.filter((item) => {
    if (excludeNoIndex && item.noIndex) return false;
    if (featuredOnly && !item.isFeatured) return false;

    if (category) {
      const categoryNorm = normalizeSearchText(category);
      const itemCategoryNorm = normalizeSearchText(item.category || item.categoryLabel);
      if (itemCategoryNorm !== categoryNorm) return false;
    }

    if (tag) {
      const tagNorm = normalizeSearchText(tag);
      if (!item.tags.some((itemTag) => normalizeSearchText(itemTag) === tagNorm)) return false;
    }

    if (qNorm) {
      const bag = buildSearchBag(item);
      if (!bag.includes(qNorm)) return false;
    }

    return true;
  });

  filtered = filtered.sort((a, b) => {
    if (sort === "popular") {
      if (b.viewCount !== a.viewCount) return b.viewCount - a.viewCount;
    }
    const timeA = new Date(a.publishedAt || a.updatedAt || a.createdAt || 0).getTime();
    const timeB = new Date(b.publishedAt || b.updatedAt || b.createdAt || 0).getTime();
    return timeB - timeA;
  });

  const totalCount = filtered.length;
  const start = (page - 1) * pageSize;
  const items = filtered.slice(start, start + pageSize);

  const recommended = normalizedAll
    .filter((item) => item.isFeatured)
    .sort((a, b) => {
      const timeA = new Date(a.publishedAt || a.updatedAt || a.createdAt || 0).getTime();
      const timeB = new Date(b.publishedAt || b.updatedAt || b.createdAt || 0).getTime();
      return timeB - timeA;
    })
    .slice(0, 6);

  const categories = Array.from(
    new Set(
      normalizedAll
        .map((item) => normalizeText(item.categoryLabel || item.category, 120))
        .filter(Boolean),
    ),
  );

  const tags = Array.from(
    new Set(
      normalizedAll.flatMap((item) => item.tags),
    ),
  );

  return json({
    ok: true,
    page,
    pageSize,
    totalCount,
    hasMore: page * pageSize < totalCount,
    sort,
    filters: {
      q,
      category,
      tag,
    },
    categories: categories
      .map((value) => normalizeText(value, 120))
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b, "ko")),
    tags: tags
      .map((value) => normalizeText(value, 80))
      .filter(Boolean)
      .slice(0, 200)
      .sort((a, b) => a.localeCompare(b, "ko")),
    items: items.map(serializeInsightCard),
    recommended: recommended.map(serializeInsightCard),
  }, { headers: publicCacheHeaders({ loaded, stale }) });
}

function normalizePublicSlug(path) {
  const raw = String(path || "").replace(/^\/+/, "").trim();
  if (!raw) return "";
  if (raw.includes("/")) return "";

  let decoded = "";
  try {
    decoded = decodeURIComponent(raw).trim().toLowerCase();
  } catch (e) {
    return "";
  }

  if (!decoded || decoded.length > 240) return "";
  if (!/^[a-z0-9-]+$/.test(decoded)) return "";
  return decoded;
}

function serializeLinkItem(item) {
  if (!item) return null;
  return {
    slug: normalizeText(item?.slug, 240),
    title: normalizeText(item?.title, 240),
    category: normalizeText(item?.category, 120),
    publishedAt: item?.publishedAt || null,
    featuredImage: {
      url: normalizeText(item?.thumbnailUrl || item?.featuredImage?.url, 1000),
      alt: normalizeText(item?.featuredImage?.alt, 300),
      width: Math.max(0, Number(item?.featuredImage?.width || 0) || 0),
      height: Math.max(0, Number(item?.featuredImage?.height || 0) || 0),
    },
  };
}

async function findPrevNextInsight(currentId) {
  const ordered = await Insight.find({
    $and: [
      buildPublicInsightStatusQuery(),
      { $or: [{ type: "fortune_insight" }, { type: { $exists: false } }, { type: "" }] },
    ],
  })
    .sort({ publishedAt: -1, updatedAt: -1, createdAt: -1 })
    .select("_id slug title category publishedAt featuredImage thumbnailUrl")
    .limit(5000)
    .lean();

  const index = ordered.findIndex((item) => String(item?._id || "") === String(currentId || ""));
  if (index < 0) return { previous: null, next: null };

  return {
    previous: serializeLinkItem(ordered[index - 1] || null),
    next: serializeLinkItem(ordered[index + 1] || null),
  };
}

async function handleInsightDetail(path, request, env) {
  const slug = normalizePublicSlug(path);
  if (!slug) return notFound();

  // 404 는 캐시하지 않는다 — load 가 throw 하면 readCmsThroughCache 는 저장하지 않는다. 다만 그때
  // stale 값이 있으면 그것을 돌려주므로, missing 플래그로 결과와 무관하게 404 를 낸다(휴지통에 넣은 글이
  // stale 창 동안 되살아나지 않도록). 슬러그는 [a-z0-9-] 로 정규화된 값이라 키에 그대로 넣는다.
  // 🔴 viewCount 증가는 미스 때만 돈다(TTL 당 1회 표본). 정확한 조회수보다 핸드셰이크 절감을 택했다.
  let loaded = false;
  let missing = false;
  let cached;
  try {
    cached = await readCmsThroughCache({
      key: insightDetailCacheKey(slug),
      ttlSeconds: INSIGHT_PUBLIC_CACHE_TTL_SECONDS,
      staleTtlSeconds: INSIGHT_PUBLIC_STALE_TTL_SECONDS,
      load: async () => {
        loaded = true;
        await connectDb(env);
        const payload = await loadInsightDetail(slug);
        if (!payload) {
          missing = true;
          throw new Error("INSIGHT_NOT_FOUND");
        }
        return payload;
      },
    });
  } catch (error) {
    if (missing) return notFound();
    throw error;
  }
  if (missing || !cached?.value?.item) return notFound();

  const { value, stale } = cached;
  return json({
    ...value,
    item: { ...value.item, shareUrl: buildShareUrl(request, value.item.slug) },
  }, { headers: publicCacheHeaders({ loaded, stale }) });
}

/** 상세 응답 본문(shareUrl 제외 — 요청 origin 에 따라 달라 캐시 밖에서 붙인다). 비공개·없음이면 null. */
async function loadInsightDetail(slug) {
  const rawItem = await Insight.findOne({
    slug,
    $or: [{ type: "fortune_insight" }, { type: { $exists: false } }, { type: "" }],
  }).lean();

  if (!rawItem) return null;

  const item = normalizeInsightPost(rawItem);
  if (!isPublicInsight(item)) return null;

  await Insight.updateOne({ _id: rawItem._id }, { $inc: { viewCount: 1 } }).catch(() => null);

  const relatedConditions = [
    normalizeText(rawItem?.category, 120) ? { category: normalizeText(rawItem?.category, 120) } : null,
    Array.isArray(item.tags) && item.tags.length > 0 ? { tags: { $in: item.tags.slice(0, 8) } } : null,
  ].filter(Boolean);

  const [related, prevNext] = await Promise.all([
    Insight.find({
      _id: { $ne: rawItem._id },
      $and: [
        buildPublicInsightStatusQuery(),
        { $or: [{ type: "fortune_insight" }, { type: { $exists: false } }, { type: "" }] },
        { $or: relatedConditions.length ? relatedConditions : [{ _id: rawItem._id }] },
      ],
    })
      .sort({ publishedAt: -1, viewCount: -1, updatedAt: -1 })
      .limit(6)
      .select("slug title category publishedAt featuredImage thumbnailUrl")
      .lean(),
    findPrevNextInsight(rawItem._id),
  ]);

  const contentHtml = sanitizeInsightHtml(item.body || rawItem.contentHtml || "");

  return {
    ok: true,
    item: {
      _id: String(rawItem._id || ""),
      slug: normalizeText(item.slug, 240),
      title: normalizeText(item.title, 240),
      subtitle: normalizeText(item.subtitle, 400),
      excerpt: normalizeText(item.excerpt, 420),
      contentHtml,
      category: normalizeText(item.categoryLabel || item.category, 120),
      tags: Array.isArray(item.tags) ? item.tags.map((tag) => normalizeText(tag, 80)).filter(Boolean) : [],
      featuredImage: {
        url: normalizeText(item?.featuredImage?.url, 1000),
        alt: normalizeText(item?.featuredImage?.alt, 300),
        width: Math.max(0, Number(item?.featuredImage?.width || 0) || 0),
        height: Math.max(0, Number(item?.featuredImage?.height || 0) || 0),
      },
      metaTitle: normalizeText(item.metaTitle, 240),
      metaDescription: normalizeText(item.metaDescription, 600),
      canonicalUrl: normalizeText(item.canonicalUrl, 1000),
      ogTitle: normalizeText(item.ogTitle, 240),
      ogDescription: normalizeText(item.ogDescription, 600),
      ogImage: normalizeText(item.ogImage, 1000),
      twitterTitle: normalizeText(item.twitterTitle, 240),
      twitterDescription: normalizeText(item.twitterDescription, 600),
      twitterImage: normalizeText(item.twitterImage, 1000),
      noIndex: Boolean(item.noIndex),
      isFeatured: Boolean(item.isFeatured),
      viewCount: Math.max(0, Number(item.viewCount || 0) || 0),
      readingTime: Math.max(1, Number(item.readingTime || 0) || estimateReadingTime(contentHtml)),
      publishedAt: item.publishedAt || null,
      updatedAt: item.updatedAt || null,
      createdAt: item.createdAt || null,
      serviceLink: normalizeText(item.serviceLink, 220),
      ctaLabel: normalizeText(item.ctaLabel, 120),
    },
    related: related.map(serializeLinkItem),
    previous: prevNext.previous,
    next: prevNext.next,
  };
}

function normalizeImageKey(rawKey) {
  let decoded = "";
  try {
    decoded = decodeURIComponent(String(rawKey || "")).trim();
  } catch (e) {
    return "";
  }
  if (!decoded) return "";
  if (decoded.length > 1024) return "";
  if (decoded.includes("..") || decoded.includes("\\")) return "";
  if (decoded.startsWith("/")) return "";
  if (!decoded.startsWith("insights/")) return "";
  return decoded;
}

function guessMimeFromKey(key) {
  const lower = String(key || "").toLowerCase();
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  return "application/octet-stream";
}

async function handleInsightImageRead(path, env) {
  const encodedKey = String(path || "").slice("/images/".length);
  const key = normalizeImageKey(encodedKey);
  if (!key) return notFound();

  const bucket = env?.INSIGHT_IMAGES_BUCKET;
  if (!bucket || typeof bucket.get !== "function") {
    throw createHttpError(503, "Image storage is not configured.", {
      code: "IMAGE_STORAGE_NOT_CONFIGURED",
      requiredBindings: ["INSIGHT_IMAGES_BUCKET"],
    });
  }

  const object = await bucket.get(key);
  if (!object) return notFound();

  const headers = new Headers();
  if (typeof object.writeHttpMetadata === "function") {
    object.writeHttpMetadata(headers);
  }

  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", guessMimeFromKey(key));
  }
  if (!headers.has("Cache-Control")) {
    headers.set("Cache-Control", "public, max-age=31536000, immutable");
  }
  headers.set("X-Content-Type-Options", "nosniff");

  const etag = String(object.httpEtag || "");
  if (etag) headers.set("ETag", etag);

  return new Response(object.body, { status: 200, headers });
}

export async function handleInsightsRoutes(request, env) {
  try {
    const method = request.method.toUpperCase();
    const path = getRoutePath(request, "/api/insights");

    if (method === "GET" && path.startsWith("/images/")) {
      return handleInsightImageRead(path, env);
    }

    if (method === "GET" && (path === "/" || path === "")) {
      return handleInsightsList(request, env);
    }

    if (method === "GET" && /^\/[^/]+$/.test(path)) {
      return handleInsightDetail(path, request, env);
    }

    if (["GET", "POST", "PATCH", "PUT", "DELETE"].includes(method)) return notFound();
    return methodNotAllowed();
  } catch (error) {
    return handleRouteError(error);
  }
}
