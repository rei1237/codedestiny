import { connectDb, withMongoRetry, isTransientMongoError } from "../lib/db.js";
import { requireUserFromRequest, isAuthDbInfraError } from "../lib/auth.js";
import {
  CONTENT_ENTITLEMENT_SCOPES,
  CONTENT_ENTITLEMENT_SERVICE_KEYS,
  CONTENT_ENTITLEMENT_SOURCES,
  CONTENT_ENTITLEMENT_STATUSES,
  Payment,
  PointHistory,
  ProfileCard,
  SAJU_LOCKED_CONTENT_KEYS,
} from "../lib/models.js";
import {
  findActivePaidContentUnlock,
  getUnlockedContentSnapshot,
  upsertContentUnlock,
} from "../lib/content-unlocks.js";
import { createHttpError, getRoutePath, handleRouteError, json, methodNotAllowed, notFound } from "../lib/http.js";

const ZIWEI_SERVICE_KEY = "ziwei";
const ZIWEI_LOCKED_CONTENT_KEYS = Object.freeze({
  DECADE_LUCK: "ziwei.decadeLuck",
  LOVE_DEEP: "ziwei.loveDeep",
  TWELVE_PALACES: "ziwei.twelvePalaces",
  SYMBOLIC_LAYER: "ziwei.symbolicLayer",
  LIFE_YEARLY_FLOW: "ziwei.lifeYearlyFlow",
});

const KNOWN_CONTENT_KEYS_BY_SERVICE = {
  [CONTENT_ENTITLEMENT_SERVICE_KEYS.SAJU]: Object.values(SAJU_LOCKED_CONTENT_KEYS),
  [ZIWEI_SERVICE_KEY]: Object.values(ZIWEI_LOCKED_CONTENT_KEYS),
};

const SAJU_FEATURE_KEY_BY_CONTENT_KEY = {
  [SAJU_LOCKED_CONTENT_KEYS.DAEUN_ANALYSIS]: "section_daewun",
  [SAJU_LOCKED_CONTENT_KEYS.FULL_READING]: "section_summary",
  [SAJU_LOCKED_CONTENT_KEYS.COMPATIBILITY]: "section_compat",
};

const ZIWEI_FEATURE_KEY_BY_CONTENT_KEY = {
  [ZIWEI_LOCKED_CONTENT_KEYS.DECADE_LUCK]: "ziwei_decade_luck",
  [ZIWEI_LOCKED_CONTENT_KEYS.LOVE_DEEP]: "ziwei_love_deep",
  [ZIWEI_LOCKED_CONTENT_KEYS.TWELVE_PALACES]: "ziwei_twelve_palaces",
  [ZIWEI_LOCKED_CONTENT_KEYS.SYMBOLIC_LAYER]: "ziwei_symbolic_layer",
  [ZIWEI_LOCKED_CONTENT_KEYS.LIFE_YEARLY_FLOW]: "ziwei_life_yearly_flow",
};

const PROFILE_FEATURE_KEY_BY_CONTENT_KEY = {
  ...SAJU_FEATURE_KEY_BY_CONTENT_KEY,
  ...ZIWEI_FEATURE_KEY_BY_CONTENT_KEY,
};

const PROFILE_CONTENT_KEY_BY_FEATURE_KEY = Object.fromEntries(
  Object.entries(PROFILE_FEATURE_KEY_BY_CONTENT_KEY).map(([contentKey, featureKey]) => [featureKey, contentKey]),
);

const BACKFILL_SUCCESS_PAYMENT_STATUSES = ["success", "paid", "fulfilled"];
const BACKFILL_BLOCKED_PAYMENT_STATUSES = ["failed", "cancelled", "refunded", "pending", "expired"];
const BACKFILL_PASS_ACCESS_TYPES = ["membership_pass", "membership_credit"];
const BACKFILL_PASS_ACCESS_METHODS = ["PASS", "MONTHLY"];

function sanitizeAccessKey(value, maxLen = 120) {
  return String(value || "").trim().slice(0, maxLen);
}

