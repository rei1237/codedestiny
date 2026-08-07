import { createHash } from "node:crypto";
import { connectDb, mongoose, withMongoRetry } from "../db.js";
import { getOptionalUserFromRequest } from "../auth.js";
import { getEnv } from "../env.js";
import { getRequestMeta, json } from "../http.js";
import {
  AbuseScore,
  ContentEntitlement,
  IdempotencyKey,
  PaidExecutionRecord,
  Payment,
  ProfileCard,
  SecurityEvent,
} from "../models.js";
import { getBillingFeaturePricing } from "../billing-feature-registry.js";

const SECURITY_MESSAGES = Object.freeze({
  LOGIN_REQUIRED: "로그인이 필요해요.",
  PAYMENT_REQUIRED: "결제 확인이 필요해요.",
  OWNER_MISMATCH: "이 결과는 현재 계정에서 볼 수 없어요.",
  IDEMPOTENCY_PROCESSING: "이미 처리 중인 요청이에요.",
  RATE_LIMIT_EXCEEDED: "요청이 잠시 많아졌어요. 조금 뒤 다시 시도해주세요.",
  INVALID_REQUEST: "요청 정보를 확인해 주세요.",
});

const ABUSE_POINTS = Object.freeze({
  OWNER_MISMATCH: 5,
  PAID_ACCESS_BYPASS_ATTEMPT: 7,
  RATE_LIMIT_EXCEEDED: 2,
  INVALID_PRODUCT_PRICE: 8,
  PAYMENT_AMOUNT_MISMATCH: 8,
  PRODUCT_FEATURE_MISMATCH: 8,
  HUGE_PAYLOAD: 3,
  INVALID_FLOW_STEP: 3,
  INVALID_CONTENT_TYPE: 3,
  INVALID_ORIGIN: 5,
});

function cleanText(value, max = 160) {
  return String(value || "").trim().slice(0, max);
}

function isProductionRuntime(env = {}) {
  const value = cleanText(getEnv(env, "NODE_ENV") || getEnv(env, "ENVIRONMENT") || getEnv(env, "CF_PAGES_BRANCH")).toLowerCase();
  return value === "production" || value === "main";
}

export function getSecurityGuardMode(env = {}) {
  const configured = cleanText(getEnv(env, "SECURITY_GUARD_MODE")).toLowerCase();
  if (configured === "off" || configured === "monitor" || configured === "enforce") return configured;
  return isProductionRuntime(env) ? "enforce" : "monitor";
}

function shouldEnforce(env = {}) {
  return getSecurityGuardMode(env) === "enforce";
}

function hashValue(value, secret = "") {
  return createHash("sha256")
    .update(String(secret || "code-destiny-security-log"))
    .update(":")
    .update(String(value || ""))
    .digest("hex");
}

export function getSecuritySubjectHash({ request, env, userId = "", endpoint = "" } = {}) {
  const meta = request ? getRequestMeta(request) : {};
  const secret = getEnv(env, "SECURITY_LOG_HASH_SECRET") || getEnv(env, "JWT_SECRET") || getEnv(env, "AUTH_SECRET") || "";
  return hashValue([userId || "", meta.ip || "unknown", endpoint || ""].join("|"), secret).slice(0, 96);
}

function safeObject(value, depth = 0) {
  if (!value || typeof value !== "object" || depth > 2) return value;
  if (Array.isArray(value)) return value.slice(0, 20).map((entry) => safeObject(entry, depth + 1));
  const output = {};
  for (const [key, entry] of Object.entries(value).slice(0, 40)) {
    if (/password|secret|token|authorization|cookie/i.test(key)) {
      output[key] = "[redacted]";
    } else if (entry && typeof entry === "object") {
      output[key] = safeObject(entry, depth + 1);
    } else {
      output[key] = typeof entry === "string" ? entry.slice(0, 500) : entry;
    }
  }
  return output;
}

function objectIdOrNull(value) {
  const text = cleanText(value, 80);
  return mongoose.Types.ObjectId.isValid(text) ? text : null;
}

function userIdText(value) {
  return cleanText(value, 80);
}

function securityResponse(status, code, message, headers = {}) {
  return json({
    ok: false,
    success: false,
    code,
    reason: code,
    message,
  }, { status, headers });
}

