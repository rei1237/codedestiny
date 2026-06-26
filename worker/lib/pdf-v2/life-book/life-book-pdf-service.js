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
import { LIFE_BOOK_LLM_VERSION } from "./life-book-chapters.js";
import { LIFE_BOOK_PROMPT_VERSION } from "./life-book-prompts.js";
import { assembleFinalHtml } from "./life-book-html-renderer.js";
import { generateLifeBookPremiumReport } from "./life-book-llm-engine.js";
import { validateLifeBookFinalHtml } from "./life-book-validator.js";

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

function validateCompletionPayload({ pdfReady = {}, chapters = [], chapterPlan = [] } = {}) {
  const issues = [];
  const llmAssembly = pdfReady.llmAssembly || {};
  if (!clean(pdfReady.html)) issues.push("pdfReady.html");
  if (!clean(pdfReady.downloadUrl || pdfReady.pdfUrl || pdfReady.htmlUrl)) issues.push("pdfReady.url");
  if (clean(pdfReady.renderFormat) !== "pdf-archive") issues.push("pdfReady.renderFormat");
  if (clean(pdfReady.mimeType) !== "application/pdf") issues.push("pdfReady.mimeType");
  if (clean(pdfReady.manuscriptSource) !== LIFE_BOOK_PREMIUM_MANUSCRIPT_SOURCE) issues.push("pdfReady.manuscriptSource");
  if (clean(pdfReady.generationMode) !== "llm-only") issues.push("pdfReady.generationMode");
  if (clean(pdfReady.writingPipeline) !== LIFE_BOOK_PREMIUM_WRITING_PIPELINE) issues.push("pdfReady.writingPipeline");
  if (llmAssembly.enabled !== true) issues.push("llmAssembly.enabled");
  if (llmAssembly.externalGeneration !== true) issues.push("llmAssembly.externalGeneration");
  if (llmAssembly.fallbackUsed === true) issues.push("llmAssembly.fallbackUsed");
  if (Number(llmAssembly.chapterCount || 0) !== chapterPlan.length) issues.push("llmAssembly.chapterCount");
  if (Number(llmAssembly.expectedChapterCount || 0) !== chapterPlan.length) issues.push("llmAssembly.expectedChapterCount");
  if (chapters.length !== chapterPlan.length) issues.push("chapter.count");
  const htmlValidation = validateLifeBookFinalHtml(pdfReady.html, chapters, chapterPlan);
  if (!htmlValidation.ok) issues.push(...htmlValidation.issues);
  return { ok: issues.length === 0, issues: [...new Set(issues)] };
}

function buildArchiveMetadata({ generated, pdfReady, reportId, sessionId }) {
  const llmAssembly = generated.llmAssembly || buildLifeBookLlmAssembly(generated.chapterCount, generated.expectedChapterCount);
  const displayName = clean(generated.normalizedInput?.userName || "고객", 80);
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
    displayName,
    title: `${displayName}의 인생의 책 PDF`,
    mode: "personal",
    birthName: displayName,
    summary: clean(generated.chapters?.[0]?.summary || generated.chapters?.[0]?.text || "", 1000),
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
      success: true,
      status: "completed",
      serverStatus: "completed",
      qualityStatus: "passed",
      reportId,
      sessionId,
      featureKey: LIFE_BOOK_PREMIUM_FEATURE_KEY,
      reportType: LIFE_BOOK_PREMIUM_REPORT_TYPE,
      normalizedInput: generated.normalizedInput,
      chapterPlan: generated.chapterPlan,
      chapterConfigSource: generated.chapterConfigSource,
      chapterConfigVersion: generated.chapterConfigVersion,
      chapters: generated.chapters,
      chapterCount: generated.chapterCount,
      expectedChapterCount: generated.expectedChapterCount,
      manuscriptSource: generated.manuscriptSource,
      generationMode: generated.generationMode,
      provider: generated.provider,
      modelName: generated.modelName,
      writingPipeline: LIFE_BOOK_PREMIUM_WRITING_PIPELINE,
      llmAssembly,
      llmAssemblyOnly: true,
      externalCallsAllowed: true,
      pdfReady,
      pdfUrl: pdfReady.pdfUrl,
      htmlUrl: pdfReady.htmlUrl,
      downloadUrl: pdfReady.downloadUrl,
      canReopen: true,
      canDownload: true,
    },
    lifeBookPremiumInput: generated.normalizedInput,
    pdfReady,
    manuscriptSource: generated.manuscriptSource,
    generationMode: generated.generationMode,
    provider: generated.provider,
    modelName: generated.modelName,
    writingPipeline: LIFE_BOOK_PREMIUM_WRITING_PIPELINE,
    llmAssembly,
    pdfV2: {
      engineVersion: LIFE_BOOK_PREMIUM_ENGINE_VERSION,
      qualityVersion: LIFE_BOOK_PREMIUM_QUALITY_VERSION,
      promptVersion: LIFE_BOOK_PROMPT_VERSION,
      chapterPlanVersion: generated.chapterConfigVersion,
      llmVersion: LIFE_BOOK_LLM_VERSION,
    },
    canReopen: true,
    canDownload: true,
  };
}

