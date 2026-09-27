// Stage 1B paid-narrative intents. A page registers its exact route body before it
// opens checkout. The ten-minute recovery task promotes the intent to a pending
// paid-narrative execution once the gate's own consumption record proves this
// purchase, and 1A then delivers it on the server. Promotion never consumes a pass
// or charges: verifyPerUsePayment runs with requireExisting.
//
// An intent is invisible to every other reader of the collection: its status is
// awaiting_payment (sweeps and resumes select "pending"), its executionKey has its
// own prefix, and it carries no reportType, reportId, sessionId or idempotencyKey.
import { createHash } from "node:crypto";
import { withMongoRetry } from "./db.js";
import { ServiceExecutionTransaction } from "./models.js";
import { getAmbientAiLocale, runWithAiLocale } from "./ai-locale-context.js";
import { cleanPaidNarrativeBody, paidNarrativeExecutionKey, paidNarrativeInsert } from "./paid-narrative-delivery.js";
import { verifyPerUsePayment } from "./nakshatra-paid-access.js";
import { isPaidResultRevoked } from "./paid-result-revocation.js";
import { resolveOracleConsultationTier } from "../../lib/tarot/oracle-consultation-pricing.mjs";

const RETENTION_MS = 86400000, FIRST_CHECK_MS = 300000, BACKOFF_MS = 600000, MAX_BACKOFF_MS = 21600000;
const MAX_ERRORS = 3, MAX_PER_TICK = 20, MAX_ACTIVE_PER_USER = 20;

// featureKey -> reportType. A product is listed only when its gate records the
// Payment, PointHistory, MonthlyCreditLedger or pass marker under the same
// featureKey and requestId as the route body, and its route seed depends on
// that body alone.
const INTENT_PRODUCTS = Object.freeze({
  "tarot-love-relationship": "loveTarot",
  "tarot-mindscan": "mindscan",
  "tarot-prompt-maker": "tarotOracleConsultation",
  "tarot-prompt-maker-standard": "tarotOracleConsultation",
  "tarot-prompt-maker-deep": "tarotOracleConsultation",
  "tarot-prompt-maker-master": "tarotOracleConsultation",
  "pet-saju-ai-consultation": "petSajuReport",
  "pet-compatibility-ai": "petCompatReport",
  "animal-totem-basic": "animal-totem",
  "animal-totem-deep": "animal-totem",
  "dream-psycho-analysis": "dreamPsychoAnalysis",
});
export const PAID_INTENT_FEATURE_KEYS = Object.freeze(Object.keys(INTENT_PRODUCTS));
export { INTENT_PRODUCTS as PAID_INTENT_PRODUCTS };

// Server-resumable products that stay out, and why. They keep 1A browser resume.
export const PAID_INTENT_EXCLUSIONS = Object.freeze({
  astrology_ai_prompt_generator: "seed calls the route's prepare(); refund is bound to the route's own payment proof",
  ziwei_ai_prompt_generator: "seed calls the route's prepare(); refund is bound to the route's own payment proof",
  sukuyo_ai_prompt_generator: "seed calls the route's prepare(); refund is bound to the route's own payment proof",
  vedic_ai_prompt_generator: "seed calls the route's prepare(); refund is bound to the route's own payment proof",
  "fortune-chat-consultation": "free-slot and usage accounting live in the route; result GET reuses the newest record without a status filter",
  geomancy: "the gate records openGeomancyOracle while the route key is geomancy, so no consumption proves this key",
  "yoga-guru-per-use": "the route body takes sessionId from checkout evidence, so a pre-checkout body cannot match it",
});

export const paidIntentKey = (userId, featureKey, requestId) =>
  `paid-intent:${createHash("sha256").update(JSON.stringify([String(userId), featureKey, requestId])).digest("hex")}`;

const invalid = reason => Object.assign(new Error("Paid intent input rejected"), { code: "INTENT_INPUT_REJECTED", reason });

