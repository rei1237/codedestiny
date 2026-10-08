import { createHash } from "node:crypto";
import { connectDb, withMongoRetry } from "./db.js";
import { ServiceExecutionTransaction } from "./models.js";
import { isPaidResultRevoked } from "./paid-result-revocation.js";
import { verifyPerUsePayment } from "./nakshatra-paid-access.js";
import { FEATURE_KEY_PRICE_TABLE } from "./paid-feature-registry.js";
import { json } from "./http.js";

const FEATURE = "nakshatra-compat";
const hash = value => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const stable = value => Array.isArray(value) ? value.map(stable) : value && typeof value === "object"
  ? Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])])) : value;

// Deterministic reports reuse the existing result collection and revocation policy.
// $setOnInsert binds one purchased request to one immutable pair, even under racing requests.
export async function deliverNakshatraCompat(env, auth, body, calculate) {
  await connectDb(env);
  const userId = auth.userId;
  const requestId = body.requestId || body.idempotencyKey;
  const resumeId = body.resumeResultId;
  if (resumeId ? typeof resumeId !== "string" || !/^nak-compat:[a-f0-9]{64}$/.test(resumeId)
    : typeof requestId !== "string" || requestId.length < 8 || requestId.length > 180) {
    return json({ ok: false, code: "INVALID_REQUEST_ID" }, { status: 400 });
  }
  const executionKey = resumeId || "nak-compat:" + hash([String(userId), FEATURE, requestId]);
  const filter = { userId, featureKey: FEATURE, executionKey };
  const find = () => withMongoRetry(env, () => ServiceExecutionTransaction.findOne(filter).lean());
  let doc = await find();
  if (resumeId && !doc) return json({ ok: false, code: "RESULT_NOT_FOUND" }, { status: 404 });
  const originalRequest = doc?.metadata?.nakshatraCompat?.requestId || doc?.idempotencyKey || requestId;
  if (["refunded", "cancelled"].includes(doc?.status)
    || await withMongoRetry(env, () => isPaidResultRevoked(userId, FEATURE, [executionKey, originalRequest, doc?.sourceTransactionId].filter(Boolean)))) {
    return json({ ok: false, code: "PAYMENT_REVOKED" }, { status: 403 });
  }
  const inputHash = resumeId ? doc.metadata.nakshatraCompat.inputHash : hash(stable({ a: body.a, b: body.b }));
  if (doc && doc.metadata?.nakshatraCompat?.inputHash !== inputHash) return json({ ok: false, code: "INPUT_MISMATCH" }, { status: 409 });
  // Completed results outlive passes and catalogue price changes.
  if (!doc) {
    const proof = await verifyPerUsePayment(env, { userId, featureKey: FEATURE,
      coinPrice: FEATURE_KEY_PRICE_TABLE[FEATURE].cost, requestId, requireExisting: true });
    if (proof.proven !== true) return json({ ok: false, code: proof.proven === null ? "PAYMENT_CHECK_UNAVAILABLE" : "PAYMENT_REQUIRED",
      message: proof.proven === null ? "결제 내역 확인이 지연되고 있어요. 잠시 후 다시 받아 주세요." : "궁합 이용 내역을 확인한 뒤 다시 시도해 주세요." },
    { status: proof.proven === null ? 503 : 402 });
    const response = await calculate();
    if (!response.ok) return response;
    const result = await response.json();
    const inserted = await withMongoRetry(env, () => ServiceExecutionTransaction.findOneAndUpdate(filter, { $setOnInsert: {
      ...filter, idempotencyKey: requestId.slice(0, 120), reportType: FEATURE, reportId: executionKey,
      status: "success", premiumStatus: "completed", deliveryStatus: "delivered", completedAt: new Date(), deliveredAt: new Date(), timeoutAt: new Date(),
      sourceTransactionId: proof.transactionId || "",
      metadata: { result, nakshatraCompat: { inputHash, requestId, method: "nakshatra-compat-v2" } },
    } }, { upsert: true, returnDocument: "after" }).lean(), { retries: 0 });
    doc = await find();
    if (!inserted || !doc?.metadata?.result) return json({ ok: false, code: "RESULT_STORAGE_UNAVAILABLE" }, { status: 503 });
    if (doc.metadata.nakshatraCompat.inputHash !== inputHash) return json({ ok: false, code: "INPUT_MISMATCH" }, { status: 409 });
  }
  return json({ ...doc.metadata.result, ok: true, resultId: executionKey, saved: true });
}
