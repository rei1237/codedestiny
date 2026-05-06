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

  const query = { status: "published" };
  if (category) query.category = category;
  if (tag) query.tags = { $in: [tag] };
  if (excludeNoIndex) query.noIndex = { $ne: true };
  if (featuredOnly) query.isFeatured = true;

  if (q) {
    const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    query.$or = [
      { title: { $regex: escaped, $options: "i" } },
      { subtitle: { $regex: escaped, $options: "i" } },
      { excerpt: { $regex: escaped, $options: "i" } },
      { category: { $regex: escaped, $options: "i" } },
      { tags: { $elemMatch: { $regex: escaped, $options: "i" } } },
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
  return {
    _id: String(item?._id || ""),
    slug: normalizeText(item?.slug, 240),
    title: normalizeText(item?.title, 240),
    subtitle: normalizeText(item?.subtitle, 400),
    excerpt: buildExcerpt(item),
    category: normalizeText(item?.category, 120),
    tags: Array.isArray(item?.tags) ? item.tags.map((tag) => normalizeText(tag, 80)).filter(Boolean) : [],
    featuredImage: {
      url: normalizeText(item?.featuredImage?.url, 1000),
      alt: normalizeText(item?.featuredImage?.alt, 300),
      width: Math.max(0, Number(item?.featuredImage?.width || 0) || 0),
      height: Math.max(0, Number(item?.featuredImage?.height || 0) || 0),
    },
    canonicalUrl: normalizeText(item?.canonicalUrl, 1000),
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
      .select("slug title subtitle excerpt category tags featuredImage canonicalUrl isFeatured noIndex viewCount readingTime publishedAt updatedAt createdAt")
      .lean(),
    Insight.countDocuments(query),
    Insight.find({ status: "published", isFeatured: true })
      .sort({ publishedAt: -1, updatedAt: -1 })
      .limit(6)
      .select("slug title subtitle excerpt category tags featuredImage canonicalUrl isFeatured noIndex viewCount readingTime publishedAt updatedAt createdAt")
      .lean(),
    Insight.distinct("category", { status: "published", category: { $ne: "" } }),
    Insight.distinct("tags", { status: "published" }),
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
  return {
    slug: normalizeText(item?.slug, 240),
    title: normalizeText(item?.title, 240),
    category: normalizeText(item?.category, 120),
    publishedAt: item?.publishedAt || null,
    featuredImage: {
      url: normalizeText(item?.featuredImage?.url, 1000),
      alt: normalizeText(item?.featuredImage?.alt, 300),
      width: Math.max(0, Number(item?.featuredImage?.width || 0) || 0),
      height: Math.max(0, Number(item?.featuredImage?.height || 0) || 0),
    },
  };
}

async function findPrevNextInsight(currentId) {
  const ordered = await Insight.find({ status: "published" })
    .sort({ publishedAt: -1, updatedAt: -1, createdAt: -1 })
    .select("_id slug title category publishedAt featuredImage")
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
    { status: "published", slug },
    { $inc: { viewCount: 1 } },
    { new: true },
  ).lean();

  if (!item) return notFound();

  const [related, prevNext] = await Promise.all([
    Insight.find({
      status: "published",
      _id: { $ne: item._id },
      $or: [
        item.category ? { category: item.category } : null,
        Array.isArray(item.tags) && item.tags.length > 0 ? { tags: { $in: item.tags.slice(0, 8) } } : null,
      ].filter(Boolean),
    })
      .sort({ publishedAt: -1, viewCount: -1, updatedAt: -1 })
      .limit(6)
      .select("slug title category publishedAt featuredImage")
      .lean(),
    findPrevNextInsight(item._id),
  ]);

  const contentHtml = sanitizeInsightHtml(item.contentHtml || "");

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