// The product's own route seed; it validates the body exactly as the route does.
// The route also derives oracle and totem feature keys from the body, so a body
// that would land under another key is rejected here.
async function seedIntent(env, featureKey, body) {
  switch (INTENT_PRODUCTS[featureKey]) {
    case "loveTarot": {
      const { seedLoveTarot } = await import("./love-tarot-delivery.js");
      const { buildLoveTarotBase } = await import("../routes/tarot.js");
      return seedLoveTarot(body, buildLoveTarotBase);
    }
    case "mindscan": {
      const { seedMindscanNarrative } = await import("./mindscan-delivery.js");
      return seedMindscanNarrative(body);
    }
    case "tarotOracleConsultation": {
      const { seedTarotOracleNarrative } = await import("./tarot-oracle-delivery.js");
      const seeded = seedTarotOracleNarrative(body, env);
      if (resolveOracleConsultationTier(body.cards?.length).featureKey !== featureKey) throw invalid("FEATURE_MISMATCH");
      return seeded;
    }
    case "petSajuReport":
    case "petCompatReport": {
      const { seedPetNarrative } = await import("../routes/pet-saju-ai.js");
      return seedPetNarrative(featureKey === "pet-saju-ai-consultation" ? "report" : "compat", body);
    }
    case "dreamPsychoAnalysis": {
      const { seedDreamPsychoNarrative } = await import("../routes/dream.js");
      return seedDreamPsychoNarrative(body);
    }
    case "animal-totem": {
      const { seedAnimalTotemNarrative } = await import("../routes/animal-totem.js");
      const seeded = await seedAnimalTotemNarrative(env, body);
      if (seeded.input.spec.featureKey !== featureKey) throw invalid("FEATURE_MISMATCH");
      return seeded;
    }
    default:
      throw invalid("FEATURE_NOT_SUPPORTED");
  }
}

const reply = (status, body) => ({ status, body });

// Registration before checkout. It never proves or consumes a purchase; a request
// that is already paid goes straight to the product route instead.
export async function registerPaidNarrativeIntent(env, { userId, featureKey, body, now }) {
  if (!INTENT_PRODUCTS[featureKey]) return reply(422, { ok: false, reason: "FEATURE_NOT_SUPPORTED" });
  if (!body || typeof body !== "object" || Array.isArray(body) || body.resumeResultId != null) return reply(422, { ok: false, reason: "INVALID_BODY" });
  const requestId = body.requestId;
  if (typeof requestId !== "string" || requestId.length < 8 || requestId.length > 180) return reply(422, { ok: false, reason: "REQUEST_ID_REQUIRED" });
  const original = cleanPaidNarrativeBody(body);
  try { await seedIntent(env, featureKey, original); }
  catch (error) {
    console.warn("[paid-narrative-intent] input rejected", JSON.stringify({ featureKey, name: error?.name, reason: error?.reason || error?.payload?.reason || "" }));
    return reply(400, { ok: false, reason: "INVALID_INPUT" });
  }
  const executionKey = paidNarrativeExecutionKey(userId, featureKey, requestId);
  if (await withMongoRetry(env, () => ServiceExecutionTransaction.exists({ userId, executionKey }))) {
    return reply(200, { ok: true, registered: false, reason: "EXECUTION_EXISTS" });
  }
  const proof = await verifyPerUsePayment(env, { userId, featureKey, requestId, requireExisting: true });
  if (proof.proven === null) return reply(503, { ok: false, retryable: true, reason: "VERIFY_UNAVAILABLE" });
  // Admin access is not a purchase: the intent is stored but never promoted.
  if (proof.proven && proof.source !== "admin") return reply(409, { ok: false, reason: "ALREADY_PAID" });
  const intentKey = paidIntentKey(userId, featureKey, requestId);
  const active = await withMongoRetry(env, () => ServiceExecutionTransaction.countDocuments({ userId, status: "awaiting_payment", executionKey: { $ne: intentKey } }));
  if (active >= MAX_ACTIVE_PER_USER) return reply(429, { ok: false, retryable: false, reason: "TOO_MANY_INTENTS" });
  const at = now ?? Date.now(), registeredAt = new Date(at), retentionUntil = new Date(at + RETENTION_MS);
  // No createdAt/updatedAt here: schema timestamps add them, and a path in both
  // $set and $setOnInsert is rejected by MongoDB (code 40).
  await withMongoRetry(env, () => ServiceExecutionTransaction.updateOne({ userId, executionKey: intentKey }, {
    $set: { timeoutAt: retentionUntil, retentionUntil, "metadata.paidIntent": { body: original, requestId,
      locale: getAmbientAiLocale() || "ko", registeredAt, attempts: 0, errors: 0, nextAttemptAt: new Date(at + FIRST_CHECK_MS), reviewRequired: false } },
    $setOnInsert: { userId, executionKey: intentKey, featureKey, status: "awaiting_payment",
      premiumStatus: "payment_pending", deliveryStatus: "payment_pending", lock: { token: "", until: null } },
  }, { upsert: true }), { retries: 0 });
  return reply(200, { ok: true, registered: true });
}

async function mark(env, intent, fields) {
  try {
    await withMongoRetry(env, () => ServiceExecutionTransaction.updateOne({ _id: intent._id, status: "awaiting_payment" },
      { $set: Object.fromEntries(Object.entries(fields).map(([key, value]) => [`metadata.paidIntent.${key}`, value])) }), { retries: 0 });
  } catch { /* the next tick reads the same stored state */ }
}

async function close(env, intent) {
  try { await withMongoRetry(env, () => ServiceExecutionTransaction.deleteOne({ _id: intent._id, status: "awaiting_payment" })); }
  catch { /* the next tick finds the execution and closes it again */ }
}

