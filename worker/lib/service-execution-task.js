import * as refundModels from "./models.js";
import { findProtectedFundingExecution } from "./refund-delivery-protection.js";
import { connectDb, mongoose, withMongoRetry } from "./db.js";
import { CONTENT_ENTITLEMENT_STATUSES, MonthlyCreditLedger, Payment, PointHistory, ServiceExecutionTransaction, User } from "./models.js";
import { findMoonstoneSpendEvidence } from "./moonstone-spend-proof.js";
import { cancelPortOnePayment } from "./portone.js";
import { revokePaymentContentAccess } from "./content-unlocks.js";
import { invalidateAccessStateCacheForUser } from "./access-state-cache.js";
import { inspectCheckpointBeforeTimeoutRefund } from "./checkpoint-refund-guard.js";

const DEFAULT_TIMEOUT_SECONDS = 600;
const DEFAULT_LOCK_SECONDS = 45;
const DEFAULT_SOFT_ABANDON_GRACE_SECONDS = 900;
const REFUND_LOCK_SECONDS = 90;
/** 승인이 끝나 환불 대상이 되는 Payment 상태. "paid" 는 V2(orders.js markOrderPaid)의 종착 상태다. */
const REFUNDABLE_PAYMENT_STATUSES = new Set(["paid", "success", "fulfilled"]);
const PAID_SERVICE_DELIVERY_STATUSES = Object.freeze({
  PAYMENT_PENDING: "payment_pending",
  PAID: "paid",
  ENTITLEMENT_GRANTING: "entitlement_granting",
  ENTITLEMENT_GRANTED: "entitlement_granted",
  GENERATING: "generating",
  DELIVERED: "delivered",
  FAILED: "failed",
  REFUND_PENDING: "refund_pending",
  REFUNDED: "refunded",
  REFUND_FAILED: "refund_failed",
});

function nowDate() {
  return new Date();
}

function clampInt(value, fallback, min, max) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  const v = Math.floor(n);
  return Math.max(min, Math.min(max, v));
}

function toObjectId(value) {
  const raw = String(value || "").trim();
  if (!raw || !mongoose.Types.ObjectId.isValid(raw)) return null;
  return new mongoose.Types.ObjectId(raw);
}

function normalizeExecutionKey(value) {
  return String(value || "").trim().slice(0, 120);
}

function normalizeFeatureKey(value) {
  return String(value || "").trim().slice(0, 80);
}

function normalizeCost(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.floor(n);
}

function toTimeoutAt(startedAt, timeoutSeconds) {
  const base = startedAt instanceof Date ? startedAt : nowDate();
  const ttlSec = clampInt(timeoutSeconds, DEFAULT_TIMEOUT_SECONDS, 60, 3600);
  return new Date(base.getTime() + ttlSec * 1000);
}

function backoffRetryAt(retryCount) {
  const exp = Math.max(1, Math.min(10, Number(retryCount) || 1));
  const delaySec = Math.min(15 * 60, 30 * (2 ** (exp - 1)));
  return new Date(Date.now() + delaySec * 1000);
}

function lockExpiry(lockSeconds) {
  const sec = clampInt(lockSeconds, DEFAULT_LOCK_SECONDS, 10, 300);
  return new Date(Date.now() + sec * 1000);
}

function randomToken(prefix = "lock") {
  const rand = Math.random().toString(36).slice(2, 10);
  return `${prefix}:${Date.now().toString(36)}:${rand}`;
}

function normalizeReason(code, message) {
  return {
    code: String(code || "execution_failed").trim().slice(0, 80),
    message: String(message || "Service execution failed.").trim().slice(0, 500),
  };
}

function normalizeReportType(value) {
  return String(value || "").trim().slice(0, 80);
}

function normalizeReportId(value) {
  return String(value || "").trim().slice(0, 120);
}

function normalizeSessionId(value) {
  return String(value || "").trim().slice(0, 160);
}

function normalizeIdempotencyKey(value) {
  return String(value || "").trim().slice(0, 120);
}

function normalizeFailureStage(value) {
  return String(value || "").trim().slice(0, 80);
}

function normalizeFailureReason(value) {
  return String(value || "").trim().slice(0, 500);
}

function normalizeRefundReason(value) {
  return String(value || "").trim().slice(0, 160);
}

function normalizeRefundIdempotencyKey(value) {
  return String(value || "").trim().slice(0, 220);
}

function cleanMetadataText(value, max = 160) {
  return String(value || "").trim().slice(0, max);
}

function isTruthy(value) {
  const raw = String(value == null ? "" : value).trim().toLowerCase();
  return raw === "1" || raw === "true" || raw === "yes" || raw === "on";
}

function isSoftAbandonReason(reasonCode) {
  const code = String(reasonCode || "").trim().toLowerCase();
  return code === "client_disconnect"
    || code === "client_background"
    || code === "route_change"
    || code === "navigation"
    || code === "client_unload";
}

function safePaymentRef(input = {}) {
  return {
    impUid: String(input?.impUid || input?.paymentId || "").trim().slice(0, 120),
    merchantUid: String(input?.merchantUid || "").trim().slice(0, 120),
    paymentId: String(input?.paymentId || input?.impUid || "").trim().slice(0, 120),
    cancelEligible: Boolean(input?.cancelEligible === true),
  };
}

function resolveDeliveryStatus(doc = {}) {
  const explicit = cleanMetadataText(doc.deliveryStatus, 40);
  if (explicit) return explicit;
  const premiumStatus = cleanMetadataText(doc.premiumStatus, 40);
  if (premiumStatus === "completed") return PAID_SERVICE_DELIVERY_STATUSES.DELIVERED;
  if (premiumStatus === "refund_failed") return PAID_SERVICE_DELIVERY_STATUSES.REFUND_FAILED;
  if (premiumStatus === "refund_pending") return PAID_SERVICE_DELIVERY_STATUSES.REFUND_PENDING;
  if (premiumStatus === "refunded") return PAID_SERVICE_DELIVERY_STATUSES.REFUNDED;
  if (premiumStatus === "failed") return PAID_SERVICE_DELIVERY_STATUSES.FAILED;
  if (premiumStatus === "abandoned") return PAID_SERVICE_DELIVERY_STATUSES.FAILED;
  const status = cleanMetadataText(doc.status, 40);
  if (status === "success") return PAID_SERVICE_DELIVERY_STATUSES.DELIVERED;
  if (status === "refunded") return PAID_SERVICE_DELIVERY_STATUSES.REFUNDED;
  if (status === "failed") return PAID_SERVICE_DELIVERY_STATUSES.REFUND_FAILED;
  return PAID_SERVICE_DELIVERY_STATUSES.GENERATING;
}

function firstCleanText(...values) {
  for (const value of values) {
    const text = cleanMetadataText(value, 160);
    if (text) return text;
  }
  return "";
}

function firstNonNegativeAmount(...values) {
  for (const value of values) {
    const n = Number(value);
    if (Number.isFinite(n) && n >= 0) return Math.floor(n);
  }
  return 0;
}

function safeResultObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function resultNestedSources(result) {
  const item = safeResultObject(result);
  const archive = safeResultObject(item.archive || item.resultArchive);
  const payload = safeResultObject(item.payload || archive.payload);
  const pdfReady = safeResultObject(item.pdfReady || item.pdf || item.file || archive.pdfReady || payload.pdfReady);
  return [item, archive, payload, pdfReady].filter((source) => Object.keys(source).length);
}

function resultHasProviderMockSignal(result) {
  const item = safeResultObject(result);
  const llmMeta = safeResultObject(item.llmMeta || item.meta || item.metadata);
  const provider = cleanMetadataText(item.provider || llmMeta.provider || item.modelProvider, 80).toLowerCase();
  return item.mock === true
    || item.isMock === true
    || item.dryRun === true
    || item.dry_run === true
    || llmMeta.mock === true
    || llmMeta.dryRun === true
    || provider === "mock"
    || provider === "dry-run"
    || provider === "dry_run";
}

function extractResultText(result) {
  if (typeof result === "string") return result.trim();
  if (!result || typeof result !== "object") return "";
  const item = safeResultObject(result);
  const candidates = [
    item.content,
    item.text,
    item.message,
    item.answer,
    item.summary,
    item.resultText,
    item.result,
    item.report,
    item.html,
    Array.isArray(item.messages) ? item.messages.map((entry) => entry?.content || "").join("\n") : "",
    Array.isArray(item.chapters) ? item.chapters.map((entry) => entry?.content || entry?.text || entry?.html || "").join("\n") : "",
    Array.isArray(item.sections) ? item.sections.map((entry) => entry?.body || entry?.content || entry?.text || "").join("\n") : "",
  ];
  return candidates.map((value) => String(value || "").trim()).find(Boolean) || "";
}

function resultChapters(result) {
  for (const source of resultNestedSources(result)) {
    if (Array.isArray(source.chapters) && source.chapters.length) return source.chapters;
  }
  return [];
}

function hasPdfArtifact(result) {
  return resultNestedSources(result).some((source) => Boolean(
    source.pdfUrl
      || source.downloadUrl
      || source.storedUrl
      || source.reportUrl
      || source.htmlUrl
      || source.url
      || source.fileKey
      || source.storageKey
      || source.filePath
      || source.r2Key,
  ));
}

function isPdfServiceId(serviceId) {
  const key = cleanMetadataText(serviceId, 120).toLowerCase();
  return key.includes("pdf")
    || key.includes("premium-fpti-report");
}

function hasResultIdentifier(result) {
  return resultNestedSources(result).some((source) => Boolean(
    source.resultId
      || source.id
      || source.reportId
      || source.sessionId
      || source.jobId
      || source.executionId,
  ));
}

