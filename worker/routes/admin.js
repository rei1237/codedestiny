import { getEnv } from "../lib/env.js";
import { buildRuntimeKeyMatrix } from "../lib/key-health.js";
import { connectDb } from "../lib/db.js";
import { requireAuth } from "../lib/auth.js";
import { Insight } from "../lib/models.js";
import { createHttpError, getRoutePath, handleRouteError, json, methodNotAllowed, notFound, readJson } from "../lib/http.js";

const ADMIN_ENTRY_PASSWORD_SHA256_LIST = [
  // current admin entry password: kangta!7989
  "f76a173ef47f93eec43168e10fc32dcbefb2d32200c44cbd33e4f0324437fb4e",
];

const FLOWER_TOKEN_TTL_SEC = 8 * 60 * 60;
const INSIGHT_STATUS_SET = new Set(["draft", "published", "private", "trash"]);
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
  } catch {
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
  } catch {
    return false;
  }

  const exp = Number(payload?.exp || 0);
  const nowSec = Math.floor(Date.now() / 1000);
  return payload?.v === 1 && Number.isFinite(exp) && nowSec <= exp;
}

async function authorizeAdminRequest(request, env) {
  if (await verifyFlowerAdminToken(request, env)) {
    return { mode: "flower" };
  }

  const auth = await requireAuth(request, env).catch(() => null);
  if (auth && String(auth.role || "").toLowerCase() === "admin") {
    return { mode: "jwt", auth };
  }

  throw createHttpError(403, "Admin access is required.", { code: "FORBIDDEN" });
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
    { new: true },
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
    { new: true },
  ).lean();

  if (!updated) throw createHttpError(404, "Not found.", { code: "NOT_FOUND" });
  return json({ ok: true, item: updated });
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

export async function handleAdminRoutes(request, env) {
  try {
    const method = request.method.toUpperCase();
    const path = getRoutePath(request, "/api/admin");

    if (method === "POST" && path === "/entry/password") {
      return handleEntryPassword(request, env);
    }

    if (method === "GET" && path === "/keys") {
      return handleKeyHealth(env);
    }

    if (path === "/insights") {
      if (method === "GET") return handleInsightsList(request, env);
      if (method === "POST") return handleInsightsCreate(request, env);
      return methodNotAllowed();
    }

    if (path === "/insights/upload-image") {
      if (method === "POST") return handleInsightsUploadImage(request, env);
      return methodNotAllowed();
    }

    if (/^\/insights\/[a-f0-9]{24}$/i.test(path)) {
      if (method === "GET") return handleInsightsGetById(path, request, env);
      if (method === "PUT") return handleInsightsUpdate(path, request, env);
      if (method === "DELETE") return handleInsightsDelete(path, request, env);
      return methodNotAllowed();
    }

    if (["GET", "POST", "PATCH", "PUT", "DELETE"].includes(method)) return notFound();
    return methodNotAllowed();
  } catch (error) {
    return handleRouteError(error);
  }
}
