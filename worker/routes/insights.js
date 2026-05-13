import { connectDb } from "../lib/db.js";
import { Insight } from "../lib/models.js";
import { createHttpError, getRoutePath, handleRouteError, json, methodNotAllowed, notFound } from "../lib/http.js";

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

const SITE_ORIGIN = "https://code-destiny.com";
const DEFAULT_FALLBACK_IMAGE = "/icons/fortune-tama-512.webp";

const INSIGHT_FALLBACK_IMAGES = [
  {
    url: "/fuctionassets/jami.webp",
    alt: "자미두수 인사이트 대표 이미지",
    keywords: ["자미", "ziwei", "명궁", "12궁", "궁위", "사화", "자미두수"],
  },
  {
    url: "/fuctionassets/sukyo.webp",
    alt: "숙요점 인사이트 대표 이미지",
    keywords: ["숙요", "27숙", "영친", "업태", "안괴", "본명숙", "월명숙"],
  },
  {
    url: "/fuctionassets/saju.webp",
    alt: "사주 인사이트 대표 이미지",
    keywords: ["사주", "명리", "천간", "지지", "오행", "십성", "용신", "만세력", "일간", "대운", "세운"],
  },
  {
    url: "/tarot-cards/theworld.webp",
    alt: "타로 메이저 아르카나 대표 이미지",
    keywords: ["아르카나", "major", "arcana", "메이저", "카드"],
  },
  {
    url: "/fuctionassets/tarolove.webp",
    alt: "타로 인사이트 대표 이미지",
    keywords: ["타로", "tarot", "스프레드", "리딩", "역방향"],
  },
  {
    url: "/fuctionassets/jumsung.webp",
    alt: "점성술 인사이트 대표 이미지",
    keywords: ["점성", "astrology", "태양궁", "달궁", "상승궁", "하우스", "출생차트"],
  },
  {
    url: "/fuctionassets/veda.webp",
    alt: "베다점성술 인사이트 대표 이미지",
    keywords: ["베다", "vedic", "라그나", "나크샤트라"],
  },
  {
    url: "/fuctionassets/heamong.webp",
    alt: "꿈해몽 인사이트 대표 이미지",
    keywords: ["꿈", "dream", "해몽", "무의식"],
  },
  {
    url: "/fuctionassets/lovebible.webp",
    alt: "연애 궁합 인사이트 대표 이미지",
    keywords: ["연애", "궁합", "관계", "재회", "사랑", "속마음"],
  },
  {
    url: "/fuctionassets/flower4.webp",
    alt: "운세 인사이트 대표 이미지",
    keywords: ["운세", "인사이트", "가이드", "fortune"],
  },
];

function normalizeText(value, maxLen = 3000) {
  return String(value || "").trim().slice(0, maxLen);
}

function isKnownBrokenImageUrl(value) {
  const url = normalizeText(value, 1200).toLowerCase();
  if (!url) return true;
  return url.includes("/og/code-destiny-og.png");
}

function toAbsoluteAssetUrl(value) {
  const raw = normalizeText(value, 1200);
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  if (raw.startsWith("/")) return `${SITE_ORIGIN}${raw}`;
  return `${SITE_ORIGIN}/${raw}`;
}

function pickInsightFallbackImage(item) {
  const blob = [
    item?.slug,
    item?.title,
    item?.subtitle,
    item?.summary,
    item?.excerpt,
    item?.category,
    ...(Array.isArray(item?.tags) ? item.tags : []),
  ]
    .map((value) => normalizeText(value, 300).toLowerCase())
    .join(" ");

  let best = INSIGHT_FALLBACK_IMAGES[INSIGHT_FALLBACK_IMAGES.length - 1];
  let bestScore = 0;

  for (const profile of INSIGHT_FALLBACK_IMAGES) {
    let score = 0;
    for (const keyword of profile.keywords) {
      if (blob.includes(String(keyword || "").toLowerCase())) score += 2;
    }

    if (score > bestScore) {
      bestScore = score;
      best = profile;
    }
  }

  return best || INSIGHT_FALLBACK_IMAGES[0];
}

function buildSafeFeaturedImage(item) {
  const explicitUrl = normalizeText(item?.thumbnailUrl || item?.featuredImage?.url, 1000);
  const profile = pickInsightFallbackImage(item);
  const url = !isKnownBrokenImageUrl(explicitUrl) ? explicitUrl : profile.url;

  return {
    url: url || DEFAULT_FALLBACK_IMAGE,
    alt: normalizeText(item?.featuredImage?.alt, 300) || profile.alt,
    width: Math.max(0, Number(item?.featuredImage?.width || 1200) || 1200),
    height: Math.max(0, Number(item?.featuredImage?.height || 630) || 630),
  };
}

