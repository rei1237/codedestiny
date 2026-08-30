import { connectDb } from "../lib/db.js";
import { Insight } from "../lib/models.js";
import { getRoutePath, handleRouteError, json, methodNotAllowed, notFound } from "../lib/http.js";
import { readCmsThroughCache } from "../lib/cms-cache.js";
import {
  CONTENT_FEED_RSS_KEY,
  CONTENT_FEED_SITEMAP_KEY,
  INSIGHT_PUBLIC_CACHE_TTL_SECONDS,
  INSIGHT_PUBLIC_STALE_TTL_SECONDS,
} from "../lib/insight-public-cache.js";

const CONTENT_PUBLIC_STATUS = "published";
const CONTENT_SCHEDULED_STATUS = "scheduled";
const DEFAULT_SITE_ORIGIN = "https://code-destiny.com";
const FEED_MAX_ITEMS = 60;
const SITEMAP_MAX_ITEMS = 500;
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
  } catch (e) {
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

function escapeXml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function resolveSiteOrigin(env) {
  const raw = String(
    env?.SITE_BASE_URL
    || env?.PUBLIC_SITE_URL
    || env?.NEXT_PUBLIC_SITE_URL
    || env?.AUTH_FRONTEND_BASE_URL
    || DEFAULT_SITE_ORIGIN,
  ).trim().replace(/\/+$/, "");

  try {
    const parsed = new URL(raw);
    if (parsed.protocol === "https:" || parsed.protocol === "http:") return parsed.origin;
  } catch (e) {
    return DEFAULT_SITE_ORIGIN;
  }

  return DEFAULT_SITE_ORIGIN;
}

function toIsoDate(value, fallback = new Date()) {
  const date = value ? new Date(value) : fallback;
  return Number.isNaN(date.getTime()) ? fallback.toISOString() : date.toISOString();
}

function toRssDate(value, fallback = new Date()) {
  const date = value ? new Date(value) : fallback;
  return Number.isNaN(date.getTime()) ? fallback.toUTCString() : date.toUTCString();
}

function buildPublicStatusQuery(now = new Date()) {
  return {
    $or: [
      { status: CONTENT_PUBLIC_STATUS },
      { status: CONTENT_SCHEDULED_STATUS, publishedAt: { $lte: now } },
    ],
  };
}

function buildListQuery(filters) {
  const query = {
    $and: [buildPublicStatusQuery()],
  };

  if (filters.type) {
    if (filters.type === "fortune_insight") {
      query.$and.push({ $or: [{ type: "fortune_insight" }, { type: { $exists: false } }, { type: "" }] });
    } else {
      query.type = filters.type;
    }
  }

  if (filters.category) query.category = filters.category;

  if (filters.keyword) {
    const escaped = filters.keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    query.$and = [
      ...(Array.isArray(query.$and) ? query.$and : []),
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
    ...buildPublicStatusQuery(),
  };

  const item = await Insight.findOneAndUpdate(
    query,
    { $inc: { viewCount: 1 } },
    { returnDocument: "after" },
  ).lean();

  if (!item) return notFound();

  const serialized = toContentItem(item);
  return json({ ok: true, item: serialized });
}

async function listPublicFeedItems(env, isSitemap) {
  // /rss.xml·/sitemap-insights.xml 은 public/_worker.js 가 정적 피드에 병합하려고 매 요청 부른다.
  // 키는 종류별 2개뿐이라 관리자 저장(purgeInsightPublicCache)이 정확히 지운다. 캐시 히트는
  // connectDb 자체를 건너뛴다(핸드셰이크 ~1.3s). 예약 발행 시각은 load 시점 기준이라 최대 TTL 만큼 늦게 실린다.
  const { value } = await readCmsThroughCache({
    key: isSitemap ? CONTENT_FEED_SITEMAP_KEY : CONTENT_FEED_RSS_KEY,
    ttlSeconds: INSIGHT_PUBLIC_CACHE_TTL_SECONDS,
    staleTtlSeconds: INSIGHT_PUBLIC_STALE_TTL_SECONDS,
    load: async () => {
      await connectDb(env);
      const items = await Insight.find(buildPublicStatusQuery())
        .sort({ publishedAt: -1, updatedAt: -1, createdAt: -1 })
        .limit(isSitemap ? SITEMAP_MAX_ITEMS : FEED_MAX_ITEMS)
        .lean();
      return items
        .map((item) => toContentItem(item))
        .filter((item) => item.slug && item.title);
    },
  });
  return value;
}

function xmlResponse(xml, status = 200) {
  return new Response(xml, {
    status,
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=300, stale-while-revalidate=86400",
    },
  });
}

function buildContentSitemapXml(items, env) {
  const origin = resolveSiteOrigin(env);
  const urls = items.map((item) => {
    const loc = `${origin}/insights/${encodeURIComponent(item.slug)}/`;
    const lastmod = toIsoDate(item.updatedAt || item.publishedAt || item.createdAt);
    return [
      "  <url>",
      `    <loc>${escapeXml(loc)}</loc>`,
      `    <lastmod>${escapeXml(lastmod)}</lastmod>`,
      "    <changefreq>monthly</changefreq>",
      "    <priority>0.74</priority>",
      "  </url>",
    ].join("\n");
  });

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls,
    "</urlset>",
    "",
  ].join("\n");
}

