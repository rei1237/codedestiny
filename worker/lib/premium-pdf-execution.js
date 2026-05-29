import {
  completeServiceExecution,
  failServiceExecution,
  startServiceExecution,
} from "./service-execution-task.js";

function clean(value, max = 160) {
  return String(value || "").trim().slice(0, max);
}

function toInt(value, fallback = 0) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.trunc(n));
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
  try {
    const metadata = {
      ...(ctx.metadata || {}),
      ...(extraMetadata && typeof extraMetadata === "object" ? extraMetadata : {}),
      reportId: clean(reportId || ctx.reportId, 120),
    };
    return await completeServiceExecution(env, userId, {
      executionKey: ctx.executionKey,
      sessionId: ctx.sessionId,
      reportId: clean(reportId || ctx.reportId, 120),
      metadata,
    });
  } catch (_) {
    return null;
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
