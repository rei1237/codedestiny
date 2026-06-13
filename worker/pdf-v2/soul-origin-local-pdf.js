function clean(value) {
  return String(value || "").trim();
}

function createSoulOriginLocalPdfError(message, code, status = 500, details = null) {
  const error = new Error(message);
  error.code = code;
  error.status = status;
  if (details) error.details = details;
  return error;
}

function assertSoulOriginLocalPdfResult(result = {}, config = {}, expectedChapterCount = 12) {
  const pdfReady = result?.pdfReady && typeof result.pdfReady === "object" ? result.pdfReady : {};
  const localAssembly = result?.localAssembly && typeof result.localAssembly === "object"
    ? result.localAssembly
    : pdfReady?.localAssembly && typeof pdfReady.localAssembly === "object"
      ? pdfReady.localAssembly
      : {};
  const chapters = Array.isArray(result?.chapters) ? result.chapters : [];
  const pdfCompletionValidation = result?.pdfCompletionValidation && typeof result.pdfCompletionValidation === "object"
    ? result.pdfCompletionValidation
    : pdfReady?.pdfCompletionValidation && typeof pdfReady.pdfCompletionValidation === "object"
      ? pdfReady.pdfCompletionValidation
      : {};
  const generationMode = clean(config.generationMode || "local-assembled");
  const templateVersion = clean(config.templateVersion);
  const storedUrl = clean(result?.downloadUrl || result?.pdfUrl || result?.htmlUrl || pdfReady?.downloadUrl || pdfReady?.pdfUrl || pdfReady?.htmlUrl);

  const issues = [];
  if (result?.ok !== true) issues.push("ok");
  if (clean(result?.manuscriptSource || pdfReady?.manuscriptSource) !== generationMode) issues.push("manuscript_source");
  if (clean(result?.chapterAuthoringSource) !== generationMode) issues.push("chapter_authoring_source");
  if (clean(result?.summarySource) !== generationMode) issues.push("summary_source");
  if (result?.localAuthoringUsed !== true) issues.push("local_authoring_used");
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

  return {
    ok: issues.length === 0,
    issues,
    localAssembly,
    chapterCount: chapters.length,
    expectedChapterCount,
    generationMode,
    templateVersion,
  };
}

export async function generateSoulOriginLocalPdf(input = {}, options = {}) {
  const buildLocalPdf = options.buildLocalPdf;
  if (typeof buildLocalPdf !== "function") {
    throw createSoulOriginLocalPdfError(
      "운명의 업 PDF 로컬 생성기가 연결되지 않았습니다.",
      "SOUL_ORIGIN_LOCAL_BUILDER_MISSING",
      500,
    );
  }

  let result;
  try {
    result = await buildLocalPdf(input);
  } catch (error) {
    throw createSoulOriginLocalPdfError(
      "운명의 업 PDF 로컬 생성에 실패했습니다. 입력 정보와 로컬 계산 결과를 확인해 주세요.",
      "SOUL_ORIGIN_LOCAL_PDF_GENERATION_FAILED",
      Number(error?.status || 500),
      {
        originalCode: clean(error?.code),
        originalMessage: clean(error?.message),
        originalDetails: error?.details || error?.issues || null,
      },
    );
  }

  const localContract = assertSoulOriginLocalPdfResult(
    result,
    options.config || {},
    Number(options.expectedChapterCount || 12),
  );

  if (!localContract.ok) {
    throw createSoulOriginLocalPdfError(
      "운명의 업 PDF 로컬 생성 결과가 완성 조건을 만족하지 못했습니다.",
      "SOUL_ORIGIN_LOCAL_PDF_CONTRACT_INVALID",
      500,
      localContract,
    );
  }

  return {
    ...result,
    localOnly: true,
    localContract,
    writingPipeline: "local-calculation-to-local-template-pdf",
  };
}