export async function writeSecurityLog({
  env,
  request,
  level = "warn",
  reason,
  userId = "",
  endpoint = "",
  metadata = {},
} = {}) {
  if (getSecurityGuardMode(env) === "off") return null;
  try {
    const meta = request ? getRequestMeta(request) : {};
    const ipHash = request ? getSecuritySubjectHash({ request, env, userId, endpoint: "ip" }) : "";
    return await withSecurityDbOperation(env, () => SecurityEvent.create({
      userId: objectIdOrNull(userId),
      ipHash,
      endpoint: cleanText(endpoint),
      level: ["info", "warn", "error"].includes(level) ? level : "warn",
      reason: cleanText(reason, 120),
      method: cleanText(request?.method, 12),
      userAgent: cleanText(meta.userAgent, 300),
      metadata: safeObject(metadata),
      createdAt: new Date(),
    }));
  } catch (_) {
    return null;
  }
}

function allowedOrigins(env = {}, request = null) {
  const values = [
    request ? new URL(request.url).origin : "",
    getEnv(env, "SITE_BASE_URL"),
    getEnv(env, "AUTH_FRONTEND_BASE_URL"),
    getEnv(env, "NEXT_PUBLIC_SITE_URL"),
    // Capacitor 앱 셸(https://localhost) + 로컬 개발 오리진 — CORS 레이어(worker/index.js:571-572)와 일관.
    // 브라우저는 Origin 을 위조할 수 없어(악성 사이트가 Origin: https://localhost 를 보낼 수 없음) 안전하며,
    // 앱의 민감요청(로그인·결제)이 INVALID_ORIGIN 으로 차단되지 않게 한다.
    "https://localhost",
    "http://localhost",
    "capacitor://localhost",
    ...cleanText(getEnv(env, "SECURITY_ALLOWED_ORIGINS"), 2000).split(","),
  ];
  return new Set(values.map((value) => {
    const raw = cleanText(value, 300).replace(/\/+$/, "");
    if (!raw) return "";
    try {
      return new URL(raw).origin.replace(/\/+$/, "");
    } catch (_) {
      return raw;
    }
  }).filter(Boolean));
}

function originFromHeader(value) {
  const raw = cleanText(value, 500);
  if (!raw) return "";
  try {
    return new URL(raw).origin.replace(/\/+$/, "");
  } catch (_) {
    return raw.replace(/\/+$/, "");
  }
}

export async function validateSensitiveRequest({
  request,
  env,
  endpoint = "",
  userId = "",
  allowedMethods = ["POST"],
  requireJson = true,
  skipOrigin = false,
} = {}) {
  if (getSecurityGuardMode(env) === "off") return { ok: true };
  const method = cleanText(request?.method).toUpperCase();
  if (allowedMethods.length && !allowedMethods.includes(method)) {
    await writeSecurityLog({ env, request, userId, endpoint, reason: "INVALID_METHOD", metadata: { allowedMethods } });
    return shouldEnforce(env)
      ? { ok: false, response: securityResponse(405, "METHOD_NOT_ALLOWED", SECURITY_MESSAGES.INVALID_REQUEST) }
      : { ok: true, monitored: true };
  }

  const contentType = cleanText(request?.headers?.get("content-type"), 160).toLowerCase();
  if (requireJson && ["POST", "PUT", "PATCH", "DELETE"].includes(method) && !contentType.includes("application/json")) {
    await writeSecurityLog({ env, request, userId, endpoint, reason: "INVALID_CONTENT_TYPE", metadata: { contentType } });
    await addAbuseScore({ env, request, userId, endpoint, reason: "INVALID_CONTENT_TYPE" });
    return shouldEnforce(env)
      ? { ok: false, response: securityResponse(400, "INVALID_CONTENT_TYPE", SECURITY_MESSAGES.INVALID_REQUEST) }
      : { ok: true, monitored: true };
  }

  if (!skipOrigin) {
    const origin = originFromHeader(request?.headers?.get("origin"));
    const refererOrigin = originFromHeader(request?.headers?.get("referer"));
    const incoming = origin || refererOrigin;
    if (incoming && !allowedOrigins(env, request).has(incoming)) {
      await writeSecurityLog({ env, request, userId, endpoint, reason: "INVALID_ORIGIN", metadata: { origin: incoming } });
      await addAbuseScore({ env, request, userId, endpoint, reason: "INVALID_ORIGIN" });
      return shouldEnforce(env)
        ? { ok: false, response: securityResponse(403, "INVALID_ORIGIN", SECURITY_MESSAGES.INVALID_REQUEST) }
        : { ok: true, monitored: true };
    }
  }

  return { ok: true };
}

