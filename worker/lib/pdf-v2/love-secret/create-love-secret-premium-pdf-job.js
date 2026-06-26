import { completePremiumPdfExecution } from "../../premium-pdf-execution.js";
import {
  LOVE_SECRET_PREMIUM_COMPAT_FEATURE_KEY,
  LOVE_SECRET_PREMIUM_ENGINE_VERSION,
  LOVE_SECRET_PREMIUM_FEATURE_KEY,
  LOVE_SECRET_PREMIUM_QUALITY_VERSION,
  clean,
  logLoveSecretPdfEvent,
  normalizeLoveSecretMode,
  withLoveSecretArchiveFormat,
} from "./love-secret-premium.types.js";
import { generateLoveSecretPremiumReport } from "./generate-love-secret-premium-report.js";
import { assembleLoveSecretPremiumHtml } from "./love-secret-premium-html-builder.js";
import { LOVE_SECRET_PREMIUM_PROMPT_VERSION } from "./love-secret-premium.prompt-pack.js";
import { validateLoveSecretPdfCompletionPayload } from "./love-secret-premium.validator.js";

function buildArchiveLinks(requestUrl, reportId) {
  const origin = requestUrl ? new URL(requestUrl).origin : "";
  const base = origin && reportId ? `${origin}/api/premium/pdf-archive/${encodeURIComponent(reportId)}` : "";
  return {
    archiveUrl: base,
    pdfUrl: withLoveSecretArchiveFormat(base, "pdf"),
    htmlUrl: withLoveSecretArchiveFormat(base, "html"),
    downloadUrl: withLoveSecretArchiveFormat(base, "pdf"),
  };
}

function resolveMode(input = {}, paymentContext = {}) {
  return normalizeLoveSecretMode(input.mode || input.body?.mode || input.body?.reportMode || paymentContext.mode, { allowDefault: true });
}

function resolveFeatureKey(mode, paymentContext = {}) {
  return clean(paymentContext.featureKey) || (mode === "compatibility" ? LOVE_SECRET_PREMIUM_COMPAT_FEATURE_KEY : LOVE_SECRET_PREMIUM_FEATURE_KEY);
}

function buildDisplayName(input, mode) {
  const selfName = clean(input?.normalizedInput?.userProfile?.name || "의뢰인");
  if (mode !== "compatibility") return selfName;
  return `${selfName} · ${clean(input?.normalizedInput?.partnerProfile?.name || "상대")}`;
}

function buildArchiveMetadata({ generated, pdfReady, reportId, sessionId, featureKey, mode }) {
  const llmAssembly = generated.llmAssembly || {};
  const displayName = buildDisplayName(generated, mode);
  const title = mode === "compatibility" ? `${displayName} 궁합 연애 비책 PDF` : `${displayName} 연애 비책 PDF`;
  return {
    reportId,
    sessionId,
    reportType: "love_book",
    reportTypeAliases: ["loveSecret", "love_book"],
    serviceKey: "saju-love-secret",
    featureKey,
    status: "completed",
    serverStatus: "completed",
    qualityStatus: "passed",
    displayName,
    title,
    mode,
    birthName: clean(generated?.normalizedInput?.userProfile?.name),
    summary: clean(generated?.chapters?.[0]?.text || generated?.chapters?.[0]?.title || "", 1000),
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
      featureKey,
      reportType: "loveSecret",
      mode,
      normalizedInput: generated.normalizedInput,
      chapters: generated.chapters,
      chapterCount: generated.chapterCount,
      expectedChapterCount: generated.expectedChapterCount,
      manuscriptSource: generated.manuscriptSource,
      generationMode: generated.generationMode,
      provider: generated.provider,
      writingPipeline: generated.writingPipeline,
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
    loveSecretPremiumInput: generated.normalizedInput,
    pdfReady,
    manuscriptSource: generated.manuscriptSource,
    generationMode: generated.generationMode,
    provider: generated.provider,
    modelName: generated.modelName,
    writingPipeline: generated.writingPipeline,
    llmAssembly,
    pdfV2: {
      engineVersion: LOVE_SECRET_PREMIUM_ENGINE_VERSION,
      qualityVersion: LOVE_SECRET_PREMIUM_QUALITY_VERSION,
      promptVersion: LOVE_SECRET_PREMIUM_PROMPT_VERSION,
      chapterPlanVersion: generated.chapterPlanVersion,
    },
    canReopen: true,
    canDownload: true,
  };
}

