import { randomUUID, createHash } from "node:crypto";
import { RelationshipBoundaryTest } from "./models.js";
import { connectDb } from "./db.js";
import { json } from "./http.js";
import { getAmbientAiLocale } from "./ai-locale-context.js";
import { isPaidResultRevoked } from "./paid-result-revocation.js";
import { generateRelationshipWave, relationshipContent, relationshipDeliveryComplete, RELATIONSHIP_PART_IDS } from "./relationship-report-delivery.js";

const FEATURE = "relationship-boundary-test";
const storageFailure = resultId => Object.assign(new Error("Result storage unavailable"), { code: "RESULT_STORAGE_UNAVAILABLE", resultId });
// Mongoose adds internal ids to character/section subdocuments; compare the stored content.
const comparable = value => JSON.stringify(value, (key, item) => key === "_id" || key === "__v" ? undefined : item);
export const relationshipPublicResult = doc => ({
  ok: true, sessionId: doc.id, score: doc.score, grade: doc.grade, character: doc.character,
  scoreFactors: doc.scoreFactors, summary: doc.summary, sections: doc.sections, finalMessage: doc.finalMessage,
});
export async function findRelationshipResult(env, filter) {
  try { await connectDb(env); return await RelationshipBoundaryTest.findOne(filter).sort({ createdAt: -1 }).lean(); }
  catch { throw storageFailure(filter.id || filter.idempotencyKey || "pending"); }
}
async function save(filter, fields) {
  try {
    const written = await RelationshipBoundaryTest.findOneAndUpdate(filter, { $set: fields }, { returnDocument: "after" }).lean();
    if (!written) throw storageFailure(filter.id);
    const confirmed = await RelationshipBoundaryTest.findOne({ userId: filter.userId, id: filter.id }).lean();
    for (const [key, value] of Object.entries(fields)) if (comparable(confirmed?.[key]) !== comparable(value)) throw storageFailure(filter.id);
    return confirmed;
  } catch { throw storageFailure(filter.id); }
}
export async function relationshipRevoked(doc) {
  return await isPaidResultRevoked(doc.userId, FEATURE, [doc.id, doc.idempotencyKey, doc.paymentId]);
}
export function relationshipPending(doc) {
  return json({ ...relationshipPublicResult(doc), status: doc.status, retryable: !doc.llmMeta?.limited,
    resumeBody: { resumeSessionId: doc.id }, resultId: doc.id,
    completedParts: Object.keys(doc.llmMeta?.delivery?.parts || {}), totalParts: RELATIONSHIP_PART_IDS.length,
  }, { status: 202 });
}
export async function runRelationshipDelivery(env, auth, supplied, callbacks) {
  const userId = String(auth.userId);
  if (supplied.resumeSessionId !== undefined ? typeof supplied.resumeSessionId !== "string" || !/^[a-zA-Z0-9_:-]{8,120}$/.test(supplied.resumeSessionId)
    : typeof supplied.idempotencyKey !== "string" || supplied.idempotencyKey.length < 12 || supplied.idempotencyKey.length > 180) return json({ ok: false, reason: "INVALID_INPUT" }, { status: 422 });
  let stored = await findRelationshipResult(env, supplied.resumeSessionId
    ? { userId, id: supplied.resumeSessionId } : { userId, idempotencyKey: supplied.idempotencyKey });
  if (supplied.resumeSessionId && !stored) return json({ ok: false, reason: "RESULT_NOT_FOUND" }, { status: 404 });
  const body = stored?.llmMeta?.resumeBody || (stored && supplied.resumeSessionId ? { targetInfo: stored.targetInfo, idempotencyKey: stored.idempotencyKey } : supplied);
  const input = callbacks.normalize(body);
  if (!input.ok || typeof body.idempotencyKey !== "string" || body.idempotencyKey.length < 12 || body.idempotencyKey.length > 180) return json({ ok: false, reason: "INVALID_INPUT" }, { status: 422 });
  if (stored?.inputHash && (stored.inputHash !== input.inputHash || (supplied.targetInfo && callbacks.normalize(supplied).inputHash !== stored.inputHash))) return json({ ok: false, reason: "INPUT_MISMATCH" }, { status: 409 });
  const access = await callbacks.verify(userId, body.idempotencyKey);
  if (access.proven === null) throw storageFailure(stored?.id || body.idempotencyKey);
  if (!access.proven) return json({ ok: false, reason: "PAYMENT_REQUIRED" }, { status: 402 });
  if (await relationshipRevoked(stored || { userId, idempotencyKey: body.idempotencyKey, paymentId: access.transactionId })) return json({ ok: false, reason: "PAYMENT_REVOKED", retryable: false }, { status: 403 });
  if (stored?.status === "completed") return json(relationshipPublicResult(stored));
  if (stored?.status === "generation_failed") return json({ ok: false, reason: "GENERATION_FAILED", retryable: false, sessionId: stored.id }, { status: 503 });
  const now = new Date(), token = randomUUID();
  const lease = { token, until: new Date(now.getTime() + 120000).toISOString() };
  if (stored?.llmMeta?.lease?.token && new Date(stored.llmMeta.lease.until) > now) return relationshipPending(stored);
  const sessionId = stored?.id || `rbt_${randomUUID()}`;
  if (!stored?.llmMeta?.delivery) {
    let seed;
    try { seed = callbacks.seed(input); }
    catch { return json({ ok: false, reason: "CALCULATION_FAILED" }, { status: 422 }); }
    const meta = { ...seed.meta, passRefund: access.passRefund || null, locale: getAmbientAiLocale() || "ko", resumeBody: { targetInfo: body.targetInfo, idempotencyKey: body.idempotencyKey }, lease,
      evidenceHash: createHash("sha256").update(JSON.stringify(seed.meta)).digest("hex"), delivery: { parts: {}, attempts: {}, invalidAttempts: {} } };
    const fields = { ...seed.fields, id: sessionId, userId, targetInfo: input.targetInfo, inputHash: input.inputHash, idempotencyKey: body.idempotencyKey,
      accessType: access.source || "paid", paymentId: stored?.paymentId || access.transactionId || "", status: "generating", llmMeta: meta, generationError: null };
    try {
      const inserted = stored
        ? await RelationshipBoundaryTest.findOneAndUpdate({ userId, id: sessionId, status: "generating", llmMeta: stored.llmMeta ?? null }, { $set: fields }, { returnDocument: "after" }).lean()
        : await RelationshipBoundaryTest.findOneAndUpdate({ userId, idempotencyKey: body.idempotencyKey }, { $setOnInsert: fields }, { upsert: true, returnDocument: "after" }).lean();
      if (!inserted) throw storageFailure(sessionId);
      stored = await findRelationshipResult(env, { userId, idempotencyKey: body.idempotencyKey });
      if (!stored?.llmMeta?.delivery) throw storageFailure(sessionId);
    } catch { throw storageFailure(sessionId); }
  } else {
    try {
      const claimed = await RelationshipBoundaryTest.findOneAndUpdate({ userId, id: sessionId, status: { $in: ["generating", "partial", "delivery_pending"] }, "llmMeta.lease.token": stored.llmMeta.lease?.token ?? null },
        { $set: { "llmMeta.lease": lease } }, { returnDocument: "after" }).lean();
      if (!claimed) return relationshipPending(stored);
      stored = claimed;
    } catch { throw storageFailure(sessionId); }
  }
  if (stored.llmMeta.lease.token !== token) return relationshipPending(stored);
  const filter = { userId, id: sessionId, status: { $in: ["generating", "partial", "delivery_pending"] }, "llmMeta.lease.token": token };
  try {
    await callbacks.open(userId, body.idempotencyKey, sessionId, stored.paymentId, stored.llmMeta.passRefund);
    if (!relationshipDeliveryComplete(stored.llmMeta.delivery)) {
      const wave = await generateRelationshipWave(env, stored.llmMeta, async delivery => {
        const meta = { ...stored.llmMeta, delivery };
        stored = await save(filter, { llmMeta: meta, ...relationshipContent(meta), status: Object.keys(delivery.parts).length ? "partial" : "generating" });
      });
      stored = await save(filter, { llmMeta: { ...stored.llmMeta, limited: wave.limited } });
      if (wave.knownFailed) {
        stored = await save(filter, { status: "generation_failed", generationError: { reason: "READING_INCOMPLETE" } });
        const refunded = await callbacks.refund(userId, body.idempotencyKey, sessionId, "READING_INCOMPLETE", stored.paymentId, stored.llmMeta.passRefund);
        return json({ ok: false, reason: "GENERATION_FAILED", retryable: false, sessionId, refunded }, { status: 503 });
      }
    }
    if (!relationshipDeliveryComplete(stored.llmMeta.delivery)) return relationshipPending(stored);
    stored = await save(filter, { ...relationshipContent(stored.llmMeta), status: "delivery_pending" });
    if (await relationshipRevoked(stored)) return json({ ok: false, reason: "PAYMENT_REVOKED", retryable: false }, { status: 403 });
    stored = await save(filter, { status: "completed", generationError: null });
    await callbacks.close(userId, body.idempotencyKey, sessionId, stored.paymentId, stored.llmMeta.passRefund);
    return json(relationshipPublicResult(stored));
  } finally {
    await RelationshipBoundaryTest.updateOne({ userId, id: sessionId, "llmMeta.lease.token": token }, { $set: { "llmMeta.lease.token": "", "llmMeta.lease.until": null } }).catch(() => {});
  }
}
