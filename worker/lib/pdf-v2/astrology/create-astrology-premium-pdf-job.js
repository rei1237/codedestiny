import { completePremiumPdfExecution } from "../../premium-pdf-execution.js";
import {
  ASTROLOGY_PREMIUM_ENGINE_VERSION,
  ASTROLOGY_PREMIUM_FEATURE_KEY,
  ASTROLOGY_PREMIUM_QUALITY_VERSION,
  clean,
  logAstrologyPdfEvent,
  withAstrologyArchiveFormat,
} from "./astrology-premium.types.js";
import { generateAstrologyPremiumReport } from "./generate-astrology-premium-report.js";
import { assembleAstrologyPremiumHtml } from "./astrology-premium-html-builder.js";
import { ASTROLOGY_PREMIUM_PROMPT_VERSION } from "./astrology-premium.prompt-pack.js";
import { astrologyPremiumChapterPlanV2 } from "./astrology-premium.chapter-plan.js";
import { validateAstrologyPdfCompletionPayload } from "./astrology-premium.validator.js";

function buildArchiveLinks(requestUrl, reportId) {
  const origin = requestUrl ? new URL(requestUrl).origin : "";
  const base = origin && reportId ? `${origin}/api/premium/pdf-archive/${encodeURIComponent(reportId)}` : "";
  return {
    archiveUrl: base,
    pdfUrl: withAstrologyArchiveFormat(base, "pdf"),
    htmlUrl: withAstrologyArchiveFormat(base, "html"),
    downloadUrl: withAstrologyArchiveFormat(base, "pdf"),
  };
}

function buildAstrologyArchiveMetadata({ input, generated, pdfReady, reportId, sessionId }) {
  const llmAssembly = generated.llmAssembly || pdfReady.llmAssembly || {};
  const name = clean(input?.userProfile?.name || "사용자");
  return {
    reportId,
    sessionId,
    reportType: "western_astro_book",
    reportTypeAliases: ["westernAstrologyPremium", "western_astro_book"],
    serviceKey: "astro-premium",
    featureKey: ASTROLOGY_PREMIUM_FEATURE_KEY,
    status: "completed",
    serverStatus: "completed",
    qualityStatus: "passed",
    displayName: "점성술",
    title: `${name} 점성술 프리미엄 PDF`,
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
      featureKey: ASTROLOGY_PREMIUM_FEATURE_KEY,
      reportType: "westernAstrologyPremium",
      normalizedInput: input,
      chapters: generated.chapters,
      chapterCount: generated.chapterCount,
      expectedChapterCount: generated.expectedChapterCount,
      manuscriptSource: generated.manuscriptSource,
      generationMode: generated.generationMode,
      provider: generated.provider,
      writingPipeline: "western-astrology-calculation-to-llm-authored-pdf",
      llmAssembly,
      llmAssemblyOnly: true,
      externalCallsAllowed: true,
      pdfReady,
    },
    localAstroChartJson: generated.localAstroChartJson,
    astrologyPremiumInput: input,
    pdfReady,
    manuscriptSource: generated.manuscriptSource,
    generationMode: generated.generationMode,
    provider: generated.provider,
    writingPipeline: "western-astrology-calculation-to-llm-authored-pdf",
    llmAssembly,
    pdfV2: {
      engineVersion: ASTROLOGY_PREMIUM_ENGINE_VERSION,
      qualityVersion: ASTROLOGY_PREMIUM_QUALITY_VERSION,
      promptVersion: ASTROLOGY_PREMIUM_PROMPT_VERSION,
      chapterPlanVersion: astrologyPremiumChapterPlanV2.version,
    },
  };
}

