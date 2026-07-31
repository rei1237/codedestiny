// 버그 제보실 공개 API.
//
// 제보는 로그인 사용자만 작성할 수 있다(스팸 최소화 + 회신 경로 확보). 저장 → 관리자 알림이
// 한 요청 안에서 돌되, 알림 실패가 접수를 실패시키지 않도록 ctx.waitUntil 로 분리한다.

import { createHash } from "node:crypto";

import { connectDb, withMongoRetry } from "../lib/db.js";
import { isAuthDbInfraError, requireUserFromRequest } from "../lib/auth.js";
import { getEnv } from "../lib/env.js";
import { User } from "../lib/models.js";
import {
  createHttpError,
  getRequestMeta,
  getRoutePath,
  handleRouteError,
  json,
  methodNotAllowed,
  notFound,
  readJson,
} from "../lib/http.js";
import {
  enforceSensitiveEndpointSecurity,
  getSecuritySubjectHash,
} from "../lib/security/index.js";
import { screenReviewText } from "../lib/review-moderation.js";
import { notifyNewFeedback, getSiteBaseUrl } from "../lib/feedback-notify.js";
import {
  FEEDBACK_ALLOWED_MIME,
  FEEDBACK_CATEGORY_LABELS,
  FEEDBACK_CATEGORY_LIST,
  FEEDBACK_CONTENT_MAX_LENGTH,
  FEEDBACK_CONTENT_MIN_LENGTH,
  FEEDBACK_MAX_ATTACHMENTS,
  FEEDBACK_MAX_FILE_BYTES,
  FEEDBACK_PRIORITY_LABELS,
  FEEDBACK_STATUS_LABELS,
  FEEDBACK_TITLE_MAX_LENGTH,
  Feedback,
} from "../lib/feedback-models.js";

const SUPPORTED_LOCALES = new Set(["ko", "ja", "zh", "en"]);
const CATEGORY_SET = new Set(FEEDBACK_CATEGORY_LIST);
const ALLOWED_MIME_SET = new Set(FEEDBACK_ALLOWED_MIME);
const FEEDBACK_KEY_PREFIX = "feedback/";
const DUPLICATE_WINDOW_MS = 24 * 60 * 60 * 1000;
const MINE_PAGE_SIZE = 20;
const META_CACHE_HEADERS = Object.freeze({ "Cache-Control": "public, max-age=300" });
// 🔴 첨부는 사적인 스크린샷이다. insights 의 immutable 1년 캐시를 그대로 쓰면
//    개인정보가 CF 엣지에 장기 잔류한다.
const ATTACHMENT_CACHE_HEADERS = Object.freeze({ "Cache-Control": "private, max-age=0, no-store" });

function toText(value) {
  return String(value || "").trim();
}

function clampText(value, max) {
  return toText(value).slice(0, max);
}

// ── 업로드 헬퍼 ──────────────────────────────────────────────────────────────
// admin.js 에서 export 해 재사용하면 feedback 라우트가 admin.js 청크 전체를 끌어와
// Worker 1MB 번들 제약에 걸린다. 4개 헬퍼만 의도적으로 복제한다.
function normalizeUploadFileName(rawName) {
  const noExt = String(rawName || "image")
    .replace(/\.[^.]+$/, "")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

  return noExt || "image";
}

