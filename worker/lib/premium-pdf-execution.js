import {
  completeServiceExecution,
  failServiceExecution,
  startServiceExecution,
} from "./service-execution-task.js";
import { connectDb, mongoose } from "./db.js";
import { ServiceExecutionTransaction } from "./models.js";

function clean(value, max = 160) {
  return String(value || "").trim().slice(0, max);
}

function toInt(value, fallback = 0) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.trunc(n));
}

function toObjectId(value) {
  const raw = clean(value, 80);
  if (!raw || !mongoose.Types.ObjectId.isValid(raw)) return null;
  return new mongoose.Types.ObjectId(raw);
}

function buildRetentionUntil(baseDate) {
  const base = baseDate instanceof Date ? baseDate : new Date();
  return new Date(base.getTime() + (14 * 86400000));
}

async function persistPremiumExecutionFallback(env, userId, ctx, reportId, metadata) {
  const userObjectId = toObjectId(userId);
  if (!userObjectId || !ctx?.executionKey || !ctx?.featureKey) return null;

  await connectDb(env);

  const now = new Date();
  const resolvedReportId = clean(reportId || ctx.reportId, 120);
  const resolvedSessionId = clean(ctx.sessionId, 180);
  const nextMetadata = metadata && typeof metadata === "object" ? metadata : (ctx.metadata || null);

  const doc = await ServiceExecutionTransaction.findOneAndUpdate(
    {
      userId: userObjectId,
      executionKey: clean(ctx.executionKey, 120),
    },
    {
      $setOnInsert: {
        userId: userObjectId,
        executionKey: clean(ctx.executionKey, 120),
        paymentSessionId: clean(ctx.paymentSessionId, 180),
        coinTransactionId: clean(ctx.coinTransactionId, 120),
        coinAmount: toInt(ctx.coinAmount, 0),
        idempotencyKey: clean(ctx.idempotencyKey || ctx.executionKey, 120),
        featureKey: clean(ctx.featureKey, 80),
        cost: toInt(ctx.cost, 0),
        sourceTransactionId: clean(ctx.sourceTransactionId, 120),
        paymentRef: {
          impUid: "",
          merchantUid: "",
          paymentId: "",
          cancelEligible: false,
        },
        timeoutAt: now,
        nextRetryAt: now,
        retryCount: 0,
        maxRetries: Math.max(1, toInt(ctx.maxRetries, 6)),
        generationStartedAt: now,
        retentionUntil: buildRetentionUntil(now),
      },
      $set: {
        reportType: clean(ctx.reportType, 80) || undefined,
        reportId: resolvedReportId || undefined,
        sessionId: resolvedSessionId || undefined,
        status: "success",
        premiumStatus: "completed",
        completedAt: now,
        generationCompletedAt: now,
        refundStatus: "none",
        reasonCode: "",
        reasonMessage: "",
        metadata: nextMetadata,
        heartbeatAt: now,
        lastClientHeartbeatAt: now,
        "lock.token": "",
        "lock.until": null,
        "lock.acquiredAt": null,
      },
    },
    { upsert: true, returnDocument: "after" },
  ).lean();

  return {
    ok: Boolean(doc),
    status: doc ? 200 : 500,
    idempotent: false,
    execution: doc || null,
  };
}

export function buildPremiumExecutionContext({
  serviceKey,
  reportType,
  userId,
  featureKey,
  sessionId,
  reportId,
  access,
  body,
  timeoutSeconds = 1800,
} = {}) {
  const resolvedSessionId = clean(
    sessionId
    || body?.sessionId
    || body?.reportSessionId
    || body?.accessGrant?.sessionId
    || body?.generationSessionId
    || body?.chapterSessionId,
    180,
  );
  const resolvedReportId = clean(
    reportId
    || body?.reportId
    || body?.accessGrant?.reportId,
    120,
  );
  const requestId = clean(
    body?.requestId
    || body?.accessGrant?.requestId
    || body?._paymentContext?.requestId,
    120,
  );
  const purchaseId = clean(
    body?.purchaseId
    || body?.accessGrant?.purchaseId
    || body?.reportPurchaseId
    || body?._paymentContext?.purchaseId,
    120,
  );
  const matchedTransactionId = clean(
    access?.matchedTransactionId
    || body?.sourceTransactionId
    || body?.transactionId,
    120,
  );
  const chargedCoins = toInt(
    access?.chargedCoins
    || body?.chargedCoins
    || body?.coinAmount
    || body?.cost,
    0,
  );

  const executionKey = clean(
    `${serviceKey || reportType || "premium-pdf"}:${userId || "anonymous"}:${resolvedSessionId || resolvedReportId || requestId || Date.now().toString(36)}`,
    120,
  );

  return {
    executionKey,
    reportType: clean(reportType || serviceKey || "premium-pdf", 80),
    featureKey: clean(featureKey || access?.featureKey || body?.featureKey, 80),
    reportId: resolvedReportId,
    sessionId: resolvedSessionId,
    paymentSessionId: purchaseId,
    coinTransactionId: matchedTransactionId,
    sourceTransactionId: matchedTransactionId,
    coinAmount: chargedCoins,
    cost: chargedCoins,
    timeoutSeconds: Math.max(300, toInt(timeoutSeconds, 1800)),
    maxRetries: 6,
    idempotencyKey: executionKey,
    metadata: {
      requestId,
      purchaseId,
      reportId: resolvedReportId,
      sessionId: resolvedSessionId,
      reportType: clean(reportType || serviceKey || "premium-pdf", 80),
      serviceKey: clean(serviceKey || "premium-pdf", 80),
      featureKey: clean(featureKey || access?.featureKey || body?.featureKey, 80),
    },
  };
}

