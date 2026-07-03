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

function safeObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function firstClean(...values) {
  for (const value of values) {
    const text = clean(value, 2000);
    if (text) return text;
  }
  return "";
}

function arrayLength(value) {
  return Array.isArray(value) ? value.length : 0;
}

function resolvePremiumPdfReadiness(metadata, reportId) {
  const source = safeObject(metadata);
  const archive = safeObject(source.archive || source.resultArchive);
  const payload = safeObject(archive.payload || source.payload);
  const pdfReady = safeObject(archive.pdfReady || source.pdfReady || payload.pdfReady);
  const lifeBookPdfRecord = safeObject(archive.lifeBookPdfRecord || source.lifeBookPdfRecord);
  const chapters = arrayLength(archive.chapters)
    ? archive.chapters
    : (arrayLength(source.chapters) ? source.chapters : payload.chapters);
  const chapterArrayCount = arrayLength(chapters);
  const declaredChapterCount = toInt(
    source.chapterCount
    || source.finalChapterCount
    || archive.chapterCount
    || payload.chapterCount
    || pdfReady.chapterCount,
    0,
  );
  const resolvedReportId = firstClean(
    reportId,
    source.reportId,
    archive.reportId,
    payload.reportId,
    pdfReady.reportId,
  );
  const downloadUrl = firstClean(
    pdfReady.downloadUrl,
    pdfReady.pdfUrl,
    pdfReady.storedUrl,
    pdfReady.reportUrl,
    archive.downloadUrl,
    archive.pdfUrl,
    source.downloadUrl,
    source.pdfUrl,
  );
  const htmlUrl = firstClean(pdfReady.htmlUrl, archive.htmlUrl, source.htmlUrl);
  const html = firstClean(
    pdfReady.html,
    archive.html,
    archive.htmlContent,
    lifeBookPdfRecord.htmlContent,
    source.html,
    source.htmlContent,
  );
  const canDownload = archive.canDownload === true
    || source.canDownload === true
    || pdfReady.canDownload === true
    || Boolean(downloadUrl);
  const hasChapterEvidence = chapterArrayCount > 0
    && (declaredChapterCount <= 0 || chapterArrayCount >= declaredChapterCount);
  const ok = Boolean(
    resolvedReportId
    && downloadUrl
    && htmlUrl
    && html
    && hasChapterEvidence
    && canDownload
  );

  return {
    ok,
    reportId: resolvedReportId,
    chapterArrayCount,
    declaredChapterCount,
    hasDownloadUrl: Boolean(downloadUrl),
    hasHtmlUrl: Boolean(htmlUrl),
    hasHtml: Boolean(html),
    canDownload,
  };
}

function buildPaymentRefFromBody(body = {}) {
  const payment = safeObject(body.payment || body.paymentRef || body._paymentContext?.payment);
  const accessGrant = safeObject(body.accessGrant || body._paymentContext?.accessGrant);
  const accessType = clean(
    payment.accessType
    || accessGrant.accessType
    || accessGrant.transactionType
    || body.accessType,
    80,
  ).toLowerCase();
  const merchantUid = clean(payment.merchantUid || body.merchantUid || body.merchant_uid || accessGrant.merchantUid, 120);
  const paymentId = clean(
    payment.paymentId
    || payment.impUid
    || body.paymentId
    || body.impUid
    || accessGrant.paymentId
    || accessGrant.merchantUid,
    120,
  );
  const hasSinglePaymentKey = Boolean(merchantUid || paymentId);
  return {
    impUid: clean(payment.impUid || payment.paymentId || body.impUid || body.paymentId || accessGrant.paymentId, 120),
    merchantUid,
    paymentId,
    cancelEligible: payment.cancelEligible === true
      || accessGrant.cancelEligible === true
      || body.cancelEligible === true
      || (accessType === "single_purchase" && hasSinglePaymentKey),
  };
}

