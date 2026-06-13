function clean(value) {
  return String(value || "").trim();
}

function createLifeBookLocalPdfError(message, code, status = 500, details = null) {
  const error = new Error(message);
  error.code = code;
  error.status = status;
  if (details) error.details = details;
  return error;
}

function assertLifeBookLocalPdfResult(result = {}, config = {}, expectedChapterCount = 13) {
  const generatedLifeBook = result?.generatedLifeBook && typeof result.generatedLifeBook === "object" ? result.generatedLifeBook : {};
  const localAssembly = generatedLifeBook.localAssembly && typeof generatedLifeBook.localAssembly === "object"
    ? generatedLifeBook.localAssembly
    : {};
  const completedChapters = Array.isArray(result?.completedChapters) ? result.completedChapters : [];
  const html = clean(result?.pdf?.html || result?.html);
  const generationMode = clean(config.generationMode || "local-assembled");
  const templateVersion = clean(config.templateVersion);

  const issues = [];
  if (clean(generatedLifeBook.generationMode) !== generationMode) issues.push("generation_mode");
  if (clean(generatedLifeBook.provider) !== clean(config.provider)) issues.push("provider");
  if (templateVersion && clean(generatedLifeBook.templateVersion) !== templateVersion) issues.push("template_version");
  if (completedChapters.length !== expectedChapterCount) issues.push("chapter_count");
  if (localAssembly.enabled !== true) issues.push("local_assembly_enabled");
  if (localAssembly.externalGeneration !== false) issues.push("external_generation");
  if (localAssembly.externalCallsAllowed !== false) issues.push("external_calls_allowed");
  if (Number(localAssembly.chapterCount || 0) !== expectedChapterCount) issues.push("local_assembly_chapter_count");
  if (Number(localAssembly.expectedChapterCount || 0) !== expectedChapterCount) issues.push("local_assembly_expected_chapter_count");
  if (templateVersion && clean(localAssembly.templateVersion) !== templateVersion) issues.push("local_assembly_template_version");
  if (!html) issues.push("html");

  return {
    ok: issues.length === 0,
    issues,
    localAssembly,
    completedChapterCount: completedChapters.length,
    expectedChapterCount,
    generationMode,
    templateVersion,
  };
}

export async function generateLifeBookLocalPdf(input = {}, options = {}) {
  const buildLocalPdf = options.buildLocalPdf;
  if (typeof buildLocalPdf !== "function") {
    throw createLifeBookLocalPdfError(
      "인생의 책 로컬 생성기가 연결되지 않았습니다.",
      "LIFEBOOK_LOCAL_BUILDER_MISSING",
      500,
    );
  }

  let result;
  try {
    result = await buildLocalPdf(input);
  } catch (error) {
    throw createLifeBookLocalPdfError(
      "인생의 책 PDF 로컬 생성에 실패했습니다. 입력한 출생 정보와 사주 계산 결과를 확인해 주세요.",
      "LIFEBOOK_LOCAL_PDF_GENERATION_FAILED",
      Number(error?.status || 500),
      {
        originalCode: clean(error?.code),
        originalMessage: clean(error?.message),
        originalDetails: error?.details || error?.issues || null,
      },
    );
  }

  const localContract = assertLifeBookLocalPdfResult(
    result,
    options.config || {},
    Number(options.expectedChapterCount || 13),
  );

  if (!localContract.ok) {
    throw createLifeBookLocalPdfError(
      "인생의 책 PDF 로컬 생성 결과가 완성 조건을 만족하지 않습니다.",
      "LIFEBOOK_LOCAL_PDF_CONTRACT_INVALID",
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
