import { connectDb } from "../lib/db.js";
import { requireUserFromRequest } from "../lib/auth.js";
import {
  CONTENT_ENTITLEMENT_SCOPES,
  CONTENT_ENTITLEMENT_SERVICE_KEYS,
  CONTENT_ENTITLEMENT_SOURCES,
  Payment,
  PointHistory,
  ProfileCard,
  SAJU_LOCKED_CONTENT_KEYS,
} from "../lib/models.js";
import {
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

const BACKFILL_SUCCESS_PAYMENT_STATUSES = ["success", "paid", "fulfilled"];
const BACKFILL_BLOCKED_PAYMENT_STATUSES = ["failed", "cancelled", "refunded", "pending", "expired"];
const BACKFILL_PASS_ACCESS_TYPES = ["membership_pass", "membership_credit"];
const BACKFILL_PASS_ACCESS_METHODS = ["PASS", "MONTHLY"];

function sanitizeAccessKey(value, maxLen = 120) {
  return String(value || "").trim().slice(0, maxLen);
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

  const histories = await PointHistory.find({
    userId,
    kind: "deduct",
    featureKey,
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
    featureKey,
    status: { $in: BACKFILL_SUCCESS_PAYMENT_STATUSES },
    $or: [
      { "pricingSnapshot.profileId": profileId },
      { "pricingSnapshot.selectedProfileId": profileId },
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

  if (!profileId) {
    throw createHttpError(403, "Profile ownership could not be verified.", { code: "MISSING_PROFILE_ID" });
  }

  await connectDb(env);
  await verifyProfileOwnership({ userId, profileId });

  const docs = await getUnlockedContentKeys({ userId, profileId, serviceKey });
  const backfilledDocs = await backfillMissingUnlocks({ userId, profileId, serviceKey, existingDocs: docs });
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
    if (routePath === "/unlocks") return await handleUnlocks(request, env);
    return notFound();
  } catch (error) {
    return handleRouteError(error, { request, env, trace });
  }
}