export async function generateAstrologyPremiumPdfV2(params = {}) {
  const started = Date.now();
  const userId = clean(params.userId);
  const reportId = clean(params.reportId || params.paymentContext?.reportId || `astro-premium-${Date.now().toString(36)}`);
  const sessionId = clean(params.sessionId || params.paymentContext?.sessionId || params.paymentContext?.reportSessionId || reportId);
  try {
    logAstrologyPdfEvent("ASTROLOGY_PAYMENT_CONTEXT_CONFIRMED", { jobId: reportId, userId, status: "confirmed" });
    const generated = await generateAstrologyPremiumReport({
      userId,
      jobId: reportId,
      input: params.input,
      env: params.env,
      requestUrl: params.requestUrl,
      onProgress: params.onProgress,
    });
    const fullHtml = assembleAstrologyPremiumHtml({
      input: generated.normalizedInput,
      chapters: generated.chapters,
      reportId,
    });
    logAstrologyPdfEvent("ASTROLOGY_HTML_ASSEMBLED", { jobId: reportId, userId, status: "completed" });
    logAstrologyPdfEvent("ASTROLOGY_PDF_RENDER_STARTED", { jobId: reportId, userId, status: "started" });
    const links = buildArchiveLinks(params.requestUrl, reportId);
    const pdfReady = {
      html: fullHtml,
      filename: `${reportId}.pdf`,
      reportId,
      sessionId,
      pdfUrl: links.pdfUrl,
      htmlUrl: links.htmlUrl,
      downloadUrl: links.downloadUrl,
      storageKey: `premium-archive:astrology:${reportId}`,
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
    const completionValidation = validateAstrologyPdfCompletionPayload({
      pdfReady,
      chapters: generated.chapters,
      requireDownloadUrl: true,
    });
    pdfReady.pdfCompletionValidation = completionValidation;
    if (!completionValidation.ok) {
      throw Object.assign(new Error("ASTROLOGY_PDF_COMPLETION_INVALID"), {
        code: "ASTROLOGY_PDF_COMPLETION_INVALID",
        status: 422,
        issues: completionValidation.issues,
      });
    }
    logAstrologyPdfEvent("ASTROLOGY_PDF_RENDER_COMPLETED", { jobId: reportId, userId, status: "completed" });

    const archive = buildAstrologyArchiveMetadata({
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
        throw Object.assign(new Error("ASTROLOGY_PDF_UPLOAD_FAILED"), {
          code: "ASTROLOGY_PDF_UPLOAD_FAILED",
          status: 500,
        });
      }
    }
    logAstrologyPdfEvent("ASTROLOGY_PDF_UPLOAD_COMPLETED", { jobId: reportId, userId, status: "completed" });
    logAstrologyPdfEvent("ASTROLOGY_PDF_COMPLETED", {
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
      serviceKey: "astro-premium",
      featureKey: ASTROLOGY_PREMIUM_FEATURE_KEY,
      chapterCount: generated.chapterCount,
      expectedChapterCount: generated.expectedChapterCount,
      chapters: generated.chapters,
      localAstroChartJson: generated.localAstroChartJson,
      normalizedInput: generated.normalizedInput,
      manuscriptSource: generated.manuscriptSource,
      generationMode: generated.generationMode,
      provider: generated.provider,
      modelName: generated.modelName,
      writingPipeline: "western-astrology-calculation-to-llm-authored-pdf",
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
    logAstrologyPdfEvent("ASTROLOGY_PDF_FAILED", {
      jobId: reportId,
      userId,
      status: "failed",
      durationMs: Date.now() - started,
      errorCode: clean(error?.code || "ASTROLOGY_PDF_FAILED"),
      errorMessage: clean(error?.message || error, 300),
    });
    return {
      ok: false,
      success: false,
      jobId: reportId,
      reportId,
      sessionId,
      status: "failed",
      error: clean(error?.message || error || "ASTROLOGY_PDF_FAILED"),
      code: clean(error?.code || "ASTROLOGY_PDF_FAILED"),
      statusCode: Number(error?.status || 500),
      details: error?.details || error?.issues || null,
    };
  }
}