export async function startPremiumPdfExecution(env, userId, ctx) {
  if (!ctx || !ctx.executionKey || !ctx.featureKey) return null;
  try {
    return await startServiceExecution(env, userId, ctx);
  } catch (_) {
    return null;
  }
}

export async function completePremiumPdfExecution(env, userId, ctx, reportId, extraMetadata = null) {
  if (!ctx || !ctx.executionKey) return null;
  const metadata = {
    ...(ctx.metadata || {}),
    ...(extraMetadata && typeof extraMetadata === "object" ? extraMetadata : {}),
    reportId: clean(reportId || ctx.reportId, 120),
  };

  try {
    let completed = await completeServiceExecution(env, userId, {
      executionKey: ctx.executionKey,
      sessionId: ctx.sessionId,
      reportId: clean(reportId || ctx.reportId, 120),
      metadata,
    });

    // If start step was missed/transiently failed, bootstrap once and complete again.
    if (!completed?.ok && Number(completed?.status) === 404) {
      await startServiceExecution(env, userId, {
        executionKey: ctx.executionKey,
        reportType: ctx.reportType,
        featureKey: ctx.featureKey,
        reportId: clean(reportId || ctx.reportId, 120),
        sessionId: ctx.sessionId,
        paymentSessionId: ctx.paymentSessionId,
        coinTransactionId: ctx.coinTransactionId,
        sourceTransactionId: ctx.sourceTransactionId,
        coinAmount: ctx.coinAmount,
        cost: ctx.cost,
        timeoutSeconds: ctx.timeoutSeconds,
        maxRetries: ctx.maxRetries,
        idempotencyKey: ctx.idempotencyKey,
        metadata,
      });

      completed = await completeServiceExecution(env, userId, {
        executionKey: ctx.executionKey,
        sessionId: ctx.sessionId,
        reportId: clean(reportId || ctx.reportId, 120),
        metadata,
      });
    }

    const completedExecution = completed?.execution || null;
    const completionLooksStored = Boolean(
      completed?.ok
      && completedExecution
      && String(completedExecution.status || "") === "success"
      && String(completedExecution.premiumStatus || "") === "completed"
      && clean(completedExecution.reportId || reportId || ctx.reportId, 120),
    );

    if (!completionLooksStored) {
      completed = await persistPremiumExecutionFallback(env, userId, ctx, reportId, metadata);
    }

    return completed;
  } catch (error) {
    console.error("[premium-pdf-execution][complete-error]", {
      message: String(error?.message || error),
      executionKey: clean(ctx?.executionKey, 120),
      reportId: clean(reportId || ctx?.reportId, 120),
    });
    try {
      return await persistPremiumExecutionFallback(env, userId, ctx, reportId, metadata);
    } catch (fallbackError) {
      console.error("[premium-pdf-execution][fallback-error]", {
        message: String(fallbackError?.message || fallbackError),
        executionKey: clean(ctx?.executionKey, 120),
        reportId: clean(reportId || ctx?.reportId, 120),
      });
      return null;
    }
  }
}

export async function failPremiumPdfExecution(env, userId, ctx, reasonCode, reasonMessage, failureStage = "generation") {
  if (!ctx || !ctx.executionKey) return null;
  try {
    return await failServiceExecution(env, userId, {
      executionKey: ctx.executionKey,
      sessionId: ctx.sessionId,
      reportId: ctx.reportId,
      reasonCode: clean(reasonCode || "generation_failed", 80),
      reasonMessage: clean(reasonMessage || "Premium PDF generation failed.", 500),
      failureStage: clean(failureStage || reasonCode || "generation", 80),
      failureReason: clean(reasonMessage || "Premium PDF generation failed.", 500),
    });
  } catch (_) {
    return null;
  }
}
