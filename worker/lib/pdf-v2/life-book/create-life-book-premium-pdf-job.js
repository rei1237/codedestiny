import { completePremiumPdfExecution } from "../../premium-pdf-execution.js";
import {
  LIFE_BOOK_PREMIUM_ENGINE_VERSION,
  LIFE_BOOK_PREMIUM_FEATURE_KEY,
  LIFE_BOOK_PREMIUM_MANUSCRIPT_SOURCE,
  LIFE_BOOK_PREMIUM_QUALITY_VERSION,
  LIFE_BOOK_PREMIUM_REPORT_TYPE,
  LIFE_BOOK_PREMIUM_SERVICE_KEY,
  LIFE_BOOK_PREMIUM_WRITING_PIPELINE,
  buildLifeBookLlmAssembly,
  clean,
  logLifeBookPdfEvent,
  withLifeBookArchiveFormat,
} from "./life-book-premium.types.js";
import { generateLifeBookPremiumReport } from "./generate-life-book-premium-report.js";
import { assembleLifeBookPremiumHtml } from "./life-book-premium-html-builder.js";
import { LIFE_BOOK_PREMIUM_PROMPT_VERSION } from "./life-book-premium.prompt-pack.js";
import { lifeBookPremiumChapterPlanV1 } from "./life-book-premium.chapter-plan.js";
import { validateLifeBookPdfCompletionPayload } from "./life-book-premium.validator.js";

function buildArchiveLinks(requestUrl, reportId) {
  const origin = requestUrl ? new URL(requestUrl).origin : "";
  const base = origin && reportId ? `${origin}/api/premium/pdf-archive/${encodeURIComponent(reportId)}` : "";
  return {
    archiveUrl: base,
    pdfUrl: withLifeBookArchiveFormat(base, "pdf"),
    htmlUrl: withLifeBookArchiveFormat(base, "html"),
    downloadUrl: withLifeBookArchiveFormat(base, "pdf"),
  };
}

function buildLifeBookArchiveMetadata({ input, generated, pdfReady, reportId, sessionId }) {
  const llmAssembly = generated.llmAssembly || pdfReady.llmAssembly || buildLifeBookLlmAssembly(generated.chapterCount);
  return {
    reportId,
    sessionId,
    reportType: LIFE_BOOK_PREMIUM_REPORT_TYPE,
    reportTypeAliases: ["lifeBook", "sajuLifeBook", "saju_lifebook_pdf"],
    serviceKey: LIFE_BOOK_PREMIUM_SERVICE_KEY,
    featureKey: LIFE_BOOK_PREMIUM_FEATURE_KEY,
    status: "completed",
    serverStatus: "completed",
    qualityStatus: "passed",
    displayName: "사주 인생의 책",
    title: `${clean(input?.userProfile?.name || "사용자")}님의 사주 인생의 책 PDF`,
    mode: "personal",
    birthName: clean(input?.userProfile?.name),
    summary: clean(generated?.chapters?.[0]?.sections?.[0]?.body || "", 1000),
    pdfUrl: pdfReady.pdfUrl,
    htmlUrl: pdfReady.htmlUrl,
    downloadUrl: pdfReady.downloadUrl,
    chapterCount: generated.chapterCount,
    expectedChapterCount: generated.expectedChapterCount,
    llmDraftChapterCount: generated.chapterCount,
    llmAssemblyOnly: true,
    externalCallsAllowed: true,
    chapters: generated.chapters,
    payload: {
      ok: true,
      status: "completed",
      serverStatus: "completed",
      qualityStatus: "passed",
      reportId,
      sessionId,
      featureKey: LIFE_BOOK_PREMIUM_FEATURE_KEY,
      reportType: LIFE_BOOK_PREMIUM_REPORT_TYPE,
      normalizedInput: input,
      chapters: generated.chapters,
      chapterCount: generated.chapterCount,
      expectedChapterCount: generated.expectedChapterCount,
      manuscriptSource: generated.manuscriptSource,
      generationMode: generated.generationMode,
      provider: generated.provider,
      writingPipeline: LIFE_BOOK_PREMIUM_WRITING_PIPELINE,
      llmAssembly,
      llmAssemblyOnly: true,
      externalCallsAllowed: true,
      pdfReady,
    },
    lifeBookPremiumInput: input,
    pdfReady,
    manuscriptSource: generated.manuscriptSource,
    generationMode: generated.generationMode,
    provider: generated.provider,
    writingPipeline: LIFE_BOOK_PREMIUM_WRITING_PIPELINE,
    llmAssembly,
    pdfV2: {
      engineVersion: LIFE_BOOK_PREMIUM_ENGINE_VERSION,
      qualityVersion: LIFE_BOOK_PREMIUM_QUALITY_VERSION,
      promptVersion: LIFE_BOOK_PREMIUM_PROMPT_VERSION,
      chapterPlanVersion: lifeBookPremiumChapterPlanV1.version,
    },
  };
}

