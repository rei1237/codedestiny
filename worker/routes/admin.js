import { getEnv } from "../lib/env.js";
import { buildRuntimeKeyMatrix } from "../lib/key-health.js";
import { connectDb } from "../lib/db.js";
import { requireAuth } from "../lib/auth.js";
import { callGeminiText } from "../lib/gemini.js";
import { Insight, PointHistory } from "../lib/models.js";
import {
  FEATURE_KEY_PRICE_TABLE,
  FRONTEND_PAID_FEATURE_KEYS,
  PIG_COIN_UNLOCK_PRODUCTS,
  listLegacyUnlockBaselineMismatches,
  listServerPricedFeatureKeys,
} from "../lib/paid-feature-registry.js";
import { createHttpError, getRoutePath, handleRouteError, json, methodNotAllowed, notFound, readJson } from "../lib/http.js";

const ADMIN_ENTRY_PASSWORD_SHA256_LIST = [
  // current admin entry password: kangta!7989
  "f76a173ef47f93eec43168e10fc32dcbefb2d32200c44cbd33e4f0324437fb4e",
];

const FLOWER_TOKEN_TTL_SEC = 8 * 60 * 60;
const INSIGHT_STATUS_SET = new Set(["draft", "scheduled", "published", "archived", "private", "trash"]);
const CONTENT_STATUS_SET = new Set(["draft", "scheduled", "published", "archived", "private", "trash"]);
const CONTENT_PUBLIC_STATUS = "published";
const CONTENT_FORMAT_SET = new Set(["html", "markdown", "blocks"]);
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
const INSIGHT_ALLOWED_HTML_TAGS = new Set([
  "h1",
  "h2",
  "h3",
  "p",
  "strong",
  "b",
  "em",
  "i",
  "ul",
  "ol",
  "li",
  "blockquote",
  "hr",
  "a",
  "img",
  "br",
]);
const INSIGHT_ALLOWED_UPLOAD_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);
const INSIGHT_MAX_IMAGE_BYTES = 6 * 1024 * 1024;

function timingSafeEqualText(a, b) {
  const lhs = String(a || "");
  const rhs = String(b || "");
  if (lhs.length !== rhs.length) return false;

  let diff = 0;
  for (let index = 0; index < lhs.length; index += 1) {
    diff |= lhs.charCodeAt(index) ^ rhs.charCodeAt(index);
  }
  return diff === 0;
}

function base64urlEncode(text) {
  return btoa(text)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function bytesToHex(bytes) {
  return Array.from(bytes)
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");
}

function normalizeText(value, maxLen = 5000) {
  return String(value || "").trim().slice(0, maxLen);
}

function firstRuntimeValue(env, keys = []) {
  for (const key of keys) {
    const value = String(env?.[key] || "").trim();
    if (value) return value;
  }
  return "";
}

function normalizeStringArray(values, maxItemLen = 120, maxItems = 50) {
  if (!Array.isArray(values)) return [];

  const out = [];
  const seen = new Set();
  for (let i = 0; i < values.length; i += 1) {
    if (out.length >= maxItems) break;
    const value = normalizeText(values[i], maxItemLen);
    if (!value) continue;
    const key = value.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(value);
  }
  return out;
}

function slugify(value) {
  const normalized = String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");

  return normalized;
}

function normalizeType(value, fallback = "general") {
  const type = String(value || fallback).trim().toLowerCase();
  return CONTENT_TYPE_SET.has(type) ? type : fallback;
}

function normalizeContentFormat(value, fallback = "html") {
  const contentFormat = String(value || fallback).trim().toLowerCase();
  return CONTENT_FORMAT_SET.has(contentFormat) ? contentFormat : fallback;
}

function sanitizeHttpUrl(value, maxLen = 2000) {
  const url = normalizeText(value, maxLen);
  if (!url) return "";
  if (url.startsWith("/")) return url;

  try {
    const parsed = new URL(url);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      return parsed.toString();
    }
  } catch (e) {
    return "";
  }

  return "";
}

function normalizeContentStatus(value, fallback = "draft") {
  const status = String(value || fallback).trim().toLowerCase();
  return CONTENT_STATUS_SET.has(status) ? status : fallback;
}

function ensureStatus(value, fallback = "draft") {
  const status = String(value || fallback).trim().toLowerCase();
  return INSIGHT_STATUS_SET.has(status) ? status : fallback;
}

function isObjectLike(value) {
  return value && typeof value === "object" && !Array.isArray(value);
}