export async function addAbuseScore({ env, request, userId = "", endpoint = "", reason, score } = {}) {
  if (getSecurityGuardMode(env) === "off") return { ok: true, score: 0 };
  try {
    const increment = Number(score || ABUSE_POINTS[reason] || 1);
    const subjectHash = getSecuritySubjectHash({ request, env, userId, endpoint });
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const blockedUntil = increment >= 20 ? new Date(now.getTime() + 60 * 60 * 1000) : undefined;
    const update = {
      $inc: { score: increment },
      $set: { updatedAt: now, expiresAt },
      $setOnInsert: {
        subjectHash,
        userId: objectIdOrNull(userId),
        endpoint: cleanText(endpoint),
        kind: "abuse",
        createdAt: now,
      },
      $push: { lastReasons: { $each: [cleanText(reason, 120)], $slice: -12 } },
    };
    if (blockedUntil) update.$set.blockedUntil = blockedUntil;
    const doc = await withSecurityDbOperation(env, () => AbuseScore.findOneAndUpdate(
      { subjectHash, endpoint: cleanText(endpoint), kind: "abuse" },
      update,
      { upsert: true, new: true, setDefaultsOnInsert: true },
    ).lean());
    if (Number(doc?.score || 0) >= 20 && !doc?.blockedUntil) {
      await withSecurityDbOperation(env, () => AbuseScore.updateOne(
        { _id: doc._id },
        { $set: { blockedUntil: new Date(now.getTime() + 60 * 60 * 1000), updatedAt: now } },
      ));
    }
    if (Number(doc?.score || 0) >= 40) {
      await writeSecurityLog({ env, request, userId, endpoint, level: "error", reason: "ADMIN_REVIEW_REQUIRED", metadata: { score: doc.score } });
    }
    return { ok: true, score: Number(doc?.score || 0), blockedUntil: doc?.blockedUntil || null };
  } catch (_) {
    return { ok: true, score: 0 };
  }
}

// 🔴 이 가드의 Mongo 작업들은 재시도도 per-op 타임아웃도 없이 드라이버 기본값
// (서버선택 8s / 소켓 20s)에만 묶여 있었다. 공유혀 Atlas 가 느려지면 두 작업이 각각 8~10초 창에
// 걸려, **인증조차 없어 거절될 POST /api/billing/checkout 이 21.7초**를 소비했다(프로덕션 실측).
// 이 가드는 원래 실패 시 fail-open 이므로(아래 catch), 짧은 시간 상한을 걸어도 정책이 바뀌지 않는다 —
// 단지 "느린 DB 때문에 모든 결제 요청이 20초 느려지는" 것을 막는다.
const SECURITY_DB_TIMEOUT_MS = 1000;

// 🔴 이 가드는 admission 슬롯을 인증·결제와 동등하게 먹으면 안 된다.
// acquireMongoOperationSlot 은 대기자마다 자기 limit 을 들고 비교하므로(active >= waiter.limit),
// 여기만 낮은 limit 을 주면 **기존 메커니즘 그대로** 우선순위 레인이 생긴다: 전역이 2슬롯 이상
// 차 있으면 보안 가드는 250ms 만 기다리고 포기하고, 남은 슬롯은 인증·결제가 쓴다.
// 포기해도 정책은 안 바뀐다 — 이 가드는 원래 실패 시 fail-open 이다(아래 catch). 반대로 이걸
// 안 두면, 어차피 fail-open 될 조회가 로그인/결제의 슬롯을 뺏어 503 을 만든다.
const SECURITY_DB_MAX_CONCURRENT = 2;
const SECURITY_DB_ADMISSION_TIMEOUT_MS = 250;

