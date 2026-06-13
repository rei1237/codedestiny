import { ASTRO_PREMIUM_CHAPTERS } from "../lib/astro-premium-chapters.js";
import {
  ASTRO_PDF_CONFIG,
  generateAstroPremiumReport,
} from "../lib/astro-premium-generator.js";

function clean(value) {
  return String(value || "").trim();
}

function createAstrologyLocalPdfError(message, code, status = 500, details = null) {
  const error = new Error(message);
  error.code = code;
  error.status = status;
  if (details) error.details = details;
  return error;
}

function assertAstrologyLocalPdfResult(result = {}) {
  const localAssembly = result?.localAssembly && typeof result.localAssembly === "object"
    ? result.localAssembly
    : {};
  const chapterCount = Number(result?.chapterCount || 0);
  const expectedChapterCount = ASTRO_PREMIUM_CHAPTERS.length;
  const source = clean(result?.manuscriptSource);
  const html = clean(result?.pdfReady?.html || result?.html);

  const issues = [];
  if (source !== ASTRO_PDF_CONFIG.generationMode) issues.push("manuscript_source");
  if (chapterCount !== expectedChapterCount) issues.push("chapter_count");
  if (Number(result?.localDraftChapterCount || 0) !== expectedChapterCount) issues.push("local_draft_chapter_count");
  if (localAssembly.enabled !== true) issues.push("local_assembly_enabled");
  if (localAssembly.externalGeneration !== false) issues.push("external_generation");
  if (Number(localAssembly.chapterCount || 0) !== expectedChapterCount) issues.push("local_assembly_chapter_count");
  if (Number(localAssembly.expectedChapterCount || 0) !== expectedChapterCount) issues.push("local_assembly_expected_chapter_count");
  if (clean(localAssembly.templateVersion) !== ASTRO_PDF_CONFIG.templateVersion) issues.push("template_version");
  if (!html) issues.push("html");

  return {
    ok: issues.length === 0,
    issues,
    localAssembly,
    chapterCount,
    expectedChapterCount,
    source,
  };
}

export async function generateAstrologyLocalPdf(rawInput = {}, options = {}) {
  const log = typeof options.log === "function" ? options.log : null;
  let generated;
  try {
    generated = await generateAstroPremiumReport(null, rawInput, {
      requestUrl: options.requestUrl,
      log,
    });
  } catch (error) {
    throw createAstrologyLocalPdfError(
      "점성술 PDF 로컬 생성에 실패했습니다. 입력한 출생 정보와 차트 계산 결과를 확인해 주세요.",
      "ASTRO_LOCAL_PDF_GENERATION_FAILED",
      Number(error?.status || 500),
      {
        originalCode: clean(error?.code),
        originalMessage: clean(error?.message),
        originalDetails: error?.details || error?.issues || null,
      },
    );
  }
  const localContract = assertAstrologyLocalPdfResult(generated);

  if (!localContract.ok) {
    throw createAstrologyLocalPdfError(
      "점성술 PDF 로컬 생성 결과가 완성 조건을 만족하지 않습니다.",
      "ASTRO_LOCAL_PDF_CONTRACT_INVALID",
      500,
      localContract,
    );
  }

  return {
    ...generated,
    localOnly: true,
    localContract,
    writingPipeline: "local-calculation-to-local-template-pdf",
  };
}