function resolveOgImageUrl(item, featuredImageUrl) {
  const explicitOg = normalizeText(item?.seo?.ogImage || item?.ogImage, 1000);
  if (!isKnownBrokenImageUrl(explicitOg)) {
    return toAbsoluteAssetUrl(explicitOg) || toAbsoluteAssetUrl(featuredImageUrl) || toAbsoluteAssetUrl(DEFAULT_FALLBACK_IMAGE);
  }
  return toAbsoluteAssetUrl(featuredImageUrl) || toAbsoluteAssetUrl(DEFAULT_FALLBACK_IMAGE);
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

  const typeFilter = { $or: [{ type: "fortune_insight" }, { type: { $exists: false } }, { type: "" }] };
  const query = {
    status: "published",
    ...typeFilter,
  };
  if (category) query.category = category;
  if (tag) query.tags = { $in: [tag] };
  if (excludeNoIndex) query.noIndex = { $ne: true };
  if (featuredOnly) query.isFeatured = true;

  if (q) {
    const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    query.$and = [
      {
        $or: [
          { title: { $regex: escaped, $options: "i" } },
          { subtitle: { $regex: escaped, $options: "i" } },
          { summary: { $regex: escaped, $options: "i" } },
          { excerpt: { $regex: escaped, $options: "i" } },
          { category: { $regex: escaped, $options: "i" } },
          { tags: { $elemMatch: { $regex: escaped, $options: "i" } } },
        ],
      },
    ];
  }

  const sortSpec = sort === "popular"
    ? { viewCount: -1, publishedAt: -1, updatedAt: -1 }
    : { publishedAt: -1, updatedAt: -1, createdAt: -1 };

  return {
    q,
    category,
    tag,
    sort,
    page,
    pageSize,
    query,
    sortSpec,
  };
}

function serializeInsightCard(item) {
  const featuredImage = buildSafeFeaturedImage(item);
  return {
    _id: String(item?._id || ""),
    slug: normalizeText(item?.slug, 240),
    title: normalizeText(item?.title, 240),
    subtitle: normalizeText(item?.subtitle, 400),
    excerpt: buildExcerpt(item),
    category: normalizeText(item?.category, 120),
    tags: Array.isArray(item?.tags) ? item.tags.map((tag) => normalizeText(tag, 80)).filter(Boolean) : [],
    featuredImage,
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

async function handleInsightsList(request, env) {
  await connectDb(env);
  const { q, category, tag, sort, page, pageSize, query, sortSpec } = buildListQuery(request);

  const [items, totalCount, recommended, categories, tags] = await Promise.all([
    Insight.find(query)
      .sort(sortSpec)
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .select("slug title subtitle summary excerpt category tags featuredImage thumbnailUrl canonicalUrl seo isFeatured noIndex viewCount readingTime publishedAt updatedAt createdAt")
      .lean(),
    Insight.countDocuments(query),
    Insight.find({
      status: "published",
      isFeatured: true,
      $or: [{ type: "fortune_insight" }, { type: { $exists: false } }, { type: "" }],
    })
      .sort({ publishedAt: -1, updatedAt: -1 })
      .limit(6)
      .select("slug title subtitle summary excerpt category tags featuredImage thumbnailUrl canonicalUrl seo isFeatured noIndex viewCount readingTime publishedAt updatedAt createdAt")
      .lean(),
    Insight.distinct("category", {
      status: "published",
      category: { $ne: "" },
      $or: [{ type: "fortune_insight" }, { type: { $exists: false } }, { type: "" }],
    }),
    Insight.distinct("tags", {
      status: "published",
      $or: [{ type: "fortune_insight" }, { type: { $exists: false } }, { type: "" }],
    }),
  ]);

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
  });
}

function normalizePublicSlug(path) {
  const raw = String(path || "").replace(/^\/+/, "").trim();
  if (!raw) return "";
  if (raw.includes("/")) return "";

  let decoded = "";
  try {
    decoded = decodeURIComponent(raw).trim().toLowerCase();
  } catch {
    return "";
  }

  if (!decoded || decoded.length > 240) return "";
  if (!/^[a-z0-9-]+$/.test(decoded)) return "";
  return decoded;
}

