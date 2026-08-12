import { connectDb, mongoose } from "./db.js";
import { CONTENT_ENTITLEMENT_STATUSES, MonthlyCreditLedger, Payment, PointHistory, ServiceExecutionTransaction, User } from "./models.js";
import { restoreMonthlyCreditLot } from "./monthly-credit-store.js";
import { cancelPortOnePayment } from "./portone.js";
import { revokePaymentContentAccess } from "./content-unlocks.js";

const DEFAULT_TIMEOUT_SECONDS = 600;
const DEFAULT_LOCK_SECONDS = 45;
const DEFAULT_RETENTION_DAYS = 14;
const DEFAULT_SOFT_ABANDON_GRACE_SECONDS = 900;
const REFUND_LOCK_SECONDS = 90;
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

function toRetentionUntil(startedAt) {
  const base = startedAt instanceof Date ? startedAt : nowDate();
  return new Date(base.getTime() + DEFAULT_RETENTION_DAYS * 86400000);
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

async function runCoinRefund({ userId, featureKey, cost, sourceTransactionId, executionId, requestId, reason }) {
  if (!userId || !sourceTransactionId || cost <= 0) {
    return { refunded: false, skipped: true };
  }
  if (!mongoose.Types.ObjectId.isValid(String(sourceTransactionId))) {
    return { refunded: false, skipped: true, reason: "SOURCE_TRANSACTION_NOT_POINT_HISTORY_ID" };
  }

  const existing = await PointHistory.findOne({
    userId,
    kind: "refund",
    "metadata.refundForPointHistoryId": String(sourceTransactionId),
  }).lean();
  if (existing) {
    return {
      refunded: true,
      idempotent: true,
      refundTxId: String(existing._id || ""),
    };
  }

  const deducted = await PointHistory.findOne({
    _id: sourceTransactionId,
    userId,
    kind: "deduct",
  }).lean();
  if (!deducted) {
    return { refunded: false, skipped: true, reason: "DEDUCT_HISTORY_NOT_FOUND" };
  }
  if (cleanMetadataText(deducted?.metadata?.accessType).toLowerCase() === "membership_credit") {
    return { refunded: false, skipped: true, reason: "MEMBERSHIP_CREDIT_DEDUCT" };
  }

  const user = await User.findByIdAndUpdate(
    userId,
    { $inc: { points: cost } },
    { returnDocument: "after", projection: { points: 1 } },
  ).lean();
  if (!user) {
    throw new Error("USER_NOT_FOUND_FOR_REFUND");
  }

  const refund = await PointHistory.create({
    userId,
    kind: "refund",
    delta: cost,
    balanceAfter: Number(user.points || 0),
    reason,
    featureKey,
    metadata: {
      source: "billing.service-execution",
      requestId: String(requestId || "").slice(0, 120),
      executionId: String(executionId || ""),
      refundForPointHistoryId: String(sourceTransactionId),
      sourceTransactionId: String(sourceTransactionId),
    },
  });

  return {
    refunded: true,
    idempotent: false,
    refundTxId: String(refund?._id || ""),
  };
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

async function resolveMonthlyCreditSourceTransactionId({
  userId,
  featureKey,
  sourceTransactionId,
  execution = {},
}) {
  const hints = extractMonthlyCreditExecutionHints(execution);
  const direct = cleanMetadataText(sourceTransactionId || hints.pointHistoryHint, 120);
  if (direct && mongoose.Types.ObjectId.isValid(direct)) {
    const directPoint = await PointHistory.findOne({
      _id: direct,
      userId,
      kind: "deduct",
    }).lean();
    if (directPoint) return String(directPoint._id || "");
  }

  if (!hints.requestIdHint && !hints.purchaseIdHint && !hints.sessionIdHint && !hints.reportIdHint) {
    return "";
  }

  if (hints.ledgerIdHint && mongoose.Types.ObjectId.isValid(hints.ledgerIdHint)) {
    const ledgerById = await MonthlyCreditLedger.findOne({
      _id: hints.ledgerIdHint,
      userId,
      type: "MONTHLY_CREDIT_SPEND",
      ...(featureKey ? { serviceKey: featureKey } : {}),
    }).lean();
    const ledgerPointId = cleanMetadataText(ledgerById?.metadata?.pointHistoryId, 120);
    if (ledgerPointId && mongoose.Types.ObjectId.isValid(ledgerPointId)) {
      return ledgerPointId;
    }
  }

  const ledgerOr = [];
  if (hints.requestIdHint) {
    ledgerOr.push(
      { sourceId: hints.requestIdHint },
      { "metadata.requestId": hints.requestIdHint },
      { "metadata.idempotencyKey": hints.requestIdHint },
      { "metadata.orderId": hints.requestIdHint },
    );
  }
  if (hints.purchaseIdHint) {
    ledgerOr.push(
      { sourceId: hints.purchaseIdHint },
      { "metadata.purchaseId": hints.purchaseIdHint },
      { "metadata.orderId": hints.purchaseIdHint },
    );
  }
  if (ledgerOr.length > 0) {
    const spendLedger = await MonthlyCreditLedger.findOne({
      userId,
      type: "MONTHLY_CREDIT_SPEND",
      ...(featureKey ? { serviceKey: featureKey } : {}),
      $or: ledgerOr,
    }).sort({ createdAt: -1 }).lean();
    const spendLedgerPointId = cleanMetadataText(spendLedger?.metadata?.pointHistoryId, 120);
    if (spendLedgerPointId && mongoose.Types.ObjectId.isValid(spendLedgerPointId)) {
      return spendLedgerPointId;
    }
  }

  const pointHistoryOr = [];
  if (hints.requestIdHint) {
    pointHistoryOr.push(
      { "metadata.requestId": hints.requestIdHint },
      { "metadata.idempotencyKey": hints.requestIdHint },
      { "metadata.orderId": hints.requestIdHint },
    );
  }
  if (hints.purchaseIdHint) {
    pointHistoryOr.push(
      { "metadata.purchaseId": hints.purchaseIdHint },
      { "metadata.orderId": hints.purchaseIdHint },
      { _id: mongoose.Types.ObjectId.isValid(hints.purchaseIdHint) ? hints.purchaseIdHint : undefined },
    );
  }
  if (hints.sessionIdHint) {
    pointHistoryOr.push(
      { "metadata.sessionId": hints.sessionIdHint },
      { "metadata.reportSessionId": hints.sessionIdHint },
    );
  }
  if (hints.reportIdHint) {
    pointHistoryOr.push(
      { "metadata.reportId": hints.reportIdHint },
    );
  }
  const safePointHistoryOr = pointHistoryOr.filter((entry) => Object.values(entry)[0] !== undefined);
  if (safePointHistoryOr.length === 0) return "";

  const pointHistory = await PointHistory.findOne({
    userId,
    kind: "deduct",
    "metadata.accessType": "membership_credit",
    ...(featureKey ? { featureKey } : {}),
    $or: safePointHistoryOr,
  }).sort({ createdAt: -1 }).lean();
  if (!pointHistory) return "";

  return cleanMetadataText(pointHistory._id, 120);
}

async function runMonthlyCreditRefund({
  userId,
  featureKey,
  sourceTransactionId,
  executionId,
  requestId,
  reason,
  execution,
}) {
  const resolvedSourceTransactionId = cleanMetadataText(
    await resolveMonthlyCreditSourceTransactionId({
      userId,
      featureKey: cleanMetadataText(featureKey, 80),
      sourceTransactionId,
      execution,
    }),
    120,
  );
  if (!resolvedSourceTransactionId) return { refunded: false, skipped: true, reason: "DEDUCT_HISTORY_NOT_FOUND" };

  if (executionId && resolvedSourceTransactionId !== cleanMetadataText(sourceTransactionId, 120)) {
    await ServiceExecutionTransaction.updateOne(
      { _id: executionId, userId, sourceTransactionId: { $ne: resolvedSourceTransactionId } },
      { $set: { sourceTransactionId: resolvedSourceTransactionId } },
    ).catch(() => {});
  }

  if (!mongoose.Types.ObjectId.isValid(String(resolvedSourceTransactionId))) {
    return { refunded: false, skipped: true, reason: "SOURCE_TRANSACTION_NOT_POINT_HISTORY_ID" };
  }

  const deducted = await PointHistory.findOne({
    _id: resolvedSourceTransactionId,
    userId,
    kind: "deduct",
  }).lean();
  if (!deducted) return { refunded: false, skipped: true, reason: "DEDUCT_HISTORY_NOT_FOUND" };

  const metadata = deducted?.metadata && typeof deducted.metadata === "object" ? deducted.metadata : {};
  const accessType = cleanMetadataText(metadata.accessType).toLowerCase();
  if (accessType !== "membership_credit") return { refunded: false, skipped: true, reason: "NOT_MEMBERSHIP_CREDIT" };

  const refundSourceId = `service-exec-refund:${String(sourceTransactionId)}`.slice(0, 180);
  const existingLedger = await MonthlyCreditLedger.findOne({
    userId,
    type: "MONTHLY_CREDIT_GRANT",
    sourceId: refundSourceId,
  }).lean();
  if (existingLedger) {
    return {
      refunded: true,
      idempotent: true,
      amount: Number(existingLedger.amount || 0),
      ledgerId: String(existingLedger._id || ""),
    };
  }

  const amount = normalizeCost(
    metadata.membershipCreditCost
    || metadata.requiredMonthlyCredits
    || metadata.monthlyCreditCost
    || 0,
  );
  if (amount <= 0) return { refunded: false, skipped: true, reason: "MEMBERSHIP_CREDIT_AMOUNT_MISSING" };

  // 복원분은 신규 30일 lot으로 재적립(원래 lot의 만료를 되살리지 않음). lotId=refundSourceId로 멱등.
  const updatedUser = await restoreMonthlyCreditLot({ userId, lotId: refundSourceId, amount });
  if (!updatedUser) throw new Error("USER_NOT_FOUND_FOR_MONTHLY_CREDIT_REFUND");

  const afterBalance = Math.max(0, Math.floor(Number(updatedUser?.profileSubscription?.membershipCreditBalance || 0)));
  const ledger = await MonthlyCreditLedger.create({
    userId,
    type: "MONTHLY_CREDIT_GRANT",
    amount,
    beforeBalance: Math.max(0, afterBalance - amount),
    afterBalance,
    reason,
    sourceId: refundSourceId,
    serviceKey: featureKey,
    profileId: cleanMetadataText(metadata.profileId || metadata.selectedProfileId, 120),
    metadata: {
      source: "billing.service-execution",
      requestId: String(requestId || "").slice(0, 120),
      executionId: String(executionId || ""),
      refundForPointHistoryId: String(sourceTransactionId),
      sourceTransactionId: String(sourceTransactionId),
      originalLedgerId: cleanMetadataText(metadata.ledgerId || metadata.monthlyCreditLedgerId, 120),
      accessType: "membership_credit",
      refundedAt: new Date(),
    },
  });

  await PointHistory.updateOne(
    { _id: sourceTransactionId, userId },
    {
      $set: {
        "metadata.monthlyCreditRefundedForServiceExecution": true,
        "metadata.monthlyCreditRefundedAt": new Date(),
        "metadata.monthlyCreditRefundExecutionId": String(executionId || ""),
        "metadata.monthlyCreditRefundLedgerId": String(ledger?._id || ""),
      },
    },
  ).catch(() => {});

  const originalLedgerId = cleanMetadataText(metadata.ledgerId || metadata.monthlyCreditLedgerId, 120);
  if (originalLedgerId && mongoose.Types.ObjectId.isValid(originalLedgerId)) {
    await MonthlyCreditLedger.updateOne(
      { _id: originalLedgerId, userId },
      {
        $set: {
          "metadata.refundedForServiceExecution": true,
          "metadata.refundedAt": new Date(),
          "metadata.refundExecutionId": String(executionId || ""),
          "metadata.refundLedgerId": String(ledger?._id || ""),
        },
      },
    ).catch(() => {});
  }

  return {
    refunded: true,
    idempotent: false,
    amount,
    ledgerId: String(ledger?._id || ""),
  };
}

async function runPaymentCancel(env, paymentRef = {}, reason, execution = {}) {
  const impUid = String(paymentRef.impUid || paymentRef.paymentId || "").trim();
  const merchantUid = String(paymentRef.merchantUid || execution.merchantUid || "").trim();
  const paymentId = String(paymentRef.paymentId || execution.paymentId || impUid || merchantUid || "").trim();
  if (!impUid && !merchantUid && !paymentId) return { cancelled: false, skipped: true };

  const payment = await Payment.findOne({
    $or: [
      ...(impUid ? [{ impUid }] : []),
      ...(merchantUid ? [{ merchantUid }] : []),
      ...(paymentId ? [{ impUid: paymentId }, { merchantUid: paymentId }, { requestId: paymentId }] : []),
    ],
  }).lean();

  if (!payment) return { cancelled: false, skipped: true };
  if (String(payment.status || "") === "cancelled" || String(payment.status || "") === "refunded") {
    return { cancelled: true, idempotent: true };
  }
  if (String(payment.status || "") !== "success" && String(payment.status || "") !== "fulfilled") {
    return { cancelled: false, skipped: true, reason: "PAYMENT_NOT_SUCCESS" };
  }

  const paymentType = cleanMetadataText(payment.paymentType, 80).toLowerCase();
  const accessType = cleanMetadataText(payment.accessType, 80).toLowerCase();
  const paymentMethod = cleanMetadataText(payment.paymentMethod, 80).toLowerCase();
  const singlePurchasePayment = paymentType === "digital_content" && accessType === "single_purchase";
  const membershipPassPayment = paymentType === "membership_pass";
  if (paymentMethod === "monthly_credit") {
    return { cancelled: false, skipped: true, reason: "MONTHLY_CREDIT_NOT_PG" };
  }
  if (!singlePurchasePayment && !membershipPassPayment) {
    return { cancelled: false, skipped: true, reason: "PAYMENT_CANCEL_NOT_ELIGIBLE" };
  }
  if (singlePurchasePayment && Number(payment.chargedPoints || 0) > 0) {
    return { cancelled: false, skipped: true, reason: "POINT_CHARGE_ROLLBACK_REQUIRED" };
  }

  const refundIdempotencyKey = buildRefundIdempotencyKey(execution, payment);
  const canceledPortOne = await cancelPortOnePayment(env, {
    impUid: payment.impUid || impUid,
    merchantUid: payment.merchantUid || merchantUid,
    reason,
    checksum: Number(payment.paymentAmount || 0) || undefined,
    idempotencyKey: refundIdempotencyKey,
  });

  const now = nowDate();
  let revocation = { unlockRevoked: false, adminReviewRequired: false };
  if (singlePurchasePayment) {
    try {
      revocation = await revokePaymentContentAccess({
        payment,
        revokedStatus: CONTENT_ENTITLEMENT_STATUSES.REFUNDED,
        reason: "service_delivery_auto_refund",
      });
    } catch (error) {
      revocation = {
        unlockRevoked: false,
        adminReviewRequired: true,
        error: String(error?.message || error || "Unlock revocation failed.").slice(0, 500),
      };
    }
  }
  await Payment.updateOne(
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
  );

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
  let execution = await ServiceExecutionTransaction.findById(executionId).lean();
  if (!execution) return { ok: false, status: "missing" };
  if (execution.status !== "pending") {
    logPaidServiceEvent("[PaidService Duplicate Refund Blocked]", execution, {
      refundStatus: execution.refundStatus,
      deliveryStatus: resolveDeliveryStatus(execution),
    });
    return { ok: true, status: execution.status, idempotent: true };
  }

  const reason = normalizeReason(reasonCode, reasonMessage);
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
  const claimed = await ServiceExecutionTransaction.findOneAndUpdate(
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
  ).lean();

  if (!claimed) {
    const latest = await ServiceExecutionTransaction.findById(execution._id).lean();
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
    const coinResult = await runCoinRefund({
      userId: execution.userId,
      featureKey: execution.featureKey,
      cost: Number(execution.cost || 0),
      sourceTransactionId: execution.sourceTransactionId,
      executionId: String(execution._id),
      requestId,
      reason: `${reason.message}`.slice(0, 120),
    });

    const monthlyCreditResult = await runMonthlyCreditRefund({
      userId: execution.userId,
      featureKey: execution.featureKey,
      sourceTransactionId: execution.sourceTransactionId,
      executionId: String(execution._id),
      requestId,
      execution,
      reason: `${reason.message}`.slice(0, 120),
    });

    const paymentResult = await runPaymentCancel(env, execution.paymentRef || {}, reason.message, execution);

    const nextStatus = coinResult.refunded
      || monthlyCreditResult.refunded
      || paymentResult.cancelled
      ? "refunded"
      : "failed";
    const now = nowDate();
    await ServiceExecutionTransaction.updateOne(
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
              paymentResult.reason,
            ].filter(Boolean).join("; ").slice(0, 500),
          "compensation.coinRefunded": Boolean(coinResult.refunded),
          "compensation.coinRefundTxId": String(coinResult.refundTxId || ""),
          "compensation.monthlyCreditRefunded": Boolean(monthlyCreditResult.refunded),
          "compensation.monthlyCreditRefundAmount": Number(monthlyCreditResult.amount || 0),
          "compensation.monthlyCreditRefundLedgerId": String(monthlyCreditResult.ledgerId || ""),
          "compensation.paymentCancelled": Boolean(paymentResult.cancelled),
          "compensation.unlockRevoked": Boolean(paymentResult.unlockRevoked),
          "compensation.adminReviewRequired": Boolean(paymentResult.adminReviewRequired),
          "lock.token": "",
          "lock.until": null,
          "lock.acquiredAt": null,
        },
      },
    );

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
      paymentResult,
    };
  } catch (error) {
    const nextRetryCount = Number(execution.retryCount || 0) + 1;
    const exhausted = nextRetryCount >= Number(execution.maxRetries || 5);

    await ServiceExecutionTransaction.updateOne(
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
    );

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
  const retentionUntil = toRetentionUntil(startedAt);

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
      retentionUntil,
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
    const locked = await lockNextTimedOutExecution();
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