export function validatePaidServiceResult(serviceId, result, options = {}) {
  if (result === null || result === undefined) return { ok: false, reason: "RESULT_EMPTY" };
  if (typeof result === "string") {
    const text = result.trim();
    if (!text) return { ok: false, reason: "RESULT_EMPTY_STRING" };
    if ((text.startsWith("{") || text.startsWith("["))) {
      try {
        return validatePaidServiceResult(serviceId, JSON.parse(text), options);
      } catch (error) {
        return { ok: false, reason: "RESULT_JSON_PARSE_FAILED" };
      }
    }
    return text.length >= Number(options.minTextLength || 20)
      ? { ok: true }
      : { ok: false, reason: "RESULT_TEXT_TOO_SHORT" };
  }
  if (Array.isArray(result)) {
    return result.length > 0 ? { ok: true } : { ok: false, reason: "RESULT_EMPTY_ARRAY" };
  }
  if (typeof result !== "object") return { ok: false, reason: "RESULT_INVALID_TYPE" };

  const item = safeResultObject(result);
  const status = cleanMetadataText(item.status || item.deliveryStatus || item.generationStatus, 80).toLowerCase();
  if (["failed", "generation_failed", "timeout", "invalid_result", "refund_failed", "refunded"].includes(status)) {
    return { ok: false, reason: `RESULT_STATUS_${status.toUpperCase()}` };
  }
  if (item.generationError || item.error) return { ok: false, reason: "RESULT_HAS_ERROR" };
  if (resultHasProviderMockSignal(item)) return { ok: false, reason: "RESULT_MOCK_OR_DRY_RUN" };

  const expectedUserId = cleanMetadataText(options.userId, 120);
  const resultUserId = cleanMetadataText(item.userId || item.ownerUserId, 120);
  if (expectedUserId && resultUserId && expectedUserId !== resultUserId) {
    return { ok: false, reason: "RESULT_USER_MISMATCH" };
  }

  if (isPdfServiceId(serviceId)) {
    const chapters = resultChapters(item);
    if (!hasPdfArtifact(item) && !chapters.length) return { ok: false, reason: "PDF_ARTIFACT_MISSING" };
    if (chapters.length && chapters.some((chapter) => !extractResultText(chapter) || extractResultText(chapter).length < 20)) {
      return { ok: false, reason: "PDF_CHAPTER_INVALID" };
    }
    return { ok: true };
  }

  const text = extractResultText(item);
  if (!hasResultIdentifier(item) && !text) return { ok: false, reason: "RESULT_ID_OR_CONTENT_MISSING" };
  if (text && text.length < Number(options.minTextLength || 20)) return { ok: false, reason: "RESULT_TEXT_TOO_SHORT" };
  return { ok: true };
}

function resolvePaymentIdForRefund(execution = {}, payment = null) {
  return firstCleanText(
    execution.paymentId,
    execution.paymentRef?.paymentId,
    execution.impUid,
    execution.paymentRef?.impUid,
    execution.merchantUid,
    execution.paymentRef?.merchantUid,
    payment?.impUid,
    payment?.merchantUid,
  );
}

function buildRefundIdempotencyKey(execution = {}, payment = null) {
  const paymentId = resolvePaymentIdForRefund(execution, payment) || "no-payment";
  const serviceId = firstCleanText(execution.serviceId, execution.featureKey, payment?.featureKey) || "unknown-service";
  const jobId = firstCleanText(execution.jobId, execution.reportId, execution.sessionId, execution.executionKey) || "no-job";
  return normalizeRefundIdempotencyKey(`refund:${paymentId}:${serviceId}:${jobId}`);
}

function paidServiceLogPayload(execution = {}, extras = {}) {
  return {
    userId: String(execution.userId || extras.userId || ""),
    profileId: firstCleanText(execution.profileId, extras.profileId),
    serviceId: firstCleanText(execution.serviceId, execution.featureKey, extras.serviceId),
    paymentId: firstCleanText(execution.paymentId, execution.paymentRef?.paymentId, extras.paymentId),
    merchantUid: firstCleanText(execution.merchantUid, execution.paymentRef?.merchantUid, extras.merchantUid),
    impUid: firstCleanText(execution.impUid, execution.paymentRef?.impUid, extras.impUid),
    jobId: firstCleanText(execution.jobId, execution.reportId, execution.sessionId, execution.executionKey, extras.jobId),
    amount: Number(execution.amount || extras.amount || 0),
    deliveryStatus: firstCleanText(extras.deliveryStatus, resolveDeliveryStatus(execution)),
    refundStatus: firstCleanText(extras.refundStatus, execution.refundStatus),
    failureReason: firstCleanText(extras.failureReason, execution.failureReason, execution.reasonMessage),
  };
}

function logPaidServiceEvent(marker, execution = {}, extras = {}) {
  try {
    console.info(marker, JSON.stringify(paidServiceLogPayload(execution, extras)));
  } catch (error) {
    console.info(marker, paidServiceLogPayload(execution, extras));
  }
}

function toSummary(doc) {
  if (!doc) return null;
  return {
    id: String(doc._id || ""),
    userId: String(doc.userId || ""),
    executionKey: String(doc.executionKey || ""),
    featureKey: String(doc.featureKey || ""),
    cost: Number(doc.cost || 0),
    sourceTransactionId: String(doc.sourceTransactionId || ""),
    reportType: String(doc.reportType || ""),
    reportId: String(doc.reportId || ""),
    sessionId: String(doc.sessionId || ""),
    paymentSessionId: String(doc.paymentSessionId || ""),
    coinTransactionId: String(doc.coinTransactionId || ""),
    coinAmount: Number(doc.coinAmount || 0),
    serviceId: String(doc.serviceId || doc.featureKey || ""),
    productId: String(doc.productId || ""),
    profileId: String(doc.profileId || ""),
    paymentId: String(doc.paymentId || doc?.paymentRef?.paymentId || ""),
    merchantUid: String(doc.merchantUid || doc?.paymentRef?.merchantUid || ""),
    impUid: String(doc.impUid || doc?.paymentRef?.impUid || ""),
    orderId: String(doc.orderId || ""),
    jobId: String(doc.jobId || doc.reportId || doc.sessionId || ""),
    amount: Number(doc.amount || 0),
    currency: String(doc.currency || "KRW"),
    paymentProvider: String(doc.paymentProvider || ""),
    status: String(doc.status || "pending"),
    premiumStatus: String(doc.premiumStatus || "generating"),
    deliveryStatus: resolveDeliveryStatus(doc),
    timeoutAt: doc.timeoutAt || null,
    nextRetryAt: doc.nextRetryAt || null,
    retryCount: Number(doc.retryCount || 0),
    completedAt: doc.completedAt || null,
    compensatedAt: doc.compensatedAt || null,
    reasonCode: String(doc.reasonCode || ""),
    reasonMessage: String(doc.reasonMessage || ""),
    compensation: {
      coinRefunded: Boolean(doc?.compensation?.coinRefunded),
      coinRefundTxId: String(doc?.compensation?.coinRefundTxId || ""),
      monthlyCreditRefunded: Boolean(doc?.compensation?.monthlyCreditRefunded),
      monthlyCreditRefundAmount: Number(doc?.compensation?.monthlyCreditRefundAmount || 0),
      monthlyCreditRefundLedgerId: String(doc?.compensation?.monthlyCreditRefundLedgerId || ""),
      passQuotaRefunded: Boolean(doc?.compensation?.passQuotaRefunded),
      passQuotaRefundAmount: Number(doc?.compensation?.passQuotaRefundAmount || 0),
      paymentCancelled: Boolean(doc?.compensation?.paymentCancelled),
    },
    refundStatus: String(doc?.refundStatus || "none"),
    refundReason: String(doc?.refundReason || ""),
    refundIdempotencyKey: String(doc?.refundIdempotencyKey || ""),
    deliveredAt: doc?.deliveredAt || null,
    failedAt: doc?.failedAt || null,
    refundRequestedAt: doc?.refundRequestedAt || null,
    refundedAt: doc?.refundedAt || null,
    refundFailedAt: doc?.refundFailedAt || null,
    refundFailureReason: String(doc?.refundFailureReason || ""),
    generationStartedAt: doc?.generationStartedAt || null,
    generationCompletedAt: doc?.generationCompletedAt || null,
    generationFailedAt: doc?.generationFailedAt || null,
    lastClientHeartbeatAt: doc?.lastClientHeartbeatAt || null,
    clientClosedAt: doc?.clientClosedAt || null,
    abandonedAt: doc?.abandonedAt || null,
  };
}

/**
 * 🔴 이 환불기 3종(runCoinRefund·runMonthlyCreditRefund·runPaymentCancel)은 ServiceExecutionTransaction
 *    경유 경로 밖에서도 쓰인다 — worker/routes/master-love-codex.js 가 자체 세션으로 같은 함수를 부른다.
 *    execution 인자는 문서가 아니라 **필드 가방**으로만 읽히므로(serviceId·featureKey·sessionId·metadata)
 *    호출자가 같은 모양을 만들어 넘기면 된다. 여기에 ServiceExecutionTransaction 전용 필드 의존을
 *    새로 넣으면 그 호출자가 조용히 skip 된다.
 */