export async function generateLoveSecretPremiumPdfV2(params = {}) {
  const {
    env = {},
    pdfDbEnv = null,
    executionContext = null,
    requestUrl = "",
    userId = "",
    input = {},
    paymentContext = {},
    onProgress = null,
  } = params;
  const mode = resolveMode(input, paymentContext);
  const reportId = clean(paymentContext.reportId || input.body?.reportId || input.body?.accessGrant?.reportId || `love-secret-${Date.now().toString(36)}`);
  const sessionId = clean(paymentContext.sessionId || input.body?.sessionId || input.body?.reportSessionId || `love-book:${reportId}`);
  const featureKey = resolveFeatureKey(mode, paymentContext);
  if (!executionContext?.executionKey) {
    const error = new Error("LOVE_SECRET_EXECUTION_CONTEXT_MISSING");
    error.code = "LOVE_SECRET_EXECUTION_CONTEXT_MISSING";
    error.status = 500;
    throw error;
  }

  logLoveSecretPdfEvent("PdfJobStart", { jobId: reportId, userId, status: "generating" });
  const generated = await generateLoveSecretPremiumReport({
    env,
    base: input.base,
    body: input.body,
    mode,
    config: input.config,
    userId,
    jobId: reportId,
    onProgress,
  });
  const html = assembleLoveSecretPremiumHtml({
    input: generated.normalizedInput,
    chapters: generated.chapters,
    reportId,
  });
  const links = buildArchiveLinks(requestUrl, reportId);
  const pdfReady = {
    reportId,
    mode,
    title: mode === "compatibility" ? "궁합 연애 비책" : "연애 비책",
    displayName: buildDisplayName(generated, mode),
    chapterCount: generated.chapterCount,
    expectedChapterCount: generated.expectedChapterCount,
    generatedAt: new Date().toISOString(),
    html,
    htmlUrl: links.htmlUrl,
    pdfUrl: links.pdfUrl,
    downloadUrl: links.downloadUrl,
    documentUrl: links.downloadUrl,
    archiveUrl: links.archiveUrl,
    storageKey: `premium-archive:love-secret:${reportId}`,
    mimeType: "application/pdf",
    contentType: "application/pdf",
    renderFormat: "pdf-archive",
    canDownload: true,
  };
  const completionValidation = validateLoveSecretPdfCompletionPayload({
    pdfReady,
    chapters: generated.chapters,
    chapterCount: generated.chapterCount,
    expectedChapterCount: generated.expectedChapterCount,
    llmAssembly: generated.llmAssembly,
  });
  if (!completionValidation.ok) {
    const error = new Error(`LOVE_SECRET_PDF_COMPLETION_INVALID:${completionValidation.errors.join(",")}`);
    error.code = "LOVE_SECRET_PDF_COMPLETION_INVALID";
    error.status = 422;
    error.validation = completionValidation;
    throw error;
  }

  const archive = buildArchiveMetadata({ generated, pdfReady, reportId, sessionId, featureKey, mode });
  const completedExecution = await completePremiumPdfExecution(pdfDbEnv || env, userId, executionContext, reportId, {
    manuscriptSource: generated.manuscriptSource,
    chapterCount: generated.chapterCount,
    expectedChapterCount: generated.expectedChapterCount,
    archive,
    pdfReady,
    chapters: generated.chapters,
    downloadUrl: pdfReady.downloadUrl,
    htmlUrl: pdfReady.htmlUrl,
    pdfUrl: pdfReady.pdfUrl,
    canDownload: true,
    llmAssembly: generated.llmAssembly,
  });
  if (!completedExecution?.ok) {
    const error = new Error("LOVE_SECRET_ARCHIVE_SAVE_FAILED");
    error.code = "LOVE_SECRET_ARCHIVE_SAVE_FAILED";
    error.status = Number(completedExecution?.status || 500);
    throw error;
  }
  const payload = {
    ...archive.payload,
    jobId: reportId,
    pdfCompletionValidation: completionValidation,
  };
  if (!clean(payload.downloadUrl)) {
    const error = new Error("LOVE_SECRET_DOWNLOAD_URL_MISSING");
    error.code = "LOVE_SECRET_DOWNLOAD_URL_MISSING";
    error.status = 422;
    throw error;
  }
  logLoveSecretPdfEvent("PdfJobCompleted", { jobId: reportId, userId, status: "completed", source: generated.manuscriptSource });
  return payload;
}
