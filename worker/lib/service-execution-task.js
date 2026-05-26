import { connectDb, mongoose } from "./db.js";
import { Payment, PointHistory, ServiceExecutionTransaction, User } from "./models.js";
import { cancelPortOnePayment } from "./portone.js";

const DEFAULT_TIMEOUT_SECONDS = 600;
const DEFAULT_LOCK_SECONDS = 45;
const DEFAULT_RETENTION_DAYS = 14;

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

function safePaymentRef(input = {}) {
  return {
    impUid: String(input?.impUid || input?.paymentId || "").trim().slice(0, 120),
    merchantUid: String(input?.merchantUid || "").trim().slice(0, 120),
    paymentId: String(input?.paymentId || input?.impUid || "").trim().slice(0, 120),
    cancelEligible: Boolean(input?.cancelEligible === true),
  };
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
    status: String(doc.status || "pending"),
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
      paymentCancelled: Boolean(doc?.compensation?.paymentCancelled),
    },
  };
}

async function runCoinRefund({ userId, featureKey, cost, sourceTransactionId, executionId, requestId, reason }) {
  if (!userId || !sourceTransactionId || cost <= 0) {
    return { refunded: false, skipped: true };
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

async function runPaymentCancel(env, paymentRef = {}, reason) {
  if (!paymentRef.cancelEligible) return { cancelled: false, skipped: true };
  const impUid = String(paymentRef.impUid || paymentRef.paymentId || "").trim();
  const merchantUid = String(paymentRef.merchantUid || "").trim();
  if (!impUid && !merchantUid) return { cancelled: false, skipped: true };

  const payment = await Payment.findOne({
    $or: [
      ...(impUid ? [{ impUid }] : []),
      ...(merchantUid ? [{ merchantUid }] : []),
    ],
  }).lean();

  if (!payment) return { cancelled: false, skipped: true };
  if (String(payment.status || "") === "cancelled") {
    return { cancelled: true, idempotent: true };
  }
  if (String(payment.status || "") !== "success") {
    return { cancelled: false, skipped: true };
  }

  const canceledPortOne = await cancelPortOnePayment(env, {
    impUid: payment.impUid || impUid,
    merchantUid: payment.merchantUid || merchantUid,
    reason,
    checksum: Number(payment.paymentAmount || 0) || undefined,
  });

  await Payment.updateOne(
    { _id: payment._id },
    {
      $set: {
        status: "cancelled",
        rawPortOne: canceledPortOne,
      },
    },
  );

  return { cancelled: true, idempotent: false };
}

async function settleExecutionById(env, executionId, reasonCode, reasonMessage) {
  const execution = await ServiceExecutionTransaction.findById(executionId).lean();
  if (!execution) return { ok: false, status: "missing" };
  if (execution.status !== "pending") return { ok: true, status: execution.status, idempotent: true };

  const reason = normalizeReason(reasonCode, reasonMessage);
  const requestId = execution.executionKey || String(execution._id);

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

    const paymentResult = await runPaymentCancel(env, execution.paymentRef || {}, reason.message);

    const nextStatus = coinResult.refunded || paymentResult.cancelled ? "refunded" : "failed";
    await ServiceExecutionTransaction.updateOne(
      { _id: execution._id },
      {
        $set: {
          status: nextStatus,
          reasonCode: reason.code,
          reasonMessage: reason.message,
          completedAt: nowDate(),
          compensatedAt: nowDate(),
          nextRetryAt: nowDate(),
          "compensation.coinRefunded": Boolean(coinResult.refunded),
          "compensation.coinRefundTxId": String(coinResult.refundTxId || ""),
          "compensation.paymentCancelled": Boolean(paymentResult.cancelled),
          "lock.token": "",
          "lock.until": null,
          "lock.acquiredAt": null,
        },
      },
    );

    return {
      ok: true,
      status: nextStatus,
      coinResult,
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
          reasonCode: reason.code,
          reasonMessage: String(error?.message || reason.message).slice(0, 500),
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

  if (!executionKey) return { ok: false, status: 400, message: "executionKey is required." };
  if (!featureKey) return { ok: false, status: 400, message: "featureKey is required." };

  const startedAt = nowDate();
  const timeoutAt = toTimeoutAt(startedAt, payload.timeoutSeconds);
  const retentionUntil = toRetentionUntil(startedAt);

  const update = {
    $setOnInsert: {
      userId: userObjectId,
      executionKey,
      featureKey,
      cost,
      sourceTransactionId,
      paymentRef: safePaymentRef(payload.payment),
      status: "pending",
      timeoutAt,
      nextRetryAt: startedAt,
      retryCount: 0,
      maxRetries: clampInt(payload.maxRetries, 5, 1, 20),
      metadata: payload.metadata && typeof payload.metadata === "object" ? payload.metadata : null,
      retentionUntil,
    },
    $set: {
      heartbeatAt: startedAt,
    },
  };

  const doc = await ServiceExecutionTransaction.findOneAndUpdate(
    { userId: userObjectId, executionKey },
    update,
    { upsert: true, returnDocument: "after" },
  ).lean();

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
  const doc = await ServiceExecutionTransaction.findOneAndUpdate(
    { userId: userObjectId, executionKey, status: "pending" },
    {
      $set: {
        status: "success",
        completedAt: now,
        reasonCode: "",
        reasonMessage: "",
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

  return { ok: true, status: 200, idempotent: false, execution: toSummary(doc) };
}

export async function failServiceExecution(env, userId, payload = {}) {
  await connectDb(env);
  const userObjectId = toObjectId(userId);
  if (!userObjectId) return { ok: false, status: 400, message: "Invalid user id." };

  const executionKey = normalizeExecutionKey(payload.executionKey || payload.requestId);
  if (!executionKey) return { ok: false, status: 400, message: "executionKey is required." };

  const reason = normalizeReason(payload.reasonCode || "manual_fail", payload.reasonMessage || "Client reported execution failure.");

  const doc = await ServiceExecutionTransaction.findOne({ userId: userObjectId, executionKey }).lean();
  if (!doc) return { ok: false, status: 404, message: "Execution not found." };
  if (doc.status !== "pending") return { ok: true, status: 200, idempotent: true, execution: toSummary(doc) };

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