// 🔴 file.type 을 믿지 않는다 — 확장자·MIME 은 위조 가능하고 매직바이트는 아니다.
function inferImageMimeFromMagic(bytes) {
  if (!bytes || bytes.length < 12) return "";

  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";

  if (
    bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47
    && bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a
  ) {
    return "image/png";
  }

  if (
    bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46
    && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
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

// 키에 userId 를 넣지 않는다 — 읽기 URL 로 사용자 식별자가 새는 것을 피한다.
// 소유권은 customMetadata.uploaderId 로 확인한다.
function buildFeedbackAttachmentKey(fileName, mimeType) {
  const now = new Date();
  const yyyy = String(now.getUTCFullYear());
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  const ext = extensionFromMime(mimeType) || "jpg";
  return `${FEEDBACK_KEY_PREFIX}${yyyy}/${mm}/${Date.now()}-${randomHex(8)}-${normalizeUploadFileName(fileName)}.${ext}`;
}

/**
 * 🔴 이 함수가 R2 버킷 공유(INSIGHT_IMAGES_BUCKET)의 유일한 실질 위험을 막는 지점이다.
 * feedback/ 접두를 강제하지 않으면 insights/ 원본 이미지를 이 라우트로 열람할 수 있다.
 * (쓰기 키는 서버가 100% 생성하므로 덮어쓰기 위험은 구조적으로 없다.)
 */
export function normalizeFeedbackKey(rawKey) {
  let decoded = "";
  try {
    decoded = decodeURIComponent(String(rawKey || "")).trim();
  } catch (e) {
    return "";
  }
  if (!decoded) return "";
  if (decoded.length > 512) return "";
  if (decoded.includes("..") || decoded.includes("\\")) return "";
  if (decoded.startsWith("/")) return "";
  if (!decoded.startsWith(FEEDBACK_KEY_PREFIX)) return "";
  return decoded;
}

function guessMimeFromKey(key) {
  const lower = String(key || "").toLowerCase();
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  return "application/octet-stream";
}

function encodePathSegments(path) {
  return String(path || "")
    .split("/")
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

function buildAttachmentUrl(request, key) {
  const origin = new URL(request.url).origin;
  return `${origin}/api/feedback/attachments/${encodePathSegments(key)}`;
}

function resolveBucket(env) {
  const bucket = env?.INSIGHT_IMAGES_BUCKET;
  if (!bucket || typeof bucket.put !== "function") {
    throw createHttpError(503, "첨부 저장소가 설정되지 않았습니다.", {
      code: "ATTACHMENT_STORAGE_NOT_CONFIGURED",
      requiredBindings: ["INSIGHT_IMAGES_BUCKET"],
    });
  }
  return bucket;
}

/**
 * 첨부 오브젝트를 R2 에서 읽어 Response 로 만든다.
 * 소유자 검사는 호출부가 한다(사용자 라우트는 uploaderId 대조, 관리자 라우트는 관리자 인증).
 * admin-feedback.js 가 이 함수를 재사용한다.
 */
export async function readFeedbackAttachmentObject(env, rawKey, { requireUploaderId = "" } = {}) {
  const key = normalizeFeedbackKey(rawKey);
  if (!key) return notFound();

  const bucket = env?.INSIGHT_IMAGES_BUCKET;
  if (!bucket || typeof bucket.get !== "function") {
    throw createHttpError(503, "첨부 저장소가 설정되지 않았습니다.", {
      code: "ATTACHMENT_STORAGE_NOT_CONFIGURED",
      requiredBindings: ["INSIGHT_IMAGES_BUCKET"],
    });
  }

  const object = await bucket.get(key);
  if (!object) return notFound();

  if (requireUploaderId && String(object.customMetadata?.uploaderId || "") !== String(requireUploaderId)) {
    throw createHttpError(403, "이 첨부에 접근할 권한이 없습니다.", { code: "FORBIDDEN" });
  }

  const headers = new Headers();
  if (typeof object.writeHttpMetadata === "function") object.writeHttpMetadata(headers);
  if (!headers.has("Content-Type")) headers.set("Content-Type", guessMimeFromKey(key));
  // 업로드 시 걸어둔 no-store 를 존중하되, 누락돼 있으면 여기서라도 반드시 채운다.
  headers.set("Cache-Control", ATTACHMENT_CACHE_HEADERS["Cache-Control"]);
  headers.set("X-Content-Type-Options", "nosniff");

  const etag = String(object.httpEtag || "");
  if (etag) headers.set("ETag", etag);

  return new Response(object.body, { status: 200, headers });
}

// ── 중복 탐지 ────────────────────────────────────────────────────────────────
function normalizeForHash(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[.,!?~·…"'"'()[\]{}]/g, "")
    .trim();
}

function buildContentHash(userId, category, title, content) {
  return createHash("sha256")
    .update([userId, category, normalizeForHash(title), normalizeForHash(content)].join("|"))
    .digest("hex");
}

// ── Turnstile (env 미설정 시 완전 무동작) ────────────────────────────────────
async function verifyTurnstileIfConfigured(env, request, token) {
  const secret = toText(getEnv(env, "TURNSTILE_SECRET_KEY"));
  if (!secret) return { ok: true, skipped: true };

  const form = new FormData();
  form.append("secret", secret);
  form.append("response", toText(token));
  const ip = getRequestMeta(request)?.ip;
  if (ip && ip !== "unknown") form.append("remoteip", ip);

  try {
    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body: form,
    });
    const data = await response.json().catch(() => null);
    if (data?.success === true) return { ok: true };
    return { ok: false, codes: Array.isArray(data?.["error-codes"]) ? data["error-codes"] : [] };
  } catch (error) {
    // 🔴 fail-open. 이미 로그인 필수 + 레이트리밋이 걸려 있고, Cloudflare 장애 때문에
    //    버그 제보가 막히는 쪽이 캡차 우회보다 나쁘다.
    console.warn("[feedback] turnstile verify failed, allowing:", String(error?.message || error));
    return { ok: true, degraded: true };
  }
}

// ── 직렬화 ───────────────────────────────────────────────────────────────────
function toEntryList(value, maxItems, maxValueLength) {
  if (!Array.isArray(value)) return [];
  return value
    .slice(0, maxItems)
    .map((entry) => ({
      key: clampText(entry?.key, 40),
      label: clampText(entry?.label, 60),
      value: clampText(entry?.value, maxValueLength),
    }))
    .filter((entry) => entry.value && (entry.key || entry.label));
}

// 🔴 adminNote·meta.ipHash·autoFlagReasons·assignee*·tags 는 사용자 응답에 절대 싣지 않는다.
function toOwnFeedbackItem(doc, request) {
  return {
    id: String(doc?._id || ""),
    category: toText(doc?.category),
    categoryLabel: FEEDBACK_CATEGORY_LABELS[doc?.category] || "",
    title: toText(doc?.title),
    content: toText(doc?.content),
    url: toText(doc?.url),
    status: toText(doc?.status),
    statusLabel: FEEDBACK_STATUS_LABELS[doc?.status] || "",
    details: Array.isArray(doc?.details) ? doc.details.map((entry) => ({ key: entry?.key || "", label: entry?.label || "", value: entry?.value || "" })) : [],
    attachments: (Array.isArray(doc?.attachments) ? doc.attachments : []).map((file) => ({
      key: toText(file?.key),
      url: buildAttachmentUrl(request, toText(file?.key)),
      mimeType: toText(file?.mimeType),
      size: Number(file?.size || 0),
    })),
    replies: (Array.isArray(doc?.replies) ? doc.replies : []).map((reply) => ({
      body: toText(reply?.body),
      authorName: toText(reply?.authorName),
      createdAt: reply?.createdAt ? new Date(reply.createdAt).toISOString() : "",
    })),
    createdAt: doc?.createdAt ? new Date(doc.createdAt).toISOString() : "",
    updatedAt: doc?.updatedAt ? new Date(doc.updatedAt).toISOString() : "",
  };
}

// ── 라우트 핸들러 ────────────────────────────────────────────────────────────
async function resolveAuth(request, env) {
  // 🔴 requireUserFromRequest를 withMongoRetry로 감싸지 말 것 — 내부에서 이미 재시도한다.
  const auth = await requireUserFromRequest(request, env, { surfaceDbInfraError: true });
  if (!auth?.userId) throw createHttpError(401, "로그인이 필요합니다.", { code: "UNAUTHORIZED" });
  return auth;
}

// 라벨 정본을 서버가 내려준다. 프론트 두 곳(/feedback, /admin/feedback)에 한글 라벨을
// 하드코딩하면 반드시 어긋나기 때문이다.
function handleMeta() {
  return json({
    ok: true,
    categories: FEEDBACK_CATEGORY_LIST.map((id) => ({ id, label: FEEDBACK_CATEGORY_LABELS[id] })),
    statuses: Object.entries(FEEDBACK_STATUS_LABELS).map(([id, label]) => ({ id, label })),
    priorities: Object.entries(FEEDBACK_PRIORITY_LABELS).map(([id, label]) => ({ id, label })),
    limits: {
      titleMaxLength: FEEDBACK_TITLE_MAX_LENGTH,
      contentMinLength: FEEDBACK_CONTENT_MIN_LENGTH,
      contentMaxLength: FEEDBACK_CONTENT_MAX_LENGTH,
      maxAttachments: FEEDBACK_MAX_ATTACHMENTS,
      maxFileBytes: FEEDBACK_MAX_FILE_BYTES,
      allowedMimeTypes: FEEDBACK_ALLOWED_MIME,
    },
  }, { headers: META_CACHE_HEADERS });
}

async function handleUpload(request, env) {
  const auth = await resolveAuth(request, env);

  // 🔴 requireJson:false + maxPayloadBytes 상향이 필수다. 기본값(JSON/256KB)을 그대로 쓰면
  //    정상 업로드가 전부 400 으로 막히고 HUGE_PAYLOAD 남용 점수가 쌓여 소프트블록이 걸린다.
  const security = await enforceSensitiveEndpointSecurity({
    env,
    request,
    userId: auth.userId,
    endpoint: "feedback:upload",
    allowedMethods: ["POST"],
    requireJson: false,
    rateLimit: { limit: 20, windowSeconds: 600 },
    rateLimitKey: `feedback:upload:${auth.userId}`,
    maxPayloadBytes: FEEDBACK_MAX_FILE_BYTES + 64 * 1024,
  });
  if (!security.ok) return security.response;

  const contentType = String(request.headers.get("content-type") || "").toLowerCase();
  if (!contentType.includes("multipart/form-data")) {
    throw createHttpError(400, "첨부는 multipart/form-data 로 업로드해야 합니다.", { code: "INVALID_UPLOAD_CONTENT_TYPE" });
  }

  const bucket = resolveBucket(env);

  const formData = await request.formData();
  const file = formData.get("file");
  if (!file || typeof file.arrayBuffer !== "function") {
    throw createHttpError(400, "파일이 필요합니다.", { code: "UPLOAD_FILE_REQUIRED" });
  }

  const rawSize = Number(file.size || 0) || 0;
  if (rawSize <= 0) {
    throw createHttpError(400, "빈 파일은 업로드할 수 없습니다.", { code: "UPLOAD_FILE_EMPTY" });
  }
  if (rawSize > FEEDBACK_MAX_FILE_BYTES) {
    throw createHttpError(413, "파일이 너무 큽니다. 최대 6MB까지 첨부할 수 있습니다.", { code: "UPLOAD_FILE_TOO_LARGE" });
  }

  const fileBytes = new Uint8Array(await file.arrayBuffer());
  const sniffedMime = inferImageMimeFromMagic(fileBytes);
  if (!sniffedMime || !ALLOWED_MIME_SET.has(sniffedMime)) {
    throw createHttpError(400, "jpg, png, webp 이미지만 첨부할 수 있습니다.", { code: "UPLOAD_FILE_TYPE_NOT_ALLOWED" });
  }

  const claimedMime = String(file.type || "").toLowerCase();
  if (claimedMime && !ALLOWED_MIME_SET.has(claimedMime)) {
    throw createHttpError(400, "지원하지 않는 파일 형식입니다.", { code: "UPLOAD_FILE_TYPE_NOT_ALLOWED" });
  }

  const key = buildFeedbackAttachmentKey(file.name, sniffedMime);
  const safeName = normalizeUploadFileName(file.name);

  await bucket.put(key, fileBytes, {
    httpMetadata: {
      contentType: sniffedMime,
      cacheControl: ATTACHMENT_CACHE_HEADERS["Cache-Control"],
      contentDisposition: `inline; filename="${safeName}.${extensionFromMime(sniffedMime)}"`,
    },
    customMetadata: {
      uploaderId: String(auth.userId),
      uploadedAt: String(Date.now()),
      originalName: safeName.slice(0, 100),
    },
  });

  return json({
    ok: true,
    item: {
      key,
      url: buildAttachmentUrl(request, key),
      mimeType: sniffedMime,
      size: rawSize,
    },
  }, { status: 201 });
}

async function handleAttachmentRead(path, request, env) {
  const auth = await resolveAuth(request, env);
  const encodedKey = String(path || "").slice("/attachments/".length);
  return await readFeedbackAttachmentObject(env, encodedKey, { requireUploaderId: auth.userId });
}

/**
 * 클라이언트가 보낸 첨부 키를 R2 실물과 대조한다.
 * 존재하지 않거나 남의 파일이면 조용히 버리고, 크기는 R2 실측값을 쓴다.
 */
async function resolveAttachments(env, rawList, userId) {
  const keys = (Array.isArray(rawList) ? rawList : [])
    .slice(0, FEEDBACK_MAX_ATTACHMENTS)
    .map((item) => normalizeFeedbackKey(typeof item === "string" ? item : item?.key))
    .filter(Boolean);

  if (!keys.length) return [];

  const bucket = env?.INSIGHT_IMAGES_BUCKET;
  if (!bucket || typeof bucket.head !== "function") return [];

  const resolved = [];
  for (const key of keys) {
    const head = await bucket.head(key).catch(() => null);
    if (!head) continue;
    if (String(head.customMetadata?.uploaderId || "") !== String(userId)) continue;
    resolved.push({
      key,
      originalName: clampText(head.customMetadata?.originalName, 200),
      mimeType: clampText(head.httpMetadata?.contentType, 80) || guessMimeFromKey(key),
      size: Number(head.size || 0) || 0,
    });
  }
  return resolved;
}

async function handleCreate(request, env, ctx) {
  const auth = await resolveAuth(request, env);

  const security = await enforceSensitiveEndpointSecurity({
    env,
    request,
    userId: auth.userId,
    endpoint: "feedback:create",
    allowedMethods: ["POST"],
    requireJson: true,
    rateLimit: { limit: 5, windowSeconds: 600 },
    rateLimitKey: `feedback:create:${auth.userId}`,
    maxPayloadBytes: 64 * 1024,
  });
  if (!security.ok) return security.response;

  await connectDb(env);
  const body = await readJson(request);

  const category = toText(body?.category);
  if (!CATEGORY_SET.has(category)) {
    throw createHttpError(400, "제보 유형을 선택해 주세요.", { code: "INVALID_CATEGORY" });
  }

  const title = clampText(body?.title, FEEDBACK_TITLE_MAX_LENGTH);
  if (!title) {
    throw createHttpError(400, "제목을 입력해 주세요.", { code: "VALIDATION_ERROR" });
  }

  const content = toText(body?.content);
  if (content.length < FEEDBACK_CONTENT_MIN_LENGTH) {
    throw createHttpError(400, `내용을 ${FEEDBACK_CONTENT_MIN_LENGTH}자 이상 입력해 주세요.`, { code: "VALIDATION_ERROR" });
  }
  if (content.length > FEEDBACK_CONTENT_MAX_LENGTH) {
    throw createHttpError(400, `내용은 ${FEEDBACK_CONTENT_MAX_LENGTH}자 이하로 입력해 주세요.`, { code: "VALIDATION_ERROR" });
  }

  const turnstile = await verifyTurnstileIfConfigured(env, request, body?.turnstileToken);
  if (!turnstile.ok) {
    throw createHttpError(403, "자동 입력 방지 확인에 실패했습니다. 다시 시도해 주세요.", { code: "CAPTCHA_FAILED" });
  }

  // 🔴 screenReviewText 를 그대로 차단 게이트로 쓰지 않는다. 광고 패턴에 URL 정규식이 들어 있어
  //    "문제가 난 페이지 주소"를 담는 정상 제보를 대부분 막아버린다. 욕설만 하드 차단하고
  //    나머지는 관리자 트리아지 신호로 저장한다. review-moderation.js 는 수정하지 않는다.
  const screening = screenReviewText({ title, body: content, isVerifiedPurchase: true });
  const flags = Array.isArray(screening?.flags) ? screening.flags : [];
  if (flags.includes("profanity")) {
    throw createHttpError(400, "부적절한 표현이 포함되어 있습니다.", { code: "PROFANITY_BLOCKED" });
  }

  const contentHash = buildContentHash(auth.userId, category, title, content);
  const since = new Date(Date.now() - DUPLICATE_WINDOW_MS);
  const duplicate = await withMongoRetry(env, () => Feedback
    .findOne({ contentHash, createdAt: { $gte: since } })
    .select("_id createdAt")
    .lean());
  if (duplicate) {
    throw createHttpError(409, "같은 내용의 제보가 이미 접수되었습니다.", {
      code: "DUPLICATE_FEEDBACK",
      existingId: String(duplicate._id || ""),
    });
  }

  const localeRaw = toText(body?.locale).toLowerCase();
  const locale = SUPPORTED_LOCALES.has(localeRaw) ? localeRaw : "ko";
  const client = toEntryList(body?.environment, 24, 500);
  const details = toEntryList(body?.details, 12, 1000);
  const url = clampText(body?.url, 1000);
  const attachments = await resolveAttachments(env, body?.attachments, auth.userId);

  const userDoc = await withMongoRetry(env, () => User.findById(auth.userId)
    .select("name email")
    .lean()).catch(() => null);

  const meta = getRequestMeta(request) || {};
  const doc = await Feedback.create({
    userId: String(auth.userId),
    authorName: clampText(userDoc?.name || auth.name, 60),
    authorEmail: clampText(userDoc?.email || auth.email, 200).toLowerCase(),
    category,
    title,
    content,
    locale,
    details,
    attachments,
    client,
    url,
    // 🔴 IP 원문은 저장하지 않는다 — 그 자체로 개인정보다.
    meta: {
      ipHash: getSecuritySubjectHash({ request, env, userId: auth.userId, endpoint: "feedback" }),
      userAgent: clampText(meta.userAgent, 300),
      requestId: clampText(meta.requestId, 120),
    },
    contentHash,
    autoFlagReasons: flags,
  });

  const notify = notifyNewFeedback(env, doc, {
    siteBaseUrl: getSiteBaseUrl(env),
    attachmentUrls: attachments.map((file) => buildAttachmentUrl(request, file.key)),
  })
    .then((result) => Feedback.updateOne(
      { _id: doc._id },
      { $set: { notifiedAt: new Date(), notifyError: clampText(result?.error, 300) } },
    ))
    .catch(() => {});

  // ctx 가 없는 경로(직접 import·테스트)에서 dangling promise 를 남기면 Workers 가 응답
  // 반환 시점에 취소해 메일이 조용히 유실된다. 그때만 await 로 폴백한다.
  if (typeof ctx?.waitUntil === "function") ctx.waitUntil(notify);
  else await notify;

  return json({
    ok: true,
    item: {
      id: String(doc._id),
      ticketNo: buildTicketNo(doc),
      status: doc.status,
      createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : "",
    },
    message: "제보가 접수되었습니다. 확인 후 업데이트에 반영하겠습니다.",
  }, { status: 201 });
}

// 사용자에게 보여줄 짧은 티켓 번호. ObjectId 는 생성 시각이 앞 4바이트에 들어 있어
// 별도 시퀀스 없이도 "연월-일련" 형태를 만들 수 있다.
export function buildTicketNo(doc) {
  const id = String(doc?._id || "");
  if (!id) return "";
  const createdAt = doc?.createdAt ? new Date(doc.createdAt) : new Date();
  const yy = String(createdAt.getUTCFullYear()).slice(2);
  const mm = String(createdAt.getUTCMonth() + 1).padStart(2, "0");
  return `CD-${yy}${mm}-${id.slice(-6).toUpperCase()}`;
}

async function handleMine(request, env) {
  const auth = await resolveAuth(request, env);

  const security = await enforceSensitiveEndpointSecurity({
    env,
    request,
    userId: auth.userId,
    endpoint: "feedback:mine",
    allowedMethods: ["GET"],
    requireJson: false,
    rateLimit: { limit: 60, windowSeconds: 60 },
    rateLimitKey: `feedback:mine:${auth.userId}`,
  });
  if (!security.ok) return security.response;

  await connectDb(env);

  const url = new URL(request.url);
  const limitRaw = Number.parseInt(String(url.searchParams.get("limit") || ""), 10);
  const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(limitRaw, MINE_PAGE_SIZE) : MINE_PAGE_SIZE;

  const items = await withMongoRetry(env, () => Feedback
    .find({ userId: String(auth.userId) })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean());

  return json({
    ok: true,
    items: (Array.isArray(items) ? items : []).map((doc) => ({
      ...toOwnFeedbackItem(doc, request),
      ticketNo: buildTicketNo(doc),
    })),
  });
}

async function handleMineDetail(path, request, env) {
  const auth = await resolveAuth(request, env);
  await connectDb(env);

  const id = String(path || "").slice("/mine/".length);
  if (!/^[a-f0-9]{24}$/i.test(id)) return notFound();

  const doc = await withMongoRetry(env, () => Feedback.findById(id).lean());
  if (!doc) return notFound();
  if (String(doc.userId || "") !== String(auth.userId)) {
    throw createHttpError(403, "이 제보를 볼 권한이 없습니다.", { code: "FORBIDDEN" });
  }

  return json({ ok: true, item: { ...toOwnFeedbackItem(doc, request), ticketNo: buildTicketNo(doc) } });
}

export async function handleFeedbackRoutes(request, env, ctx) {
  try {
    const method = request.method.toUpperCase();
    const path = getRoutePath(request, "/api/feedback");

    if (path === "/") {
      if (method === "POST") return await handleCreate(request, env, ctx);
      return methodNotAllowed();
    }

    if (path === "/meta") {
      if (method === "GET") return handleMeta();
      return methodNotAllowed();
    }

    if (path === "/mine") {
      if (method === "GET") return await handleMine(request, env);
      return methodNotAllowed();
    }

    if (path.startsWith("/mine/")) {
      if (method === "GET") return await handleMineDetail(path, request, env);
      return methodNotAllowed();
    }

    if (path === "/attachments") {
      if (method === "POST") return await handleUpload(request, env);
      return methodNotAllowed();
    }

    if (path.startsWith("/attachments/")) {
      if (method === "GET") return await handleAttachmentRead(path, request, env);
      return methodNotAllowed();
    }

    if (["GET", "POST", "PATCH", "PUT", "DELETE"].includes(method)) return notFound();
    return methodNotAllowed();
  } catch (error) {
    // 일시적 DB 장애를 확정 401로 세탁하면 로그인 사용자가 로그아웃된다(ghost login 회귀).
    if (isAuthDbInfraError(error)) {
      return json({
        ok: false,
        error: "service_unavailable",
        message: "일시적으로 제보실을 이용할 수 없습니다. 잠시 후 다시 시도해 주세요.",
      }, { status: 503 });
    }
    return handleRouteError(error);
  }
}
