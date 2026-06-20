import {
  SOUL_ORIGIN_LLM_MANUSCRIPT_SOURCE,
  SOUL_ORIGIN_LLM_PROVIDER,
  SOUL_ORIGIN_LLM_WRITING_PIPELINE,
  buildSoulOriginLlmAssembly,
  clean,
} from "./soul-origin-premium.types.js";
import { generateSoulOriginLlmReport } from "./generate-soul-origin-premium-report.js";
import { renderSoulOriginPdfFromLlmResult } from "./soul-origin-premium-html-builder.js";
import { validateSoulOriginPdfCompletionPayload } from "./soul-origin-premium.validator.js";

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

export async function createSoulOriginPremiumPdfJob(params = {}) {
  const reportId = clean(params.reportId || `soul-origin-${Date.now().toString(36)}`);
  const sessionId = clean(params.sessionId || reportId);
  const generatedAt = new Date().toISOString();
  const generated = await generateSoulOriginLlmReport({
    env: params.env,
    input: params.input,
    userId: params.userId,
    jobId: reportId,
  });
  const html = renderSoulOriginPdfFromLlmResult({
    input: generated.normalizedInput,
    result: generated.result,
    reportId,
    generatedAt,
  });
  const links = buildArchiveLinks(params.requestUrl, reportId);
  const llmAssembly = generated.llmAssembly || buildSoulOriginLlmAssembly(generated.chapterCount);
  const pdfReady = {
    html,
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
    externalCallsAllowed: true,
    llmAssembly,
    provider: generated.provider || SOUL_ORIGIN_LLM_PROVIDER,
    modelName: generated.modelName,
    canDownload: Boolean(links.downloadUrl),
  };
  const pdfCompletionValidation = validateSoulOriginPdfCompletionPayload({
    pdfReady,
    result: generated.result,
    requireDownloadUrl: true,
  });
  pdfReady.pdfCompletionValidation = pdfCompletionValidation;
  if (!pdfCompletionValidation.ok) {
    throw Object.assign(new Error("PDF_RENDER_FAILED"), {
      code: "PDF_RENDER_FAILED",
      status: 422,
      issues: pdfCompletionValidation.issues,
    });
  }
  return {
    ok: true,
    status: "completed",
    serverStatus: "completed",
    qualityStatus: "passed",
    reportId,
    sessionId,
    generatedAt,
    normalizedInput: generated.normalizedInput,
    result: generated.result,
    reportTitle: generated.result.reportTitle,
    summary: generated.result.openingSummary,
    finalMessage: generated.result.finalMessage,
    disclaimer: generated.result.disclaimer,
    chapters: generated.chapters,
    chapterCount: generated.chapterCount,
    expectedChapterCount: generated.expectedChapterCount,
    qualityReport: generated.qualityReport,
    manuscriptSource: SOUL_ORIGIN_LLM_MANUSCRIPT_SOURCE,
    chapterAuthoringSource: SOUL_ORIGIN_LLM_MANUSCRIPT_SOURCE,
    summarySource: SOUL_ORIGIN_LLM_MANUSCRIPT_SOURCE,
    generationMode: SOUL_ORIGIN_LLM_MANUSCRIPT_SOURCE,
    provider: generated.provider || SOUL_ORIGIN_LLM_PROVIDER,
    modelName: generated.modelName,
    writingPipeline: SOUL_ORIGIN_LLM_WRITING_PIPELINE,
    fallbackUsed: false,
    llmAssemblyOnly: true,
    externalCallsAllowed: true,
    llmAssembly,
    pdfReady,
    pdfCompletionValidation,
    pdfV2: generated.pdfV2,
    cacheKey: generated.cacheKey,
    cached: generated.cached === true,
    attempts: generated.attempts || [],
  };
}