function buildContentRssXml(items, env, requestPath = "/rss.xml") {
  const origin = resolveSiteOrigin(env);
  const feedUrl = `${origin}${requestPath === "/insights/rss.xml" ? "/insights/rss.xml" : "/rss.xml"}`;
  const now = new Date();
  const rssItems = items.slice(0, FEED_MAX_ITEMS).map((item) => {
    // 🔴 후행 슬래시 필수 — 이 항목들은 public/_worker.js 가 정적 rss.xml 에 병합하므로,
    // 형태가 다르면 라이브 피드 안에서 리다이렉트되는 URL 과 아닌 URL 이 섞인다.
    const link = `${origin}/insights/${encodeURIComponent(item.slug)}/`;
    return [
      "    <item>",
      `      <title>${escapeXml(item.title || "Untitled")}</title>`,
      `      <link>${escapeXml(link)}</link>`,
      `      <guid isPermaLink="true">${escapeXml(link)}</guid>`,
      `      <description>${escapeXml(item.summary || item.seo?.metaDescription || "")}</description>`,
      `      <category>${escapeXml(item.category || "Insights")}</category>`,
      `      <pubDate>${escapeXml(toRssDate(item.publishedAt || item.updatedAt || item.createdAt, now))}</pubDate>`,
      "    </item>",
    ].join("\n");
  });

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
    "  <channel>",
    "    <title>Code Destiny Insights RSS</title>",
    `    <link>${escapeXml(`${origin}/insights`)}</link>`,
    "    <description>Code Destiny insights</description>",
    "    <language>ko</language>",
    `    <lastBuildDate>${escapeXml(now.toUTCString())}</lastBuildDate>`,
    `    <atom:link href="${escapeXml(feedUrl)}" rel="self" type="application/rss+xml" />`,
    ...rssItems,
    "  </channel>",
    "</rss>",
    "",
  ].join("\n");
}

async function handleContentFeed(path, request, env) {
  const method = request.method.toUpperCase();
  if (method !== "GET" && method !== "HEAD") return methodNotAllowed();

  const normalizedPath = path.replace(/\/+/g, "/");
  const isSitemap = normalizedPath === "/sitemap-insights.xml" || normalizedPath === "/sitemap.xml";
  const isRootRss = normalizedPath === "/rss.xml";
  const isInsightsRss = normalizedPath === "/insights/rss.xml";
  if (!isSitemap && !isRootRss && !isInsightsRss) return notFound();

  const items = await listPublicFeedItems(env, isSitemap);
  const xml = isSitemap
    ? buildContentSitemapXml(items, env)
    : buildContentRssXml(items, env, isInsightsRss ? "/insights/rss.xml" : "/rss.xml");

  if (method === "HEAD") {
    const response = xmlResponse("");
    return new Response(null, { status: response.status, headers: response.headers });
  }

  return xmlResponse(xml);
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

export async function handleContentFeedRoutes(request, env) {
  try {
    const path = getRoutePath(request, "/api/content-feed");
    return handleContentFeed(path, request, env);
  } catch (error) {
    return handleRouteError(error);
  }
}