export async function runCoinRefund({ env, userId, featureKey, sourceTransactionId, executionId, requestId, reason, receiptSource }, deps = {}) {
  if (!userId || !sourceTransactionId) {
    return { refunded: false, skipped: true };
  }
  if (!mongoose.Types.ObjectId.isValid(String(sourceTransactionId))) {
    return { refunded: false, skipped: true, reason: "SOURCE_TRANSACTION_NOT_POINT_HISTORY_ID" };
  }

  const uid = toObjectId(userId), sourceId = toObjectId(sourceTransactionId);
  if (!uid || !sourceId) return { refunded: false, skipped: true, reason: "SOURCE_ID_INVALID" };
  const { createPaymentContext, withPaymentDb } = deps.paymentDb || await import("../payments/db.js");
  const context = createPaymentContext({ requestId: `service-refund:${sourceId}`, route: "service-execution-coin-refund" });
  return (deps.withDb || withPaymentDb)(env || {}, context, db => db.transaction(async tx => {
    const existing = await tx.findOne(PointHistory, { userId: uid, kind: "refund", "metadata.refundForPointHistoryId": String(sourceId) });
    if (existing) {
      if (!featureKey || String(existing.featureKey || "") !== String(featureKey)) return { refunded: false, skipped: true, reason: "REFUND_FEATURE_MISMATCH" };
      return { refunded: true, idempotent: true, refundTxId: String(existing._id || "") };
    }
    const filter = { _id: sourceId, userId: uid, kind: "deduct", "metadata.refundedForServiceExecution": { $ne: true } };
    const deducted = await tx.findOne(PointHistory, filter);
    if (!deducted) return { refunded: false, skipped: true, reason: "DEDUCT_HISTORY_NOT_FOUND" };
    if (!featureKey || String(deducted.featureKey || "") !== String(featureKey)) return { refunded: false, skipped: true, reason: "DEDUCT_FEATURE_MISMATCH" };
    if (cleanMetadataText(deducted?.metadata?.accessType).toLowerCase() === "membership_credit") return { refunded: false, skipped: true, reason: "MEMBERSHIP_CREDIT_DEDUCT" };
    const delta = Number(deducted.delta);
    if (!Number.isSafeInteger(delta) || delta >= 0) return { refunded: false, skipped: true, reason: "DEDUCT_AMOUNT_UNVERIFIED" };
    const protectedResult = await findProtectedFundingExecution({
      userId: uid, ids: [sourceId, deducted.metadata?.requestId, deducted.metadata?.purchaseId, deducted.metadata?.orderId, requestId],
      executionId: toObjectId(executionId), failedRequestId: requestId,
    }, (name, filter) => tx.findOne(refundModels[name], filter));
    if (protectedResult) return {refunded:false,skipped:true,adminReviewRequired:true,reason:'FUNDING_ACTIVE_OR_COMPLETED'};
    const now = new Date(), refundAmount = -delta;
    const claimed = await tx.updateOne(PointHistory, filter, { $set: { "metadata.refundedForServiceExecution": true, "metadata.refundedAt": now } });
    if (claimed.modifiedCount !== 1) throw new Error("COIN_REFUND_SOURCE_CONFLICT");
    const updated = await tx.findOneAndUpdate(User, { _id: uid }, { $inc: { points: refundAmount } }, { returnDocument: "after", projection: { points: 1 } });
    const user = updated && "value" in updated && !("_id" in updated) ? updated.value : updated;
    if (!user || !Number.isFinite(Number(user.points))) throw new Error("USER_NOT_FOUND_FOR_REFUND");
    const receipt = await tx.insertOne(PointHistory, { userId: uid, kind: "refund", delta: refundAmount,
      balanceAfter: Number(user.points), reason, featureKey,
      metadata: { source: receiptSource === "fortune.pig-coin.refund" ? receiptSource : "billing.service-execution", requestId: String(requestId || "").slice(0, 120),
        executionId: String(executionId || ""), refundForPointHistoryId: String(sourceId), sourceTransactionId: String(sourceId) },
      createdAt: now, updatedAt: now });
    return { refunded: true, idempotent: false, amount: refundAmount, refundTxId: String(receipt.insertedId || "") };
  }));
}

/**
 * 이용권 커버(worker/lib/nakshatra-paid-access.js verifyPerUsePayment 4번째 분기)로
 * profileSubscription.monthlySpendCoin 을 차감한 뒤, 뒤 단계(생성)가 실패하면 그 차감을 되돌린다.
 *
 * 🔴 monthlySpendCoin 은 레포 전체에서 worker/payments/passes.js consumePassCoverage 한 곳에서만
 *    증가한다(2026-09-12 실사고 이전에는 감소 경로가 아예 없었다). 사이클이 넘어갔거나(만료·갱신)
 *    다른 소비가 끼어들어 잔액이 cost 미만이면 조용히 skip — 다른 달의 카운터를 잘못 건드리지 않는다.
 */
async function runPassQuotaRefund({ userId, executionId, execution }) {
  const passRefund = execution?.metadata?.passRefund;
  const cost = Math.max(0, Math.floor(Number(passRefund?.cost) || 0));
  const cycleKey = cleanMetadataText(passRefund?.cycleKey, 160);
  if (!userId || cost <= 0 || !cycleKey) {
    return { refunded: false, skipped: true };
  }
  // 멱등: 재시도로 이 함수가 다시 불려도 두 번 복구하지 않는다.
  if (passRefund?.refundedAt) {
    return { refunded: true, idempotent: true, amount: cost };
  }

  const featureKey = cleanMetadataText(execution?.featureKey, 120);
  const requestId = cleanMetadataText(execution?.idempotencyKey, 180);
  if (!featureKey || !requestId) return { refunded: false, skipped: true, reason: "PASS_SOURCE_REVIEW_REQUIRED", adminReviewRequired: true };
  const { passUsageEvidenceId } = await import("../payments/passes.js");
  const sourcePointHistoryId = passUsageEvidenceId(userId, featureKey, requestId);
  if (!sourcePointHistoryId) return { refunded: false, skipped: true, reason: "PASS_SOURCE_REVIEW_REQUIRED", adminReviewRequired: true };
  const protectedResult = await findProtectedFundingExecution({
    userId, ids: [sourcePointHistoryId, execution.sourceTransactionId, requestId],
    executionId: execution._id || executionId, failedRequestId: requestId,
  }, (name, filter) => refundModels[name].findOne(filter).lean());
  if (protectedResult) return { refunded: false, skipped: true, adminReviewRequired: true, reason: "FUNDING_ACTIVE_OR_COMPLETED" };
  const { refundPassCoverage } = await import("./pass-consumption.js");
  let result;
  try {
    result = await refundPassCoverage({ userId, cycleKey, cost, refundId: `${featureKey}:${requestId}`,
      sourcePointHistoryId, sourceFeatureKey: featureKey, sourceRequestId: requestId });
  } catch (error) {
    if (error?.code === "REFUND_PASS_REVIEW") return { refunded: false, skipped: true, reason: "PASS_SOURCE_REVIEW_REQUIRED", adminReviewRequired: true };
    throw error;
  }
  if (!result.refunded) return result;
  await ServiceExecutionTransaction.updateOne(
    { _id: executionId },
    { $set: { "metadata.passRefund.refundedAt": new Date() } },
  ).catch(() => {});

  return { refunded: true, idempotent: false, amount: cost };
}

function extractMonthlyCreditExecutionHints(execution = {}) {
  const metadata = execution?.metadata && typeof execution.metadata === "object" ? execution.metadata : {};
  const billing = metadata.billing && typeof metadata.billing === "object" ? metadata.billing : {};
  const requestIdHint = cleanMetadataText(
    billing.requestId || metadata.requestId || metadata.idempotencyKey || execution.executionKey,
    120,
  );
  const purchaseIdHint = cleanMetadataText(
    billing.purchaseId || metadata.purchaseId || metadata.orderId || execution.paymentSessionId,
    120,
  );
  const sessionIdHint = cleanMetadataText(
    metadata.sessionId || execution.sessionId || billing.sessionId || metadata.reportSessionId,
    160,
  );
  const reportIdHint = cleanMetadataText(
    metadata.reportId || execution.reportId || billing.reportId,
    120,
  );
  const pointHistoryHint = cleanMetadataText(
    billing.pointHistoryId || metadata.pointHistoryId || metadata.refundForPointHistoryId,
    120,
  );
  const ledgerIdHint = cleanMetadataText(
    metadata.billing?.ledgerId || billing.ledgerId || metadata.ledgerId,
    120,
  );

  return {
    requestIdHint,
    purchaseIdHint,
    sessionIdHint,
    reportIdHint,
    pointHistoryHint,
    ledgerIdHint,
  };
}

/**
 * V2 월정석 원장(MonthlyCreditLedger)을 되짚을 결제 식별자 후보를 모은다.
 *
 * 🔴 sessionId·reportId 는 일부러 뺀다 — 결제 식별자가 아니라 화면/리포트 식별자라서,
 * 정본 조회기의 sourceId·purchaseId·orderId 절에 넣으면 남의 차감을 오매칭할 수 있다.
 * (PointHistory 갈래는 accessType=membership_credit 로 한 번 더 좁히지만 원장에는 그 필드가 없다.)
 * 값 정리·중복 제거·빈 값 제거는 findMoonstoneSpendEvidence 가 한다.
 */
function collectMonthlyCreditLedgerTokens(execution = {}, hints = {}) {
  const metadata = execution?.metadata && typeof execution.metadata === "object" ? execution.metadata : {};
  const billing = metadata.billing && typeof metadata.billing === "object" ? metadata.billing : {};
  return [
    hints.requestIdHint,
    hints.purchaseIdHint,
    hints.ledgerIdHint,
    // 라우트가 access.executionSourceTransactionId(= ctx.transactionId)로 넘기는 값. V2 에서는
    // PointHistory _id 가 아니라 원장 sourceId 와 같은 requestId 문자열이라 여기서만 쓸모가 있다.
    execution.sourceTransactionId,
    execution.idempotencyKey,
    execution.coinTransactionId,
    execution.orderId,
    execution.paymentSessionId,
    billing.transactionId,
    billing.monthlyCreditLedgerId,
    metadata.transactionId,
    metadata.monthlyCreditLedgerId,
  ];
}