async function promoteOne(env, intent) {
  const state = intent.metadata?.paidIntent || {};
  const userId = String(intent.userId), featureKey = intent.featureKey, body = state.body || {};
  const executionKey = paidNarrativeExecutionKey(userId, featureKey, state.requestId);
  try {
    // The browser reached the route itself; its record already owns the delivery.
    if (await withMongoRetry(env, () => ServiceExecutionTransaction.exists({ userId, executionKey }))) {
      await close(env, intent);
      return "execution_exists";
    }
    const proof = await verifyPerUsePayment(env, { userId, featureKey, requestId: state.requestId, requireExisting: true });
    if (proof.proven === null) return "degraded";
    if (!proof.proven || proof.source === "admin") {
      const attempts = (Number(state.attempts) || 0) + 1;
      await mark(env, intent, { attempts, nextAttemptAt: new Date(Date.now() + Math.min(MAX_BACKOFF_MS, BACKOFF_MS * 2 ** (attempts - 1))) });
      return "unpaid";
    }
    if (await withMongoRetry(env, () => isPaidResultRevoked(userId, featureKey, [executionKey, state.requestId, proof.transactionId, body.sessionId]))) {
      await close(env, intent);
      return "revoked";
    }
    const locale = state.locale || "ko";
    const seeded = await runWithAiLocale(locale, () => seedIntent(env, featureKey, body));
    // The record starts like one the route inserts (ten-minute deadline), so the
    // recovery task resumes it once idle. updatedAt stays out of the insert-only
    // fields for the same code-40 reason as above.
    const promotedAt = new Date();
    const { updatedAt: _updatedAt, ...insert } = paidNarrativeInsert({ userId, executionKey, featureKey, reportType: INTENT_PRODUCTS[featureKey],
      original: body, seeded, locale, lock: { token: "", until: null }, now: promotedAt, timeoutAt: new Date(promotedAt.getTime() + 600000),
      metadata: { paidNarrativeProof: { source: proof.source, transactionId: proof.transactionId || "", requestId: state.requestId, provenAt: promotedAt } } });
    try {
      await withMongoRetry(env, () => ServiceExecutionTransaction.updateOne({ userId, executionKey }, { $setOnInsert: insert }, { upsert: true }), { retries: 0 });
    } catch (error) {
      if (error?.code !== 11000) throw error;
    }
    // A lost reply, a duplicate-key race or a browser insert all settle here.
    if (!await withMongoRetry(env, () => ServiceExecutionTransaction.exists({ userId, executionKey, "metadata.paidNarrative": { $exists: true } }))) {
      throw Object.assign(new Error("Promotion not confirmed"), { code: "PROMOTION_UNCONFIRMED" });
    }
    await close(env, intent);
    return "promoted";
  } catch (error) {
    const code = String(error?.code || error?.reason || "PROMOTION_FAILED").slice(0, 120);
    const errors = (Number(state.errors) || 0) + 1;
    await mark(env, intent, errors >= MAX_ERRORS ? { errors, code, reviewRequired: true }
      : { errors, code, nextAttemptAt: new Date(Date.now() + Math.min(MAX_BACKOFF_MS, BACKOFF_MS * 2 ** errors)) });
    return code;
  }
}

// Runs at the start of the recovery tick. Expired intents are deleted here as
// well, since the TTL index is not assumed to exist. (Plain parameters: the cron
// op-coverage verifier cuts a signature at its first closing parenthesis.)
export async function promotePaidIntents(env, options = {}) {
  const now = options.now ?? Date.now(), deadline = options.deadline ?? now + 30000, at = new Date(now);
  const expired = await withMongoRetry(env, () => ServiceExecutionTransaction.deleteMany({ status: "awaiting_payment", timeoutAt: { $lte: at } }));
  const intents = await withMongoRetry(env, () => ServiceExecutionTransaction.find({
    status: "awaiting_payment", timeoutAt: { $gt: at }, featureKey: { $in: [...PAID_INTENT_FEATURE_KEYS] },
    "metadata.paidIntent.nextAttemptAt": { $lte: at }, "metadata.paidIntent.reviewRequired": { $ne: true },
  }).sort({ "metadata.paidIntent.nextAttemptAt": 1 }).limit(MAX_PER_TICK).lean());
  const outcomes = [];
  for (const intent of intents) {
    if (Date.now() > deadline) break;
    const outcome = await promoteOne(env, intent);
    outcomes.push({ executionKey: paidNarrativeExecutionKey(String(intent.userId), intent.featureKey, intent.metadata?.paidIntent?.requestId), featureKey: intent.featureKey, outcome });
  }
  const result = { expired: Number(expired?.deletedCount) || 0, scanned: intents.length, outcomes };
  console.log("[paid-narrative-intent]", JSON.stringify(result));
  return result;
}
