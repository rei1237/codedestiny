import { completePremiumPdfExecution } from "../../premium-pdf-execution.js";
import {
  VEDIC_PREMIUM_ENGINE_VERSION,
  VEDIC_PREMIUM_FEATURE_KEY,
  VEDIC_PREMIUM_QUALITY_VERSION,
  clean,
  logVedicPdfEvent,
  withVedicArchiveFormat,
} from "./vedic-premium.types.js";
import { generateVedicPremiumReport } from "./generate-vedic-premium-report.js";
import { assembleVedicPremiumHtml } from "./vedic-premium-html-builder.js";
import { VEDIC_PREMIUM_PROMPT_VERSION } from "./vedic-premium.prompt-pack.js";
import { vedicPremiumChapterPlanV2 } from "./vedic-premium.chapter-plan.js";
import { validateVedicPdfCompletionPayload } from "./vedic-premium.validator.js";

function buildArchiveLinks(requestUrl, reportId) {
  const origin = requestUrl ? new URL(requestUrl).origin : "";
  const base = origin && reportId ? `${origin}/api/premium/pdf-archive/${encodeURIComponent(reportId)}` : "";
  return {
    archiveUrl: base,
    pdfUrl: withVedicArchiveFormat(base, "pdf"),
    htmlUrl: withVedicArchiveFormat(base, "html"),
    downloadUrl: withVedicArchiveFormat(base, "pdf"),
  };
}

function buildVedicArchiveMetadata({ input, generated, pdfReady, reportId, sessionId }) {
  const llmAssembly = generated.llmAssembly || pdfReady.llmAssembly || {};
  return {
    reportId,
    sessionId,
    reportType: "vedic_book",
    reportTypeAliases: ["vedicPremium", "vedic_book"],
    serviceKey: "vedic-premium",
    featureKey: VEDIC_PREMIUM_FEATURE_KEY,
    status: "completed",
    serverStatus: "completed",
    qualityStatus: "passed",
    displayName: "베다점",
    title: `${clean(input?.userProfile?.name || "사용자")} 베다점 프리미엄 PDF`,
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
      featureKey: VEDIC_PREMIUM_FEATURE_KEY,
      reportType: "vedicPremium",
      normalizedInput: input,
      chapters: generated.chapters,
      chapterCount: generated.chapterCount,
      expectedChapterCount: generated.expectedChapterCount,
      manuscriptSource: generated.manuscriptSource,
      generationMode: generated.generationMode,
      provider: generated.provider,
      writingPipeline: "vedic-calculation-to-llm-authored-pdf",
      llmAssembly,
      llmAssemblyOnly: true,
      externalCallsAllowed: true,
      pdfReady,
    },
    localVedicChartJson: generated.localVedicChartJson,
    vedicPremiumInput: input,
    pdfReady,
    manuscriptSource: generated.manuscriptSource,
    generationMode: generated.generationMode,
    provider: generated.provider,
    writingPipeline: "vedic-calculation-to-llm-authored-pdf",
    llmAssembly,
    pdfV2: {
      engineVersion: VEDIC_PREMIUM_ENGINE_VERSION,
      qualityVersion: VEDIC_PREMIUM_QUALITY_VERSION,
      promptVersion: VEDIC_PREMIUM_PROMPT_VERSION,
      chapterPlanVersion: vedicPremiumChapterPlanV2.version,
    },
  };
}