function buildFeaturedImage(value) {
  const source = isObjectLike(value) ? value : {};
  return {
    url: normalizeText(source.url, 1000),
    alt: normalizeText(source.alt, 300),
    width: Math.max(0, Number(source.width || 0) || 0),
    height: Math.max(0, Number(source.height || 0) || 0),
  };
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
    if (!INSIGHT_ALLOWED_HTML_TAGS.has(tagName)) return "";

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

function normalizeSeoInput(body = {}) {
  const seoBody = isObjectLike(body?.seo) ? body.seo : {};
  const metaTitle = normalizeText(seoBody.metaTitle ?? body.metaTitle, 240);
  const metaDescription = normalizeText(seoBody.metaDescription ?? body.metaDescription, 600);
  const ogTitle = normalizeText(seoBody.ogTitle ?? body.ogTitle, 240);
  const ogDescription = normalizeText(seoBody.ogDescription ?? body.ogDescription, 600);
  const ogImage = sanitizeHttpUrl(seoBody.ogImage ?? body.ogImage, 1000);
  const canonicalUrl = sanitizeHttpUrl(seoBody.canonicalUrl ?? body.canonicalUrl, 1000);

  return {
    metaTitle,
    metaDescription,
    ogTitle,
    ogDescription,
    ogImage,
    canonicalUrl,
  };
}

function parseContentPublishedAt(value, status, existingPublishedAt = null) {
  if (value === null) return null;
  if (value !== undefined) {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  if (status === "published") {
    if (existingPublishedAt) return existingPublishedAt;
    return new Date();
  }
  if (status === "scheduled") return existingPublishedAt || null;
  return null;
}

function toContentItem(item) {
  const contentFormat = normalizeContentFormat(item?.contentFormat, "html");
  const contentHtml = sanitizeInsightHtml(
    String(item?.contentHtml || (contentFormat === "html" ? item?.content : "") || ""),
  );
  const thumbnailUrl = sanitizeHttpUrl(item?.thumbnailUrl || item?.featuredImage?.url, 1000);
  const seo = {
    metaTitle: normalizeText(item?.seo?.metaTitle || item?.metaTitle, 240),
    metaDescription: normalizeText(item?.seo?.metaDescription || item?.metaDescription, 600),
    ogTitle: normalizeText(item?.seo?.ogTitle || item?.ogTitle, 240),
    ogDescription: normalizeText(item?.seo?.ogDescription || item?.ogDescription, 600),
    ogImage: sanitizeHttpUrl(item?.seo?.ogImage || item?.ogImage, 1000),
    canonicalUrl: sanitizeHttpUrl(item?.seo?.canonicalUrl || item?.canonicalUrl, 1000),
  };
  const status = normalizeContentStatus(item?.status, "draft");

  return {
    id: String(item?._id || ""),
    _id: String(item?._id || ""),
    type: normalizeType(item?.type, "fortune_insight"),
    title: normalizeText(item?.title, 240),
    slug: normalizeText(item?.slug, 240),
    summary: normalizeText(item?.summary || item?.excerpt, 2000),
    excerpt: normalizeText(item?.excerpt || item?.summary, 2000),
    content: String(item?.content || contentHtml || ""),
    contentFormat,
    contentHtml,
    contentJson: isObjectLike(item?.contentJson) ? item.contentJson : {},
    revision: Math.max(1, Number(item?.revision || 1) || 1),
    revisionHistory: Array.isArray(item?.revisionHistory) ? item.revisionHistory.slice(-20) : [],
    thumbnailUrl,
    featuredImage: {
      url: thumbnailUrl,
      alt: normalizeText(item?.featuredImage?.alt, 300),
      width: Math.max(0, Number(item?.featuredImage?.width || 0) || 0),
      height: Math.max(0, Number(item?.featuredImage?.height || 0) || 0),
    },
    category: normalizeText(item?.category, 120),
    tags: normalizeStringArray(item?.tags, 60, 80),
    status,
    seo,
    authorId: normalizeText(item?.authorId, 120),
    authorName: normalizeText(item?.authorName || item?.author, 120),
    publishedAt: item?.publishedAt || null,
    createdAt: item?.createdAt || null,
    updatedAt: item?.updatedAt || null,
    isPublished: status === CONTENT_PUBLIC_STATUS,
    isFeatured: Boolean(item?.isFeatured),
    noIndex: Boolean(item?.noIndex),
    viewCount: Math.max(0, Number(item?.viewCount || 0) || 0),
    readingTime: Math.max(0, Number(item?.readingTime || 0) || 0),
    keywords: normalizeStringArray(item?.keywords, 80, 80),
    metaTitle: seo.metaTitle,
    metaDescription: seo.metaDescription,
    canonicalUrl: seo.canonicalUrl,
    ogTitle: seo.ogTitle,
    ogDescription: seo.ogDescription,
    ogImage: seo.ogImage,
    twitterTitle: normalizeText(item?.twitterTitle, 240),
    twitterDescription: normalizeText(item?.twitterDescription, 600),
    twitterImage: sanitizeHttpUrl(item?.twitterImage, 1000),
  };
}

function normalizeContentPayload(body = {}, mode = "create", existing = null) {
  if (!isObjectLike(body)) {
    throw createHttpError(400, "Request body must be an object.", { code: "VALIDATION_ERROR" });
  }

  const title = normalizeText(body.title, 240);
  const providedSlugRaw = normalizeText(body.slug, 240);
  const slug = slugify(providedSlugRaw);
  if (body.slug !== undefined && providedSlugRaw && !slug) {
    throw createHttpError(400, "slug format is invalid.", { code: "VALIDATION_ERROR" });
  }

  const type = normalizeType(body.type, existing?.type || "general");
  const status = normalizeContentStatus(body.status, existing?.status || (mode === "create" ? "draft" : "draft"));
  const contentFormat = normalizeContentFormat(
    body.contentFormat,
    existing?.contentFormat || (isObjectLike(body.contentJson) ? "blocks" : "html"),
  );

  if (mode === "create" && !title) {
    throw createHttpError(400, "title is required.", { code: "VALIDATION_ERROR" });
  }

  const contentHtmlInput = body.contentHtml !== undefined
    ? body.contentHtml
    : (contentFormat === "html" ? body.content : existing?.contentHtml || "");

  const seo = normalizeSeoInput(body);
  const nextSummary = normalizeText(body.summary ?? body.excerpt, 2000);
  const thumbnailUrl = sanitizeHttpUrl(
    body.thumbnailUrl ?? body.featuredImage?.url ?? existing?.thumbnailUrl,
    1000,
  );

  const featuredImage = buildFeaturedImage({
    ...(isObjectLike(existing?.featuredImage) ? existing.featuredImage : {}),
    ...(isObjectLike(body.featuredImage) ? body.featuredImage : {}),
    url: thumbnailUrl,
  });

  const nextPublishedAt = parseContentPublishedAt(
    body.publishedAt,
    status,
    existing?.publishedAt || null,
  );
  if (status === "scheduled" && !nextPublishedAt) {
    throw createHttpError(400, "scheduled publish time is required.", { code: "SCHEDULED_AT_REQUIRED" });
  }

  const payload = {
    type,
    title,
    summary: nextSummary,
    subtitle: normalizeText(body.subtitle ?? existing?.subtitle, 240),
    slug,
    excerpt: nextSummary,
    content: String(body.content ?? existing?.content ?? ""),
    contentFormat,
    contentHtml: sanitizeInsightHtml(contentHtmlInput),
    contentJson: isObjectLike(body.contentJson) ? body.contentJson : (existing?.contentJson || {}),
    thumbnailUrl,
    featuredImage,
    category: normalizeText(body.category ?? existing?.category, 120),
    tags: normalizeStringArray(body.tags ?? existing?.tags, 60, 40),
    seo,
    metaTitle: seo.metaTitle,
    metaDescription: seo.metaDescription,
    canonicalUrl: seo.canonicalUrl,
    ogTitle: seo.ogTitle,
    ogDescription: seo.ogDescription,
    ogImage: seo.ogImage,
    twitterTitle: normalizeText(body.twitterTitle ?? existing?.twitterTitle, 240),
    twitterDescription: normalizeText(body.twitterDescription ?? existing?.twitterDescription, 600),
    twitterImage: sanitizeHttpUrl(body.twitterImage ?? existing?.twitterImage, 1000),
    keywords: normalizeStringArray(body.keywords ?? existing?.keywords, 80, 50),
    authorId: normalizeText(body.authorId ?? existing?.authorId, 120),
    authorName: normalizeText(body.authorName ?? body.author ?? existing?.authorName ?? existing?.author, 120),
    author: normalizeText(body.author ?? body.authorName ?? existing?.author ?? existing?.authorName, 120),
    status,
    isPublished: status === CONTENT_PUBLIC_STATUS,
    isFeatured: body.isFeatured !== undefined ? Boolean(body.isFeatured) : Boolean(existing?.isFeatured),
    noIndex: body.noIndex !== undefined ? Boolean(body.noIndex) : Boolean(existing?.noIndex),
    viewCount: Math.max(0, Number(body.viewCount ?? existing?.viewCount ?? 0) || 0),
    readingTime: Math.max(0, Number(body.readingTime ?? existing?.readingTime ?? 0) || 0),
    publishedAt: nextPublishedAt,
  };

  if (mode === "update") {
    Object.keys(payload).forEach((key) => {
      if (body[key] === undefined && key !== "isPublished" && key !== "publishedAt") {
        delete payload[key];
      }
    });

    if (body.slug === undefined) delete payload.slug;
    if (body.status === undefined && body.publishedAt === undefined) {
      delete payload.isPublished;
      delete payload.publishedAt;
    }
  }

  return {
    payload,
    title,
    providedSlug: providedSlugRaw,
  };
}

function logAdminContent(event, details = {}) {
  const payload = {
    scope: "admin-content",
    event,
    timestamp: new Date().toISOString(),
    ...details,
  };

  try {
    console.log("[admin-content]", JSON.stringify(payload));
  } catch (e) {
    console.log("[admin-content]", payload);
  }
}

function normalizeInsightPayload(body = {}, mode = "create") {
  const title = normalizeText(body.title, 240);
  const providedSlug = normalizeText(body.slug, 240);
  const status = ensureStatus(body.status, mode === "create" ? "draft" : "draft");

  if (mode === "create" && !title) {
    throw createHttpError(400, "title is required.", { code: "VALIDATION_ERROR" });
  }

  const payload = {
    title,
    subtitle: normalizeText(body.subtitle, 240),
    slug: slugify(providedSlug),
    excerpt: normalizeText(body.excerpt, 2000),
    contentHtml: sanitizeInsightHtml(body.contentHtml),
    contentJson: isObjectLike(body.contentJson) ? body.contentJson : {},
    featuredImage: buildFeaturedImage(body.featuredImage),
    category: normalizeText(body.category, 120),
    tags: normalizeStringArray(body.tags, 60, 40),
    metaTitle: normalizeText(body.metaTitle, 240),
    metaDescription: normalizeText(body.metaDescription, 600),
    keywords: normalizeStringArray(body.keywords, 80, 50),
    canonicalUrl: normalizeText(body.canonicalUrl, 1000),
    ogTitle: normalizeText(body.ogTitle, 240),
    ogDescription: normalizeText(body.ogDescription, 600),
    ogImage: normalizeText(body.ogImage, 1000),
    twitterTitle: normalizeText(body.twitterTitle, 240),
    twitterDescription: normalizeText(body.twitterDescription, 600),
    twitterImage: normalizeText(body.twitterImage, 1000),
    author: normalizeText(body.author, 120),
    status,
    isPublished: typeof body.isPublished === "boolean" ? body.isPublished : status === "published",
    isFeatured: Boolean(body.isFeatured),
    noIndex: Boolean(body.noIndex),
    viewCount: Math.max(0, Number(body.viewCount || 0) || 0),
    readingTime: Math.max(0, Number(body.readingTime || 0) || 0),
    publishedAt: body.publishedAt ? new Date(body.publishedAt) : (status === "published" ? new Date() : null),
  };

  if (payload.publishedAt && Number.isNaN(payload.publishedAt.getTime())) {
    payload.publishedAt = null;
  }

  if (mode === "update") {
    Object.keys(payload).forEach((key) => {
      if (body[key] === undefined && !["slug", "isPublished", "publishedAt", "status"].includes(key)) {
        delete payload[key];
      }
    });

    if (body.slug === undefined) delete payload.slug;
    if (body.isPublished === undefined && body.status === undefined) delete payload.isPublished;
    if (body.publishedAt === undefined && body.status === undefined) delete payload.publishedAt;
    if (body.status === undefined) delete payload.status;
  }

  return { payload, title, providedSlug };
}

function buildContentRevisionSnapshot(item, adminContext, reason = "manual_save") {
  const revision = Math.max(1, Number(item?.revision || 1) || 1);
  return {
    id: `rev_${Date.now().toString(36)}_${revision}`,
    revision,
    reason,
    savedAt: new Date(),
    savedBy: String(adminContext?.userId || "admin"),
    title: String(item?.title || ""),
    slug: String(item?.slug || ""),
    summary: String(item?.summary || ""),
    subtitle: String(item?.subtitle || ""),
    excerpt: String(item?.excerpt || ""),
    content: String(item?.content || ""),
    contentFormat: String(item?.contentFormat || "html"),
    contentHtml: String(item?.contentHtml || ""),
    contentJson: isObjectLike(item?.contentJson) ? item.contentJson : {},
    category: String(item?.category || ""),
    tags: Array.isArray(item?.tags) ? item.tags.slice(0, 80) : [],
    status: String(item?.status || "draft"),
    seo: isObjectLike(item?.seo) ? item.seo : {},
    metaTitle: String(item?.metaTitle || ""),
    metaDescription: String(item?.metaDescription || ""),
    keywords: Array.isArray(item?.keywords) ? item.keywords.slice(0, 80) : [],
    canonicalUrl: String(item?.canonicalUrl || ""),
    ogTitle: String(item?.ogTitle || ""),
    ogDescription: String(item?.ogDescription || ""),
    ogImage: String(item?.ogImage || ""),
    twitterTitle: String(item?.twitterTitle || ""),
    twitterDescription: String(item?.twitterDescription || ""),
    twitterImage: String(item?.twitterImage || ""),
    featuredImage: isObjectLike(item?.featuredImage) ? item.featuredImage : {},
    thumbnailUrl: String(item?.thumbnailUrl || ""),
    isFeatured: Boolean(item?.isFeatured),
    noIndex: Boolean(item?.noIndex),
    publishedAt: item?.publishedAt || null,
  };
}

async function findDuplicateSlug(slug, excludeId = "") {
  const query = { slug };
  if (excludeId) query._id = { $ne: excludeId };
  return Insight.findOne(query).select("_id slug").lean();
}

async function buildUniqueSlug(baseInput, excludeId = "") {
  const base = slugify(baseInput) || `insight-${Date.now()}`;
  let candidate = base;
  let seq = 2;

  while (await findDuplicateSlug(candidate, excludeId)) {
    candidate = `${base}-${seq}`;
    seq += 1;
    if (seq > 500) {
      candidate = `${base}-${Date.now()}`;
      break;
    }
  }

  return candidate;
}

function parseInsightId(path) {
  const matched = path.match(/^\/insights\/([a-f0-9]{24})$/i);
  return matched ? matched[1] : "";
}

function normalizeUploadFileName(rawName) {
  const noExt = String(rawName || "image")
    .replace(/\.[^.]+$/, "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

  return noExt || "image";
}

function inferImageMimeFromMagic(bytes) {
  if (!bytes || bytes.length < 12) return "";

  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }

  if (
    bytes[0] === 0x89
    && bytes[1] === 0x50
    && bytes[2] === 0x4e
    && bytes[3] === 0x47
    && bytes[4] === 0x0d
    && bytes[5] === 0x0a
    && bytes[6] === 0x1a
    && bytes[7] === 0x0a
  ) {
    return "image/png";
  }

  if (
    bytes[0] === 0x52
    && bytes[1] === 0x49
    && bytes[2] === 0x46
    && bytes[3] === 0x46
    && bytes[8] === 0x57
    && bytes[9] === 0x45
    && bytes[10] === 0x42
    && bytes[11] === 0x50
  ) {
    return "image/webp";
  }

  return "";
}

function extensionFromMime(mimeType) {
  if (mimeType === "image/jpeg") return "jpg";
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/webp") return "webp";
  return "";
}

function randomHex(length = 10) {
  const bytes = new Uint8Array(Math.max(4, Math.ceil(length / 2)));
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((value) => value.toString(16).padStart(2, "0")).join("").slice(0, length);
}

function buildUploadImageKey(fileName, mimeType, usage) {
  const now = new Date();
  const yyyy = String(now.getUTCFullYear());
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  const ext = extensionFromMime(mimeType) || "jpg";
  const safeName = normalizeUploadFileName(fileName);
  const usageDir = usage === "featured" ? "featured" : "body";
  return `insights/${usageDir}/${yyyy}/${mm}/${Date.now()}-${randomHex(8)}-${safeName}.${ext}`;
}

function encodePathSegments(path) {
  return String(path || "")
    .split("/")
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

function buildUploadedImageUrl(request, env, key) {
  const explicitBase = String(env?.INSIGHT_IMAGE_PUBLIC_BASE_URL || "").trim().replace(/\/+$/, "");
  const encodedPath = encodePathSegments(key);

  if (explicitBase) return `${explicitBase}/${encodedPath}`;

  const origin = new URL(request.url).origin;
  return `${origin}/api/insights/images/${encodedPath}`;
}

function normalizeUploadDimension(rawValue) {
  return Math.max(0, Math.min(8192, Number(rawValue || 0) || 0));
}

async function handleInsightsUploadImage(request, env) {
  await authorizeAdminRequest(request, env);

  const contentType = String(request.headers.get("content-type") || "").toLowerCase();
  if (!contentType.includes("multipart/form-data")) {
    throw createHttpError(400, "Image upload must use multipart/form-data.", { code: "INVALID_UPLOAD_CONTENT_TYPE" });
  }

  const bucket = env?.INSIGHT_IMAGES_BUCKET;
  if (!bucket || typeof bucket.put !== "function") {
    throw createHttpError(503, "Image storage is not configured.", {
      code: "IMAGE_STORAGE_NOT_CONFIGURED",
      requiredBindings: ["INSIGHT_IMAGES_BUCKET"],
      optionalVars: ["INSIGHT_IMAGE_PUBLIC_BASE_URL"],
    });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  if (!file || typeof file.arrayBuffer !== "function") {
    throw createHttpError(400, "file is required.", { code: "UPLOAD_FILE_REQUIRED" });
  }

  const rawSize = Number(file.size || 0) || 0;
  if (rawSize <= 0) {
    throw createHttpError(400, "empty file is not allowed.", { code: "UPLOAD_FILE_EMPTY" });
  }
  if (rawSize > INSIGHT_MAX_IMAGE_BYTES) {
    throw createHttpError(413, "file too large. max 6MB.", { code: "UPLOAD_FILE_TOO_LARGE" });
  }

  const fileBytes = new Uint8Array(await file.arrayBuffer());
  const sniffedMime = inferImageMimeFromMagic(fileBytes);
  if (!sniffedMime || !INSIGHT_ALLOWED_UPLOAD_MIME.has(sniffedMime)) {
    throw createHttpError(400, "only jpg, jpeg, png, webp are allowed.", { code: "UPLOAD_FILE_TYPE_NOT_ALLOWED" });
  }

  const claimedMime = String(file.type || "").toLowerCase();
  if (claimedMime && !INSIGHT_ALLOWED_UPLOAD_MIME.has(claimedMime)) {
    throw createHttpError(400, "invalid file type.", { code: "UPLOAD_FILE_TYPE_NOT_ALLOWED" });
  }

  const usage = String(formData.get("usage") || "body").toLowerCase() === "featured" ? "featured" : "body";
  const alt = normalizeText(formData.get("alt"), 300);
  const width = normalizeUploadDimension(formData.get("width"));
  const height = normalizeUploadDimension(formData.get("height"));

  const key = buildUploadImageKey(file.name, sniffedMime, usage);

  await bucket.put(key, fileBytes, {
    httpMetadata: {
      contentType: sniffedMime,
      cacheControl: "public, max-age=31536000, immutable",
      contentDisposition: `inline; filename="${normalizeUploadFileName(file.name)}.${extensionFromMime(sniffedMime)}"`,
    },
    customMetadata: {
      usage,
      alt,
      uploadedAt: String(Date.now()),
    },
  });

  const url = buildUploadedImageUrl(request, env, key);
  return json({
    ok: true,
    item: {
      key,
      url,
      alt,
      width,
      height,
      mimeType: sniffedMime,
      size: rawSize,
      loading: "lazy",
      usage,
      storage: "r2",
    },
  }, { status: 201 });
}

function decodeCookieValue(rawValue) {
  try {
    return decodeURIComponent(String(rawValue || ""));
  } catch (e) {
    return String(rawValue || "");
  }
}

function extractFlowerAdminToken(request) {
  const headerToken = normalizeText(request.headers.get("x-admin-token"), 512);
  if (headerToken) return headerToken;

  const auth = String(request.headers.get("authorization") || "").trim();
  if (auth.toLowerCase().startsWith("bearer ")) {
    return auth.slice(7).trim();
  }

  const cookie = String(request.headers.get("cookie") || "");
  const match = cookie.match(/(?:^|;\s*)flower_admin_token=([^;]+)/i);
  if (!match) return "";
  return decodeCookieValue(match[1]);
}

function base64urlDecode(value) {
  const base64 = String(value || "").replace(/-/g, "+").replace(/_/g, "/");
  const pad = (4 - (base64.length % 4)) % 4;
  return atob(base64 + "=".repeat(pad));
}

async function verifyFlowerAdminToken(request, env) {
  const token = extractFlowerAdminToken(request);
  if (!token) return false;

  const dotIdx = token.lastIndexOf(".");
  if (dotIdx < 1) return false;

  const payloadB64 = token.slice(0, dotIdx);
  const signatureHex = token.slice(dotIdx + 1);
  if (!/^[a-f0-9]{64}$/i.test(signatureHex)) return false;

  const expectedHex = await hmacSha256Hex(
    payloadB64,
    String(env?.FLOWER_ADMIN_SECRET || "flower-admin-dev-secret-placeholder-000000"),
  );

  if (!timingSafeEqualText(expectedHex, signatureHex.toLowerCase())) return false;

  let payload = null;
  try {
    payload = JSON.parse(base64urlDecode(payloadB64));
  } catch (e) {
    return false;
  }

  const exp = Number(payload?.exp || 0);
  const nowSec = Math.floor(Date.now() / 1000);
  return payload?.v === 1 && Number.isFinite(exp) && nowSec <= exp;
}

async function authorizeAdminRequest(request, env) {
  const authHeader = String(request.headers.get("authorization") || "").trim();
  const cookieHeader = String(request.headers.get("cookie") || "");
  const hasSessionCookie = /(?:^|;\s*)(cd_access_token|cd_refresh_token)=/i.test(cookieHeader);
  const hasFlowerCredential = Boolean(extractFlowerAdminToken(request));
  const hasAnyCredential = Boolean(authHeader) || hasSessionCookie || hasFlowerCredential;

  if (!hasAnyCredential) {
    throw createHttpError(401, "로그인이 필요합니다.", { code: "UNAUTHORIZED" });
  }

  const flowerTokenGranted = await verifyFlowerAdminToken(request, env);

  let auth = null;
  let authError = null;
  try {
    auth = await requireAuth(request, env);
  } catch (error) {
    authError = error;
  }

  if (auth) {
    const role = String(auth.role || "user").toLowerCase();
    const isAdmin = role === "admin" || auth.isAdmin === true;
    if (!isAdmin && !flowerTokenGranted) {
      throw createHttpError(403, "관리자 권한이 필요합니다.", { code: "FORBIDDEN" });
    }

    if (!isAdmin && flowerTokenGranted) {
      return {
        mode: "flower",
        auth: { userId: "flower-admin", role: "admin", isAdmin: true },
        userId: "flower-admin",
        isAdmin: true,
      };
    }

    return {
      mode: "jwt",
      auth,
      userId: String(auth.userId || ""),
      isAdmin: true,
    };
  }

  if (flowerTokenGranted) {
    return {
      mode: "flower",
      auth: { userId: "flower-admin", role: "admin", isAdmin: true },
      userId: "flower-admin",
      isAdmin: true,
    };
  }

  if (authError && Number(authError?.status || 0) === 401) {
    throw createHttpError(401, "로그인이 필요합니다.", { code: "UNAUTHORIZED" });
  }

  throw createHttpError(401, "로그인이 필요합니다.", { code: "UNAUTHORIZED" });
}

function parseQuery(urlString) {
  const url = new URL(urlString);
  const q = url.searchParams;
  const status = normalizeText(q.get("status"), 24).toLowerCase();
  const includeTrash = String(q.get("includeTrash") || "") === "1";
  const search = normalizeText(q.get("q"), 120);
  const sort = normalizeText(q.get("sort"), 24).toLowerCase();
  const page = Math.max(1, Number(q.get("page") || 1) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(q.get("pageSize") || 20) || 20));
  return { status, includeTrash, search, sort, page, pageSize };
}

function resolveListSort(sort) {
  if (sort === "updated") return { updatedAt: -1, createdAt: -1 };
  if (sort === "views") return { viewCount: -1, updatedAt: -1, createdAt: -1 };
  return { createdAt: -1, updatedAt: -1 };
}

async function handleInsightsList(request, env) {
  await authorizeAdminRequest(request, env);
  await connectDb(env);

  const { status, includeTrash, search, sort, page, pageSize } = parseQuery(request.url);
  const query = {};

  if (INSIGHT_STATUS_SET.has(status)) {
    query.status = status;
  } else if (!includeTrash) {
    query.status = { $ne: "trash" };
  }

  if (search) {
    const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    query.$or = [
      { title: { $regex: escaped, $options: "i" } },
      { slug: { $regex: escaped, $options: "i" } },
    ];
  }

  const sortSpec = resolveListSort(sort);

  const [items, totalCount] = await Promise.all([
    Insight.find(query)
      .sort(sortSpec)
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .lean(),
    Insight.countDocuments(query),
  ]);

  return json({
    ok: true,
    totalCount,
    page,
    pageSize,
    sort: sort || "latest",
    search,
    items,
  });
}

async function handleInsightsCreate(request, env) {
  await authorizeAdminRequest(request, env);
  await connectDb(env);

  const body = await readJson(request);
  const { payload, title, providedSlug } = normalizeInsightPayload(body, "create");

  if (!title) {
    throw createHttpError(400, "title is required.", { code: "VALIDATION_ERROR" });
  }

  if (providedSlug) {
    const duplicate = await findDuplicateSlug(payload.slug);
    if (duplicate) {
      throw createHttpError(409, "slug already exists.", { code: "DUPLICATE_SLUG" });
    }
  } else {
    payload.slug = await buildUniqueSlug(title);
  }

  if (!payload.slug) {
    payload.slug = await buildUniqueSlug(`insight-${Date.now()}`);
  }

  payload.status = ensureStatus(payload.status, "draft");

  const doc = await Insight.create(payload);
  return json({ ok: true, item: doc.toObject() }, { status: 201 });
}

async function handleInsightsGetById(path, request, env) {
  await authorizeAdminRequest(request, env);
  await connectDb(env);

  const id = parseInsightId(path);
  if (!id) throw createHttpError(404, "Not found.", { code: "NOT_FOUND" });

  const item = await Insight.findById(id).lean();
  if (!item) throw createHttpError(404, "Not found.", { code: "NOT_FOUND" });

  return json({ ok: true, item });
}

async function handleInsightsUpdate(path, request, env) {
  await authorizeAdminRequest(request, env);
  await connectDb(env);

  const id = parseInsightId(path);
  if (!id) throw createHttpError(404, "Not found.", { code: "NOT_FOUND" });

  const existing = await Insight.findById(id).lean();
  if (!existing) throw createHttpError(404, "Not found.", { code: "NOT_FOUND" });

  const body = await readJson(request);
  const { payload, title, providedSlug } = normalizeInsightPayload(body, "update");

  if (body.title !== undefined && !title) {
    throw createHttpError(400, "title is required.", { code: "VALIDATION_ERROR" });
  }

  if (body.slug !== undefined) {
    if (!providedSlug) {
      const fallbackTitle = title || existing.title;
      payload.slug = await buildUniqueSlug(fallbackTitle, id);
    } else {
      const duplicate = await findDuplicateSlug(payload.slug, id);
      if (duplicate) {
        throw createHttpError(409, "slug already exists.", { code: "DUPLICATE_SLUG" });
      }
    }
  }

  if (body.status !== undefined) {
    payload.status = ensureStatus(body.status, existing.status || "draft");
    if (body.isPublished === undefined) {
      payload.isPublished = payload.status === "published";
    }
    if (body.publishedAt === undefined && payload.status === "published" && !existing.publishedAt) {
      payload.publishedAt = new Date();
    }
  }

  const updated = await Insight.findByIdAndUpdate(
    id,
    { $set: payload },
    { returnDocument: "after" },
  ).lean();

  return json({ ok: true, item: updated });
}

async function handleInsightsDelete(path, request, env) {
  await authorizeAdminRequest(request, env);
  await connectDb(env);

  const id = parseInsightId(path);
  if (!id) throw createHttpError(404, "Not found.", { code: "NOT_FOUND" });

  const updated = await Insight.findByIdAndUpdate(
    id,
    {
      $set: {
        status: "trash",
        isPublished: false,
      },
    },
    { returnDocument: "after" },
  ).lean();

  if (!updated) throw createHttpError(404, "Not found.", { code: "NOT_FOUND" });
  return json({ ok: true, item: updated });
}

function parseAdminContentId(path) {
  const matched = String(path || "").match(/^\/content\/([^/]+)$/i);
  if (!matched) return "";

  let token = "";
  try {
    token = decodeURIComponent(String(matched[1] || "").trim());
  } catch (e) {
    return "";
  }

  if (!token) return "";
  if (token.startsWith("insight:")) token = token.slice("insight:".length);
  if (!/^[a-f0-9]{24}$/i.test(token)) return "";
  return token;
}

function parseAdminContentSlug(path) {
  const matched = String(path || "").match(/^\/content\/by-slug\/([^/]+)$/i);
  if (!matched) return "";

  try {
    const decoded = decodeURIComponent(String(matched[1] || "")).trim().toLowerCase();
    if (!decoded || decoded.length > 240) return "";
    if (!/^[a-z0-9-]+$/.test(decoded)) return "";
    return decoded;
  } catch (e) {
    return "";
  }
}

function parseContentListQuery(urlString) {
  const url = new URL(urlString);
  const q = url.searchParams;

  const type = normalizeType(q.get("type"), "");
  const statusRaw = normalizeText(q.get("status"), 24).toLowerCase();
  const status = statusRaw && CONTENT_STATUS_SET.has(statusRaw) ? statusRaw : "";
  const category = normalizeText(q.get("category"), 120);
  const keyword = normalizeText(q.get("keyword") || q.get("q"), 120);
  const sort = normalizeText(q.get("sort"), 32).toLowerCase();
  const page = Math.max(1, Number(q.get("page") || 1) || 1);
  const limit = Math.min(100, Math.max(1, Number(q.get("limit") || q.get("pageSize") || 20) || 20));

  return {
    type,
    status,
    category,
    keyword,
    sort,
    page,
    limit,
  };
}

function resolveContentSort(sort) {
  if (sort === "updated") return { updatedAt: -1, createdAt: -1 };
  if (sort === "published") return { publishedAt: -1, updatedAt: -1, createdAt: -1 };
  if (sort === "title") return { title: 1, updatedAt: -1 };
  if (sort === "views") return { viewCount: -1, updatedAt: -1 };
  return { updatedAt: -1, createdAt: -1 };
}

function buildContentListQuery(filters) {
  const query = {};

  if (filters.type) {
    if (filters.type === "fortune_insight") {
      query.$or = [{ type: "fortune_insight" }, { type: { $exists: false } }, { type: "" }];
    } else {
      query.type = filters.type;
    }
  }

  if (filters.status) {
    query.status = filters.status;
  }

  if (filters.category) {
    query.category = filters.category;
  }

  if (filters.keyword) {
    const escaped = filters.keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    query.$and = [
      ...(Array.isArray(query.$and) ? query.$and : []),
      {
        $or: [
          { title: { $regex: escaped, $options: "i" } },
          { slug: { $regex: escaped, $options: "i" } },
          { summary: { $regex: escaped, $options: "i" } },
          { excerpt: { $regex: escaped, $options: "i" } },
          { category: { $regex: escaped, $options: "i" } },
          { tags: { $elemMatch: { $regex: escaped, $options: "i" } } },
        ],
      },
    ];
  }

  return query;
}

async function handleContentList(request, env) {
  const adminContext = await authorizeAdminRequest(request, env);
  await connectDb(env);

  const filters = parseContentListQuery(request.url);
  const query = buildContentListQuery(filters);
  const sort = resolveContentSort(filters.sort);

  logAdminContent("list_start", {
    endpoint: "/api/admin/content",
    method: request.method,
    userId: adminContext.userId,
    isAdmin: adminContext.isAdmin,
    filters,
  });

  const [items, total] = await Promise.all([
    Insight.find(query)
      .sort(sort)
      .skip((filters.page - 1) * filters.limit)
      .limit(filters.limit)
      .lean(),
    Insight.countDocuments(query),
  ]);

  const mappedItems = items.map((item) => toContentItem(item));
  const totalPages = Math.max(1, Math.ceil(total / filters.limit));

  logAdminContent("list_success", {
    endpoint: "/api/admin/content",
    method: request.method,
    userId: adminContext.userId,
    isAdmin: adminContext.isAdmin,
    resultCount: mappedItems.length,
    total,
  });

  return json({
    ok: true,
    items: mappedItems,
    pagination: {
      page: filters.page,
      limit: filters.limit,
      total,
      totalPages,
    },
  });
}

async function findDuplicateContentSlug(slug, excludeId = "") {
  const query = { slug };
  if (excludeId) query._id = { $ne: excludeId };
  return Insight.findOne(query).select("_id slug").lean();
}

async function buildUniqueContentSlug(baseInput, excludeId = "") {
  const base = slugify(baseInput) || `content-${Date.now()}`;
  let candidate = base;
  let seq = 2;

  while (await findDuplicateContentSlug(candidate, excludeId)) {
    candidate = `${base}-${seq}`;
    seq += 1;
    if (seq > 500) {
      candidate = `${base}-${Date.now()}`;
      break;
    }
  }

  return candidate;
}

async function handleContentCreate(request, env) {
  const adminContext = await authorizeAdminRequest(request, env);
  await connectDb(env);

  const body = await readJson(request);
  const { payload, title, providedSlug } = normalizeContentPayload(body, "create", null);

  if (!title) {
    throw createHttpError(400, "title is required.", { code: "VALIDATION_ERROR" });
  }

  if (providedSlug) {
    const duplicate = await findDuplicateContentSlug(payload.slug);
    if (duplicate) {
      throw createHttpError(409, "slug already exists.", { code: "DUPLICATE_SLUG" });
    }
  } else {
    payload.slug = await buildUniqueContentSlug(title);
  }

  if (!payload.slug) {
    payload.slug = await buildUniqueContentSlug(`content-${Date.now()}`);
  }

  const created = await Insight.create(payload);
  const item = toContentItem(created.toObject());

  logAdminContent("create_success", {
    endpoint: "/api/admin/content",
    method: request.method,
    userId: adminContext.userId,
    isAdmin: adminContext.isAdmin,
    contentId: item.id,
    slug: item.slug,
    type: item.type,
  });

  return json({ ok: true, item }, { status: 201 });
}

async function handleContentGetById(path, request, env) {
  const adminContext = await authorizeAdminRequest(request, env);
  await connectDb(env);

  const id = parseAdminContentId(path);
  if (!id) throw createHttpError(404, "Not found.", { code: "NOT_FOUND" });

  const found = await Insight.findById(id).lean();
  if (!found) throw createHttpError(404, "Not found.", { code: "NOT_FOUND" });

  const item = toContentItem(found);
  logAdminContent("get_success", {
    endpoint: "/api/admin/content/:id",
    method: request.method,
    userId: adminContext.userId,
    isAdmin: adminContext.isAdmin,
    contentId: item.id,
    slug: item.slug,
  });

  return json({ ok: true, item });
}

async function handleContentGetBySlug(path, request, env) {
  const adminContext = await authorizeAdminRequest(request, env);
  await connectDb(env);

  const slug = parseAdminContentSlug(path);
  if (!slug) throw createHttpError(404, "Not found.", { code: "NOT_FOUND" });

  const found = await Insight.findOne({ slug }).lean();
  if (!found) throw createHttpError(404, "Not found.", { code: "NOT_FOUND" });

  const item = toContentItem(found);
  logAdminContent("get_by_slug_success", {
    endpoint: "/api/admin/content/by-slug/:slug",
    method: request.method,
    userId: adminContext.userId,
    isAdmin: adminContext.isAdmin,
    contentId: item.id,
    slug: item.slug,
  });

  return json({ ok: true, item });
}

async function handleContentPatch(path, request, env) {
  const adminContext = await authorizeAdminRequest(request, env);
  await connectDb(env);

  const id = parseAdminContentId(path);
  if (!id) throw createHttpError(404, "Not found.", { code: "NOT_FOUND" });

  const existing = await Insight.findById(id).lean();
  if (!existing) throw createHttpError(404, "Not found.", { code: "NOT_FOUND" });

  const body = await readJson(request);
  const { payload, title, providedSlug } = normalizeContentPayload(body, "update", existing);

  if (body.title !== undefined && !title) {
    throw createHttpError(400, "title is required.", { code: "VALIDATION_ERROR" });
  }

  if (body.slug !== undefined) {
    if (!providedSlug) {
      payload.slug = await buildUniqueContentSlug(title || existing.title || `content-${Date.now()}`, id);
    } else {
      const duplicate = await findDuplicateContentSlug(payload.slug, id);
      if (duplicate) {
        throw createHttpError(409, "slug already exists.", { code: "DUPLICATE_SLUG" });
      }
    }
  }

  const nextRevision = Math.max(1, Number(existing?.revision || 1) || 1) + 1;
  const revisionSnapshot = buildContentRevisionSnapshot(existing, adminContext, "before_update");
  const updateResult = await Insight.updateOne(
    { _id: id },
    {
      $set: {
        ...payload,
        revision: nextRevision,
      },
      $push: {
        revisionHistory: {
          $each: [revisionSnapshot],
          $slice: -20,
        },
      },
    },
  );
  if (!Number(updateResult.matchedCount || 0)) {
    throw createHttpError(404, "Not found.", { code: "NOT_FOUND" });
  }

  const updated = await Insight.findById(id).lean();
  const item = toContentItem(updated);

  logAdminContent("patch_success", {
    endpoint: "/api/admin/content/:id",
    method: request.method,
    userId: adminContext.userId,
    isAdmin: adminContext.isAdmin,
    contentId: item.id,
    slug: item.slug,
    matchedCount: Number(updateResult.matchedCount || 0),
    modifiedCount: Number(updateResult.modifiedCount || 0),
  });

  return json({
    ok: true,
    item,
    db: {
      matchedCount: Number(updateResult.matchedCount || 0),
      modifiedCount: Number(updateResult.modifiedCount || 0),
    },
  });
}

async function handleContentDelete(path, request, env) {
  const adminContext = await authorizeAdminRequest(request, env);
  await connectDb(env);

  const id = parseAdminContentId(path);
  if (!id) throw createHttpError(404, "Not found.", { code: "NOT_FOUND" });

  const updateResult = await Insight.updateOne(
    { _id: id },
    {
      $set: {
        status: "archived",
        isPublished: false,
      },
    },
  );

  if (!Number(updateResult.matchedCount || 0)) {
    throw createHttpError(404, "Not found.", { code: "NOT_FOUND" });
  }

  const updated = await Insight.findById(id).lean();
  const item = toContentItem(updated);

  logAdminContent("delete_soft_success", {
    endpoint: "/api/admin/content/:id",
    method: request.method,
    userId: adminContext.userId,
    isAdmin: adminContext.isAdmin,
    contentId: item.id,
    slug: item.slug,
    matchedCount: Number(updateResult.matchedCount || 0),
    modifiedCount: Number(updateResult.modifiedCount || 0),
  });

  return json({
    ok: true,
    item,
    db: {
      matchedCount: Number(updateResult.matchedCount || 0),
      modifiedCount: Number(updateResult.modifiedCount || 0),
    },
  });
}

function parseRevisionContentId(path, suffix) {
  return parseAdminContentId(String(path || "").replace(new RegExp(`${suffix}$`, "i"), ""));
}

function findContentRevision(item, body = {}) {
  const history = Array.isArray(item?.revisionHistory) ? item.revisionHistory : [];
  const revisionId = String(body?.revisionId || "").trim();
  const revisionNumber = Number(body?.revision || 0);
  if (revisionId) return history.find((entry) => String(entry?.id || "") === revisionId) || null;
  if (Number.isFinite(revisionNumber) && revisionNumber > 0) {
    return history.find((entry) => Number(entry?.revision || 0) === revisionNumber) || null;
  }
  return history[history.length - 1] || null;
}

function buildRestorePayloadFromRevision(revision) {
  return {
    title: String(revision?.title || ""),
    slug: slugify(revision?.slug || revision?.title || ""),
    summary: String(revision?.summary || ""),
    subtitle: String(revision?.subtitle || ""),
    excerpt: String(revision?.excerpt || ""),
    content: String(revision?.content || revision?.contentHtml || ""),
    contentFormat: normalizeContentFormat(revision?.contentFormat, "html"),
    contentHtml: sanitizeInsightHtml(String(revision?.contentHtml || revision?.content || "")),
    contentJson: isObjectLike(revision?.contentJson) ? revision.contentJson : {},
    category: String(revision?.category || ""),
    tags: Array.isArray(revision?.tags) ? revision.tags.slice(0, 80) : [],
    status: normalizeContentStatus(revision?.status, "draft"),
    seo: isObjectLike(revision?.seo) ? revision.seo : {},
    metaTitle: String(revision?.metaTitle || ""),
    metaDescription: String(revision?.metaDescription || ""),
    keywords: Array.isArray(revision?.keywords) ? revision.keywords.slice(0, 80) : [],
    canonicalUrl: String(revision?.canonicalUrl || ""),
    ogTitle: String(revision?.ogTitle || ""),
    ogDescription: String(revision?.ogDescription || ""),
    ogImage: String(revision?.ogImage || ""),
    twitterTitle: String(revision?.twitterTitle || ""),
    twitterDescription: String(revision?.twitterDescription || ""),
    twitterImage: String(revision?.twitterImage || ""),
    featuredImage: isObjectLike(revision?.featuredImage) ? revision.featuredImage : {},
    thumbnailUrl: String(revision?.thumbnailUrl || revision?.featuredImage?.url || ""),
    isFeatured: Boolean(revision?.isFeatured),
    noIndex: Boolean(revision?.noIndex),
    isPublished: normalizeContentStatus(revision?.status, "draft") === CONTENT_PUBLIC_STATUS,
    publishedAt: revision?.publishedAt || null,
  };
}

async function handleContentRevisions(path, request, env) {
  const adminContext = await authorizeAdminRequest(request, env);
  await connectDb(env);

  const id = parseRevisionContentId(path, "/revisions");
  if (!id) throw createHttpError(404, "Not found.", { code: "NOT_FOUND" });

  const found = await Insight.findById(id).lean();
  if (!found) throw createHttpError(404, "Not found.", { code: "NOT_FOUND" });

  const revisions = (Array.isArray(found.revisionHistory) ? found.revisionHistory : [])
    .slice()
    .reverse()
    .map((entry) => ({
      id: String(entry?.id || ""),
      revision: Math.max(1, Number(entry?.revision || 1) || 1),
      reason: String(entry?.reason || ""),
      savedAt: entry?.savedAt || null,
      savedBy: String(entry?.savedBy || ""),
      title: String(entry?.title || ""),
      status: String(entry?.status || "draft"),
    }));

  logAdminContent("revisions_list", {
    endpoint: "/api/admin/content/:id/revisions",
    method: request.method,
    userId: adminContext.userId,
    isAdmin: adminContext.isAdmin,
    contentId: id,
    count: revisions.length,
  });

  return json({
    ok: true,
    currentRevision: Math.max(1, Number(found?.revision || 1) || 1),
    revisions,
  });
}

async function handleContentRestore(path, request, env) {
  const adminContext = await authorizeAdminRequest(request, env);
  await connectDb(env);

  const id = parseRevisionContentId(path, "/restore");
  if (!id) throw createHttpError(404, "Not found.", { code: "NOT_FOUND" });

  const existing = await Insight.findById(id).lean();
  if (!existing) throw createHttpError(404, "Not found.", { code: "NOT_FOUND" });

  const body = await readJson(request);
  const targetRevision = findContentRevision(existing, body);
  if (!targetRevision) throw createHttpError(404, "revision not found.", { code: "REVISION_NOT_FOUND" });

  const currentSnapshot = buildContentRevisionSnapshot(existing, adminContext, "before_restore");
  const nextRevision = Math.max(1, Number(existing?.revision || 1) || 1) + 1;
  const restorePayload = buildRestorePayloadFromRevision(targetRevision);

  const duplicate = restorePayload.slug
    ? await findDuplicateContentSlug(restorePayload.slug, id)
    : null;
  if (duplicate) {
    restorePayload.slug = await buildUniqueContentSlug(restorePayload.slug || restorePayload.title || `content-${Date.now()}`, id);
  }

  await Insight.updateOne(
    { _id: id },
    {
      $set: {
        ...restorePayload,
        revision: nextRevision,
      },
      $push: {
        revisionHistory: {
          $each: [currentSnapshot],
          $slice: -20,
        },
      },
    },
  );

  const updated = await Insight.findById(id).lean();
  const item = toContentItem(updated);

  logAdminContent("restore_success", {
    endpoint: "/api/admin/content/:id/restore",
    method: request.method,
    userId: adminContext.userId,
    isAdmin: adminContext.isAdmin,
    contentId: id,
    restoredRevision: Number(targetRevision?.revision || 0),
  });

  return json({ ok: true, item, restoredRevision: targetRevision });
}

function resolvePublicOrigin(request, env) {
  const configured = firstRuntimeValue(env, [
    "PUBLIC_SITE_URL",
    "NEXT_PUBLIC_SITE_URL",
    "SITE_URL",
    "APP_URL",
    "BASE_URL",
  ]);
  if (configured) return configured.replace(/\/+$/, "");
  return new URL(request.url).origin.replace(/\/+$/, "");
}

function buildContentPublicUrls(request, env, item) {
  const origin = resolvePublicOrigin(request, env);
  const slug = String(item?.slug || "").trim();
  if (!slug) return { origin, pageUrl: "", apiUrl: "" };
  const encodedSlug = encodeURIComponent(slug);
  return {
    origin,
    pageUrl: `${origin}/insights/${encodedSlug}`,
    apiUrl: `${origin}/api/content/${encodedSlug}`,
  };
}

async function fetchContentUrlStatus(url, timeoutMs = 4500) {
  if (!url) return { ok: false, status: 0, checked: false, error: "missing_url" };
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort("timeout"), timeoutMs);
  try {
    const response = await fetch(url, {
      method: "GET",
      headers: { "Cache-Control": "no-cache" },
      signal: controller.signal,
    });
    return {
      ok: response.ok,
      status: response.status,
      checked: true,
      error: "",
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      checked: true,
      error: String(error?.message || error || "fetch_failed").slice(0, 180),
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchContentUrlTextStatus(url, timeoutMs = 4500) {
  if (!url) return { ok: false, status: 0, checked: false, error: "missing_url", text: "" };
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort("timeout"), timeoutMs);
  try {
    const response = await fetch(url, {
      method: "GET",
      headers: { "Cache-Control": "no-cache" },
      signal: controller.signal,
    });
    const text = await response.text().catch(() => "");
    return {
      ok: response.ok,
      status: response.status,
      checked: true,
      error: "",
      text: text.slice(0, 350000),
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      checked: true,
      error: String(error?.message || error || "fetch_failed").slice(0, 180),
      text: "",
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchContentFeedHeaderStatus(url, timeoutMs = 3500) {
  if (!url) return { ok: false, status: 0, checked: false, merged: false, error: "missing_url" };
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort("timeout"), timeoutMs);
  try {
    const response = await fetch(url, {
      method: "HEAD",
      headers: { "Cache-Control": "no-cache" },
      signal: controller.signal,
    });
    return {
      ok: response.ok,
      status: response.status,
      checked: true,
      merged: response.headers.get("X-Code-Destiny-Feed") === "merged",
      error: "",
      url,
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      checked: true,
      merged: false,
      error: String(error?.message || error || "fetch_failed").slice(0, 180),
      url,
    };
  } finally {
    clearTimeout(timeout);
  }
}

function extractHtmlTagContent(html, pattern) {
  const matched = String(html || "").match(pattern);
  return String(matched?.[1] || "").trim();
}

function buildPageMetaCheck(html, expectedUrl, item) {
  const title = extractHtmlTagContent(html, /<title[^>]*>([\s\S]*?)<\/title>/i);
  const description = extractHtmlTagContent(html, /<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["'][^>]*>/i)
    || extractHtmlTagContent(html, /<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["'][^>]*>/i);
  const canonical = extractHtmlTagContent(html, /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']*)["'][^>]*>/i)
    || extractHtmlTagContent(html, /<link[^>]+href=["']([^"']*)["'][^>]+rel=["']canonical["'][^>]*>/i);
  const ogTitle = extractHtmlTagContent(html, /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']*)["'][^>]*>/i)
    || extractHtmlTagContent(html, /<meta[^>]+content=["']([^"']*)["'][^>]+property=["']og:title["'][^>]*>/i);
  const ogImage = extractHtmlTagContent(html, /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']*)["'][^>]*>/i)
    || extractHtmlTagContent(html, /<meta[^>]+content=["']([^"']*)["'][^>]+property=["']og:image["'][^>]*>/i);
  const robots = extractHtmlTagContent(html, /<meta[^>]+name=["']robots["'][^>]+content=["']([^"']*)["'][^>]*>/i)
    || extractHtmlTagContent(html, /<meta[^>]+content=["']([^"']*)["'][^>]+name=["']robots["'][^>]*>/i);
  const expectedTitle = String(item?.seo?.metaTitle || item?.metaTitle || item?.title || "").trim();
  const expectedDescription = String(item?.seo?.metaDescription || item?.metaDescription || item?.summary || item?.excerpt || "").trim();

  return {
    hasTitle: Boolean(title),
    hasDescription: Boolean(description),
    hasCanonical: Boolean(canonical),
    canonicalMatches: canonical ? canonical.replace(/\/+$/, "") === String(expectedUrl || "").replace(/\/+$/, "") : false,
    hasOgTitle: Boolean(ogTitle),
    hasOgImage: Boolean(ogImage),
    noIndex: /noindex/i.test(robots),
    titleMatches: expectedTitle ? title.includes(expectedTitle.slice(0, 80)) : Boolean(title),
    descriptionMatches: expectedDescription ? description.includes(expectedDescription.slice(0, 80)) : Boolean(description),
    title: title.slice(0, 180),
    description: description.slice(0, 220),
    canonical: canonical.slice(0, 400),
    ogImage: ogImage.slice(0, 400),
    robots: robots.slice(0, 120),
  };
}

async function buildFeedCoverageCheck(origin, slug) {
  const encodedSlug = encodeURIComponent(String(slug || ""));
  const targets = [
    { key: "sitemap", url: `${origin}/sitemap.xml` },
    { key: "rss", url: `${origin}/rss.xml` },
    { key: "insightsRss", url: `${origin}/insights/rss.xml` },
  ];
  const results = {};
  for (const target of targets) {
    const status = await fetchContentUrlTextStatus(target.url, 3500);
    results[target.key] = {
      ok: status.ok,
      status: status.status,
      containsSlug: Boolean(status.text && (status.text.includes(`/insights/${encodedSlug}`) || status.text.includes(`/insights/${slug}`))),
      error: status.error || "",
      url: target.url,
    };
  }
  return results;
}

async function buildContentPublicationStatus(request, env, item) {
  const urls = buildContentPublicUrls(request, env, item);
  const status = String(item?.status || "").toLowerCase();
  const publishedAtMs = new Date(item?.publishedAt || 0).getTime();
  const isScheduledReady = status === "scheduled" && Number.isFinite(publishedAtMs) && publishedAtMs <= Date.now();
  const isPublished = status === CONTENT_PUBLIC_STATUS || isScheduledReady;
  const hasSlug = Boolean(String(item?.slug || "").trim());
  const dbReady = isPublished && hasSlug && Boolean(item?.publishedAt || item?.isPublished);
  const apiStatus = isPublished ? await fetchContentUrlStatus(urls.apiUrl) : { ok: false, status: 0, checked: false, error: "not_published" };
  const pageTextStatus = isPublished ? await fetchContentUrlTextStatus(urls.pageUrl) : { ok: false, status: 0, checked: false, error: "not_published", text: "" };
  const pageStatus = {
    ok: pageTextStatus.ok,
    status: pageTextStatus.status,
    checked: pageTextStatus.checked,
    error: pageTextStatus.error,
  };
  const pageMeta = pageTextStatus.ok ? buildPageMetaCheck(pageTextStatus.text, urls.pageUrl, item) : null;
  const feedCoverage = isPublished ? await buildFeedCoverageCheck(urls.origin, item?.slug) : null;

  return {
    ok: Boolean(dbReady && apiStatus.ok && pageStatus.ok && (!pageMeta || !pageMeta.noIndex)),
    dbReady,
    isPublished,
    slug: String(item?.slug || ""),
    publicUrl: urls.pageUrl,
    apiUrl: urls.apiUrl,
    apiStatus,
    pageStatus,
    pageMeta,
    feedCoverage,
    checkedAt: new Date().toISOString(),
  };
}

function resolveCloudflareZoneIdFromEnv(env) {
  return firstRuntimeValue(env, [
    "CLOUDFLARE_ZONE_ID",
    "CLOUDFLARE_ZONEID",
    "CF_ZONE_ID",
    "CF_ZONEID",
    "ZONE_ID",
    "ZONEID",
    "ZoneID",
  ]);
}

function resolveCloudflareApiToken(env) {
  return firstRuntimeValue(env, [
    "Edit_zone",
    "EDIT_ZONE",
    "EDIT_ZONE_TOKEN",
    "CLOUDFLARE_CACHE_PURGE_TOKEN",
    "CLOUDFLARE_API_TOKEN",
    "CF_API_TOKEN",
    "CLOUDFLARE_APITOKEN",
  ]);
}

function candidateZoneNamesFromUrl(url) {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./i, "").toLowerCase();
    if (!hostname) return [];
    const parts = hostname.split(".").filter(Boolean);
    const candidates = [hostname];
    if (parts.length >= 2) candidates.push(parts.slice(-2).join("."));
    return Array.from(new Set(candidates));
  } catch (e) {
    return [];
  }
}

async function resolveCloudflareZoneId(env, sampleUrl, token) {
  const configured = resolveCloudflareZoneIdFromEnv(env);
  if (configured) return configured;

  const candidates = candidateZoneNamesFromUrl(sampleUrl);
  for (const zoneName of candidates) {
    try {
      const response = await fetch(`https://api.cloudflare.com/client/v4/zones?name=${encodeURIComponent(zoneName)}&status=active&per_page=1`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      });
      const payload = await response.json().catch(() => ({}));
      const zoneId = String(payload?.result?.[0]?.id || "").trim();
      if (response.ok && zoneId) return zoneId;
    } catch (e) {
      continue;
    }
  }

  return "";
}

async function purgeCloudflareContentCache(env, urls = []) {
  const files = Array.from(new Set(urls.map((url) => String(url || "").trim()).filter(Boolean))).slice(0, 30);
  if (!files.length) return { ok: false, status: "skipped", reason: "missing_urls", files: [] };

  const token = resolveCloudflareApiToken(env);
  if (!token) {
    return {
      ok: false,
      status: "skipped",
      reason: "missing_api_token",
      files,
    };
  }

  const zoneId = await resolveCloudflareZoneId(env, files[0], token);
  if (!zoneId) {
    return {
      ok: false,
      status: "skipped",
      reason: "missing_zone_id",
      files,
    };
  }

  try {
    const response = await fetch(`https://api.cloudflare.com/client/v4/zones/${encodeURIComponent(zoneId)}/purge_cache`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ files }),
    });
    const payload = await response.json().catch(() => ({}));
    return {
      ok: response.ok && payload?.success !== false,
      status: response.ok ? "requested" : "failed",
      httpStatus: response.status,
      files,
      errors: Array.isArray(payload?.errors) ? payload.errors.slice(0, 3) : [],
    };
  } catch (error) {
    return {
      ok: false,
      status: "failed",
      reason: String(error?.message || error || "purge_failed").slice(0, 180),
      files,
    };
  }
}

async function handleContentPublishStatus(path, request, env) {
  const adminContext = await authorizeAdminRequest(request, env);
  await connectDb(env);

  const id = parseAdminContentId(path.replace(/\/publish-status$/i, ""));
  if (!id) throw createHttpError(404, "Not found.", { code: "NOT_FOUND" });

  const found = await Insight.findById(id).lean();
  if (!found) throw createHttpError(404, "Not found.", { code: "NOT_FOUND" });

  const item = toContentItem(found);
  const publication = await buildContentPublicationStatus(request, env, item);

  logAdminContent("publish_status", {
    endpoint: "/api/admin/content/:id/publish-status",
    method: request.method,
    userId: adminContext.userId,
    isAdmin: adminContext.isAdmin,
    contentId: item.id,
    slug: item.slug,
    ok: publication.ok,
  });

  return json({ ok: true, item, publication });
}

async function handleContentCachePurge(path, request, env) {
  const adminContext = await authorizeAdminRequest(request, env);
  await connectDb(env);

  const id = parseAdminContentId(path.replace(/\/cache-purge$/i, ""));
  if (!id) throw createHttpError(404, "Not found.", { code: "NOT_FOUND" });

  const found = await Insight.findById(id).lean();
  if (!found) throw createHttpError(404, "Not found.", { code: "NOT_FOUND" });

  const item = toContentItem(found);
  const urls = buildContentPublicUrls(request, env, item);
  const purge = await purgeCloudflareContentCache(env, [
    urls.pageUrl,
    urls.apiUrl,
    `${urls.origin}/insights`,
    `${urls.origin}/api/content`,
    `${urls.origin}/sitemap.xml`,
    `${urls.origin}/rss.xml`,
    `${urls.origin}/insights/rss.xml`,
  ]);

  logAdminContent("cache_purge", {
    endpoint: "/api/admin/content/:id/cache-purge",
    method: request.method,
    userId: adminContext.userId,
    isAdmin: adminContext.isAdmin,
    contentId: item.id,
    slug: item.slug,
    status: purge.status,
    ok: purge.ok,
  });

  return json({ ok: true, item, purge });
}

async function handleContentDiag(request, env) {
  const adminContext = await authorizeAdminRequest(request, env);
  const dbConn = await connectDb(env);

  const collections = await dbConn.db.listCollections({}, { nameOnly: true }).toArray();
  const names = new Set(collections.map((item) => String(item?.name || "")));
  const origin = resolvePublicOrigin(request, env);
  const now = new Date();

  const [
    allContent,
    fortuneInsights,
    published,
    draft,
    scheduled,
    scheduledReady,
    archived,
    missingSlug,
    publishedMissingMetaDescription,
    publishedMissingFeaturedImage,
    publishedNoIndex,
    dynamicSitemap,
    dynamicRss,
    dynamicInsightsRss,
  ] = await Promise.all([
    Insight.countDocuments({}),
    Insight.countDocuments({
      $or: [{ type: "fortune_insight" }, { type: { $exists: false } }, { type: "" }],
    }),
    Insight.countDocuments({ status: "published" }),
    Insight.countDocuments({ status: "draft" }),
    Insight.countDocuments({ status: "scheduled" }),
    Insight.countDocuments({ status: "scheduled", publishedAt: { $lte: now } }),
    Insight.countDocuments({ status: { $in: ["archived", "private", "trash"] } }),
    Insight.countDocuments({ $or: [{ slug: "" }, { slug: { $exists: false } }] }),
    Insight.countDocuments({
      status: "published",
      $and: [
        { $or: [{ "seo.metaDescription": "" }, { "seo.metaDescription": { $exists: false } }] },
        { $or: [{ metaDescription: "" }, { metaDescription: { $exists: false } }] },
      ],
    }),
    Insight.countDocuments({
      status: "published",
      $and: [
        { $or: [{ "featuredImage.url": "" }, { "featuredImage.url": { $exists: false } }] },
        { $or: [{ thumbnailUrl: "" }, { thumbnailUrl: { $exists: false } }] },
      ],
    }),
    Insight.countDocuments({
      status: "published",
      $or: [
        { noIndex: true },
        { "seo.noIndex": true },
      ],
    }),
    fetchContentFeedHeaderStatus(`${origin}/sitemap.xml`),
    fetchContentFeedHeaderStatus(`${origin}/rss.xml`),
    fetchContentFeedHeaderStatus(`${origin}/insights/rss.xml`),
  ]);

  logAdminContent("diag_success", {
    endpoint: "/api/admin/content/diag",
    method: request.method,
    userId: adminContext.userId,
    isAdmin: adminContext.isAdmin,
    dbConnected: dbConn.readyState === 1,
  });

  return json({
    ok: true,
    dbConnected: dbConn.readyState === 1,
    collections: {
      content: names.has("insights") || names.has("Insights"),
      insights: names.has("insights") || names.has("Insights"),
    },
    adminAuth: true,
    counts: {
      allContent,
      fortuneInsights,
      published,
      draft,
      scheduled,
      scheduledReady,
      archived,
      missingSlug,
      publishedMissingMetaDescription,
      publishedMissingFeaturedImage,
      publishedNoIndex,
    },
    dynamicFeeds: {
      sitemap: dynamicSitemap,
      rss: dynamicRss,
      insightsRss: dynamicInsightsRss,
    },
  });
}

async function sha256Hex(text) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(String(text || "")));
  return bytesToHex(new Uint8Array(digest));
}

async function hmacSha256Hex(text, secret) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(text));
  return bytesToHex(new Uint8Array(signature));
}

async function verifyAdminEntryPassword(rawInput) {
  const input = String(rawInput || "");
  if (!input) return false;

  const inputHex = await sha256Hex(input);
  for (const expected of ADMIN_ENTRY_PASSWORD_SHA256_LIST) {
    if (timingSafeEqualText(inputHex, expected)) return true;
  }
  return false;
}

async function issueFlowerAdminToken(env) {
  const now = Math.floor(Date.now() / 1000);
  const payload = JSON.stringify({ v: 1, issued: now, exp: now + FLOWER_TOKEN_TTL_SEC });
  const payloadB64 = base64urlEncode(payload);
  const secret = String(env?.FLOWER_ADMIN_SECRET || "flower-admin-dev-secret-placeholder-000000");
  const signature = await hmacSha256Hex(payloadB64, secret);
  return `${payloadB64}.${signature}`;
}

function setFlowerAdminCookie(response, token, request) {
  const isHttps = new URL(request.url).protocol === "https:";
  const cookie = [
    `flower_admin_token=${encodeURIComponent(token)}`,
    "Path=/",
    `Max-Age=${FLOWER_TOKEN_TTL_SEC}`,
    "SameSite=Lax",
    "HttpOnly",
    isHttps ? "Secure" : "",
  ].filter(Boolean).join("; ");

  response.headers.append("Set-Cookie", cookie);
}

async function handleEntryPassword(request, env) {
  const body = await readJson(request);
  const password = String(body?.password || "");
  if (!await verifyAdminEntryPassword(password)) {
    return json({ message: "Not found" }, { status: 404 });
  }

  const adminToken = await issueFlowerAdminToken(env);

  const expectedHash = getEnv(env, "ADMIN_SECRET_HASH");
  const response = json({
    ok: true,
    adminToken,
    nextUrl: expectedHash ? `/${expectedHash}/login` : "/admin",
  }, { status: 200 });

  setFlowerAdminCookie(response, adminToken, request);
  return response;
}

function handleKeyHealth(env) {
  const matrix = buildRuntimeKeyMatrix(env);
  return json({
    ok: true,
    service: "code-destiny-api-worker",
    message: "Runtime key health matrix for feature diagnostics.",
    matrix,
  }, { status: 200 });
}

function hasAnyRuntimeKey(env, keys = []) {
  for (let i = 0; i < keys.length; i += 1) {
    if (String(getEnv(env, keys[i]) || "").trim()) return true;
  }
  return false;
}

async function handleAdminDiag(request, env) {
  const adminContext = await authorizeAdminRequest(request, env);
  const requestId = `adiag_${Date.now().toString(36)}`;

  const bindings = {
    DB: hasAnyRuntimeKey(env, ["MONGO_URI", "MONGODB_URI"]),
    COIN_KV: hasAnyRuntimeKey(env, ["COIN_KV", "PIG_COIN_KV", "COIN_LEDGER_KV"]),
    AUTH_SECRET: hasAnyRuntimeKey(env, ["AUTH_SECRET", "JWT_SECRET", "JWT_ACCESS_SECRET"]),
    R2: hasAnyRuntimeKey(env, ["R2", "R2_BUCKET", "CONTENT_R2", "UPLOADS_R2"]),
  };

  let dbReady = false;
  try {
    await connectDb(env);
    dbReady = true;
  } catch (e) {
    dbReady = false;
  }

  const runtime = String(
    getEnv(env, "NODE_ENV")
    || getEnv(env, "APP_ENV")
    || getEnv(env, "ENV")
    || "unknown"
  ).trim();
  const version = String(
    getEnv(env, "APP_VERSION")
    || getEnv(env, "BUILD_ID")
    || getEnv(env, "COMMIT_SHA")
    || getEnv(env, "CF_PAGES_COMMIT_SHA")
    || "unknown"
  ).trim().slice(0, 120) || "unknown";

  return json({
    ok: true,
    requestId,
    adminAuth: true,
    userId: adminContext.userId,
    version,
    runtime,
    bindings,
    services: {
      auth: bindings.AUTH_SECRET ? "ok" : "degraded",
      coin: (bindings.DB && dbReady) ? "ok" : "degraded",
      subscription: (bindings.DB && dbReady) ? "ok" : "degraded",
      destinyProfiles: (bindings.DB && dbReady) ? "ok" : "degraded",
    },
  }, { status: 200 });
}

function listGeminiKeyStatus(env) {
  const keyNames = [
    "PREMIUM_GEMINI_API_KEY1",
    "PREMIUM_GEMINI_API_KEY2",
    "PREMIUM_GEMINI_API_KEY3",
    "PREMIUM_GEMINI_API_KEY4",
    "PREMIUM_GEMINI_API_KEY5",
    "GEMINI_API_KEY",
    "GOOGLE_GEMINI_API_KEY",
    "GOOGLE_GENERATIVE_AI_API_KEY",
    "GOOGLE_AI_API_KEY",
    "GOOGLE_API_KEY",
    "GEMINIF_API_KEY1",
    "GEMINIF_API_KEY2",
    "GEMINIF_API_KEY3",
    "GEMINIF_API_KEY4",
    "GEMINIF_API_KEY5",
  ];
  const status = {};
  let enabledCount = 0;
  for (const name of keyNames) {
    const usable = String(env?.[name] || "").trim().length > 0;
    status[name] = usable;
    if (usable) enabledCount += 1;
  }
  return {
    enabledCount,
    keyStatus: status,
  };
}

async function runGeminiSmoke(env, requestId) {
  const prompt = `healthcheck:${requestId}`;
  const result = await callGeminiText(env, prompt, {
    keyEnvKeys: [
      "PREMIUM_GEMINI_API_KEY1",
      "PREMIUM_GEMINI_API_KEY2",
      "PREMIUM_GEMINI_API_KEY3",
      "PREMIUM_GEMINI_API_KEY4",
      "PREMIUM_GEMINI_API_KEY5",
      "GEMINI_API_KEY",
      "GOOGLE_GEMINI_API_KEY",
      "GOOGLE_GENERATIVE_AI_API_KEY",
      "GOOGLE_AI_API_KEY",
      "GOOGLE_API_KEY",
      "GEMINIF_API_KEY1",
      "GEMINIF_API_KEY2",
      "GEMINIF_API_KEY3",
      "GEMINIF_API_KEY4",
      "GEMINIF_API_KEY5",
    ],
    modelEnvKeys: ["PREMIUM_GEMINI_MODEL", "GEMINI_MODEL"],
    temperature: 0,
    topP: 0.9,
    maxOutputTokens: 80,
    timeoutMs: 12000,
    maxAttemptsPerPair: 1,
  });

  return {
    ok: Boolean(result?.ok),
    model: String(result?.model || ""),
    message: String(result?.message || ""),
    outputLength: result?.ok ? String(result?.text || "").length : 0,
  };
}

async function handleAdminGeminiHealth(request, env) {
  const adminContext = await authorizeAdminRequest(request, env);
  const requestId = `agh_${Date.now().toString(36)}`;
  const url = new URL(request.url);
  const smoke = String(url.searchParams.get("smoke") || "") === "1";
  const keyStatus = listGeminiKeyStatus(env);
  const smokeResult = smoke ? await runGeminiSmoke(env, requestId) : null;

  return json({
    ok: true,
    requestId,
    adminAuth: true,
    userId: adminContext.userId,
    gemini: {
      ...keyStatus,
      smokeRequested: smoke,
      smokeResult,
    },
  });
}

async function handleAdminPaymentDiagnostics(request, env) {
  const adminContext = await authorizeAdminRequest(request, env);
  await connectDb(env);

  const requestId = `apd_${Date.now().toString(36)}`;
  const serverFeatureKeys = listServerPricedFeatureKeys();
  const frontendFeatureKeys = Array.from(FRONTEND_PAID_FEATURE_KEYS);
  const serverKeySet = new Set(serverFeatureKeys);

  const missingInServer = frontendFeatureKeys.filter((key) => !serverKeySet.has(key));
  const frontendSeen = new Set();
  const duplicatedInFrontend = frontendFeatureKeys.filter((key) => {
    if (frontendSeen.has(key)) return true;
    frontendSeen.add(key);
    return false;
  });

  const invalidPriceRows = Object.entries(FEATURE_KEY_PRICE_TABLE)
    .filter(([, spec]) => !Number.isFinite(Number(spec?.cost)) || Number(spec?.cost) <= 0)
    .map(([featureKey]) => featureKey)
    .sort();

  const invalidUnlockRows = Object.entries(PIG_COIN_UNLOCK_PRODUCTS)
    .filter(([, spec]) => !Number.isFinite(Number(spec?.cost)) || Number(spec?.cost) <= 0)
    .map(([productId]) => productId)
    .sort();

  const legacyUnlockBaselineMismatches = listLegacyUnlockBaselineMismatches();

  const dbOrphanRaw = await PointHistory.distinct("featureKey", {
    kind: "deduct",
    featureKey: { $nin: serverFeatureKeys },
  });

  const dbOrphanFeatureKeys = Array.from(new Set(
    (Array.isArray(dbOrphanRaw) ? dbOrphanRaw : [])
      .map((value) => String(value || "").trim())
      .filter(Boolean),
  )).sort();

  return json({
    ok: true,
    requestId,
    adminAuth: true,
    userId: adminContext.userId,
    diagnostics: {
      serverFeatureKeyCount: serverFeatureKeys.length,
      frontendFeatureKeyCount: frontendFeatureKeys.length,
      missingInServer,
      duplicatedInFrontend,
      invalidPriceRows,
      invalidUnlockRows,
      legacyUnlockBaselineMismatches,
      dbOrphanFeatureKeys,
      serverFeatureKeys,
      frontendFeatureKeys,
    },
  });
}

export async function handleAdminRoutes(request, env) {
  try {
    const method = request.method.toUpperCase();
    const path = getRoutePath(request, "/api/admin");

    if (method === "POST" && path === "/entry/password") {
      return await handleEntryPassword(request, env);
    }

    if (method === "GET" && path === "/keys") {
      return handleKeyHealth(env);
    }

    if (method === "GET" && path === "/diag") {
      return await handleAdminDiag(request, env);
    }

    if (method === "GET" && path === "/gemini-health") {
      return await handleAdminGeminiHealth(request, env);
    }

    if (method === "GET" && path === "/payment-diagnostics") {
      return await handleAdminPaymentDiagnostics(request, env);
    }

    if (path === "/content") {
      if (method === "GET") return await handleContentList(request, env);
      if (method === "POST") return await handleContentCreate(request, env);
      return methodNotAllowed();
    }

    if (path === "/content/diag") {
      if (method === "GET") return await handleContentDiag(request, env);
      return methodNotAllowed();
    }

    if (/^\/content\/by-slug\/[^/]+$/i.test(path)) {
      if (method === "GET") return await handleContentGetBySlug(path, request, env);
      return methodNotAllowed();
    }

    if (/^\/content\/[^/]+\/publish-status$/i.test(path)) {
      if (method === "GET" || method === "POST") return await handleContentPublishStatus(path, request, env);
      return methodNotAllowed();
    }

    if (/^\/content\/[^/]+\/cache-purge$/i.test(path)) {
      if (method === "POST") return await handleContentCachePurge(path, request, env);
      return methodNotAllowed();
    }

    if (/^\/content\/[^/]+\/revisions$/i.test(path)) {
      if (method === "GET") return await handleContentRevisions(path, request, env);
      return methodNotAllowed();
    }

    if (/^\/content\/[^/]+\/restore$/i.test(path)) {
      if (method === "POST") return await handleContentRestore(path, request, env);
      return methodNotAllowed();
    }

    if (/^\/content\/[^/]+$/i.test(path)) {
      if (method === "GET") return await handleContentGetById(path, request, env);
      if (method === "PATCH") return await handleContentPatch(path, request, env);
      if (method === "DELETE") return await handleContentDelete(path, request, env);
      return methodNotAllowed();
    }

    if (path === "/insights") {
      if (method === "GET") return await handleInsightsList(request, env);
      if (method === "POST") return await handleInsightsCreate(request, env);
      return methodNotAllowed();
    }

    if (path === "/insights/upload-image") {
      if (method === "POST") return await handleInsightsUploadImage(request, env);
      return methodNotAllowed();
    }

    if (/^\/insights\/[a-f0-9]{24}$/i.test(path)) {
      if (method === "GET") return await handleInsightsGetById(path, request, env);
      if (method === "PUT") return await handleInsightsUpdate(path, request, env);
      if (method === "PATCH") return await handleInsightsUpdate(path, request, env);
      if (method === "DELETE") return await handleInsightsDelete(path, request, env);
      return methodNotAllowed();
    }

    if (["GET", "POST", "PATCH", "PUT", "DELETE"].includes(method)) return notFound();
    return methodNotAllowed();
  } catch (error) {
    return handleRouteError(error);
  }
}