const SECURITY_DB_OPERATION_OPTIONS = Object.freeze({
  retries: 0,
  attemptTimeoutMS: SECURITY_DB_TIMEOUT_MS,
  minAttemptTimeoutMS: SECURITY_DB_TIMEOUT_MS,
  respectServerSelectionFloor: false,
  resetOnOperationTimeout: false,
  maxConcurrent: SECURITY_DB_MAX_CONCURRENT,
  admissionTimeoutMS: SECURITY_DB_ADMISSION_TIMEOUT_MS,
});

function withSecurityDbOperation(env, operation) {
  return withMongoRetry(env, operation, SECURITY_DB_OPERATION_OPTIONS);
}

function withSecurityDbTimeout(promise) {
  let timer = null;
  const timeout = new Promise((_resolve, reject) => {
    timer = setTimeout(() => reject(new Error("SECURITY_DB_TIMEOUT")), SECURITY_DB_TIMEOUT_MS);
  });
  // 타이머를 반드시 정리한다 — Workers 에서 대기 중인 타이머가 요청을 살려두면 예산을 낭비한다.
  return Promise.race([promise, timeout]).finally(() => {
    if (timer !== null) clearTimeout(timer);
  });
}

// 소프트블록은 남용 탐지가 걸어 두는 것이고 지속시간이 1시간 단위다. 그런데 그 "차단 안 됨"을
// 확인하려고 모든 결제 요청이 Mongo 읽기 1회를 지불했다 — 공유혀 Atlas 에서는 그것만으로 1초 이상이다.
// 아이솔레이트 안에 짧게 음성 결과만 캐시한다(차단됨은 캐시하지 않아 즉시 반영된다).
const SOFT_BLOCK_NEGATIVE_TTL_MS = 20000;
const softBlockNegativeCache = new Map();

function readSoftBlockNegativeCache(cacheKey) {
  const hit = softBlockNegativeCache.get(cacheKey);
  if (!hit) return false;
  if (Date.now() - hit > SOFT_BLOCK_NEGATIVE_TTL_MS) {
    softBlockNegativeCache.delete(cacheKey);
    return false;
  }
  return true;
}

function rememberSoftBlockNegative(cacheKey) {
  // 아이솔레이트 수명 동안 무한히 커지지 않게 상한을 둔다.
  if (softBlockNegativeCache.size > 500) softBlockNegativeCache.clear();
  softBlockNegativeCache.set(cacheKey, Date.now());
}

export async function checkSoftBlock({ env, request, userId = "", endpoint = "" } = {}) {
  if (!shouldEnforce(env)) return { ok: true };
  try {
    const subjectHash = getSecuritySubjectHash({ request, env, userId, endpoint });
    const cacheKey = `${subjectHash}|${cleanText(endpoint)}`;
    if (readSoftBlockNegativeCache(cacheKey)) return { ok: true, cached: true };
    const doc = await withSecurityDbOperation(env, () => AbuseScore.findOne({
      subjectHash,
      endpoint: cleanText(endpoint),
      kind: "abuse",
      blockedUntil: { $gt: new Date() },
    }).lean());
    if (!doc) {
      rememberSoftBlockNegative(cacheKey);
      return { ok: true };
    }
    return {
      ok: false,
      response: securityResponse(429, "RATE_LIMIT_EXCEEDED", SECURITY_MESSAGES.RATE_LIMIT_EXCEEDED, { "Retry-After": "3600" }),
    };
  } catch (_) {
    return { ok: true };
  }
}

