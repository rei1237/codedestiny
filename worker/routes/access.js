import { connectDb, withMongoRetry, isTransientMongoError } from "../lib/db.js";
import { requireUserFromRequest, isAuthDbInfraError } from "../lib/auth.js";
import {
  CONTENT_ENTITLEMENT_SCOPES,
  CONTENT_ENTITLEMENT_SERVICE_KEYS,
  CONTENT_ENTITLEMENT_SOURCES,
  CONTENT_ENTITLEMENT_STATUSES,
  ContentEntitlement,
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
const ACCESS_UNLOCKS_CACHE_TTL_MS = 15000;
const ACCESS_UNLOCKS_STALE_TTL_MS = 10 * 60 * 1000;
const ACCESS_UNLOCKS_CACHE_MAX_ENTRIES = 2500;
const accessUnlocksCache = globalThis.__codeDestinyAccessUnlocksCache
  || (globalThis.__codeDestinyAccessUnlocksCache = {
    entries: new Map(),
    lastPruneAt: 0,
  });

function pruneAccessUnlocksCache(now = Date.now()) {
  if (accessUnlocksCache.lastPruneAt + 5000 > now) return;
  accessUnlocksCache.lastPruneAt = now;
  for (const [key, entry] of accessUnlocksCache.entries.entries()) {
    if (!entry || entry.staleUntil <= now) accessUnlocksCache.entries.delete(key);
  }
  while (accessUnlocksCache.entries.size > ACCESS_UNLOCKS_CACHE_MAX_ENTRIES) {
    const oldest = accessUnlocksCache.entries.keys().next().value;
    if (!oldest) break;
    accessUnlocksCache.entries.delete(oldest);
  }
}

function makeAccessUnlocksCacheKey({ userId, profileId, serviceKeys }) {
  return [
    String(userId || "").trim(),
    String(profileId || "").trim(),
    (serviceKeys || []).map((key) => String(key || "").trim()).filter(Boolean).sort().join(","),
  ].join("::");
}

function readAccessUnlocksCache(key, { allowStale = false } = {}) {
  const entry = accessUnlocksCache.entries.get(key);
  if (!entry) return null;
  const now = Date.now();
  if (entry.expiresAt > now) return { ...entry.payload, source: "cache" };
  if (allowStale && entry.staleUntil > now) return { ...entry.payload, source: "stale-cache", degraded: true, stale: true };
  if (entry.staleUntil <= now) accessUnlocksCache.entries.delete(key);
  return null;
}

function writeAccessUnlocksCache(key, payload) {
  if (!key || !payload || payload.ok !== true) return payload;
  const now = Date.now();
  pruneAccessUnlocksCache(now);
  accessUnlocksCache.entries.set(key, {
    payload: { ...payload, source: "db" },
    expiresAt: now + ACCESS_UNLOCKS_CACHE_TTL_MS,
    staleUntil: now + ACCESS_UNLOCKS_STALE_TTL_MS,
  });
  return payload;
}

function privateAccessHeaders(source = "db") {
  return {
    "Cache-Control": "private, max-age=15, stale-while-revalidate=300",
    "X-Access-Unlocks-Source": String(source || "db"),
  };
}

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
  return Array.from(new Set(rawKeys.length ? rawKeys : [CONTENT_ENTITLEMENT_SERVICE_KEYS.SAJU]));
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

function getBackfillFeatureAliases(contentKey) {
  const featureKey = PROFILE_FEATURE_KEY_BY_CONTENT_KEY[contentKey] || "";
  return Array.from(new Set([featureKey, contentKey].filter(Boolean)));
}

function getHistoryPaymentIds(history) {
  const metadata = history?.metadata && typeof history.metadata === "object" ? history.metadata : {};
  return [history?.paymentId, metadata.paymentId, metadata.purchaseId]
    .map((value) => String(value || "").trim())
    .filter(isObjectIdLike);
}

async function findBackfillEvidenceBatch({ userId, profileId, contentKeys }) {
  const targets = (contentKeys || []).filter((contentKey) => PROFILE_FEATURE_KEY_BY_CONTENT_KEY[contentKey]);
  if (!targets.length) return new Map();

  const featureAliases = Array.from(new Set(targets.flatMap(getBackfillFeatureAliases)));
  const histories = await PointHistory.find({
    userId,
    kind: "deduct",
    featureKey: { $in: featureAliases },
    $or: [
      { "metadata.profileId": profileId },
      { "metadata.selectedProfileId": profileId },
    ],
  }).sort({ createdAt: -1 }).limit(Math.max(20, targets.length * 20)).lean();

  const paymentIds = Array.from(new Set(histories.flatMap(getHistoryPaymentIds)));
  const paymentFeatureClauses = [
    { featureKey: { $in: featureAliases } },
    { contentKey: { $in: featureAliases } },
    { contentId: { $in: featureAliases } },
    { "pricingSnapshot.featureKey": { $in: featureAliases } },
    { "pricingSnapshot.contentKey": { $in: featureAliases } },
    { "pricingSnapshot.contentId": { $in: featureAliases } },
  ];
  const paymentScopeClauses = [
    { "pricingSnapshot.profileId": profileId },
    { "pricingSnapshot.selectedProfileId": profileId },
  ];
  const paymentOr = [
    ...(paymentIds.length ? [{ _id: { $in: paymentIds } }] : []),
    { $and: [{ $or: paymentScopeClauses }, { $or: paymentFeatureClauses }] },
  ];
  const payments = await Payment.find({
    userId,
    paymentType: "digital_content",
    status: { $in: BACKFILL_SUCCESS_PAYMENT_STATUSES },
    $or: paymentOr,
  }).sort({ paidAt: -1, updatedAt: -1, createdAt: -1 })
    .select("_id merchantUid status paymentType featureKey contentKey contentId coinPrice expectedChargedPoints paidAt createdAt updatedAt pricingSnapshot")
    .lean();

  const paymentById = new Map();
  for (const payment of payments) {
    if (payment?._id) paymentById.set(String(payment._id), payment);
  }

  const result = new Map();
  for (const contentKey of targets) {
    const aliases = new Set(getBackfillFeatureAliases(contentKey));
    const matchingHistories = histories.filter((history) => aliases.has(String(history?.featureKey || "")) && hasHistoryProfileScope(history, profileId));
    let evidence = null;
    for (const history of matchingHistories) {
      const historyPayment = getHistoryPaymentIds(history)
        .map((paymentId) => paymentById.get(paymentId))
        .find((payment) => payment && isSuccessPaymentStatus(payment.status));
      if (historyPayment) {
        evidence = { history, payment: historyPayment };
        break;
      }
      if (isBackfillablePassHistory(history)) {
        evidence = { history, payment: null };
        break;
      }
    }
    if (!evidence) {
      const payment = payments.find((candidate) => {
        const pricing = candidate?.pricingSnapshot && typeof candidate.pricingSnapshot === "object" ? candidate.pricingSnapshot : {};
        return aliases.has(String(candidate?.featureKey || ""))
          || aliases.has(String(candidate?.contentKey || ""))
          || aliases.has(String(candidate?.contentId || ""))
          || aliases.has(String(pricing.featureKey || ""))
          || aliases.has(String(pricing.contentKey || ""))
          || aliases.has(String(pricing.contentId || ""));
      });
      if (payment) evidence = { history: null, payment };
    }
    if (evidence) result.set(contentKey, evidence);
  }
  return result;
}

async function upsertBackfillUnlocksBatch(records) {
  if (!records.length) return [];
  if (!ContentEntitlement || typeof ContentEntitlement.bulkWrite !== "function") {
    const created = [];
    for (const record of records) {
      const doc = await upsertBackfillUnlock(record);
      if (doc) created.push(doc);
    }
    return created;
  }

  const now = new Date();
  const operations = records.map(({ userId, profileId, serviceKey, contentKey, evidence }) => {
    const body = toEntitlementBodyFromEvidence({ userId, profileId, serviceKey, contentKey, evidence });
    return {
      updateOne: {
        filter: { userId, profileId, serviceKey, contentKey, scope: CONTENT_ENTITLEMENT_SCOPES.PROFILE },
        update: {
          // Backfill is insert-only. A concurrent purchase/confirm may create the
          // entitlement after the snapshot read; never rewrite that authoritative row.
          $setOnInsert: {
            status: body.status,
            source: body.source,
            orderId: body.orderId,
            paymentId: body.paymentId,
            passId: body.passId,
            coinAmount: body.coinAmount,
            expiresAt: body.expiresAt,
            updatedAt: now,
            userId,
            profileId,
            serviceKey,
            contentKey,
            scope: CONTENT_ENTITLEMENT_SCOPES.PROFILE,
            unlockedAt: body.unlockedAt,
            createdAt: now,
          },
        },
        upsert: true,
      },
    };
  });
  await ContentEntitlement.bulkWrite(operations, { ordered: false });
  return ContentEntitlement.find({
    userId: records[0].userId,
    profileId: records[0].profileId,
    serviceKey: { $in: Array.from(new Set(records.map((record) => record.serviceKey))) },
    contentKey: { $in: records.map((record) => record.contentKey) },
    scope: CONTENT_ENTITLEMENT_SCOPES.PROFILE,
    status: CONTENT_ENTITLEMENT_STATUSES.ACTIVE,
  }).select("contentKey serviceKey source unlockedAt expiresAt orderId paymentId").lean();
}

async function backfillMissingUnlocksForServices({ userId, profileId, serviceKeys, existingDocs }) {
  const existingKeys = new Set((existingDocs || []).map((doc) => `${doc?.serviceKey || ""}::${doc?.contentKey || ""}`));
  const targets = [];
  for (const serviceKey of serviceKeys || []) {
    for (const contentKey of KNOWN_CONTENT_KEYS_BY_SERVICE[serviceKey] || []) {
      if (!existingKeys.has(`${serviceKey}::${contentKey}`)) targets.push({ serviceKey, contentKey });
    }
  }
  if (!targets.length) return [];

  const evidenceByContentKey = await findBackfillEvidenceBatch({
    userId,
    profileId,
    contentKeys: targets.map((target) => target.contentKey),
  });
  const records = targets
    .map((target) => ({ ...target, evidence: evidenceByContentKey.get(target.contentKey) }))
    .filter((record) => record.evidence);
  return upsertBackfillUnlocksBatch(records.map((record) => ({
    userId,
    profileId,
    serviceKey: record.serviceKey,
    contentKey: record.contentKey,
    evidence: record.evidence,
  })));
}

async function backfillMissingUnlocks({ userId, profileId, serviceKey, existingDocs }) {
  return backfillMissingUnlocksForServices({ userId, profileId, serviceKeys: [serviceKey], existingDocs });
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
  // ?�시???� 초기?�에???�금 ?�태�??�확??반환?�도�?조회�??�시?�로 감싼??handleUnlocks?� ?�일 ?�턴).
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

function buildUnlocksPayload({ profileId, serviceKey, serviceKeys, activeDocs }) {
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

  return {
    ok: true,
    profileId,
    serviceKey,
    serviceKeys,
    unlockedContentKeys: Array.from(new Set(unlockedContentKeys)),
    unlocks,
  };
}

async function handleUnlocks(request, env, trace) {
  if (request.method !== "GET") return methodNotAllowed();

  const url = new URL(request.url);
  if (trace) trace.stage = "auth";
  const profileId = sanitizeAccessKey(url.searchParams.get("profileId"), 100);
  const serviceKeyParam = sanitizeAccessKey(
    url.searchParams.get("serviceKey") || CONTENT_ENTITLEMENT_SERVICE_KEYS.SAJU,
    80,
  );
  const serviceKeys = normalizeServiceKeys(serviceKeyParam);
  const serviceKey = serviceKeys.join(",");
  const includeBackfill = false;

  if (!profileId) {
    throw createHttpError(403, "Profile ownership could not be verified.", { code: "MISSING_PROFILE_ID" });
  }

  const auth = await requireUserFromRequest(request, env);
  const userId = String(auth.userId || "");

  // ?�시???� 초기?�에???�금 ?�태�??�확??반환?�도�?조회�??�시?�로 감싼??
  // (verifyProfileOwnership??404 ??�??�시???�러???�시???�이 즉시 ?�파?�다.)
  const cacheKey = makeAccessUnlocksCacheKey({ userId, profileId, serviceKeys });
  if (!includeBackfill) {
    const cached = readAccessUnlocksCache(cacheKey);
    if (cached) return json(cached, { headers: privateAccessHeaders(cached.source) });
  }

  const promise = withMongoRetry(env, async () => {
    if (trace) trace.stage = "profile-ownership";
    await verifyProfileOwnership({ userId, profileId });
    if (trace) trace.stage = "unlock-snapshot";
    const snapshot = await getUnlockedContentSnapshot({ userId, profileId, serviceKeys });
    const docs = Array.isArray(snapshot?.docs) ? snapshot.docs : [];
    const backfilledDocs = [];
    if (includeBackfill) {
      const created = await backfillMissingUnlocksForServices({
        userId,
        profileId,
        serviceKeys,
        existingDocs: docs,
      });
      backfilledDocs.push(...created);
    }
    return buildUnlocksPayload({ profileId, serviceKey, serviceKeys, activeDocs: docs.concat(backfilledDocs) });
  });

  // 🔴 요청 간 in-flight Promise 공유는 두지 않는다 — Cloudflare Workers 가 다른 요청 컨텍스트의
  // continuation 을 취소해 그 요청이 op 타임아웃까지 끌려가 503 으로 죽는다(worker/lib/auth.js 의
  // 같은 위법이 6ab597c0b 에서 제거됐다). 재사용은 위 결과 TTL 캐시(15s)가 담당한다 — 그건 Promise 가
  // 아니라 데이터라 요청 간 공유가 합법이다.
  try {
    const payload = await promise;
    if (!includeBackfill) writeAccessUnlocksCache(cacheKey, payload);
    return json(payload, { headers: privateAccessHeaders(payload.source) });
  } catch (error) {
    const stale = !includeBackfill ? readAccessUnlocksCache(cacheKey, { allowStale: true }) : null;
    if (stale) return json(stale, { headers: privateAccessHeaders(stale.source) });
    throw error;
  }
}

export async function handleAccessRoutes(request, env) {
  const routePath = getRoutePath(request, "/api/access");
  const trace = {
    route: "access",
    method: request.method,
    requestPath: new URL(request.url).pathname,
    requestId: globalThis.crypto?.randomUUID?.() || `access:${Date.now().toString(36)}`,
    stage: "route",
  };

  try {
    if (routePath === "/status") return await handleStatus(request, env);
    if (routePath === "/confirm") return await handleConfirm(request, env);
    if (routePath === "/unlocks") return await handleUnlocks(request, env, trace);
    return notFound();
  } catch (error) {
    // ?�근 ?�정 ?�기(GET)???�시??Mongo 블립???�드 503?�로 죽이지 말고, ?�라가 ?�시?�할 ???�게
    // ?��? ?�프??503(retryable/DB_DEGRADED)�??�린?? ?�기(/confirm POST)???�중?�출 방�? ?�해 ?�외.
    if (request.method === "GET" && (isTransientMongoError(error) || isAuthDbInfraError(error))) {
      try {
        console.warn("[access-503]", JSON.stringify({
          requestId: trace.requestId,
          route: trace.requestPath,
          stage: trace.stage,
          errorName: String(error?.name || ""),
          errorCode: String(error?.code || ""),
          transientMongo: isTransientMongoError(error),
          authDbInfra: isAuthDbInfraError(error),
        }));
      } catch (_) {
        // Diagnostics must never change the retryable access response.
      }
      return json({
        ok: false,
        retryable: true,
        reason: "DB_DEGRADED",
        code: "SERVICE_UNAVAILABLE",
        message: "?�시?�인 ?�결 문제가 ?�어?? ?�시 ???�시 ?�도??주세??",
      }, { status: 503 });
    }
    return handleRouteError(error, { request, env, trace });
  }
}
