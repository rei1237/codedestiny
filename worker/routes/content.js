import { connectDb } from "../lib/db.js";
import { Insight } from "../lib/models.js";
import { getRoutePath, handleRouteError, json, methodNotAllowed, notFound } from "../lib/http.js";

const CONTENT_PUBLIC_STATUS = "published";
const CONTENT_TYPE_SET = new Set([
  "fortune_insight",
  "saju",
  "tarot",
  "astrology",
  "jamidusu",
  "sookyo",
  "vedic",
  "palmistry",
  "physiognomy",
  "notice",
  "landing",
  "seo_page",
  "general",
]);

function normalizeText(value, maxLen = 3000) {
  return String(value || "").trim().slice(0, maxLen);
}

function normalizeType(value) {
  const type = String(value || "").trim().toLowerCase();
  return CONTENT_TYPE_SET.has(type) ? type : "";
}

function sanitizeHttpUrl(value, maxLen = 2000) {
  const url = normalizeText(value, maxLen);
  if (!url) return "";
  if (url.startsWith("/")) return url;

  try {
    const parsed = new URL(url);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") return parsed.toString();
  } catch {
    return "";
  }

  return "";
}

function sanitizeSlug(rawSlug) {
  const slug = String(rawSlug || "").trim().toLowerCase();
  if (!slug || slug.length > 240) return "";
  if (!/^[a-z0-9-]+$/.test(slug)) return "";
  return slug;
}

function parsePositiveInt(value, fallback, min, max) {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.max(min, Math.min(max, Math.floor(num)));
}

function parseListQuery(request) {
  const url = new URL(request.url);
  const params = url.searchParams;

  const type = normalizeType(params.get("type"));
  const category = normalizeText(params.get("category"), 120);
  const keyword = normalizeText(params.get("keyword") || params.get("q"), 120);
  const sort = normalizeText(params.get("sort"), 24).toLowerCase();
  const page = parsePositiveInt(params.get("page"), 1, 1, 100000);
  const limit = parsePositiveInt(params.get("limit") || params.get("pageSize"), 20, 1, 100);

  return {
    type,
    category,
    keyword,
    sort,
    page,
    limit,
  };
}

function resolveSort(sort) {
  if (sort === "updated") return { updatedAt: -1, createdAt: -1 };
  if (sort === "views") return { viewCount: -1, updatedAt: -1 };
  if (sort === "title") return { title: 1, updatedAt: -1 };
  return { publishedAt: -1, updatedAt: -1, createdAt: -1 };
}

function buildListQuery(filters) {
  const query = {
    status: CONTENT_PUBLIC_STATUS,
  };

  if (filters.type) {
    if (filters.type === "fortune_insight") {
      query.$or = [{ type: "fortune_insight" }, { type: { $exists: false } }, { type: "" }];
    } else {
      query.type = filters.type;
    }
  }

  if (filters.category) query.category = filters.category;

  if (filters.keyword) {
    const escaped = filters.keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    query.$and = [
      {
        $or: [
          { title: { $regex: escaped, $options: "i" } },
          { summary: { $regex: escaped, $options: "i" } },
          { excerpt: { $regex: escaped, $options: "i" } },
          { slug: { $regex: escaped, $options: "i" } },
          { category: { $regex: escaped, $options: "i" } },
          { tags: { $elemMatch: { $regex: escaped, $options: "i" } } },
        ],
      },
    ];
  }

  return query;
}

function toContentItem(item) {
  const summary = normalizeText(item?.summary || item?.excerpt, 2000);
  const thumbnailUrl = sanitizeHttpUrl(item?.thumbnailUrl || item?.featuredImage?.url, 1000);
  const contentFormat = normalizeText(item?.contentFormat || "html", 16).toLowerCase() || "html";

  return {
    id: String(item?._id || ""),
    type: normalizeType(item?.type) || "fortune_insight",
    title: normalizeText(item?.title, 240),
    slug: normalizeText(item?.slug, 240),
    summary,
    content: String(item?.content || item?.contentHtml || ""),
    contentFormat,
    contentHtml: String(item?.contentHtml || ""),
    thumbnailUrl,
    category: normalizeText(item?.category, 120),
    tags: Array.isArray(item?.tags) ? item.tags.map((value) => normalizeText(value, 80)).filter(Boolean) : [],
    status: String(item?.status || CONTENT_PUBLIC_STATUS),
    seo: {
      metaTitle: normalizeText(item?.seo?.metaTitle || item?.metaTitle, 240),
      metaDescription: normalizeText(item?.seo?.metaDescription || item?.metaDescription, 600),
      ogTitle: normalizeText(item?.seo?.ogTitle || item?.ogTitle, 240),
      ogDescription: normalizeText(item?.seo?.ogDescription || item?.ogDescription, 600),
      ogImage: sanitizeHttpUrl(item?.seo?.ogImage || item?.ogImage, 1000),
      canonicalUrl: sanitizeHttpUrl(item?.seo?.canonicalUrl || item?.canonicalUrl, 1000),
    },
    authorId: normalizeText(item?.authorId, 120),
    authorName: normalizeText(item?.authorName || item?.author, 120),
    publishedAt: item?.publishedAt || null,
    updatedAt: item?.updatedAt || null,
    createdAt: item?.createdAt || null,
    viewCount: Math.max(0, Number(item?.viewCount || 0) || 0),
    readingTime: Math.max(0, Number(item?.readingTime || 0) || 0),
    featuredImage: {
      url: thumbnailUrl,
      alt: normalizeText(item?.featuredImage?.alt, 300),
      width: Math.max(0, Number(item?.featuredImage?.width || 0) || 0),
      height: Math.max(0, Number(item?.featuredImage?.height || 0) || 0),
    },
  };
}

async function handleContentList(request, env) {
  await connectDb(env);

  const filters = parseListQuery(request);
  const query = buildListQuery(filters);
  const sortSpec = resolveSort(filters.sort);

  const [items, total] = await Promise.all([
    Insight.find(query)
      .sort(sortSpec)
      .skip((filters.page - 1) * filters.limit)
      .limit(filters.limit)
      .lean(),
    Insight.countDocuments(query),
  ]);

  return json({
    ok: true,
    items: items.map((item) => toContentItem(item)),
    pagination: {
      page: filters.page,
      limit: filters.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / filters.limit)),
    },
  });
}

async function handleContentDetail(path, request, env) {
  await connectDb(env);

  const slug = sanitizeSlug(path.replace(/^\/+/, ""));
  if (!slug) return notFound();

  const query = {
    slug,
    status: CONTENT_PUBLIC_STATUS,
  };

  const item = await Insight.findOneAndUpdate(
    query,
    { $inc: { viewCount: 1 } },
    { new: true },
  ).lean();

  if (!item) return notFound();

  const serialized = toContentItem(item);
  return json({ ok: true, item: serialized });
}

export async function handleContentRoutes(request, env) {
  try {
    const method = request.method.toUpperCase();
    const path = getRoutePath(request, "/api/content");

    if (method === "GET" && (path === "/" || path === "")) {
      return handleContentList(request, env);
    }

    if (method === "GET" && /^\/[^/]+$/.test(path)) {
      return handleContentDetail(path, request, env);
    }

    if (["GET", "POST", "PATCH", "PUT", "DELETE"].includes(method)) return notFound();
    return methodNotAllowed();
  } catch (error) {
    if (Number(error?.status || 0) === 400) {
      return json({
        ok: false,
        code: "VALIDATION_ERROR",
        message: String(error?.message || "Invalid request."),
      }, { status: 400 });
    }

    return handleRouteError(error);
  }
}