/** 원장 serviceKey(= 상품 featureKey)와 실행 레코드의 키가 어긋날 수 있어 후보를 함께 넘긴다. */
function collectMonthlyCreditFeatureKeys(execution = {}, featureKey = "") {
  const metadata = execution?.metadata && typeof execution.metadata === "object" ? execution.metadata : {};
  const billing = metadata.billing && typeof metadata.billing === "object" ? metadata.billing : {};
  return [
    featureKey,
    execution.featureKey,
    execution.serviceId,
    execution.productId,
    metadata.serviceKey,
    metadata.featureKey,
    billing.featureKey,
    billing.serviceKey,
  ];
}

/**
 * 월정석 자동환불 진입점.
 *
 * 2026-08-12 V2 컷오버 이후 spendMoonstone 은 PointHistory 를 쓰지 않고 MonthlyCreditLedger
 * 한 컬렉션만 남긴다(worker/payments/moonstone.js). 그래서 아래 PointHistory 갈래는 V2 결제에
 * 대해 **구조적으로** 아무것도 못 찾고, 환불이 통째로 skip 돼 refundStatus:"refund_failed" 로
 * 굳었다(재시도 리퍼는 pending 만 줍는다). 구 데이터를 위해 PointHistory 갈래를 먼저 태우고,
 * 그것이 "차감 이력 없음"으로 끝나면 원장 갈래로 넘긴다.
 */
export async function runMonthlyCreditRefund({ env, userId, featureKey, sourceTransactionId, executionId, requestId, reason, execution = {} }, deps = {}) {
  const uid = toObjectId(userId);
  const keys = collectMonthlyCreditFeatureKeys(execution, featureKey);
  const tokens = [...new Set([cleanMetadataText(sourceTransactionId, 180), ...collectMonthlyCreditLedgerTokens(execution, extractMonthlyCreditExecutionHints(execution))].filter(Boolean))];
  if (!uid || !keys.length || !tokens.length) return { refunded: false, skipped: true, reason: 'DEDUCT_HISTORY_NOT_FOUND' };
  const { createPaymentContext, withPaymentDb } = deps.paymentDb || await import('../payments/db.js');
  const { restoreMonthlyCreditLotWithDb } = deps.creditStore || await import('./monthly-credit-store.js');
  const context = createPaymentContext({ requestId: `monthly-refund:${executionId || requestId}`, route: 'service-execution-monthly-refund' });
  return (deps.withDb || withPaymentDb)(env || {}, context, db => db.transaction(async tx => {
    // A committed receipt survives expired/spent refund lots and a lost execution-close response.
    if (executionId) {
      const previous = await tx.findOne(MonthlyCreditLedger, { userId: uid, type: 'MONTHLY_CREDIT_GRANT', serviceKey: {$in:keys}, 'metadata.executionId': String(executionId), 'metadata.source': 'billing.service-execution' });
      if (previous?.settledAt) return { refunded:true, idempotent:true, amount:previous.amount, ledgerId:String(previous._id) };
      // Pre-transaction receipts may be incomplete; do not automatically pay them again.
      if (previous) return { refunded:false, skipped:true, adminReviewRequired:true, reason:'MONTHLY_REFUND_RECEIPT_REVIEW_REQUIRED' };
    }
    // A different retry can refer to the same original debit after its spend proof is excluded.
    const sourceReceipt = await tx.findOne(MonthlyCreditLedger, {
      userId: uid, type: 'MONTHLY_CREDIT_GRANT', serviceKey: {$in: keys},
      'metadata.source': 'billing.service-execution',
      $or: [{'metadata.originalLedgerId': {$in: tokens}}, {'metadata.refundForPointHistoryId': {$in: tokens}}, {'metadata.sourceTransactionId': {$in: tokens}}],
    });
    if (sourceReceipt) return sourceReceipt.settledAt
      ? {refunded: true, idempotent: true, amount: sourceReceipt.amount, ledgerId: String(sourceReceipt._id)}
      : {refunded: false, skipped: true, adminReviewRequired: true, reason: 'MONTHLY_REFUND_RECEIPT_REVIEW_REQUIRED'};
    const debitClauses = tokens.flatMap(token => [
      ...(toObjectId(token) ? [{_id:toObjectId(token)}] : []),
      {'metadata.requestId':token},{'metadata.idempotencyKey':token},{'metadata.purchaseId':token},{'metadata.orderId':token}
    ]);
    const legacy = await tx.findOne(PointHistory, {userId:uid, kind:'deduct', featureKey:{$in:keys}, 'metadata.accessType':'membership_credit', $or:debitClauses});
    let evidence, source, sourceModel, sourceFilter;
    if (legacy) {
      source = String(legacy._id); sourceModel = PointHistory;
      const receipt = await tx.findOne(MonthlyCreditLedger, {userId:uid,type:'MONTHLY_CREDIT_GRANT','metadata.refundForPointHistoryId':source});
      if (receipt) return receipt.settledAt ? {refunded:true,idempotent:true,amount:receipt.amount,ledgerId:String(receipt._id)} : {refunded:false,skipped:true,adminReviewRequired:true,reason:'MONTHLY_REFUND_RECEIPT_REVIEW_REQUIRED'};
      const meta = legacy.metadata || {};
      if (meta.monthlyCreditRefundedForServiceExecution || meta.monthlyCreditRefundedForUnlockFailure || meta.monthlyCreditRefundedForLedgerFailure) return {refunded:false,skipped:true,adminReviewRequired:true,reason:'MONTHLY_REFUND_SOURCE_ALREADY_MARKED'};
      const amount = Number(meta.membershipCreditCost || meta.requiredMonthlyCredits || meta.monthlyCreditCost || 0);
      evidence = {amount,ledgerId:source,sourceId:meta.purchaseId || meta.idempotencyKey || meta.orderId || meta.requestId || '',serviceKey:legacy.featureKey};
      sourceFilter = {_id:legacy._id,userId:uid,kind:'deduct',featureKey:legacy.featureKey,'metadata.monthlyCreditRefundedForServiceExecution':{$ne:true}};
    } else {
      evidence = await (deps.findEvidence || findMoonstoneSpendEvidence)(env,{userId:uid,featureKeys:keys,tokens,db:tx});
      if (!evidence) return {refunded:false,skipped:true,reason:'DEDUCT_HISTORY_NOT_FOUND'};
      source = String(evidence.ledgerId); sourceModel = MonthlyCreditLedger;
      if (!toObjectId(source)) return {refunded:false,skipped:true,reason:'DEDUCT_SOURCE_INVALID'};
      sourceFilter = {_id:toObjectId(source),userId:uid,type:'MONTHLY_CREDIT_SPEND','metadata.refundedForServiceExecution':{$ne:true}};
    }
    if (!Number.isSafeInteger(evidence.amount) || evidence.amount <= 0) return {refunded:false,skipped:true,reason:'MEMBERSHIP_CREDIT_AMOUNT_MISSING'};
    const refundSourceId = `service-exec-refund:${legacy ? 'point' : 'ledger'}:${source}`;
    const receipt = await tx.findOne(MonthlyCreditLedger,{userId:uid,type:'MONTHLY_CREDIT_GRANT',sourceId:refundSourceId});
    if (receipt) return receipt.settledAt ? {refunded:true,idempotent:true,amount:receipt.amount,ledgerId:String(receipt._id)} : {refunded:false,skipped:true,adminReviewRequired:true,reason:'MONTHLY_REFUND_RECEIPT_REVIEW_REQUIRED'};
    const other = await findProtectedFundingExecution({
      userId: uid, ids: [source, ...tokens], executionId: toObjectId(executionId), failedRequestId: requestId,
    }, (name, filter) => tx.findOne(refundModels[name], filter));
    if (other) return {refunded:false,skipped:true,adminReviewRequired:true,reason:'MONTHLY_SOURCE_ACTIVE_OR_COMPLETED'};
    const now = new Date();
    const marked = await tx.updateOne(sourceModel,sourceFilter,{$set:legacy ? {
      'metadata.monthlyCreditRefundedForServiceExecution':true,'metadata.monthlyCreditRefundedForUnlockFailure':true,'metadata.monthlyCreditRefundedAt':now
    } : {'metadata.refundedForServiceExecution':true,'metadata.refundedForUnlockFailure':true,'metadata.refundedAt':now}});
    if (marked.modifiedCount !== 1) throw new Error('MONTHLY_REFUND_SOURCE_CONFLICT');
    const restored = await restoreMonthlyCreditLotWithDb(tx,{userId:uid,lotId:refundSourceId,amount:evidence.amount,pullRequestId:cleanMetadataText(evidence.sourceId,160),returnDetails:true});
    if (!restored?.added) throw new Error('MONTHLY_REFUND_BALANCE_CONFLICT');
    const inserted = await tx.insertOne(MonthlyCreditLedger,{userId:uid,type:'MONTHLY_CREDIT_GRANT',sourceId:refundSourceId,amount:evidence.amount,beforeBalance:restored.beforeBalance,afterBalance:restored.afterBalance,serviceKey:evidence.serviceKey || featureKey,profileId:cleanMetadataText(execution.profileId,120),reason,createdAt:now,updatedAt:now,settledAt:now,metadata:{source:'billing.service-execution',requestId:String(requestId || '').slice(0,120),executionId:String(executionId || ''),originalLedgerId:legacy ? cleanMetadataText(legacy.metadata?.ledgerId || legacy.metadata?.monthlyCreditLedgerId,120) : source,...(legacy?{refundForPointHistoryId:source}:{}),sourceTransactionId:cleanMetadataText(evidence.sourceId,160),accessType:'membership_credit',refundedAt:now}});
    if (legacy) {
      const originalLedgerId = toObjectId(legacy.metadata?.ledgerId || legacy.metadata?.monthlyCreditLedgerId);
      if (originalLedgerId) await tx.updateOne(MonthlyCreditLedger,{_id:originalLedgerId,userId:uid},{$set:{'metadata.refundedForServiceExecution':true,'metadata.refundedForUnlockFailure':true,'metadata.refundedAt':now}});
    }
    return {refunded:true,idempotent:false,amount:evidence.amount,ledgerId:String(inserted.insertedId)};
  }));
}

