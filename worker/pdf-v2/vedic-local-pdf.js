function clean(value) {
  return String(value || "").trim();
}

function isVedicPdfArchiveUrl(value, format) {
  const url = clean(value);
  const target = clean(format);
  if (!url || !/\/api\/premium\/pdf-archive\//.test(url)) return false;
  return new RegExp(`[?&]format=${target}(?:&|$)`, "i").test(url);
}

function createVedicLocalPdfError(message, code, status = 500, details = null) {
  const error = new Error(message);
  error.code = code;
  error.status = status;
  if (details) error.details = details;
  return error;
}

function assertVedicLocalPdfResult(result = {}, config = {}, expectedChapterCount = 12) {
  const pdfReady = result?.pdfReady && typeof result.pdfReady === "object" ? result.pdfReady : {};
  const localAssembly = result?.localAssembly && typeof result.localAssembly === "object" ? result.localAssembly : {};
  const chapters = Array.isArray(result?.chapterDrafts) ? result.chapterDrafts : Array.isArray(result?.chapters) ? result.chapters : [];
  const pdfCompletionValidation = result?.pdfCompletionValidation && typeof result.pdfCompletionValidation === "object"
    ? result.pdfCompletionValidation
    : {};
  const generationMode = clean(config.generationMode || "local-assembled");
  const templateVersion = clean(config.templateVersion);
  const storedUrl = clean(result?.downloadUrl || result?.pdfUrl || pdfReady?.downloadUrl || pdfReady?.pdfUrl || pdfReady?.htmlUrl);
  const pdfUrl = clean(result?.pdfUrl || pdfReady?.pdfUrl || pdfReady?.downloadUrl || result?.downloadUrl);
  const htmlUrl = clean(result?.htmlUrl || pdfReady?.htmlUrl);
  const writingPipeline = clean(result?.writingPipeline || pdfReady?.writingPipeline);

  const issues = [];
  if (clean(result?.manuscriptSource || pdfReady?.manuscriptSource) !== generationMode) issues.push("manuscript_source");
  if (result?.fallbackUsed === true) issues.push("fallback_used");
  if (chapters.length !== expectedChapterCount) issues.push("chapter_count");
  if (Number(result?.chapterCount || 0) !== expectedChapterCount) issues.push("payload_chapter_count");
  if (localAssembly.enabled !== true) issues.push("local_assembly_enabled");
  if (localAssembly.externalGeneration !== false) issues.push("external_generation");
  if (localAssembly.externalCallsAllowed !== false) issues.push("external_calls_allowed");
  if (Number(localAssembly.chapterCount || 0) !== expectedChapterCount) issues.push("local_assembly_chapter_count");
  if (Number(localAssembly.expectedChapterCount || 0) !== expectedChapterCount) issues.push("local_assembly_expected_chapter_count");
  if (templateVersion && clean(localAssembly.templateVersion) !== templateVersion) issues.push("local_assembly_template_version");
  if (pdfCompletionValidation.ok === false) issues.push("pdf_completion_validation");
  if (!clean(pdfReady?.html)) issues.push("html");
  if (!storedUrl) issues.push("download_url");
  if (!isVedicPdfArchiveUrl(pdfUrl, "pdf")) issues.push("archive_pdf_url");
  if (!isVedicPdfArchiveUrl(htmlUrl, "html")) issues.push("archive_html_url");
  if (clean(pdfReady?.renderFormat) !== "pdf-archive") issues.push("render_format");
  if (clean(pdfReady?.mimeType) !== "application/pdf") issues.push("mime_type");
  if (clean(pdfReady?.contentType) !== "application/pdf") issues.push("content_type");
  if (pdfReady.canDownload !== true && result?.canDownload !== true) issues.push("can_download");
  if (writingPipeline !== "local-calculation-to-local-assembled-pdf") issues.push("writing_pipeline");

  return {
    ok: issues.length === 0,
    issues,
    localAssembly,
    chapterCount: chapters.length,
    expectedChapterCount,
    generationMode,
    templateVersion,
    pdfUrl,
    htmlUrl,
    canDownload: pdfReady.canDownload === true || result?.canDownload === true,
    writingPipeline,
  };
}

export async function generateVedicLocalPdf(input = {}, options = {}) {
  const buildLocalPdf = options.buildLocalPdf;
  if (typeof buildLocalPdf !== "function") {
    throw createVedicLocalPdfError(
      "베다점 PDF 로컬 생성기가 연결되지 않았습니다.",
      "VEDIC_LOCAL_BUILDER_MISSING",
      500,
    );
  }

  let result;
  try {
    result = await buildLocalPdf(input);
  } catch (error) {
    throw createVedicLocalPdfError(
      "베다점 PDF 로컬 생성에 실패했습니다. 입력 정보와 베다 차트 계산 결과를 확인해 주세요.",
      "VEDIC_LOCAL_PDF_GENERATION_FAILED",
      Number(error?.status || 500),
      {
        originalCode: clean(error?.code),
        originalMessage: clean(error?.message),
        originalDetails: error?.details || error?.issues || null,
      },
    );
  }

  const localContract = assertVedicLocalPdfResult(
    result,
    options.config || {},
    Number(options.expectedChapterCount || 12),
  );

  if (!localContract.ok) {
    throw createVedicLocalPdfError(
      "베다점 PDF 로컬 생성 결과가 완성 조건을 만족하지 못했습니다.",
      "VEDIC_LOCAL_PDF_CONTRACT_INVALID",
      500,
      localContract,
    );
  }

  return {
    ...result,
    localOnly: true,
    localContract,
    writingPipeline: "local-calculation-to-local-assembled-pdf",
  };
}