function normalizeContentKey(value) {
  const key = sanitizeAccessKey(value, 160);
  return PROFILE_CONTENT_KEY_BY_FEATURE_KEY[key] || key;
}

function normalizeServiceKey(value, contentKey = "") {
  const explicitServiceKey = sanitizeAccessKey(value, 80);
  if (explicitServiceKey) return explicitServiceKey;
  const key = normalizeContentKey(contentKey);
  for (const [serviceKey, contentKeys] of Object.entries(KNOWN_CONTENT_KEYS_BY_SERVICE)) {
    if ((contentKeys || []).includes(key)) return serviceKey;
  }
  return CONTENT_ENTITLEMENT_SERVICE_KEYS.SAJU;
}

function normalizeServiceKeys(value) {
  const rawKeys = String(value || "")
    .split(",")
    .map((key) => sanitizeAccessKey(key, 80))
    .filter(Boolean);
  const knownKeys = rawKeys.filter((key) => Object.prototype.hasOwnProperty.call(KNOWN_CONTENT_KEYS_BY_SERVICE, key));
  if (knownKeys.length) return Array.from(new Set(knownKeys));
  return [rawKeys[0] || CONTENT_ENTITLEMENT_SERVICE_KEYS.SAJU];
}

function normalizeUnlockSource(value) {
  const source = String(value || "").trim().toLowerCase();
  if (source === "coin") return CONTENT_ENTITLEMENT_SOURCES.COIN;
  if (source === "pass") return CONTENT_ENTITLEMENT_SOURCES.PASS;
  if (source === "monthly") return CONTENT_ENTITLEMENT_SOURCES.MONTHLY;
  if (source === "admin") return CONTENT_ENTITLEMENT_SOURCES.ADMIN;
  if (source === "migration") return CONTENT_ENTITLEMENT_SOURCES.BACKFILL;
  return "";
}

function toApiUnlockSource(value) {
  const source = String(value || "").trim().toUpperCase();
  if (source === CONTENT_ENTITLEMENT_SOURCES.COIN) return "coin";
  if (source === CONTENT_ENTITLEMENT_SOURCES.PASS) return "pass";
  if (source === CONTENT_ENTITLEMENT_SOURCES.MONTHLY) return "monthly";
  if (source === CONTENT_ENTITLEMENT_SOURCES.ADMIN) return "admin";
  if (source === CONTENT_ENTITLEMENT_SOURCES.BACKFILL) return "migration";
  return "";
}