export async function runPaymentCancel(env, paymentRef = {}, reason, execution = {}) {
  const impUid = String(paymentRef.impUid || paymentRef.paymentId || "").trim();
  const merchantUid = String(paymentRef.merchantUid || execution.merchantUid || "").trim();
  const paymentId = String(paymentRef.paymentId || execution.paymentId || impUid || merchantUid || "").trim();
  if (!impUid && !merchantUid && !paymentId) return { cancelled: false, skipped: true };

  // 🔴 이 함수 **자체**는 withMongoRetry 로 감싸지 않는다 — 아래 cancelPortOnePayment 가 외부 HTTP 라
  // 한 시도가 18s clamp 를 넘길 수 있다. 대신 DB 접촉 3곳을 각각 등록한다(등록의 목적은 재시도가 아니라
  // db.js 의 in-flight 가드에 "지금 쓰는 중"을 알리는 것이다 — 2026-09-03 실사고).
  const payment = await withMongoRetry(env, () => Payment.findOne({
    $or: [
      ...(impUid ? [{ impUid }] : []),
      ...(merchantUid ? [{ merchantUid }] : []),
      ...(paymentId ? [{ impUid: paymentId }, { merchantUid: paymentId }, { requestId: paymentId }] : []),
    ],
  }).lean());

  if (!payment) return { cancelled: false, skipped: true };
  if (!execution.userId || String(payment.userId || "") !== String(execution.userId)) {
    return { cancelled: false, skipped: true, reason: "PAYMENT_OWNER_MISMATCH" };
  }
  if (!execution.featureKey || String(payment.featureKey || "") !== String(execution.featureKey)) {
    return { cancelled: false, skipped: true, reason: "PAYMENT_FEATURE_MISMATCH" };
  }
  if (cleanMetadataText(payment.paymentType, 80).toLowerCase() === "membership_pass") {
    return { cancelled: false, skipped: true, reason: "PASS_PURCHASE_NOT_CONSULTATION_REFUND" };
  }
  if (String(payment.status || "") === "cancelled" || String(payment.status || "") === "refunded") {
    return payment.metadata?.unlockRevoked === true
      ? { cancelled: true, idempotent: true, unlockRevoked: true }
      : { cancelled: true, idempotent: true, adminReviewRequired: true, reason: "PAYMENT_ACCESS_REVOCATION_UNCONFIRMED" };
  }
  // 🔴 "paid" 를 빼면 **V2 카드 결제 전부**가 자동 환불에서 조용히 빠진다. V2 의 승인 종착 상태는
  // orders.js markOrderPaid 가 쓰는 status:"paid"(orderState:"PAID_VERIFIED") 이고, 같은 Payment
  // 컬렉션을 여기서 읽는다. success·fulfilled 는 구 경로의 종착 상태라 둘 다 유효하다.
  if (!REFUNDABLE_PAYMENT_STATUSES.has(String(payment.status || ""))) {
    return { cancelled: false, skipped: true, reason: "PAYMENT_NOT_SUCCESS" };
  }

  const paymentType = cleanMetadataText(payment.paymentType, 80).toLowerCase();
  const accessType = cleanMetadataText(payment.accessType, 80).toLowerCase();
  const paymentMethod = cleanMetadataText(payment.paymentMethod, 80).toLowerCase();
  const singlePurchasePayment = paymentType === "digital_content" && accessType === "single_purchase";
  if (paymentMethod === "monthly_credit") {
    return { cancelled: false, skipped: true, reason: "MONTHLY_CREDIT_NOT_PG" };
  }
  if (!singlePurchasePayment) {
    return { cancelled: false, skipped: true, reason: "PAYMENT_CANCEL_NOT_ELIGIBLE" };
  }
  if (singlePurchasePayment && Number(payment.chargedPoints || 0) > 0) {
    return { cancelled: false, skipped: true, reason: "POINT_CHARGE_ROLLBACK_REQUIRED" };
  }

  // The payment, not the generation attempt, owns the single cancellation intent.
  const refundIdempotencyKey = normalizeRefundIdempotencyKey('service-refund-payment-' + String(payment._id));
  const other = await withMongoRetry(env, () => findProtectedFundingExecution({
    userId: execution.userId, ids: [payment._id, payment.impUid, payment.merchantUid, payment.requestId, execution.sourceTransactionId],
    executionId: execution._id, failedRequestId: execution.executionKey || execution.idempotencyKey,
  }, (name, filter) => refundModels[name].findOne(filter).lean()), { retries: 0 });
  if (other) return {cancelled:false,skipped:true,adminReviewRequired:true,reason:'PAYMENT_ACTIVE_OR_COMPLETED'};
  const claim = await withMongoRetry(env, () => Payment.updateOne({
    _id:payment._id, userId:execution.userId, status:{$in:[...REFUNDABLE_PAYMENT_STATUSES]},
    'metadata.serviceRefundClaimedAt':{$exists:false},
  }, {$set:{'metadata.serviceRefundClaimedAt':nowDate(),'metadata.refundIdempotencyKey':refundIdempotencyKey,'metadata.refundStatus':'pending'}}), {retries:0});
  if (claim.modifiedCount === 1) {
    try {
      await cancelPortOnePayment(env, {impUid:payment.impUid || impUid,merchantUid:payment.merchantUid || merchantUid,
        reason,checksum:Number(payment.paymentAmount || 0) || undefined,idempotencyKey:refundIdempotencyKey});
    } catch { /* A lost response is reconciled by lookup; never issue a second POST. */ }
  }
  let canceledPortOne;
  try { const { fetchPortOnePayment } = await import("./portone.js"); canceledPortOne = await fetchPortOnePayment(env, payment.impUid || impUid || payment.merchantUid || merchantUid); }
  catch { return {cancelled:false,adminReviewRequired:true,reason:'PAYMENT_CANCEL_OUTCOME_UNKNOWN'}; }
  // The normalizer also calls a partial cancellation 'cancelled'. Provider truth is required.
  const providerStatus = String(canceledPortOne?.rawV2?.status || canceledPortOne?.status || '').toUpperCase();
  if (!['CANCELLED','CANCELED'].includes(providerStatus)) return {cancelled:false,adminReviewRequired:true,reason:'PAYMENT_FULL_CANCELLATION_UNCONFIRMED'};

  const now = nowDate();
  let revocation = { unlockRevoked: false, adminReviewRequired: false };
  if (singlePurchasePayment) {
    try {
      // 🔴 이 서브트리 안에 재시도를 새로 추가하지 말 것(verify:no-nested-retry 가 잡는다).
      revocation = await withMongoRetry(env, () => revokePaymentContentAccess({
        payment,
        revokedStatus: CONTENT_ENTITLEMENT_STATUSES.REFUNDED,
        reason: "service_delivery_auto_refund",
      }), { retries: 0 });
    } catch (error) {
      revocation = {
        unlockRevoked: false,
        adminReviewRequired: true,
        error: String(error?.message || error || "Unlock revocation failed.").slice(0, 500),
      };
    }
  }
  await withMongoRetry(env, () => Payment.updateOne(
    { _id: payment._id },
    {
      $set: {
        status: "cancelled",
        orderState: "CANCELLED",
        rawPortOne: canceledPortOne,
        failureCode: "service_delivery_auto_refund",
        failureMessage: String(reason || "Paid service delivery failed.").slice(0, 500),
        failureStage: "service_delivery_auto_refund",
        lastErrorAt: now,
        "metadata.autoRefundedAt": now,
        "metadata.refundIdempotencyKey": refundIdempotencyKey,
        "metadata.refundReason": String(reason || "").slice(0, 160),
        "metadata.refundStatus": "refunded",
        "metadata.unlockRevoked": revocation.unlockRevoked === true,
        "metadata.unlockRevocationStatus": singlePurchasePayment ? CONTENT_ENTITLEMENT_STATUSES.REFUNDED : "",
        "metadata.unlockRevocationError": revocation.error || "",
      },
    },
  ));

  return {
    cancelled: true,
    idempotent: false,
    refundIdempotencyKey,
    providerResponse: canceledPortOne,
    unlockRevoked: revocation.unlockRevoked === true,
    adminReviewRequired: revocation.adminReviewRequired === true,
  };
}