function estimateReadingTime(contentHtml) {
  const text = stripHtml(contentHtml);
  const chars = text.replace(/\s+/g, "").length;
  return Math.max(1, Math.ceil(chars / 500));
}

function serializeLinkItem(item) {
  if (!item) return null;
  const featuredImage = buildSafeFeaturedImage(item);
  return {
    slug: normalizeText(item?.slug, 240),
    title: normalizeText(item?.title, 240),
    category: normalizeText(item?.category, 120),
    publishedAt: item?.publishedAt || null,
    featuredImage,
  };
}

async function findPrevNextInsight(currentId) {
  const ordered = await Insight.find({
    status: "published",
    $or: [{ type: "fortune_insight" }, { type: { $exists: false } }, { type: "" }],
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
  await connectDb(env);

  const slug = normalizePublicSlug(path);
  if (!slug) return notFound();

  const item = await Insight.findOneAndUpdate(
    {
      status: "published",
      slug,
      $or: [{ type: "fortune_insight" }, { type: { $exists: false } }, { type: "" }],
    },
    { $inc: { viewCount: 1 } },
    { new: true },
  ).lean();

  if (!item) return notFound();

  const relatedConditions = [
    item.category ? { category: item.category } : null,
    Array.isArray(item.tags) && item.tags.length > 0 ? { tags: { $in: item.tags.slice(0, 8) } } : null,
  ].filter(Boolean);

  const [related, prevNext] = await Promise.all([
    Insight.find({
      status: "published",
      _id: { $ne: item._id },
      $and: [
        { $or: [{ type: "fortune_insight" }, { type: { $exists: false } }, { type: "" }] },
        { $or: relatedConditions.length ? relatedConditions : [{ _id: item._id }] },
      ],
    })
      .sort({ publishedAt: -1, viewCount: -1, updatedAt: -1 })
      .limit(6)
      .select("slug title category publishedAt featuredImage thumbnailUrl")
      .lean(),
    findPrevNextInsight(item._id),
  ]);

  const contentHtml = sanitizeInsightHtml(item.contentHtml || "");
  const featuredImage = buildSafeFeaturedImage(item);
  const ogImage = resolveOgImageUrl(item, featuredImage.url);
  const explicitTwitterImage = normalizeText(item?.seo?.twitterImage || item?.twitterImage, 1000);
  const twitterImage = !isKnownBrokenImageUrl(explicitTwitterImage)
    ? toAbsoluteAssetUrl(explicitTwitterImage)
    : ogImage;

  return json({
    ok: true,
    item: {
      _id: String(item._id || ""),
      slug: normalizeText(item.slug, 240),
      title: normalizeText(item.title, 240),
      subtitle: normalizeText(item.subtitle, 400),
      excerpt: buildExcerpt(item),
      contentHtml,
      category: normalizeText(item.category, 120),
      tags: Array.isArray(item.tags) ? item.tags.map((tag) => normalizeText(tag, 80)).filter(Boolean) : [],
      featuredImage,
      metaTitle: normalizeText(item?.seo?.metaTitle || item.metaTitle, 240),
      metaDescription: normalizeText(item?.seo?.metaDescription || item.metaDescription, 600),
      canonicalUrl: normalizeText(item?.seo?.canonicalUrl || item.canonicalUrl, 1000),
      ogTitle: normalizeText(item?.seo?.ogTitle || item.ogTitle, 240),
      ogDescription: normalizeText(item?.seo?.ogDescription || item.ogDescription, 600),
      ogImage,
      twitterTitle: normalizeText(item.twitterTitle, 240),
      twitterDescription: normalizeText(item.twitterDescription, 600),
      twitterImage,
      noIndex: Boolean(item.noIndex),
      isFeatured: Boolean(item.isFeatured),
      viewCount: Math.max(0, Number(item.viewCount || 0) || 0),
      readingTime: Math.max(1, Number(item.readingTime || 0) || estimateReadingTime(contentHtml)),
      publishedAt: item.publishedAt || null,
      updatedAt: item.updatedAt || null,
      createdAt: item.createdAt || null,
      shareUrl: buildShareUrl(request, item.slug),
    },
    related: related.map(serializeLinkItem),
    previous: prevNext.previous,
    next: prevNext.next,
  });
}

function normalizeImageKey(rawKey) {
  let decoded = "";
  try {
    decoded = decodeURIComponent(String(rawKey || "")).trim();
  } catch {
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
