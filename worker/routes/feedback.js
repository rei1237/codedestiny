// 버그 제보실 공개 API.
//
// 제보는 로그인 사용자만 작성할 수 있다(스팸 최소화 + 회신 경로 확보). 저장 → 관리자 알림이
// 한 요청 안에서 돌되, 알림 실패가 접수를 실패시키지 않도록 ctx.waitUntil 로 분리한다.

import { createHash } from "node:crypto";

import { connectDb, withMongoRetry } from "../lib/db.js";
import { getOptionalUserFromRequest, isAuthDbInfraError } from "../lib/auth.js";
import { getEnv } from "../lib/env.js";
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
import { notifyNewFeedback } from "../lib/feedback-notify.js";
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
 * 첨부 키 정규화. 전용 버킷(FEEDBACK_IMAGES_BUCKET)으로 분리되면서 "다른 용도 오브젝트 열람"
 * 위험은 구조적으로 사라졌지만, 경로 조작(.. / 선행 슬래시 / 역슬래시 / 과길이)은 여기서 계속 막는다.
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
  const bucket = env?.FEEDBACK_IMAGES_BUCKET;
  if (!bucket || typeof bucket.put !== "function") {
    throw createHttpError(503, "첨부 저장소가 설정되지 않았습니다.", {
      code: "ATTACHMENT_STORAGE_NOT_CONFIGURED",
      requiredBindings: ["FEEDBACK_IMAGES_BUCKET"],
    });
  }
  return bucket;
}

/**
 * 첨부 오브젝트를 R2 에서 읽어 Response 로 만든다. 소유자 검사는 호출부가 한다(uploaderId 대조).
 */