async function settleExecutionById(env, executionId, reasonCode, reasonMessage) {
  let execution = await withMongoRetry(env, () => ServiceExecutionTransaction.findById(executionId).lean());
  if (!execution) return { ok: false, status: "missing" };
  if (execution.status !== "pending") {
    logPaidServiceEvent("[PaidService Duplicate Refund Blocked]", execution, {
      refundStatus: execution.refundStatus,
      deliveryStatus: resolveDeliveryStatus(execution),
    });
    return { ok: true, status: execution.status, idempotent: true };
  }

  const reason = normalizeReason(reasonCode, reasonMessage);
  {
    const checkpoint = await inspectCheckpointBeforeTimeoutRefund(execution, { includeResumable: reason.code === "timeout_auto_refund" });
    if (["completed", "recoverable", "unknown"].includes(checkpoint)) {
      const now = nowDate();
      const fields = checkpoint === "completed"
        ? { status: "success", premiumStatus: "completed", deliveryStatus: "delivered", completedAt: now, deliveredAt: now }
        : { nextRetryAt: new Date(now.getTime() + DEFAULT_TIMEOUT_SECONDS * 1000),
          ...(reason.code !== "timeout_auto_refund" ? { "compensation.adminReviewRequired": true, reasonCode: "DELIVERY_CHECKPOINT_REVIEW_REQUIRED" } : {}) };
      const updated = await withMongoRetry(env, () => ServiceExecutionTransaction.findOneAndUpdate({ _id: execution._id, status: "pending", "lock.token": execution.lock?.token || "" }, {
        $set: { ...fields, refundStatus: "none", "lock.token": "", "lock.until": null },
      }, { returnDocument: "after" }).lean(), { retries: 0 });
      return { ok: Boolean(updated), status: updated?.status || "pending", checkpoint };
    }
  }
  const requestId = execution.executionKey || String(execution._id);
  const refundIdempotencyKey = buildRefundIdempotencyKey(execution);
  const claimNow = nowDate();
  const existingLockToken = cleanMetadataText(execution.lock?.token, 220);
  const lockClauses = [
    { "lock.token": "" },
    { "lock.token": { $exists: false } },
    { "lock.until": null },
    { "lock.until": { $lte: claimNow } },
  ];
  if (existingLockToken.startsWith("svc-lock-")) {
    lockClauses.push({ "lock.token": existingLockToken });
  }
  // 🔴 {retries:0} — 클레임이 성공했는데 응답만 유실되면, 재시도는 lockClauses(호출 시점 스냅샷)로
  // 자기가 방금 건 락을 못 알아보고 null 을 받아 "idempotent" 로 빠진다. 그러면 이미 잠긴 건이
  // 환급되지 않은 채 조용히 넘어간다.
  const claimed = await withMongoRetry(env, () => ServiceExecutionTransaction.findOneAndUpdate(
    {
      _id: execution._id,
      status: "pending",
      $or: lockClauses,
    },
    {
      $set: {
        deliveryStatus: PAID_SERVICE_DELIVERY_STATUSES.REFUND_PENDING,
        premiumStatus: "refund_pending",
        refundStatus: "pending",
        refundRequestedAt: claimNow,
        failedAt: execution.failedAt || claimNow,
        reasonCode: reason.code,
        reasonMessage: reason.message,
        refundIdempotencyKey,
        nextRetryAt: claimNow,
        "lock.token": refundIdempotencyKey,
        "lock.until": lockExpiry(REFUND_LOCK_SECONDS),
        "lock.acquiredAt": claimNow,
      },
    },
    { returnDocument: "after" },
  ).lean(), { retries: 0 });

  if (!claimed) {
    const latest = await withMongoRetry(env, () => ServiceExecutionTransaction.findById(execution._id).lean());
    logPaidServiceEvent("[PaidService Duplicate Refund Blocked]", latest || execution, {
      refundStatus: latest?.refundStatus || execution.refundStatus,
      deliveryStatus: resolveDeliveryStatus(latest || execution),
    });
    return { ok: true, status: latest?.status || execution.status, idempotent: true };
  }

  execution = claimed;
  logPaidServiceEvent("[PaidService Auto Refund Requested]", execution, {
    refundStatus: "pending",
    failureReason: reason.message,
  });

  try {
    // 차감 표식·잔액·영수증은 runCoinRefund의 한 트랜잭션에서 함께 처리한다.
    // 내부 withPaymentDb가 단일 DB admission을 소유하므로 바깥에서 다시 감싸지 않는다.
    const coinResult = await runCoinRefund({
      env,
      userId: execution.userId,
      featureKey: execution.featureKey,
      cost: Number(execution.cost || 0),
      sourceTransactionId: execution.sourceTransactionId,
      executionId: String(execution._id),
      requestId,
      reason: `${reason.message}`.slice(0, 120),
    });

    // 잔액과 원장 복원은 내부의 단일 트랜잭션으로 처리한다.
    const monthlyCreditResult = coinResult.refunded ? {refunded:false,skipped:true,reason:"SOURCE_ALREADY_RESTORED"} : coinResult.adminReviewRequired ? {refunded:false,adminReviewRequired:true,reason:coinResult.reason} : await runMonthlyCreditRefund({
      env,
      userId: execution.userId,
      featureKey: execution.featureKey,
      sourceTransactionId: execution.sourceTransactionId,
      executionId: String(execution._id),
      requestId,
      execution,
      reason: `${reason.message}`.slice(0, 120),
    });

    const passQuotaResult = (coinResult.refunded || monthlyCreditResult.refunded) ? {refunded:false,skipped:true,reason:"SOURCE_ALREADY_RESTORED"} : (coinResult.adminReviewRequired || monthlyCreditResult.adminReviewRequired) ? {refunded:false,adminReviewRequired:true,reason:"REFUND_SOURCE_REVIEW_REQUIRED"} : await withMongoRetry(env, () => runPassQuotaRefund({
      userId: execution.userId,
      executionId: String(execution._id),
      execution,
    }), { retries: 0 });

    const paymentResult = (coinResult.refunded || monthlyCreditResult.refunded || passQuotaResult.refunded)
      ? { cancelled: false, skipped: true, reason: "SOURCE_ALREADY_RESTORED" }
      : (passQuotaResult.adminReviewRequired || monthlyCreditResult.adminReviewRequired)
      ? { cancelled: false, skipped: true, reason: "REFUND_SOURCE_REVIEW_REQUIRED", adminReviewRequired: true }
      : await runPaymentCancel(env, execution.paymentRef || {}, reason.message, execution);

    const nextStatus = (passQuotaResult.adminReviewRequired || monthlyCreditResult.adminReviewRequired || paymentResult.adminReviewRequired) ? "failed" : coinResult.refunded
      || monthlyCreditResult.refunded
      || passQuotaResult.refunded
      || paymentResult.cancelled
      ? "refunded"
      : "failed";
    const now = nowDate();
    await withMongoRetry(env, () => ServiceExecutionTransaction.updateOne(
      { _id: execution._id },
      {
        $set: {
          status: nextStatus,
          premiumStatus: nextStatus === "refunded" ? "refunded" : "refund_failed",
          deliveryStatus: nextStatus === "refunded" ? PAID_SERVICE_DELIVERY_STATUSES.REFUNDED : PAID_SERVICE_DELIVERY_STATUSES.REFUND_FAILED,
          reasonCode: reason.code,
          reasonMessage: reason.message,
          completedAt: now,
          compensatedAt: now,
          nextRetryAt: now,
          refundStatus: nextStatus === "refunded" ? "refunded" : "refund_failed",
          refundedAt: nextStatus === "refunded" ? now : null,
          refundFailedAt: nextStatus === "refunded" ? null : now,
          refundReason: normalizeRefundReason(reason.code || reason.message || ""),
          refundProviderResponse: paymentResult.providerResponse || null,
          refundFailureReason: nextStatus === "refunded"
            ? ""
            : [
              coinResult.reason,
              monthlyCreditResult.reason,
              passQuotaResult.reason,
              paymentResult.reason,
            ].filter(Boolean).join("; ").slice(0, 500),
          "compensation.coinRefunded": Boolean(coinResult.refunded),
          "compensation.coinRefundTxId": String(coinResult.refundTxId || ""),
          "compensation.monthlyCreditRefunded": Boolean(monthlyCreditResult.refunded),
          "compensation.monthlyCreditRefundAmount": Number(monthlyCreditResult.amount || 0),
          "compensation.monthlyCreditRefundLedgerId": String(monthlyCreditResult.ledgerId || ""),
          "compensation.passQuotaRefunded": Boolean(passQuotaResult.refunded),
          "compensation.passQuotaRefundAmount": Number(passQuotaResult.amount || 0),
          "compensation.paymentCancelled": Boolean(paymentResult.cancelled),
          "compensation.unlockRevoked": Boolean(paymentResult.unlockRevoked),
          "compensation.adminReviewRequired": Boolean(paymentResult.adminReviewRequired || passQuotaResult.adminReviewRequired || monthlyCreditResult.adminReviewRequired),
          "lock.token": "",
          "lock.until": null,
          "lock.acquiredAt": null,
        },
      },
    ));

    logPaidServiceEvent(
      nextStatus === "refunded" ? "[PaidService Auto Refund Success]" : "[PaidService Auto Refund Failed]",
      { ...execution, status: nextStatus, refundStatus: nextStatus === "refunded" ? "refunded" : "refund_failed" },
      {
        deliveryStatus: nextStatus === "refunded" ? PAID_SERVICE_DELIVERY_STATUSES.REFUNDED : PAID_SERVICE_DELIVERY_STATUSES.REFUND_FAILED,
        refundStatus: nextStatus === "refunded" ? "refunded" : "refund_failed",
        failureReason: reason.message,
      },
    );

    return {
      ok: true,
      status: nextStatus,
      coinResult,
      monthlyCreditResult,
      passQuotaResult,
      paymentResult,
    };
  } catch (error) {
    const nextRetryCount = Number(execution.retryCount || 0) + 1;
    const exhausted = nextRetryCount >= Number(execution.maxRetries || 5);

    // 🔴 {retries:0} — $inc: retryCount. 재시도하면 소진 판정(maxRetries)이 실제보다 빨리 온다.
    await withMongoRetry(env, () => ServiceExecutionTransaction.updateOne(
      { _id: execution._id },
      {
        $set: {
          status: exhausted ? "failed" : "pending",
          deliveryStatus: exhausted ? PAID_SERVICE_DELIVERY_STATUSES.REFUND_FAILED : PAID_SERVICE_DELIVERY_STATUSES.REFUND_PENDING,
          premiumStatus: exhausted ? "refund_failed" : "refund_pending",
          refundStatus: exhausted ? "refund_failed" : "pending",
          reasonCode: reason.code,
          reasonMessage: String(error?.message || reason.message).slice(0, 500),
          refundFailureReason: String(error?.message || reason.message).slice(0, 500),
          refundFailedAt: exhausted ? nowDate() : null,
          nextRetryAt: exhausted ? nowDate() : backoffRetryAt(nextRetryCount),
          "lock.token": "",
          "lock.until": null,
          "lock.acquiredAt": null,
        },
        $inc: { retryCount: 1 },
      },
    ), { retries: 0 });

    return {
      ok: false,
      status: exhausted ? "failed" : "pending",
      retryCount: nextRetryCount,
      error: String(error?.message || "SETTLEMENT_FAILED"),
    };
  }
}

