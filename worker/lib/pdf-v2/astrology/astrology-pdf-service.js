import { completePremiumPdfExecution } from "../../premium-pdf-execution.js";
import {
  ASTROLOGY_PREMIUM_FEATURE_KEY,
  clean,
  logAstrologyPdfEvent,
  withAstrologyArchiveFormat,
} from "./astrology-premium.types.js";
import { ASTROLOGY_LLM_VERSION } from "./astrology-chapters.js";
import { generateAstrologyLlmReport } from "./astrology-llm-engine.js";
import { assembleFinalHtml } from "./astrology-html-renderer.js";
import { ASTROLOGY_PROMPT_VERSION } from "./astrology-prompts.js";
import { validateAstrologyPdfCompletionPayload } from "./astrology-validator.js";

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

function updateStatus(params = {}, patch = {}) {
  const payload = {
    status: patch.status,
    progress: Number.isFinite(Number(patch.progress)) ? Number(patch.progress) : undefined,
    stateKey: patch.stateKey || patch.status,
    currentChapterNo: Number.isFinite(Number(patch.currentChapterNo)) ? Number(patch.currentChapterNo) : undefined,
    totalChapters: Number.isFinite(Number(patch.totalChapters)) ? Number(patch.totalChapters) : undefined,
    currentChapterTitle: clean(patch.currentChapterTitle),
    chapter: patch.chapter,
    error: patch.error,
    updatedAt: new Date().toISOString(),
  };
  if (typeof params.onStatus === "function") params.onStatus(payload);
  if (typeof params.onProgress === "function") params.onProgress(payload);
}

function buildAstrologyArchiveMetadata({ input, generated, pdfReady, reportId, sessionId }) {
  const name = clean(input?.userName || "사용자");
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
    displayName: "점성술 프리미엄 PDF",
    title: `${name} 점성술 프리미엄 PDF`,
    mode: "personal",
    birthName: name,
    summary: clean(generated?.chapters?.[0]?.summary || generated?.chapters?.[0]?.body || "", 1000),
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
      llmAssembly: generated.llmAssembly,
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
    llmAssembly: generated.llmAssembly,
    pdfV2: {
      engineVersion: ASTROLOGY_LLM_VERSION,
      promptVersion: ASTROLOGY_PROMPT_VERSION,
      chapterPlanVersion: generated.chapterPlanVersion,
    },
  };
}

export async function runAstrologyPdfService(params = {}) {
  const started = Date.now();
  const userId = clean(params.userId);
  const reportId = clean(params.reportId || params.paymentContext?.reportId || `astro-premium-${Date.now().toString(36)}`);
  const sessionId = clean(params.sessionId || params.paymentContext?.sessionId || params.paymentContext?.reportSessionId || reportId);
  try {
    updateStatus(params, { status: "validating", progress: 5, currentChapterTitle: "입력과 차트 데이터 검증" });
    logAstrologyPdfEvent("ASTROLOGY_PAYMENT_CONTEXT_CONFIRMED", { jobId: reportId, userId, status: "confirmed" });

    const generated = await generateAstrologyLlmReport({
      userId,
      jobId: reportId,
      input: params.input,
      env: params.env,
      requestUrl: params.requestUrl,
      onStatus: (status) => updateStatus(params, status),
    });

    updateStatus(params, {
      status: "rendering",
      progress: 88,
      stateKey: "rendering",
      currentChapterNo: generated.chapterCount,
      totalChapters: generated.expectedChapterCount,
      currentChapterTitle: "PDF HTML 조립",
    });
    const fullHtml = assembleFinalHtml({
      input: generated.normalizedInput,
      chapters: generated.chapters,
      chapterPlan: generated.chapterPlan,
      reportId,
    });
    logAstrologyPdfEvent("ASTROLOGY_HTML_ASSEMBLED", { jobId: reportId, userId, status: "completed" });

    updateStatus(params, {
      status: "rendering",
      progress: 94,
      stateKey: "rendering",
      currentChapterNo: generated.chapterCount,
      totalChapters: generated.expectedChapterCount,
      currentChapterTitle: "PDF 렌더링",
    });
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
      plan: generated.chapterPlan,
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

    updateStatus(params, {
      status: "completed",
      progress: 100,
      stateKey: "completed",
      currentChapterNo: generated.chapterCount,
      totalChapters: generated.expectedChapterCount,
      currentChapterTitle: "완료",
    });
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
      chapterPlan: generated.chapterPlan,
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
    updateStatus(params, {
      status: "failed",
      progress: 100,
      stateKey: "failed",
      currentChapterTitle: "생성 실패",
      error: clean(error?.message || error || "ASTROLOGY_PDF_FAILED"),
    });
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
      details: error?.details || error?.issues || error?.attempts || null,
    };
  }
}