export async function generateLifeBookPremiumPdfV2(params = {}) {
  const started = Date.now();
  const userId = clean(params.userId);
  const reportId = clean(params.reportId || params.paymentContext?.reportId || `saju-lifebook-${Date.now().toString(36)}`);
  const sessionId = clean(params.sessionId || params.paymentContext?.sessionId || params.paymentContext?.reportSessionId || reportId);

  try {
    logLifeBookPdfEvent("LIFE_BOOK_JOB_STARTED", { jobId: reportId, userId, status: "validating" });
    if (typeof params.onProgress === "function") {
      params.onProgress({ status: "validating", progress: 5, currentChapterNo: 0, totalChapters: 0 });
    }

    const generated = await generateLifeBookPremiumReport({
      userId,
      jobId: reportId,
      input: params.input,
      env: params.env,
      onProgress: params.onProgress,
    });

    if (typeof params.onProgress === "function") {
      params.onProgress({ status: "rendering", progress: 85, currentChapterNo: generated.chapterCount, totalChapters: generated.expectedChapterCount });
    }
    const fullHtml = assembleFinalHtml({
      input: generated.normalizedInput,
      chapters: generated.chapters,
      chapterPlan: generated.chapterPlan,
      reportId,
    });
    const links = buildArchiveLinks(params.requestUrl, reportId);
    const llmAssembly = generated.llmAssembly || buildLifeBookLlmAssembly(generated.chapterCount, generated.expectedChapterCount);
    const pdfReady = {
      html: fullHtml,
      filename: `${reportId}.pdf`,
      reportId,
      sessionId,
      pdfUrl: links.pdfUrl,
      htmlUrl: links.htmlUrl,
      downloadUrl: links.downloadUrl,
      archiveUrl: links.archiveUrl,
      documentUrl: links.downloadUrl,
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
      chapters: generated.chapters,
      chapterPlan: generated.chapterPlan,
      chapterConfigSource: generated.chapterConfigSource,
      chapterConfigVersion: generated.chapterConfigVersion,
      llmDraftChapterCount: generated.chapterCount,
      llmAssemblyOnly: true,
      externalCallsAllowed: true,
      llmAssembly,
      canDownload: Boolean(links.downloadUrl),
    };

    const completionValidation = validateCompletionPayload({
      pdfReady,
      chapters: generated.chapters,
      chapterPlan: generated.chapterPlan,
    });
    pdfReady.pdfCompletionValidation = completionValidation;
    if (!completionValidation.ok) {
      throw Object.assign(new Error("LIFE_BOOK_PDF_COMPLETION_INVALID"), {
        code: "LIFE_BOOK_PDF_COMPLETION_INVALID",
        status: 422,
        issues: completionValidation.issues,
      });
    }

    if (typeof params.onProgress === "function") {
      params.onProgress({ status: "rendering", progress: 95, currentChapterNo: generated.chapterCount, totalChapters: generated.expectedChapterCount });
    }
    const archive = buildArchiveMetadata({ generated, pdfReady, reportId, sessionId });
    let completedExecution = null;
    if (params.pdfDbEnv && params.executionContext) {
      completedExecution = await completePremiumPdfExecution(params.pdfDbEnv, userId, params.executionContext, reportId, {
        chapterCount: generated.chapterCount,
        expectedChapterCount: generated.expectedChapterCount,
        manuscriptSource: generated.manuscriptSource,
        generationMode: generated.generationMode,
        writingPipeline: generated.writingPipeline,
        llmAssembly,
        pdfCompletionValidation: completionValidation,
        archive,
        pdfReady,
        chapters: generated.chapters,
        downloadUrl: pdfReady.downloadUrl,
        htmlUrl: pdfReady.htmlUrl,
        pdfUrl: pdfReady.pdfUrl,
        canDownload: true,
      });
      if (!completedExecution?.ok) {
        throw Object.assign(new Error("LIFE_BOOK_PDF_UPLOAD_FAILED"), {
          code: "LIFE_BOOK_PDF_UPLOAD_FAILED",
          status: Number(completedExecution?.status || 500),
        });
      }
    }

    if (typeof params.onProgress === "function") {
      params.onProgress({ status: "completed", progress: 100, currentChapterNo: generated.chapterCount, totalChapters: generated.expectedChapterCount });
    }
    logLifeBookPdfEvent("LIFE_BOOK_JOB_COMPLETED", {
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
      chapterPlan: generated.chapterPlan,
      chapterConfigSource: generated.chapterConfigSource,
      chapterConfigVersion: generated.chapterConfigVersion,
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
    logLifeBookPdfEvent("LIFE_BOOK_JOB_FAILED", {
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
      details: error?.details || error?.issues || error?.validation || null,
    };
  }
}