export async function startServiceExecution(env, userId, payload = {}) {
  await connectDb(env);

  const userObjectId = toObjectId(userId);
  if (!userObjectId) {
    return { ok: false, status: 400, message: "Invalid user id." };
  }

  const executionKey = normalizeExecutionKey(payload.executionKey || payload.requestId);
  const featureKey = normalizeFeatureKey(payload.featureKey);
  const sourceTransactionId = String(payload.sourceTransactionId || "").trim().slice(0, 120);
  const cost = normalizeCost(payload.cost);
  const reportType = normalizeReportType(payload.reportType);
  const reportId = normalizeReportId(payload.reportId);
  const sessionId = normalizeSessionId(payload.sessionId || payload.reportSessionId);
  const paymentSessionId = normalizeSessionId(payload.paymentSessionId);
  const coinTransactionId = normalizeReportId(payload.coinTransactionId || sourceTransactionId);
  const coinAmount = normalizeCost(payload.coinAmount ?? payload.cost);
  const idempotencyKey = normalizeIdempotencyKey(payload.idempotencyKey || executionKey);
  const metadata = payload.metadata && typeof payload.metadata === "object" ? payload.metadata : null;
  const metadataFields = metadata || {};
  const metadataBilling = metadata && typeof metadata.billing === "object" ? metadata.billing : {};
  const paymentRef = safePaymentRef(payload.payment || metadataBilling.payment || metadataFields.payment);
  const serviceId = firstCleanText(payload.serviceId, payload.productId, metadataFields.serviceId, metadataBilling.serviceId, featureKey);
  const productId = firstCleanText(payload.productId, metadataFields.productId, metadataBilling.productId, featureKey);
  const profileId = firstCleanText(payload.profileId, metadataFields.profileId, metadataBilling.profileId);
  const jobId = firstCleanText(payload.jobId, metadataFields.jobId, reportId, sessionId, executionKey);
  const orderId = firstCleanText(payload.orderId, payload.payment?.orderId, payload.payment?.merchantUid, metadataFields.orderId, metadataBilling.orderId);
  const paymentId = firstCleanText(payload.paymentId, payload.impUid, paymentRef.paymentId, paymentRef.impUid, metadataFields.paymentId, metadataBilling.paymentId);
  const merchantUid = firstCleanText(payload.merchantUid, paymentRef.merchantUid, metadataFields.merchantUid, metadataBilling.merchantUid, orderId);
  const impUid = firstCleanText(payload.impUid, paymentRef.impUid, metadataFields.impUid, metadataBilling.impUid, paymentId);
  const amount = firstNonNegativeAmount(
    payload.amount,
    payload.amountKRW,
    payload.payment?.amount,
    payload.payment?.paymentAmount,
    metadataFields.amount,
    metadataFields.amountKRW,
    metadataBilling.amount,
    metadataBilling.amountKRW,
    cost,
  );
  const currency = firstCleanText(payload.currency, payload.payment?.currency, metadataFields.currency, metadataBilling.currency) || "KRW";
  const paymentProvider = firstCleanText(
    payload.paymentProvider,
    payload.payment?.paymentProvider,
    payload.payment?.provider,
    metadataFields.paymentProvider,
    metadataBilling.paymentProvider,
    "portone",
  );

  if (!executionKey) return { ok: false, status: 400, message: "executionKey is required." };
  if (!featureKey) return { ok: false, status: 400, message: "featureKey is required." };

  if (paymentSessionId) {
    const completedByPaymentSession = await ServiceExecutionTransaction.findOne({
      userId: userObjectId,
      paymentSessionId,
      ...(reportType ? { reportType } : {}),
      status: "success",
      premiumStatus: "completed",
    }).sort({ completedAt: -1, createdAt: -1 }).lean();

    if (completedByPaymentSession) {
      return {
        ok: true,
        status: 200,
        idempotent: true,
        execution: toSummary(completedByPaymentSession),
      };
    }
  }

  const startedAt = nowDate();
  const timeoutAt = toTimeoutAt(startedAt, payload.timeoutSeconds);

  const update = {
    $setOnInsert: {
      userId: userObjectId,
      executionKey,
      paymentSessionId,
      coinTransactionId,
      coinAmount,
      idempotencyKey,
      featureKey,
      serviceId,
      productId,
      profileId,
      jobId,
      orderId,
      cost,
      amount,
      currency,
      paymentProvider,
      paymentId,
      merchantUid,
      impUid,
      sourceTransactionId,
      paymentRef,
      status: "pending",
      premiumStatus: "generating",
      deliveryStatus: PAID_SERVICE_DELIVERY_STATUSES.GENERATING,
      timeoutAt,
      nextRetryAt: startedAt,
      retryCount: 0,
      maxRetries: clampInt(payload.maxRetries, 5, 1, 20),
      generationStartedAt: startedAt,
      refundStatus: "none",
      metadata,
      retentionUntil: null,
    },
    $set: {
      heartbeatAt: startedAt,
      lastClientHeartbeatAt: startedAt,
      sessionId: sessionId || undefined,
      reportId: reportId || undefined,
      reportType: reportType || undefined,
    },
  };

  const doc = await ServiceExecutionTransaction.findOneAndUpdate(
    { userId: userObjectId, executionKey },
    update,
    { upsert: true, returnDocument: "after" },
  ).lean();

  logPaidServiceEvent("[PaidService Delivery Start]", doc, {
    deliveryStatus: resolveDeliveryStatus(doc),
    refundStatus: doc?.refundStatus || "none",
  });
  logPaidServiceEvent("[PaidService Entitlement Granted]", doc, {
    deliveryStatus: PAID_SERVICE_DELIVERY_STATUSES.ENTITLEMENT_GRANTED,
    refundStatus: doc?.refundStatus || "none",
  });
  logPaidServiceEvent("[PaidService Generation Start]", doc, {
    deliveryStatus: PAID_SERVICE_DELIVERY_STATUSES.GENERATING,
    refundStatus: doc?.refundStatus || "none",
  });

  return {
    ok: true,
    status: 201,
    idempotent: doc?.status !== "pending" ? true : false,
    execution: toSummary(doc),
  };
}

export async function heartbeatServiceExecution(env, userId, payload = {}) {
  await connectDb(env);
  const userObjectId = toObjectId(userId);
  if (!userObjectId) return { ok: false, status: 400, message: "Invalid user id." };

  const executionKey = normalizeExecutionKey(payload.executionKey || payload.requestId);
  if (!executionKey) return { ok: false, status: 400, message: "executionKey is required." };

  const now = nowDate();
  const timeoutAt = toTimeoutAt(now, payload.timeoutSeconds);

  const doc = await ServiceExecutionTransaction.findOneAndUpdate(
    { userId: userObjectId, executionKey, status: "pending" },
    {
      $set: {
        heartbeatAt: now,
        lastClientHeartbeatAt: now,
        timeoutAt,
      },
    },
    { returnDocument: "after" },
  ).lean();

  if (!doc) {
    const existing = await ServiceExecutionTransaction.findOne({ userId: userObjectId, executionKey }).lean();
    if (!existing) return { ok: false, status: 404, message: "Execution not found." };
    return { ok: true, status: 200, idempotent: true, execution: toSummary(existing) };
  }

  return { ok: true, status: 200, idempotent: false, execution: toSummary(doc) };
}

