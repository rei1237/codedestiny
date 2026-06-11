import {
  SUKYO_PDF_CONFIG,
  SUKYO_PDF_CHAPTER_COUNT,
  buildSukyoPdfSeed,
  generateSukyoPremiumReport,
  validateSukyoPdfCompletionPayload,
  validateSukyoCompatibilityPdfQuality,
} from "../worker/lib/sukyo-pdf.js";

function assert(condition, message, details = null) {
  if (condition) return;
  const error = new Error(message);
  error.details = details;
  throw error;
}

function buildSeed(label) {
  const seed = buildSukyoPdfSeed({
    self: {
      name: "User",
      gender: "male",
      calendarType: "solar",
      birthDate: "1991-02-20",
      birthTime: "08:40",
      timezone: "Asia/Seoul",
    },
    partner: {
      name: "Partner",
      gender: "female",
      calendarType: "solar",
      birthDate: "1995-05-10",
      birthTime: "",
      timezone: "Asia/Seoul",
    },
    compatibility: {
      relationType: "安壞",
      relationTypeHan: "安壞",
      distanceLabel: "near",
      directionFromAToB: "安",
      directionFromBToA: "壞",
      score: 72,
      temperature: 68,
      magnetism: 74,
      compatibilityIndex: 71,
    },
  });
  seed.sessionId = `verify-sukuyo-${label}`;
  seed.reportId = `verify-sukuyo-${label}`;
  seed.requestId = `verify-sukuyo-${label}`;
  seed.featureKey = "premium-sukuyo-report-compat";
  return seed;
}

function mergedBody(chapters) {
  return chapters
    .flatMap((chapter) => Array.isArray(chapter.sections) ? chapter.sections : [])
    .map((section) => String(section.body || ""))
    .join("\n");
}

function assertReadyReport(label, report) {
  const chapters = Array.isArray(report.chapters) ? report.chapters : [];
  assert(report.ok === true, `${label}: report not ok`, report);
  assert(report.qualityStatus === "passed", `${label}: qualityStatus mismatch`, report);
  assert(report.chapterCount === SUKYO_PDF_CHAPTER_COUNT, `${label}: chapterCount mismatch`, report);
  assert(chapters.length === SUKYO_PDF_CHAPTER_COUNT, `${label}: chapters length mismatch`, report);
  assert(chapters.every((chapter) => Array.isArray(chapter.sections) && chapter.sections.length === 5), `${label}: section count mismatch`, report);
  assert(chapters.every((chapter) => chapter.sections.every((section) => String(section.body || "").length >= 700)), `${label}: section too short`, report);
  assert(Boolean(String(report.pdfReady?.html || "")), `${label}: pdf html missing`, report);
  assert(String(report.pdfReady?.html || "").includes("<!DOCTYPE html>"), `${label}: pdf html shell missing`, report);

  const quality = validateSukyoCompatibilityPdfQuality(chapters, report.payload || {});
  assert(quality.ok === true, `${label}: manuscript quality failed`, quality);
  const completion = validateSukyoPdfCompletionPayload({
    pdfReady: report.pdfReady,
    chapters,
    seed: report.payload || {},
    requireDownloadUrl: false,
  });
  assert(completion.ok === true, `${label}: pdf completion validation failed`, completion);

  const body = mergedBody(chapters).toLowerCase();
  const forbidden = ["fallback", "debug", "payload", "json", "localdraft", "internal server error", "about:blank", "undefined", "null", "nan"];
  const leaked = forbidden.filter((token) => body.includes(token));
  assert(leaked.length === 0, `${label}: technical token leaked`, leaked);
}

async function runLocalOnlyCase() {
  const report = await generateSukyoPremiumReport(
    { SUKUYO_LLM_ENHANCEMENT_ENABLED: "false" },
    buildSeed("local-only"),
    { llmEnhancementEnabled: false },
  );
  assertReadyReport("local-only", report);
  assert(report.manuscriptSource === SUKYO_PDF_CONFIG.generationMode, "local-only: source mismatch", report);
  assert(report.llmChapterCount === 0, "local-only: llmChapterCount mismatch", report);
  assert(report.targetLlmChapterCount === 0, "local-only: target count mismatch", report);
  assert(report.localDraftChapterCount === SUKYO_PDF_CHAPTER_COUNT, "local-only: localDraftChapterCount mismatch", report);
  assert(report.fallbackChapterCount === 0, "local-only: fallbackChapterCount mismatch", report);
  assert(report.fallbackUsed === false, "local-only: fallbackUsed mismatch", report);
  return report;
}

async function runLlmFailureCase() {
  const report = await generateSukyoPremiumReport(
    { SUKUYO_LLM_ENHANCEMENT_ENABLED: "true" },
    buildSeed("llm-failure"),
    {
      llmEnhancementEnabled: true,
      llmChapterGenerator() {
        const error = new Error("forced llm failure");
        error.code = "VERIFY_FORCED_LLM_FAILURE";
        throw error;
      },
    },
  );
  assertReadyReport("llm-failure", report);
  assert(report.manuscriptSource === SUKYO_PDF_CONFIG.generationMode, "llm-failure: source mismatch", report);
  assert(report.fallbackUsed === false, "llm-failure: fallbackUsed mismatch", report);
  assert(report.llmChapterCount === 0, "llm-failure: llmChapterCount mismatch", report);
  assert(report.targetLlmChapterCount === 0, "llm-failure: target count mismatch", report);
  assert(report.localDraftChapterCount === SUKYO_PDF_CHAPTER_COUNT, "llm-failure: localDraftChapterCount mismatch", report);
  assert(report.fallbackChapterCount === 0, "llm-failure: fallbackChapterCount mismatch", report);
  return report;
}

const localOnly = await runLocalOnlyCase();
const llmFailure = await runLlmFailureCase();

console.log("[verify-sukuyo-pdf-local-fallback] PASS", {
  localOnly: {
    chapterCount: localOnly.chapterCount,
    source: localOnly.manuscriptSource,
    htmlReady: Boolean(localOnly.pdfReady?.html),
  },
  llmFailure: {
    chapterCount: llmFailure.chapterCount,
    source: llmFailure.manuscriptSource,
    fallbackChapterCount: llmFailure.fallbackChapterCount,
    htmlReady: Boolean(llmFailure.pdfReady?.html),
  },
});