export async function enforceRateLimit({
  env,
  request,
  userId = "",
  endpoint = "",
  key = "",
  limit = 60,
  windowSeconds = 60,
} = {}) {
  if (getSecurityGuardMode(env) === "off") return { ok: true };
  try {
    const nowMs = Date.now();
    const windowMs = Math.max(1, Number(windowSeconds || 60)) * 1000;
    const windowStart = Math.floor(nowMs / windowMs) * windowMs;
    const rateKey = key || userId || getRequestMeta(request).ip || "anonymous";
    const subjectHash = hashValue(["rate", endpoint, rateKey, windowStart].join("|"), getEnv(env, "SECURITY_LOG_HASH_SECRET")).slice(0, 96);
    const now = new Date(nowMs);
    const expiresAt = new Date(nowMs + windowMs * 2);
    const doc = await withSecurityDbOperation(env, () => AbuseScore.findOneAndUpdate(
      { subjectHash, endpoint: cleanText(endpoint), kind: "rate_limit" },
      {
        $inc: { score: 1 },
        $set: { updatedAt: now, expiresAt },
        $setOnInsert: {
          subjectHash,
          userId: objectIdOrNull(userId),
          endpoint: cleanText(endpoint),
          kind: "rate_limit",
          createdAt: now,
          lastReasons: [],
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    ).lean());
    const count = Number(doc?.score || 0);
    if (count <= Number(limit || 60)) return { ok: true, count };
    const retryAfter = String(Math.max(1, Math.ceil((windowStart + windowMs - nowMs) / 1000)));
    await writeSecurityLog({ env, request, userId, endpoint, reason: "RATE_LIMIT_EXCEEDED", metadata: { count, limit, windowSeconds } });
    await addAbuseScore({ env, request, userId, endpoint, reason: "RATE_LIMIT_EXCEEDED" });
    return shouldEnforce(env)
      ? { ok: false, response: securityResponse(429, "RATE_LIMIT_EXCEEDED", SECURITY_MESSAGES.RATE_LIMIT_EXCEEDED, { "Retry-After": retryAfter }) }
      : { ok: true, monitored: true, count };
  } catch (_) {
    return { ok: true };
  }
}

export async function detectAbusePattern({
  env,
  request,
  userId = "",
  endpoint = "",
  methodAllowlist = [],
  maxPayloadBytes = 256 * 1024,
} = {}) {
  if (getSecurityGuardMode(env) === "off") return { ok: true, reasons: [] };
  const reasons = [];
  const meta = getRequestMeta(request);
  const method = cleanText(request?.method).toUpperCase();
  const contentLength = Number(request?.headers?.get("content-length") || 0);
  if (methodAllowlist.length && !methodAllowlist.includes(method)) reasons.push("INVALID_METHOD");
  if (!meta.userAgent) reasons.push("MISSING_USER_AGENT");
  if (Number.isFinite(contentLength) && contentLength > maxPayloadBytes) reasons.push("HUGE_PAYLOAD");
  for (const reason of reasons) {
    await writeSecurityLog({ env, request, userId, endpoint, reason, metadata: { contentLength } });
    if (ABUSE_POINTS[reason]) await addAbuseScore({ env, request, userId, endpoint, reason });
  }
  return { ok: true, reasons };
}

export async function enforceSensitiveEndpointSecurity(options = {}) {
  const {
    env,
    request,
    userId = "",
    endpoint = "",
    allowedMethods = ["POST"],
    requireJson = true,
    skipOrigin = false,
    rateLimit = null,
    rateLimitKey = "",
    maxPayloadBytes,
  } = options;
  const validation = await validateSensitiveRequest({ request, env, userId, endpoint, allowedMethods, requireJson, skipOrigin });
  if (!validation.ok) return validation;

  // 🔴 예전에는 checkSoftBlock → detectAbusePattern → enforceRateLimit 을 **직렬**로 await 했다.
  // 두 Mongo 작업이 서로 독립인데도 순서대로 기다려서, 공유혀 Atlas 에서 각 상한(1s)이 꽉 차면
  // 모든 결제 POST 앞에 2초가 붙었다(결제 1건 = billing POST 2회 = 4초). 병렬로 돌린다.
  // 차단된 사용자의 레이트리밋 카운터도 함께 증가하는데, 그건 무해하며 오히려 더 정확하다.
  const [block, limited] = await Promise.all([
    checkSoftBlock({ env, request, userId, endpoint }),
    rateLimit
      ? enforceRateLimit({
        env,
        request,
        userId,
        endpoint,
        key: rateLimitKey || userId || getRequestMeta(request).ip,
        limit: rateLimit.limit,
        windowSeconds: rateLimit.windowSeconds,
      })
      : Promise.resolve({ ok: true }),
  ]);
  if (!block.ok) return block;

  // 정상 요청에서는 Mongo 를 타지 않는다(reasons 가 비어 있으면 no-op) — 직렬로 둬도 비용이 없다.
  await detectAbusePattern({ env, request, userId, endpoint, methodAllowlist: allowedMethods, maxPayloadBytes });
  return limited;
}

function aiActionFromPath(path = "") {
  const normalized = cleanText(path, 200).toLowerCase();
  if (/\/(start|generate|create|consult)$/.test(normalized)) return "start";
  if (/\/(prepare|ensure-access|access|checkout)$/.test(normalized)) return "ensure";
  if (/\/(message|refine|chat)$/.test(normalized)) return "message";
  if (/\/(result|session|consultation)/.test(normalized) || /^\/[^/]+$/.test(normalized)) return "result";
  return "";
}

export async function enforceAiRouteSecurity({ request, env, serviceKey = "ai", path = "", userId = "" } = {}) {
  const action = aiActionFromPath(path);
  if (!action) return { ok: true };
  const auth = userId ? null : await getOptionalUserFromRequest(request, env).catch(() => null);
  const resolvedUserId = userId || String(auth?.userId || "");
  const method = cleanText(request?.method).toUpperCase();
  const isRead = action === "result" && method === "GET";
  const allowedMethods = isRead ? ["GET"] : ["POST"];
  const endpoint = `ai:${cleanText(serviceKey, 80)}:${action}`;
  const rateLimit = isRead
    ? { limit: 100, windowSeconds: 60 }
    : { limit: 15, windowSeconds: 60 };
  const primary = await enforceSensitiveEndpointSecurity({
    env,
    request,
    userId: resolvedUserId,
    endpoint,
    allowedMethods,
    requireJson: !isRead,
    rateLimit,
    rateLimitKey: `${resolvedUserId || getRequestMeta(request).ip}:${serviceKey}:${action}`,
    maxPayloadBytes: 256 * 1024,
  });
  if (!primary.ok) return primary;
  if (action === "start") {
    const daily = await enforceRateLimit({
      env,
      request,
      userId: resolvedUserId,
      endpoint: `${endpoint}:daily`,
      key: `${resolvedUserId || getRequestMeta(request).ip}:${serviceKey}:start:daily`,
      limit: 60,
      windowSeconds: 24 * 60 * 60,
    });
    if (!daily.ok) return daily;
  }
  return { ok: true };
}

export async function enforceIdempotency({
  env,
  userId = "",
  endpoint = "",
  idempotencyKey = "",
  requestPayload = null,
  ttlSeconds = 10 * 60,
} = {}) {
  const key = cleanText(idempotencyKey, 240);
  if (!key || getSecurityGuardMode(env) === "off") return { ok: true, applied: false };
  await connectDb(env);
  const keyHash = hashValue(key, getEnv(env, "SECURITY_LOG_HASH_SECRET")).slice(0, 96);
  const requestHash = hashValue(JSON.stringify(safeObject(requestPayload || {})), keyHash).slice(0, 96);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + Math.max(1, Number(ttlSeconds || 600)) * 1000);
  const existing = await IdempotencyKey.findOne({ userId: objectIdOrNull(userId), endpoint: cleanText(endpoint), keyHash }).lean();
  if (existing) {
    if (existing.requestHash && existing.requestHash !== requestHash) {
      return { ok: false, response: securityResponse(409, "IDEMPOTENCY_CONFLICT", SECURITY_MESSAGES.IDEMPOTENCY_PROCESSING) };
    }
    if (existing.status === "processing" && existing.expiresAt > now) {
      return { ok: false, response: securityResponse(409, "IDEMPOTENCY_PROCESSING", SECURITY_MESSAGES.IDEMPOTENCY_PROCESSING) };
    }
    return { ok: true, applied: true, existing };
  }
  await IdempotencyKey.create({
    userId: objectIdOrNull(userId),
    endpoint: cleanText(endpoint),
    keyHash,
    requestHash,
    status: "processing",
    expiresAt,
    createdAt: now,
    updatedAt: now,
  });
  return { ok: true, applied: true };
}

export async function completeIdempotency({ env, userId = "", endpoint = "", idempotencyKey = "", status = "success", responseRef = null } = {}) {
  const key = cleanText(idempotencyKey, 240);
  if (!key || getSecurityGuardMode(env) === "off") return;
  try {
    const keyHash = hashValue(key, getEnv(env, "SECURITY_LOG_HASH_SECRET")).slice(0, 96);
    await IdempotencyKey.updateOne(
      { userId: objectIdOrNull(userId), endpoint: cleanText(endpoint), keyHash },
      { $set: { status: status === "failed" ? "failed" : "success", responseRef: safeObject(responseRef || null), updatedAt: new Date() } },
    );
  } catch (_) {}
}

export async function requireOwnership({ env, request, userId, resourceType, resourceId, endpoint = "" } = {}) {
  const id = cleanText(resourceId, 180);
  const owner = objectIdOrNull(userId);
  const ownerText = userIdText(userId);
  if (!ownerText || !id) return { ok: false, response: securityResponse(403, "OWNER_MISMATCH", SECURITY_MESSAGES.OWNER_MISMATCH) };
  await connectDb(env);
  const profileId = cleanText(id, 100);
  let found = null;
  if (resourceType === "profile" && owner) found = await ProfileCard.findOne({ userId: owner, profileId }).select("_id").lean();
  if (resourceType === "payment" && owner) found = await Payment.findOne({ userId: owner, $or: [{ _id: objectIdOrNull(id) }, { impUid: id }, { merchantUid: id }, { requestId: id }, { idempotencyKey: id }] }).select("_id").lean();
  if (resourceType === "entitlement") found = await ContentEntitlement.findOne({ userId: ownerText, $or: [{ _id: objectIdOrNull(id) }, { paymentId: id }, { orderId: id }, { idempotencyKey: id }] }).select("_id").lean();
  if (resourceType === "paidExecution") found = await PaidExecutionRecord.findOne({ userId: ownerText, $or: [{ _id: objectIdOrNull(id) }, { requestId: id }, { paymentId: id }, { orderId: id }, { idempotencyKey: id }, { executionId: id }] }).select("_id").lean();
  if (found) return { ok: true, resource: found };
  await writeSecurityLog({ env, request, userId, endpoint, reason: "OWNER_MISMATCH", metadata: { resourceType, resourceId: id } });
  await addAbuseScore({ env, request, userId, endpoint, reason: "OWNER_MISMATCH" });
  return { ok: false, response: securityResponse(403, "OWNER_MISMATCH", SECURITY_MESSAGES.OWNER_MISMATCH) };
}

export async function validateProductAccess({
  env,
  request,
  userId = "",
  endpoint = "",
  productKey = "",
  featureKey = "",
  amountFromClient,
  amountFromProvider,
} = {}) {
  const resolved = getBillingFeaturePricing({ featureKey: featureKey || productKey, subFeatureKey: productKey });
  if (!resolved?.ok || !resolved.pricing) {
    await writeSecurityLog({ env, request, userId, endpoint, reason: "INVALID_PRODUCT_KEY", metadata: { productKey, featureKey } });
    await addAbuseScore({ env, request, userId, endpoint, reason: "PAID_ACCESS_BYPASS_ATTEMPT" });
    return { ok: false, response: securityResponse(400, "INVALID_PRODUCT_KEY", SECURITY_MESSAGES.INVALID_REQUEST) };
  }
  const expected = Number(resolved.pricing.amountKRW || resolved.pricing.cashPrice || 0);
  const client = amountFromClient === undefined || amountFromClient === null || amountFromClient === "" ? expected : Number(amountFromClient);
  const provider = amountFromProvider === undefined || amountFromProvider === null || amountFromProvider === "" ? expected : Number(amountFromProvider);
  if ((Number.isFinite(client) && client !== expected) || (Number.isFinite(provider) && provider !== expected)) {
    await writeSecurityLog({ env, request, userId, endpoint, reason: "PAYMENT_AMOUNT_MISMATCH", metadata: { expected, client, provider } });
    await addAbuseScore({ env, request, userId, endpoint, reason: "PAYMENT_AMOUNT_MISMATCH" });
    return { ok: false, response: securityResponse(400, "PAYMENT_AMOUNT_MISMATCH", SECURITY_MESSAGES.INVALID_REQUEST) };
  }
  return { ok: true, pricing: resolved.pricing };
}

export const SECURITY_ERROR_MESSAGES = SECURITY_MESSAGES;