async function persistPremiumExecutionFallback(env, userId, ctx, reportId, metadata) {
  const userObjectId = toObjectId(userId);
  if (!userObjectId || !ctx?.executionKey || !ctx?.featureKey) return null;

  await connectDb(env);

  const now = new Date();
  const resolvedReportId = clean(reportId || ctx.reportId, 120);
  const resolvedSessionId = clean(ctx.sessionId, 180);
  const nextMetadata = metadata && typeof metadata === "object" ? metadata : (ctx.metadata || null);
  const existing = await ServiceExecutionTransaction.findOne({
    userId: userObjectId,
    executionKey: clean(ctx.executionKey, 120),
  }).lean();
  if (existing && String(existing.status || "") !== "pending") {
    return {
      ok: false,
      status: 409,
      idempotent: true,
      execution: existing,
      message: "Execution is already settled.",
    };
  }

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
        paymentRef: ctx.payment || {
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
    || body?.consume?.transactionId
    || body?._paymentContext?.consume?.transactionId
    || body?.accessGrant?.evidenceId
    || body?.accessGrant?.purchaseId
    || body?.sourceTransactionId
    || body?.transactionId,
    120,
  );
  const chargedCoins = toInt(
    access?.chargedCoins
    || body?.consume?.chargedCoins
    || body?._paymentContext?.consume?.chargedCoins
    || body?.consume?.coinPrice
    || body?.chargedCoins
    || body?.coinAmount
    || body?.cost,
    0,
  );
  const consume = safeObject(body?.consume || body?._paymentContext?.consume);
  const accessGrant = safeObject(body?.accessGrant || body?._paymentContext?.accessGrant);
  const billingAccessType = clean(access?.accessType || consume.accessType || accessGrant.accessType || body?.accessType, 80);
  const billingTransactionType = clean(consume.transactionType || access?.transactionType || body?.transactionType, 80);
  const billingAccessMethod = clean(access?.accessMethod || consume.accessMethod || accessGrant.accessMethod || body?.accessMethod, 80);

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
    payment: buildPaymentRefFromBody(body),
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
      billing: {
        accessType: billingAccessType,
        transactionType: billingTransactionType,
        accessMethod: billingAccessMethod,
        membershipCreditCost: toInt(consume.membershipCreditCost || consume.requiredMonthlyCredits || body?.membershipCreditCost, 0),
        ledgerId: clean(consume.ledgerId || body?.ledgerId, 120),
      },
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
  const readiness = resolvePremiumPdfReadiness(metadata, reportId || ctx.reportId);
  if (!readiness.ok) {
    await failPremiumPdfExecution(
      env,
      userId,
      ctx,
      "premium_pdf_not_completed",
      "Premium PDF was not fully completed before settlement.",
      "pdf-completion-validation",
    );
    const error = new Error("PREMIUM_PDF_NOT_COMPLETED");
    error.code = "PREMIUM_PDF_NOT_COMPLETED";
    error.status = 422;
    error.readiness = readiness;
    throw error;
  }

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
        payment: ctx.payment,
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

    const finalExecution = completed?.execution || null;
    if (!completed?.ok || String(finalExecution?.status || "") !== "success" || String(finalExecution?.premiumStatus || "") !== "completed") {
      const error = new Error("PREMIUM_PDF_EXECUTION_COMPLETE_FAILED");
      error.code = "PREMIUM_PDF_EXECUTION_COMPLETE_FAILED";
      error.status = Number(completed?.status || 500);
      throw error;
    }

    return completed;
  } catch (error) {
    console.error("[premium-pdf-execution][complete-error]", {
      message: String(error?.message || error),
      executionKey: clean(ctx?.executionKey, 120),
      reportId: clean(reportId || ctx?.reportId, 120),
    });
    throw error;
  }
}

export async function failPremiumPdfExecution(env, userId, ctx, reasonCode, reasonMessage, failureStage = "generation") {
  if (!ctx || !ctx.executionKey) return null;
  try {
    const payload = {
      executionKey: ctx.executionKey,
      sessionId: ctx.sessionId,
      reportId: ctx.reportId,
      reasonCode: clean(reasonCode || "generation_failed", 80),
      reasonMessage: clean(reasonMessage || "Premium PDF generation failed.", 500),
      failureStage: clean(failureStage || reasonCode || "generation", 80),
      failureReason: clean(reasonMessage || "Premium PDF generation failed.", 500),
      forceRefundOnClose: true,
    };

    let failed = await failServiceExecution(env, userId, payload);
    if (!failed?.ok && Number(failed?.status || 0) === 404) {
      await startServiceExecution(env, userId, {
        executionKey: ctx.executionKey,
        reportType: ctx.reportType,
        featureKey: ctx.featureKey,
        reportId: ctx.reportId,
        sessionId: ctx.sessionId,
        paymentSessionId: ctx.paymentSessionId,
        coinTransactionId: ctx.coinTransactionId,
        sourceTransactionId: ctx.sourceTransactionId,
        payment: ctx.payment,
        coinAmount: ctx.coinAmount,
        cost: ctx.cost,
        timeoutSeconds: ctx.timeoutSeconds,
        maxRetries: ctx.maxRetries,
        idempotencyKey: ctx.idempotencyKey,
        metadata: ctx.metadata,
      });
      failed = await failServiceExecution(env, userId, payload);
    }

    return failed;
  } catch (error) {
    console.error("[premium-pdf-execution][fail-error]", {
      message: String(error?.message || error),
      executionKey: clean(ctx?.executionKey, 120),
      reportId: clean(ctx?.reportId, 120),
    });
    return null;
  }
}