export async function readFeedbackAttachmentObject(env, rawKey, { requireUploaderId = "" } = {}) {
  const key = normalizeFeedbackKey(rawKey);
  if (!key) return notFound();

  const bucket = env?.FEEDBACK_IMAGES_BUCKET;
  if (!bucket || typeof bucket.get !== "function") {
    throw createHttpError(503, "첨부 저장소가 설정되지 않았습니다.", {
      code: "ATTACHMENT_STORAGE_NOT_CONFIGURED",
      requiredBindings: ["FEEDBACK_IMAGES_BUCKET"],
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
/**
 * 🔴 인증을 DB 임계경로에서 뺀다.
 *
 * 예전에는 surfaceDbInfraError:true 로 원본 infra 에러를 던졌는데, 이 워커의 Mongo 왕복이
 * 요청당 4초를 넘고 connectDb 가드가 10초라 **제보 접수가 100% 실패했다**(feedbacks 컬렉션
 * 문서 0건). 유료/권한 라우트라면 그 엄격함이 맞지만 버그 제보 폼은 금전·권한이 없으므로,
 * 서명이 검증된 JWT 면 DB 확인을 못 해도 통과시킨다(allowDbFallback → authDbFallback:true).
 * 진짜 게스트(토큰 없음/무효)는 종전대로 null → 401.
 *
 * 🔴 여기를 withMongoRetry 로 감싸지 말 것 — auth.js 내부에서 이미 재시도한다.
 */
async function resolveAuth(request, env) {
  const auth = await getOptionalUserFromRequest(request, env, { allowDbFallback: true });
  if (!auth?.userId) throw createHttpError(401, "로그인이 필요합니다.", { code: "UNAUTHORIZED" });
  return auth;
}

// 라벨 정본을 서버가 내려준다. 프론트에 한글 라벨을 하드코딩하면 반드시 어긋나기 때문이다.
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

  const bucket = env?.FEEDBACK_IMAGES_BUCKET;
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

  // 🔴 여기서 connectDb 를 미리 부르지 않는다. 아래 DB 작업은 전부 withMongoRetry 를 거치고
  //    그 안에서 시도마다 connectDb 를 부른다(db.js). 앞에서 한 번 더 부르면, 연결이 안 서는
  //    동안 본문 파싱·검증조차 못 하고 요청이 통째로 죽는다 — 아래 '메일 우선' 폴백이
  //    도달할 기회 자체를 잃는다.
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
  // 🔴 중복 사전검사는 편의 기능이지 접수 조건이 아니다. 예전에는 이 조회가 실패하면 제보 전체가
  //    503으로 죽었다 — 사용자가 쓴 글을 날리면서까지 지킬 값어치가 없다. 재시도 없이 한 번만
  //    시도하고, 실패하면 중복검사를 건너뛰고 접수를 계속한다(최악의 결과는 중복 1건).
  const duplicate = await withMongoRetry(env, () => Feedback
    .findOne({ contentHash, createdAt: { $gte: since } })
    .select("_id createdAt")
    .lean(), { retries: 0 }).catch(() => null);
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

  // 작성자 표시값은 인증이 이미 읽은 User 문서에서 온다(auth.name/auth.email) — 여기서 다시
  // User.findById 를 치면 순수한 중복 왕복이고, 이 워커의 Mongo 왕복은 요청당 4초를 넘는다.
  const meta = getRequestMeta(request) || {};

  // 🔴 저장은 이 기능의 유일한 쓰기인데 이 파일에서 유일하게 재시도가 없었다(읽기 3곳은 전부 있음).
  //    일시적 풀 초기화 한 번에 사용자가 쓴 제보가 통째로 날아간다. 문서를 먼저 한 번만 만들어
  //    _id 를 고정한 뒤 재시도를 건다 — 앞선 시도가 실제로는 저장에 성공했더라도 같은 _id 재삽입은
  //    중복키(11000)로 튕기므로 문서가 두 건 생기지 않는다.
  const doc = new Feedback({
    userId: String(auth.userId),
    authorName: clampText(auth.name, 60),
    authorEmail: clampText(auth.email, 200).toLowerCase(),
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
  // 🔴 저장 실패가 곧 제보 유실이면 안 된다. 이 폼의 목적은 '관리자에게 닿는 것'이고,
  //    알림 메일은 Resend HTTP 호출이라 DB 를 전혀 타지 않는다. DB 인프라 장애일 때만
  //    메일 우선 모드로 내려간다 — 스키마 검증 실패 같은 진짜 잘못된 요청은 그대로 전파한다.
  let persisted = true;
  try {
    await withMongoRetry(env, () => doc.save().catch((error) => {
      if (Number(error?.code) === 11000) return doc; // 앞선 시도가 이미 저장에 성공했다.
      throw error;
    }));
  } catch (error) {
    if (!isAuthDbInfraError(error)) throw error;
    persisted = false;
    console.error("[feedback] persist failed, falling back to email-only:", String(error?.message || error));
  }

  const notifyOptions = {
    attachmentUrls: attachments.map((file) => buildAttachmentUrl(request, file.key)),
  };

  if (persisted) {
    const notify = notifyNewFeedback(env, doc, notifyOptions)
      .then((result) => Feedback.updateOne(
        { _id: doc._id },
        { $set: { notifiedAt: new Date(), notifyError: clampText(result?.error, 300) } },
      ))
      .catch(() => {});

    // ctx 가 없는 경로(직접 import·테스트)에서 dangling promise 를 남기면 Workers 가 응답
    // 반환 시점에 취소해 메일이 조용히 유실된다. 그때만 await 로 폴백한다.
    if (typeof ctx?.waitUntil === "function") ctx.waitUntil(notify);
    else await notify;
  } else {
    // 저장이 없으면 메일이 유일한 전달 경로다. 백그라운드로 돌리면 실패를 알 수 없어
    // "접수됐다"고 거짓말하게 되므로 여기서만 await 하고, 메일이 **실제로** 나갔을 때만
    // 성공으로 답한다(수신자 미설정으로 skip 된 것도 전달 실패로 친다).
    const result = await notifyNewFeedback(env, doc, notifyOptions);
    const email = (Array.isArray(result?.results) ? result.results : []).find((entry) => entry?.channel === "email");
    if (!email?.ok || email?.skipped) {
      throw createHttpError(503, "지금은 제보를 접수하지 못했습니다. 잠시 후 다시 시도해 주세요.", {
        code: "FEEDBACK_PERSIST_AND_NOTIFY_FAILED",
      });
    }
  }

  return json({
    ok: true,
    persisted,
    item: {
      id: String(doc._id),
      ticketNo: buildTicketNo(doc),
      status: doc.status,
      createdAt: (doc.createdAt ? new Date(doc.createdAt) : new Date()).toISOString(),
    },
    message: persisted
      ? "제보가 접수되었습니다. 확인 후 업데이트에 반영하겠습니다."
      : "제보가 관리자에게 전달되었습니다. 확인 후 업데이트에 반영하겠습니다.",
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
      // 🔴 문구는 유지하되 무엇이 죽었는지는 남긴다. 이 catch 가 모든 DB 계열 예외를 같은 한
      //    문장으로 뭉갠 탓에, "제보가 한 건도 저장된 적 없다"는 영구 장애가 '일시적'으로
      //    위장돼 있었다. code/reason 이 있으면 재현 1회로 원인이 드러난다.
      console.error("[feedback] db-infra failure:", getRoutePath(request, "/api/feedback"), String(error?.message || error));
      return json({
        ok: false,
        error: "service_unavailable",
        code: "DB_DEGRADED",
        reason: clampText(error?.name || "", 60),
        message: "일시적으로 제보실을 이용할 수 없습니다. 잠시 후 다시 시도해 주세요.",
      }, { status: 503 });
    }
    return handleRouteError(error);
  }
}