export async function generateVedicPremiumPdfV2(params = {}) {
  const started = Date.now();
  const userId = clean(params.userId);
  const reportId = clean(params.reportId || params.paymentContext?.reportId || `vedic-premium-${Date.now().toString(36)}`);
  const sessionId = clean(params.sessionId || params.paymentContext?.sessionId || params.paymentContext?.reportSessionId || reportId);
  try {
    logVedicPdfEvent("VEDIC_PAYMENT_CONTEXT_CONFIRMED", { jobId: reportId, userId, status: "confirmed" });
    const generated = await generateVedicPremiumReport({
      userId,
      jobId: reportId,
      input: params.input,
      env: params.env,
      onProgress: params.onProgress,
    });
    const fullHtml = assembleVedicPremiumHtml({
      input: generated.normalizedInput,
      chapters: generated.chapters,
      reportId,
    });
    logVedicPdfEvent("VEDIC_HTML_ASSEMBLED", { jobId: reportId, userId, status: "completed" });
    logVedicPdfEvent("VEDIC_PDF_RENDER_STARTED", { jobId: reportId, userId, status: "started" });
    const links = buildArchiveLinks(params.requestUrl, reportId);
    const pdfReady = {
      html: fullHtml,
      filename: `${reportId}.pdf`,
      reportId,
      sessionId,
      pdfUrl: links.pdfUrl,
      htmlUrl: links.htmlUrl,
      downloadUrl: links.downloadUrl,
      storageKey: `premium-archive:vedic:${reportId}`,
      mimeType: "application/pdf",
      contentType: "application/pdf",
      renderFormat: "pdf-archive",
      manuscriptSource: generated.manuscriptSource,
      chapterCount: generated.chapterCount,
      expectedChapterCount: generated.expectedChapterCount,
      llmDraftChapterCount: generated.chapterCount,
      llmAssemblyOnly: true,
      externalCallsAllowed: true,
      llmAssembly: generated.llmAssembly,
      canDownload: Boolean(links.downloadUrl),
    };
    const completionValidation = validateVedicPdfCompletionPayload({
      pdfReady,
      chapters: generated.chapters,
      requireDownloadUrl: true,
    });
    pdfReady.pdfCompletionValidation = completionValidation;
    if (!completionValidation.ok) {
      throw Object.assign(new Error("VEDIC_PDF_COMPLETION_INVALID"), {
        code: "VEDIC_PDF_COMPLETION_INVALID",
        status: 422,
        issues: completionValidation.issues,
      });
    }
    logVedicPdfEvent("VEDIC_PDF_RENDER_COMPLETED", { jobId: reportId, userId, status: "completed" });

    const archive = buildVedicArchiveMetadata({
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
        llmAssembly: generated.llmAssembly,
        pdfCompletionValidation: completionValidation,
        archive,
      });
      if (!completedExecution?.ok) {
        throw Object.assign(new Error("VEDIC_PDF_UPLOAD_FAILED"), {
          code: "VEDIC_PDF_UPLOAD_FAILED",
          status: 500,
        });
      }
    }
    logVedicPdfEvent("VEDIC_PDF_UPLOAD_COMPLETED", { jobId: reportId, userId, status: "completed" });
    logVedicPdfEvent("VEDIC_PDF_COMPLETED", {
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
      serviceKey: "vedic-premium",
      featureKey: VEDIC_PREMIUM_FEATURE_KEY,
      chapterCount: generated.chapterCount,
      expectedChapterCount: generated.expectedChapterCount,
      chapters: generated.chapters,
      localVedicChartJson: generated.localVedicChartJson,
      normalizedInput: generated.normalizedInput,
      manuscriptSource: generated.manuscriptSource,
      generationMode: generated.generationMode,
      provider: generated.provider,
      modelName: generated.modelName,
      writingPipeline: "vedic-calculation-to-llm-authored-pdf",
      llmAssembly: generated.llmAssembly,
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
    logVedicPdfEvent("VEDIC_PDF_FAILED", {
      jobId: reportId,
      userId,
      status: "failed",
      durationMs: Date.now() - started,
      errorCode: clean(error?.code || "VEDIC_PDF_FAILED"),
      errorMessage: clean(error?.message || error, 300),
    });
    return {
      ok: false,
      success: false,
      jobId: reportId,
      reportId,
      sessionId,
      status: "failed",
      error: clean(error?.message || error || "VEDIC_PDF_FAILED"),
      code: clean(error?.code || "VEDIC_PDF_FAILED"),
      statusCode: Number(error?.status || 500),
      details: error?.details || error?.issues || null,
    };
  }
}