function toIsoString(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function readAccessHeader(request, name) {
  try {
    return String(request.headers.get(name) || "").trim();
  } catch {
    return "";
  }
}

function createAccessRequestId(request) {
  const incoming = readAccessHeader(request, "x-request-id") || readAccessHeader(request, "x-correlation-id");
  if (incoming) return incoming.slice(0, 120);
  const cfRay = readAccessHeader(request, "cf-ray");
  if (cfRay) return `cf-${cfRay.slice(0, 80)}`;
  if (globalThis.crypto && typeof globalThis.crypto.randomUUID === "function") return globalThis.crypto.randomUUID();
  return `access-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function hashAccessLogValue(value) {
  const input = String(value || "");
  if (!input) return "";
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `h${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

function getAccessDeploySha(env) {
  return String(env?.CF_PAGES_COMMIT_SHA || env?.COMMIT_SHA || env?.DEPLOY_COMMIT_SHA || "").slice(0, 80);
}

function getAccessErrorCode(error) {
  return String(error?.code || error?.errorCode || error?.name || "UNEXPECTED_ACCESS_ERROR").slice(0, 120);
}

function logAccessUnlocksTrace(level, fields) {
  const line = { event: "access.unlocks.lookup", ...fields };
  const writer = level === "error" ? console.error : level === "warn" ? console.warn : console.info;
  try {
    writer(JSON.stringify(line));
  } catch {
    writer(line);
  }
}

function createLockedMap(serviceKeys) {
  const unlocks = {};
  const keys = Array.isArray(serviceKeys) ? serviceKeys : [serviceKeys];
  for (const serviceKey of keys) {
    for (const contentKey of KNOWN_CONTENT_KEYS_BY_SERVICE[serviceKey] || []) {
      unlocks[contentKey] = { unlocked: false };
    }
  }
  return unlocks;
}

function normalizeStatus(value) {
  return String(value || "").trim().toLowerCase();
}

function isSuccessPaymentStatus(value) {
  const status = normalizeStatus(value);
  return BACKFILL_SUCCESS_PAYMENT_STATUSES.includes(status)
    && !BACKFILL_BLOCKED_PAYMENT_STATUSES.includes(status);
}

function isBackfillablePassHistory(history) {
  const metadata = history?.metadata && typeof history.metadata === "object" ? history.metadata : {};
  const accessType = String(metadata.accessType || "").trim();
  const accessMethod = String(metadata.accessMethod || metadata.paymentMethod || "").trim().toUpperCase();
  const transactionType = String(metadata.transactionType || "").trim().toLowerCase();
  return BACKFILL_PASS_ACCESS_TYPES.includes(accessType)
    || BACKFILL_PASS_ACCESS_METHODS.includes(accessMethod);
}

function isObjectIdLike(value) {
  return /^[a-f0-9]{24}$/i.test(String(value || "").trim());
}

function hasHistoryProfileScope(history, profileId) {
  const metadata = history?.metadata && typeof history.metadata === "object" ? history.metadata : {};
  return String(metadata.profileId || "").trim() === profileId
    || String(metadata.selectedProfileId || "").trim() === profileId;
}

function toEntitlementBodyFromEvidence({ userId, profileId, serviceKey, contentKey, evidence }) {
  const payment = evidence?.payment || null;
  const history = evidence?.history || null;
  const metadata = history?.metadata && typeof history.metadata === "object" ? history.metadata : {};
  const createdAt = history?.createdAt || payment?.paidAt || payment?.updatedAt || payment?.createdAt || new Date();
  return {
    userId,
    profileId,
    serviceKey,
    contentKey,
    scope: CONTENT_ENTITLEMENT_SCOPES.PROFILE,
    status: CONTENT_ENTITLEMENT_STATUSES.ACTIVE,
    source: CONTENT_ENTITLEMENT_SOURCES.BACKFILL,
    orderId: String(payment?.merchantUid || history?.merchantUid || metadata.merchantUid || ""),
    paymentId: String(payment?._id || history?.paymentId || metadata.paymentId || ""),
    passId: String(metadata.passId || metadata.purchaseId || metadata.requestId || history?._id || ""),
    coinAmount: Math.max(0, Math.floor(Number(payment?.coinPrice || payment?.expectedChargedPoints || metadata.coinPrice || metadata.coinCost || Math.abs(Number(history?.delta || 0)) || 0))),
    unlockedAt: createdAt,
    expiresAt: null,
  };
}

async function findPaymentForHistory(history) {
  const metadata = history?.metadata && typeof history.metadata === "object" ? history.metadata : {};
  const candidates = [
    history?.paymentId,
    metadata.paymentId,
    metadata.purchaseId,
  ].map((value) => String(value || "").trim()).filter(isObjectIdLike);

  if (!candidates.length) return null;

  return Payment.findOne({
    _id: { $in: candidates },
    status: { $in: BACKFILL_SUCCESS_PAYMENT_STATUSES },
    paymentType: "digital_content",
  }).select("_id merchantUid status paymentType featureKey coinPrice expectedChargedPoints paidAt createdAt updatedAt pricingSnapshot").lean();
}

async function findBackfillEvidence({ userId, profileId, contentKey }) {
  const featureKey = PROFILE_FEATURE_KEY_BY_CONTENT_KEY[contentKey] || "";
  if (!featureKey) return null;
  const featureAliases = Array.from(new Set([featureKey, contentKey].filter(Boolean)));

  const histories = await PointHistory.find({
    userId,
    kind: "deduct",
    featureKey: { $in: featureAliases },
    $or: [
      { "metadata.profileId": profileId },
      { "metadata.selectedProfileId": profileId },
    ],
  }).sort({ createdAt: -1 }).limit(20).lean();

  for (const history of histories) {
    if (!hasHistoryProfileScope(history, profileId)) continue;

    const payment = await findPaymentForHistory(history);
    if (payment) {
      if (isSuccessPaymentStatus(payment.status)) return { history, payment };
      continue;
    }

    if (isBackfillablePassHistory(history)) return { history, payment: null };
  }

  const payment = await Payment.findOne({
    userId,
    paymentType: "digital_content",
    status: { $in: BACKFILL_SUCCESS_PAYMENT_STATUSES },
    $and: [
      {
        $or: [
          { "pricingSnapshot.profileId": profileId },
          { "pricingSnapshot.selectedProfileId": profileId },
        ],
      },
      {
        $or: [
          { featureKey: { $in: featureAliases } },
          { contentKey: { $in: featureAliases } },
          { contentId: { $in: featureAliases } },
          { "pricingSnapshot.featureKey": { $in: featureAliases } },
          { "pricingSnapshot.contentKey": { $in: featureAliases } },
          { "pricingSnapshot.contentId": { $in: featureAliases } },
        ],
      },
    ],
  }).sort({ paidAt: -1, updatedAt: -1, createdAt: -1 }).select("_id merchantUid status paymentType featureKey coinPrice expectedChargedPoints paidAt createdAt updatedAt pricingSnapshot").lean();

  if (payment && isSuccessPaymentStatus(payment.status)) return { history: null, payment };
  return null;
}

async function upsertBackfillUnlock({ userId, profileId, serviceKey, contentKey, evidence }) {
  const body = toEntitlementBodyFromEvidence({ userId, profileId, serviceKey, contentKey, evidence });
  return upsertContentUnlock(body);
}

async function backfillMissingUnlocks({ userId, profileId, serviceKey, existingDocs }) {
  const contentKeys = KNOWN_CONTENT_KEYS_BY_SERVICE[serviceKey] || [];
  if (!contentKeys.length) return [];

  const existingKeys = new Set((existingDocs || []).map((doc) => String(doc?.contentKey || "")));
  const created = [];

  for (const contentKey of contentKeys) {
    if (existingKeys.has(contentKey)) continue;

    const evidence = await findBackfillEvidence({ userId, profileId, contentKey });
    if (!evidence) continue;

    const doc = await upsertBackfillUnlock({ userId, profileId, serviceKey, contentKey, evidence });
    if (doc) created.push(doc);
  }

  return created;
}

async function verifyProfileOwnership({ userId, profileId }) {
  const profile = await ProfileCard.findOne({ userId, profileId }).select("_id profileId").lean();
  if (!profile) {
    throw createHttpError(404, "Profile was not found.", { code: "PROFILE_NOT_FOUND" });
  }
  return profile;
}

function toUnlockStatusPayload({ userId, profileId, serviceKey, contentKey, doc }) {
  return {
    ok: true,
    userId,
    profileId,
    serviceKey,
    contentKey,
    unlocked: Boolean(doc?._id),
    source: toApiUnlockSource(doc?.source),
    unlockSource: toApiUnlockSource(doc?.source),
    unlockedAt: toIsoString(doc?.unlockedAt),
    orderId: String(doc?.orderId || ""),
  };
}

async function handleStatus(request, env) {
  if (request.method !== "GET") return methodNotAllowed();

  const url = new URL(request.url);
  const auth = await requireUserFromRequest(request, env);
  const userId = String(auth.userId || "");
  const profileId = sanitizeAccessKey(url.searchParams.get("profileId"), 100);
  const featureKey = sanitizeAccessKey(url.searchParams.get("featureKey"), 160);
  const contentKey = normalizeContentKey(url.searchParams.get("contentKey") || featureKey);
  const serviceKey = normalizeServiceKey(url.searchParams.get("serviceKey"), contentKey);

  if (!profileId) throw createHttpError(403, "Profile ownership could not be verified.", { code: "MISSING_PROFILE_ID" });
  if (!contentKey) throw createHttpError(400, "Content key is required.", { code: "MISSING_CONTENT_KEY" });

  await connectDb(env);
  // 일시적 풀 초기화에도 해금 상태를 정확히 반환하도록 조회를 재시도로 감싼다(handleUnlocks와 동일 패턴).
  const doc = await withMongoRetry(env, async () => {
    await verifyProfileOwnership({ userId, profileId });
    return findActivePaidContentUnlock({ userId, profileId, serviceKey, contentKey, featureKey });
  });
  return json(toUnlockStatusPayload({ userId, profileId, serviceKey, contentKey, doc }));
}

async function readJsonBody(request) {
  try {
    const body = await request.json();
    return body && typeof body === "object" ? body : {};
  } catch {
    return {};
  }
}

async function handleConfirm(request, env) {
  if (request.method !== "POST") return methodNotAllowed();

  const auth = await requireUserFromRequest(request, env);
  const userId = String(auth.userId || "");
  const body = await readJsonBody(request);
  const profileId = sanitizeAccessKey(body.profileId, 100);
  const featureKey = sanitizeAccessKey(body.featureKey, 160);
  const contentKey = normalizeContentKey(body.contentKey || featureKey);
  const serviceKey = normalizeServiceKey(body.serviceKey, contentKey);
  const source = normalizeUnlockSource(body.unlockSource || body.source);
  const orderId = sanitizeAccessKey(body.orderId, 160);

  if (!profileId) throw createHttpError(403, "Profile ownership could not be verified.", { code: "MISSING_PROFILE_ID" });
  if (!contentKey) throw createHttpError(400, "Content key is required.", { code: "MISSING_CONTENT_KEY" });
  if (!source) throw createHttpError(400, "Unlock source is invalid.", { code: "INVALID_UNLOCK_SOURCE" });

  await connectDb(env);
  const existing = await withMongoRetry(env, async () => {
    await verifyProfileOwnership({ userId, profileId });
    return findActivePaidContentUnlock({ userId, profileId, serviceKey, contentKey, featureKey });
  });
  if (existing) {
    return json(toUnlockStatusPayload({ userId, profileId, serviceKey, contentKey, doc: existing }));
  }

  const isAdmin = String(auth.role || "").toLowerCase() === "admin" || auth.isAdmin === true;
  if (source === CONTENT_ENTITLEMENT_SOURCES.ADMIN && !isAdmin) {
    throw createHttpError(403, "Admin unlock is not allowed.", { code: "ADMIN_UNLOCK_FORBIDDEN" });
  }
  if (source !== CONTENT_ENTITLEMENT_SOURCES.ADMIN) {
    const evidence = await findBackfillEvidence({ userId, profileId, contentKey });
    if (!evidence) throw createHttpError(409, "Unlock evidence was not found.", { code: "UNLOCK_EVIDENCE_NOT_FOUND" });
  }

  const doc = await upsertContentUnlock({
    userId,
    profileId,
    serviceKey,
    contentKey,
    scope: CONTENT_ENTITLEMENT_SCOPES.PROFILE,
    status: CONTENT_ENTITLEMENT_STATUSES.ACTIVE,
    source,
    orderId,
    unlockedBy: source === CONTENT_ENTITLEMENT_SOURCES.ADMIN ? userId : "",
    unlockedAt: new Date(),
    expiresAt: null,
  });

  return json(toUnlockStatusPayload({ userId, profileId, serviceKey, contentKey, doc }));
}

async function handleUnlocks(request, env) {
  if (request.method !== "GET") return methodNotAllowed();

  const startedAt = Date.now();
  const requestId = createAccessRequestId(request);
  const metrics = {
    requestId,
    route: "/api/access/unlocks",
    method: "GET",
    userHash: "",
    profileId: "",
    serviceKey: "",
    serviceKeys: [],
    includeBackfill: false,
    dbQueryCount: 0,
    internalFetchCount: 0,
    cache: "none",
    commitSha: getAccessDeploySha(env),
  };

  try {
    const url = new URL(request.url);
    const auth = await requireUserFromRequest(request, env);
    const userId = String(auth.userId || "");
    const profileId = sanitizeAccessKey(url.searchParams.get("profileId"), 100);
    const serviceKeyParam = sanitizeAccessKey(
      url.searchParams.get("serviceKey") || CONTENT_ENTITLEMENT_SERVICE_KEYS.SAJU,
      80,
    );
    const serviceKeys = normalizeServiceKeys(serviceKeyParam);
    const serviceKey = serviceKeys.join(",");
    const includeBackfill = url.searchParams.get("backfill") === "1"
      || url.searchParams.get("includeBackfill") === "1";

    Object.assign(metrics, {
      userHash: hashAccessLogValue(userId),
      profileId,
      serviceKey,
      serviceKeys,
      includeBackfill,
    });

    if (!profileId) {
      throw createHttpError(403, "Profile ownership could not be verified.", { code: "MISSING_PROFILE_ID" });
    }

    const activeDocs = await withMongoRetry(env, async () => {
      const profileStartedAt = Date.now();
      metrics.dbQueryCount += 1;
      await verifyProfileOwnership({ userId, profileId });
      metrics.profileLookupMs = Date.now() - profileStartedAt;

      const snapshotStartedAt = Date.now();
      metrics.dbQueryCount += 1;
      const snapshot = await getUnlockedContentSnapshot({ userId, profileId, serviceKeys });
      metrics.snapshotLookupMs = Date.now() - snapshotStartedAt;
      return Array.isArray(snapshot?.docs) ? snapshot.docs : [];
    });

    const unlocks = createLockedMap(serviceKeys);
    const unlockedContentKeys = [];

    for (const doc of activeDocs) {
      const contentKey = sanitizeAccessKey(doc?.contentKey, 160);
      if (!contentKey) continue;

      unlocks[contentKey] = {
        unlocked: true,
        source: doc.source,
        unlockedAt: toIsoString(doc.unlockedAt),
        expiresAt: toIsoString(doc.expiresAt),
      };
      unlockedContentKeys.push(contentKey);
    }

    const uniqueContentKeys = Array.from(new Set(unlockedContentKeys));
    logAccessUnlocksTrace("info", {
      ...metrics,
      status: 200,
      durationMs: Date.now() - startedAt,
      entitlementCount: uniqueContentKeys.length,
      accessResult: uniqueContentKeys.length ? "unlocked" : "locked",
    });

    return json({
      ok: true,
      requestId,
      profileId,
      serviceKey,
      serviceKeys,
      unlockedContentKeys: uniqueContentKeys,
      unlocks,
    });
  } catch (error) {
    error.accessUnlocksRequestId = error.accessUnlocksRequestId || requestId;
    logAccessUnlocksTrace("warn", {
      ...metrics,
      status: Number(error?.status || error?.statusCode || 503),
      durationMs: Date.now() - startedAt,
      errorCode: getAccessErrorCode(error),
      originalErrorName: String(error?.name || "Error").slice(0, 120),
      stack: String(error?.stack || "").slice(0, 2000),
    });
    throw error;
  }
}
export async function handleAccessRoutes(request, env) {
  const routePath = getRoutePath(request, "/api/access");
  const trace = { route: "access", method: request.method, requestPath: new URL(request.url).pathname };

  try {
    if (routePath === "/status") return await handleStatus(request, env);
    if (routePath === "/confirm") return await handleConfirm(request, env);
    if (routePath === "/unlocks") return await handleUnlocks(request, env);
    return notFound();
  } catch (error) {
    // 접근 판정 읽기(GET)는 일시적 Mongo 블립을 하드 503으로 죽이지 말고, 클라가 재시도할 수 있게
    // 표준 소프트-503(retryable/DB_DEGRADED)로 내린다. 쓰기(/confirm POST)는 이중제출 방지 위해 제외.
    if (request.method === "GET" && (isTransientMongoError(error) || isAuthDbInfraError(error))) {
      return json({
        ok: false,
        retryable: true,
        reason: "DB_DEGRADED",
        code: "ACCESS_LOOKUP_TEMPORARILY_UNAVAILABLE",
        requestId: error?.accessUnlocksRequestId || createAccessRequestId(request),
        message: "Access lookup is temporarily unavailable. Please retry shortly.",
      }, { status: 503 });
    }
    return handleRouteError(error, { request, env, trace });
  }
}
