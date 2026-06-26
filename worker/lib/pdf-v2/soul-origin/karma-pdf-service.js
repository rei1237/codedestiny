import {
  SOUL_ORIGIN_LLM_MANUSCRIPT_SOURCE,
  SOUL_ORIGIN_LLM_PROVIDER,
  SOUL_ORIGIN_LLM_WRITING_PIPELINE,
  clean,
} from "./soul-origin-premium.types.js";
import { generateKarmaIntegratedReport, KARMA_INTEGRATED_GENERATION_MODE, KARMA_INTEGRATED_LLM_VERSION } from "./karma-integrated-llm-engine.js";
import { validateKarmaIntegratedPdfCompletionPayload } from "./karma-validator.js";

function buildArchiveLinks(requestUrl, reportId) {
  const origin = requestUrl ? new URL(requestUrl).origin : "";
  const base = origin && reportId ? `${origin}/api/premium/pdf-archive/${encodeURIComponent(reportId)}` : "";
  return {
    archiveUrl: base,
    pdfUrl: `${base}?format=pdf`,
    htmlUrl: `${base}?format=html`,
    downloadUrl: `${base}?format=pdf`,
  };
}

export async function createKarmaIntegratedPdfJob(params = {}) {
  const reportId = clean(params.reportId || `karma-integrated-${Date.now().toString(36)}`);
  const sessionId = clean(params.sessionId || reportId);
  const generatedAt = new Date().toISOString();
  const generated = await generateKarmaIntegratedReport({
    env: params.env,
    input: params.input,
    calculationSeed: params.calculationSeed,
    userId: params.userId,
    jobId: reportId,
    onStatus: params.onStatus,
  });
  const links = buildArchiveLinks(params.requestUrl, reportId);
  const llmAssembly = generated.llmAssembly || {
    enabled: true,
    externalGeneration: true,
    externalCallsAllowed: generated.externalCallsAllowed !== false,
    fallbackUsed: false,
    provider: generated.provider || SOUL_ORIGIN_LLM_PROVIDER,
    modelName: generated.modelName,
    tokensUsed: Number(generated.tokensUsed || 0),
    cost: Number(generated.cost || 0),
    isMock: generated.isMock === true,
    chapterCount: generated.chapterCount,
    expectedChapterCount: generated.expectedChapterCount,
    engineVersion: KARMA_INTEGRATED_LLM_VERSION,
  };
  const externalCallsAllowed = generated.externalCallsAllowed !== false;
  const pdfReady = {
    html: generated.html,
    filename: `${reportId}.pdf`,
    reportId,
    sessionId,
    pdfUrl: links.pdfUrl,
    htmlUrl: links.htmlUrl,
    downloadUrl: links.downloadUrl,
    storageKey: `premium-archive:soul-origin:${reportId}`,
    mimeType: "application/pdf",
    contentType: "application/pdf",
    renderFormat: "pdf-archive",
    manuscriptSource: SOUL_ORIGIN_LLM_MANUSCRIPT_SOURCE,
    chapterCount: generated.chapterCount,
    expectedChapterCount: generated.expectedChapterCount,
    llmDraftChapterCount: generated.chapterCount,
    llmAssemblyOnly: true,
    externalCallsAllowed,
    llmAssembly,
    provider: generated.provider || SOUL_ORIGIN_LLM_PROVIDER,
    modelName: generated.modelName,
    tokensUsed: Number(generated.tokensUsed || 0),
    cost: Number(generated.cost || 0),
    isMock: generated.isMock === true,
    generationMode: KARMA_INTEGRATED_GENERATION_MODE,
    canDownload: Boolean(links.downloadUrl),
  };
  const pdfCompletionValidation = validateKarmaIntegratedPdfCompletionPayload({
    pdfReady,
    chapterPlan: generated.chapterPlan,
    chapters: generated.chapters,
    requireDownloadUrl: true,
  });
  pdfReady.pdfCompletionValidation = pdfCompletionValidation;
  if (!pdfCompletionValidation.ok) {
    throw Object.assign(new Error("PDF_RENDER_FAILED"), {
      code: "PDF_RENDER_FAILED",
      status: 422,
      issues: pdfCompletionValidation.issues,
      failedStep: "rendering",
    });
  }
  await params.onStatus?.({
    status: "completed",
    progress: 100,
    currentStep: "completed",
    systemStatus: generated.integratedData?.systemStatus,
  });
  return {
    ok: true,
    status: "completed",
    serverStatus: "completed",
    qualityStatus: "passed",
    reportId,
    sessionId,
    generatedAt,
    normalizedInput: params.input,
    integratedData: generated.integratedData,
    chapterPlan: generated.chapterPlan,
    result: {
      reportTitle: generated.reportTitle,
      openingSummary: generated.summary,
      chapters: generated.chapters,
      finalMessage: generated.finalMessage,
      disclaimer: generated.disclaimer,
    },
    reportTitle: generated.reportTitle,
    summary: generated.summary,
    finalMessage: generated.finalMessage,
    disclaimer: generated.disclaimer,
    chapters: generated.chapters,
    chapterCount: generated.chapterCount,
    expectedChapterCount: generated.expectedChapterCount,
    qualityReport: generated.qualityReport,
    manuscriptSource: SOUL_ORIGIN_LLM_MANUSCRIPT_SOURCE,
    chapterAuthoringSource: SOUL_ORIGIN_LLM_MANUSCRIPT_SOURCE,
    summarySource: SOUL_ORIGIN_LLM_MANUSCRIPT_SOURCE,
    generationMode: KARMA_INTEGRATED_GENERATION_MODE,
    provider: generated.provider || SOUL_ORIGIN_LLM_PROVIDER,
    modelName: generated.modelName,
    writingPipeline: SOUL_ORIGIN_LLM_WRITING_PIPELINE,
    fallbackUsed: false,
    llmAssemblyOnly: true,
    externalCallsAllowed,
    llmAssembly,
    pdfReady,
    pdfCompletionValidation,
    pdfV2: generated.pdfV2,
    cacheKey: clean(generated.chapters?.[0]?.cacheKey || ""),
    cached: generated.chapters?.every((chapter) => chapter.cached === true) === true,
  };
}