export async function completeServiceExecution(env, userId, payload = {}) {
  await connectDb(env);
  const userObjectId = toObjectId(userId);
  if (!userObjectId) return { ok: false, status: 400, message: "Invalid user id." };

  const executionKey = normalizeExecutionKey(payload.executionKey || payload.requestId);
  if (!executionKey) return { ok: false, status: 400, message: "executionKey is required." };

  const now = nowDate();
  const reportId = normalizeReportId(payload.reportId);
  const sessionId = normalizeSessionId(payload.sessionId || payload.reportSessionId);
  const completionMetadata = payload.metadata && typeof payload.metadata === "object" ? payload.metadata : null;
  const hasResultPayload = Object.prototype.hasOwnProperty.call(payload, "result");
  const existingForValidation = await ServiceExecutionTransaction.findOne({ userId: userObjectId, executionKey }).lean();
  if (!existingForValidation) return { ok: false, status: 404, message: "Execution not found." };
  if (existingForValidation.status !== "pending") {
    return { ok: true, status: 200, idempotent: true, execution: toSummary(existingForValidation) };
  }

  const validationResult = hasResultPayload
    ? payload.result
    : {
      ...(completionMetadata || {}),
      reportId: reportId || completionMetadata?.reportId || existingForValidation.reportId || "",
      sessionId: sessionId || completionMetadata?.sessionId || existingForValidation.sessionId || "",
      resultId: reportId || sessionId || completionMetadata?.resultId || existingForValidation.reportId || existingForValidation.sessionId || "",
    };
  const validation = validatePaidServiceResult(
    firstCleanText(payload.serviceId, payload.featureKey, existingForValidation.serviceId, existingForValidation.featureKey),
    validationResult,
    { userId: String(userObjectId) },
  );
  logPaidServiceEvent("[PaidService Result Validation]", existingForValidation, {
    deliveryStatus: resolveDeliveryStatus(existingForValidation),
    refundStatus: existingForValidation.refundStatus,
    failureReason: validation.ok ? "" : validation.reason,
  });
  if (!validation.ok) {
    return failServiceExecution(env, userId, {
      executionKey,
      sessionId,
      reportId,
      reasonCode: "invalid_result",
      reasonMessage: validation.reason || "Paid service result validation failed.",
      failureStage: "result_validation",
      failureReason: validation.reason || "Paid service result validation failed.",
      forceRefundOnClose: true,
    });
  }

  const doc = await ServiceExecutionTransaction.findOneAndUpdate(
    { userId: userObjectId, executionKey, status: "pending" },
    {
      $set: {
        status: "success",
        premiumStatus: "completed",
        deliveryStatus: PAID_SERVICE_DELIVERY_STATUSES.DELIVERED,
        reportId: reportId || undefined,
        sessionId: sessionId || undefined,
        deliveredAt: now,
        failedAt: null,
        completedAt: now,
        generationCompletedAt: now,
        refundStatus: "none",
        reasonCode: "",
        reasonMessage: "",
        refundFailureReason: "",
        ...(completionMetadata ? { metadata: completionMetadata } : {}),
        "lock.token": "",
        "lock.until": null,
        "lock.acquiredAt": null,
      },
    },
    { returnDocument: "after" },
  ).lean();

  if (!doc) {
    const existing = await ServiceExecutionTransaction.findOne({ userId: userObjectId, executionKey }).lean();
    if (!existing) return { ok: false, status: 404, message: "Execution not found." };
    return { ok: true, status: 200, idempotent: true, execution: toSummary(existing) };
  }

  logPaidServiceEvent("[PaidService Delivery Success]", doc, {
    deliveryStatus: PAID_SERVICE_DELIVERY_STATUSES.DELIVERED,
    refundStatus: doc.refundStatus || "none",
  });

  return { ok: true, status: 200, idempotent: false, execution: toSummary(doc) };
}

export async function failServiceExecution(env, userId, payload = {}) {
  await connectDb(env);
  const userObjectId = toObjectId(userId);
  if (!userObjectId) return { ok: false, status: 400, message: "Invalid user id." };

  const executionKey = normalizeExecutionKey(payload.executionKey || payload.requestId);
  const sessionId = normalizeSessionId(payload.sessionId || payload.reportSessionId);
  const reportId = normalizeReportId(payload.reportId);
  if (!executionKey && !sessionId && !reportId) {
    return { ok: false, status: 400, message: "executionKey or sessionId or reportId is required." };
  }

  const reason = normalizeReason(payload.reasonCode || "manual_fail", payload.reasonMessage || "Client reported execution failure.");
  const failureStage = normalizeFailureStage(payload.failureStage || reason.code);
  const failureReason = normalizeFailureReason(payload.failureReason || reason.message);
  const softAbandon = isSoftAbandonReason(reason.code);
  const closeRefundImmediate = payload.forceRefundOnClose === true
    || (payload.forceRefundOnClose == null && !isTruthy(env?.SERVICE_EXEC_DEFER_SOFT_ABANDON));

  const query = { userId: userObjectId };
  if (executionKey) query.executionKey = executionKey;
  else if (sessionId) query.sessionId = sessionId;
  else query.reportId = reportId;

  const doc = await ServiceExecutionTransaction.findOne(query)
    .sort({ createdAt: -1, updatedAt: -1 })
    .lean();
  if (!doc) return { ok: false, status: 404, message: "Execution not found." };
  if (doc.status !== "pending") return { ok: true, status: 200, idempotent: true, execution: toSummary(doc) };

  if (softAbandon && !closeRefundImmediate) {
    const now = nowDate();
    const graceSeconds = clampInt(payload.graceSeconds, DEFAULT_SOFT_ABANDON_GRACE_SECONDS, 300, 3600);
    const graceTimeoutAt = toTimeoutAt(now, graceSeconds);
    const updated = await ServiceExecutionTransaction.findOneAndUpdate(
      { _id: doc._id, status: "pending" },
      {
        $set: {
          reasonCode: reason.code,
          reasonMessage: reason.message,
          failureStage,
          failureReason,
          premiumStatus: "abandoned",
          clientClosedAt: now,
          abandonedAt: now,
          nextRetryAt: now,
          timeoutAt: graceTimeoutAt,
          "lock.token": "",
          "lock.until": null,
          "lock.acquiredAt": null,
        },
      },
      { returnDocument: "after" },
    ).lean();

    return {
      ok: true,
      status: 202,
      idempotent: false,
      execution: toSummary(updated || doc),
      settlement: {
        ok: true,
        status: "pending",
        deferred: true,
      },
    };
  }

  const failedAt = nowDate();
  logPaidServiceEvent("[PaidService Delivery Failed]", doc, {
    deliveryStatus: PAID_SERVICE_DELIVERY_STATUSES.FAILED,
    refundStatus: "pending",
    failureReason,
  });

  await ServiceExecutionTransaction.updateOne(
    { _id: doc._id, status: "pending" },
    {
      $set: {
        premiumStatus: "failed",
        deliveryStatus: PAID_SERVICE_DELIVERY_STATUSES.FAILED,
        failedAt,
        generationFailedAt: failedAt,
        failureStage,
        failureReason,
        refundStatus: "pending",
      },
    },
  );

  const settled = await settleExecutionById(env, doc._id, reason.code, reason.message);
  const latest = await ServiceExecutionTransaction.findById(doc._id).lean();

  return {
    ok: true,
    status: settled.ok ? 200 : 202,
    idempotent: false,
    execution: toSummary(latest),
    settlement: settled,
  };
}

export async function getServiceExecution(env, userId, payload = {}) {
  await connectDb(env);
  const userObjectId = toObjectId(userId);
  if (!userObjectId) return { ok: false, status: 400, message: "Invalid user id." };

  const executionKey = normalizeExecutionKey(payload.executionKey || payload.requestId);
  const sessionId = normalizeSessionId(payload.sessionId || payload.reportSessionId);
  const reportId = normalizeReportId(payload.reportId);

  let query = null;
  if (executionKey) {
    query = { userId: userObjectId, executionKey };
  } else if (sessionId) {
    query = { userId: userObjectId, sessionId };
  } else if (reportId) {
    query = { userId: userObjectId, reportId };
  } else {
    return { ok: false, status: 400, message: "executionKey or sessionId or reportId is required." };
  }

  const doc = await ServiceExecutionTransaction.findOne(query).sort({ createdAt: -1 }).lean();
  if (!doc) return { ok: false, status: 404, message: "Execution not found." };
  return { ok: true, status: 200, execution: toSummary(doc) };
}

async function lockNextTimedOutExecution() {
  const now = nowDate();
  const token = randomToken("svc-lock");
  const lockUntil = lockExpiry(DEFAULT_LOCK_SECONDS);

  const doc = await ServiceExecutionTransaction.findOneAndUpdate(
    {
      status: "pending",
      timeoutAt: { $lte: now },
      nextRetryAt: { $lte: now },
      $or: [
        { "lock.until": null },
        { "lock.until": { $lte: now } },
      ],
    },
    {
      $set: {
        "lock.token": token,
        "lock.until": lockUntil,
        "lock.acquiredAt": now,
      },
    },
    {
      sort: { timeoutAt: 1, createdAt: 1 },
      returnDocument: "after",
    },
  ).lean();

  if (!doc) return null;
  return doc;
}

export async function sweepStaleServiceExecutions(env, options = {}) {
  await connectDb(env);
  const limit = clampInt(options.limit, 30, 1, 200);

  const result = {
    scanned: 0,
    refunded: 0,
    failed: 0,
    pending: 0,
  };

  for (let i = 0; i < limit; i += 1) {
    // 🔴 {retries:0} — 이 findOneAndUpdate 는 락 클레임이다. 재시도하면 같은 실행 건에 두 번째 토큰을
    // 발급하거나 다음 건을 함께 잠글 수 있다.
    const locked = await withMongoRetry(env, () => lockNextTimedOutExecution(), { retries: 0 });
    if (!locked) break;

    result.scanned += 1;
    const reason = normalizeReason("timeout_auto_refund", "Execution timeout reached before completion.");
    const settled = await settleExecutionById(env, locked._id, reason.code, reason.message);

    if (settled.status === "refunded") result.refunded += 1;
    else if (settled.status === "failed") result.failed += 1;
    else result.pending += 1;
  }

  return result;
}

export async function runServiceExecutionTimeoutTask(env) {
  const startedAt = Date.now();
  try {
    const result = await sweepStaleServiceExecutions(env, {
      limit: clampInt(env?.SERVICE_EXEC_SWEEP_LIMIT, 30, 1, 200),
    });
    console.log("[CRON] service-execution timeout task completed", JSON.stringify({
      ...result,
      durationMs: Date.now() - startedAt,
    }));
    return result;
  } catch (error) {
    console.error("[CRON] service-execution timeout task failed", String(error?.message || error));
    throw error;
  }
}
