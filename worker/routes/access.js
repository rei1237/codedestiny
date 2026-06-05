import { connectDb } from "../lib/db.js";
import { requireUserFromRequest } from "../lib/auth.js";
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
  getUnlockedContentKeys,
  upsertContentUnlock,
} from "../lib/content-unlocks.js";
import { createHttpError, getRoutePath, handleRouteError, json, methodNotAllowed, notFound } from "../lib/http.js";

const KNOWN_CONTENT_KEYS_BY_SERVICE = {
  [CONTENT_ENTITLEMENT_SERVICE_KEYS.SAJU]: Object.values(SAJU_LOCKED_CONTENT_KEYS),
};

const SAJU_FEATURE_KEY_BY_CONTENT_KEY = {
  [SAJU_LOCKED_CONTENT_KEYS.DAEUN_ANALYSIS]: "section_daewun",
  [SAJU_LOCKED_CONTENT_KEYS.FULL_READING]: "section_summary",
  [SAJU_LOCKED_CONTENT_KEYS.COMPATIBILITY]: "section_compat",
};

const SAJU_CONTENT_KEY_BY_FEATURE_KEY = Object.fromEntries(
  Object.entries(SAJU_FEATURE_KEY_BY_CONTENT_KEY).map(([contentKey, featureKey]) => [featureKey, contentKey]),
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
  return SAJU_CONTENT_KEY_BY_FEATURE_KEY[key] || key;
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

function createLockedMap(serviceKey) {
  const unlocks = {};
  for (const contentKey of KNOWN_CONTENT_KEYS_BY_SERVICE[serviceKey] || []) {
    unlocks[contentKey] = { unlocked: false };
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
    || BACKFILL_PASS_ACCESS_METHODS.includes(accessMethod)
    || transactionType === "usage_pass";
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
  const featureKey = SAJU_FEATURE_KEY_BY_CONTENT_KEY[contentKey] || "";
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
  if (serviceKey !== CONTENT_ENTITLEMENT_SERVICE_KEYS.SAJU) return [];

  const existingKeys = new Set((existingDocs || []).map((doc) => String(doc?.contentKey || "")));
  const created = [];

  for (const contentKey of Object.values(SAJU_LOCKED_CONTENT_KEYS)) {
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
  const serviceKey = sanitizeAccessKey(url.searchParams.get("serviceKey") || CONTENT_ENTITLEMENT_SERVICE_KEYS.SAJU, 80);

  if (!profileId) throw createHttpError(403, "Profile ownership could not be verified.", { code: "MISSING_PROFILE_ID" });
  if (!contentKey) throw createHttpError(400, "Content key is required.", { code: "MISSING_CONTENT_KEY" });

  await connectDb(env);
  await verifyProfileOwnership({ userId, profileId });

  const doc = await findActivePaidContentUnlock({ userId, profileId, serviceKey, contentKey, featureKey });
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
  const serviceKey = sanitizeAccessKey(body.serviceKey || CONTENT_ENTITLEMENT_SERVICE_KEYS.SAJU, 80);
  const source = normalizeUnlockSource(body.unlockSource || body.source);
  const orderId = sanitizeAccessKey(body.orderId, 160);

  if (!profileId) throw createHttpError(403, "Profile ownership could not be verified.", { code: "MISSING_PROFILE_ID" });
  if (!contentKey) throw createHttpError(400, "Content key is required.", { code: "MISSING_CONTENT_KEY" });
  if (!source) throw createHttpError(400, "Unlock source is invalid.", { code: "INVALID_UNLOCK_SOURCE" });

  await connectDb(env);
  await verifyProfileOwnership({ userId, profileId });

  const existing = await findActivePaidContentUnlock({ userId, profileId, serviceKey, contentKey, featureKey });
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

  const url = new URL(request.url);
  const auth = await requireUserFromRequest(request, env);
  const userId = String(auth.userId || "");
  const profileId = sanitizeAccessKey(url.searchParams.get("profileId"), 100);
  const serviceKey = sanitizeAccessKey(
    url.searchParams.get("serviceKey") || CONTENT_ENTITLEMENT_SERVICE_KEYS.SAJU,
    80,
  );
  const includeBackfill = url.searchParams.get("backfill") === "1"
    || url.searchParams.get("includeBackfill") === "1";

  if (!profileId) {
    throw createHttpError(403, "Profile ownership could not be verified.", { code: "MISSING_PROFILE_ID" });
  }

  await connectDb(env);
  await verifyProfileOwnership({ userId, profileId });

  const docs = await getUnlockedContentKeys({ userId, profileId, serviceKey });
  const backfilledDocs = includeBackfill
    ? await backfillMissingUnlocks({ userId, profileId, serviceKey, existingDocs: docs })
    : [];
  const activeDocs = docs.concat(backfilledDocs);

  const unlocks = createLockedMap(serviceKey);
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

  return json({
    ok: true,
    profileId,
    serviceKey,
    unlockedContentKeys: Array.from(new Set(unlockedContentKeys)),
    unlocks,
  });
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
    return handleRouteError(error, { request, env, trace });
  }
}