export async function generateLifeBookPremiumPdfV2(params = {}) {
  const started = Date.now();
  const userId = clean(params.userId);
  const reportId = clean(params.reportId || params.paymentContext?.reportId || `saju-lifebook-${Date.now().toString(36)}`);
  const sessionId = clean(params.sessionId || params.paymentContext?.sessionId || params.paymentContext?.reportSessionId || reportId);
  try {
    logLifeBookPdfEvent("LIFE_BOOK_PAYMENT_CONTEXT_CONFIRMED", { jobId: reportId, userId, status: "confirmed" });
    const generated = await generateLifeBookPremiumReport({
      userId,
      jobId: reportId,
      input: params.input,
      env: params.env,
      onProgress: params.onProgress,
    });
    const fullHtml = assembleLifeBookPremiumHtml({
      input: generated.normalizedInput,
      chapters: generated.chapters,
      reportId,
    });
    logLifeBookPdfEvent("LIFE_BOOK_HTML_ASSEMBLED", { jobId: reportId, userId, status: "completed" });
    logLifeBookPdfEvent("LIFE_BOOK_PDF_RENDER_STARTED", { jobId: reportId, userId, status: "started" });
    const links = buildArchiveLinks(params.requestUrl, reportId);
    const llmAssembly = generated.llmAssembly || buildLifeBookLlmAssembly(generated.chapterCount);
    const pdfReady = {
      html: fullHtml,
      filename: `${reportId}.pdf`,
      reportId,
      sessionId,
      pdfUrl: links.pdfUrl,
      htmlUrl: links.htmlUrl,
      downloadUrl: links.downloadUrl,
      storageKey: `premium-archive:life-book:${reportId}`,
      mimeType: "application/pdf",
      contentType: "application/pdf",
      renderFormat: "pdf-archive",
      manuscriptSource: LIFE_BOOK_PREMIUM_MANUSCRIPT_SOURCE,
      generationMode: generated.generationMode,
      writingPipeline: LIFE_BOOK_PREMIUM_WRITING_PIPELINE,
      provider: generated.provider,
      modelName: generated.modelName,
      chapterCount: generated.chapterCount,
      expectedChapterCount: generated.expectedChapterCount,
      llmDraftChapterCount: generated.chapterCount,
      llmAssemblyOnly: true,
      externalCallsAllowed: true,
      llmAssembly,
      canDownload: Boolean(links.downloadUrl),
    };
    const completionValidation = validateLifeBookPdfCompletionPayload({
      pdfReady,
      chapters: generated.chapters,
      requireDownloadUrl: true,
    });
    pdfReady.pdfCompletionValidation = completionValidation;
    if (!completionValidation.ok) {
      throw Object.assign(new Error("LIFE_BOOK_PDF_COMPLETION_INVALID"), {
        code: "LIFE_BOOK_PDF_COMPLETION_INVALID",
        status: 422,
        issues: completionValidation.issues,
      });
    }
    logLifeBookPdfEvent("LIFE_BOOK_PDF_RENDER_COMPLETED", { jobId: reportId, userId, status: "completed" });

    const archive = buildLifeBookArchiveMetadata({
      input: generated.normalizedInput,
      generated,
      pdfReady,
      reportId,
      sessionId,
    });
    let completedExecution = null;
    if (params.pdfDbEnv && params.executionContext) {
      completedExecution = await completePremiumPdfExecution(params.pdfDbEnv, userId, params.executionContext, reportId, {
        chapterCount: generated.chapterCount,
        manuscriptSource: generated.manuscriptSource,
        llmAssembly,
        pdfCompletionValidation: completionValidation,
        archive,
      });
      if (!completedExecution?.ok) {
        throw Object.assign(new Error("LIFE_BOOK_PDF_UPLOAD_FAILED"), {
          code: "LIFE_BOOK_PDF_UPLOAD_FAILED",
          status: 500,
        });
      }
    }
    logLifeBookPdfEvent("LIFE_BOOK_PDF_UPLOAD_COMPLETED", { jobId: reportId, userId, status: "completed" });
    logLifeBookPdfEvent("LIFE_BOOK_PDF_COMPLETED", {
      jobId: reportId,
      userId,
      status: "completed",
      durationMs: Date.now() - started,
      provider: generated.provider,
      modelName: generated.modelName,
    });
    return {
      ok: true,
      success: true,
      jobId: reportId,
      reportId,
      sessionId,
      status: "completed",
      serverStatus: "completed",
      qualityStatus: "passed",
      serviceKey: LIFE_BOOK_PREMIUM_SERVICE_KEY,
      featureKey: LIFE_BOOK_PREMIUM_FEATURE_KEY,
      reportType: LIFE_BOOK_PREMIUM_REPORT_TYPE,
      chapterCount: generated.chapterCount,
      expectedChapterCount: generated.expectedChapterCount,
      chapters: generated.chapters,
      normalizedInput: generated.normalizedInput,
      manuscriptSource: generated.manuscriptSource,
      generationMode: generated.generationMode,
      provider: generated.provider,
      modelName: generated.modelName,
      writingPipeline: generated.writingPipeline,
      llmAssembly,
      llmAssemblyOnly: true,
      externalCallsAllowed: true,
      pdfCompletionValidation: completionValidation,
      archiveStatus: completedExecution ? "completed" : "skipped",
      completedExecutionStored: Boolean(completedExecution?.ok),
      pdfReady,
      pdfUrl: pdfReady.pdfUrl,
      htmlUrl: pdfReady.htmlUrl,
      downloadUrl: pdfReady.downloadUrl,
      canReopen: true,
      canDownload: true,
      payload: archive.payload,
    };
  } catch (error) {
    logLifeBookPdfEvent("LIFE_BOOK_PDF_FAILED", {
      jobId: reportId,
      userId,
      status: "failed",
      durationMs: Date.now() - started,
      errorCode: clean(error?.code || "LIFE_BOOK_PDF_FAILED"),
      errorMessage: clean(error?.message || error, 300),
    });
    return {
      ok: false,
      success: false,
      jobId: reportId,
      reportId,
      sessionId,
      status: "failed",
      error: clean(error?.message || error || "LIFE_BOOK_PDF_FAILED"),
      code: clean(error?.code || "LIFE_BOOK_PDF_FAILED"),
      statusCode: Number(error?.status || 500),
      details: error?.details || error?.issues || null,
    };
  }
}
