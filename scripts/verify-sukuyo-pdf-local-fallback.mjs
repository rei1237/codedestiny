import {
  SUKYO_PDF_CONFIG,
  SUKYO_PDF_CHAPTER_COUNT,
  buildSukyoChapterQualityReport,
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

function buildSeed(label, overrides = {}) {
  const seed = buildSukyoPdfSeed({
    self: {
      name: "User",
      gender: "male",
      calendarType: "solar",
      birthDate: "1991-02-20",
      birthTime: "08:40",
      timezone: "Asia/Seoul",
      ...(overrides.self || {}),
    },
    partner: {
      name: "Partner",
      gender: "female",
      calendarType: "solar",
      birthDate: "1995-05-10",
      birthTime: "",
      timezone: "Asia/Seoul",
      ...(overrides.partner || {}),
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
  const localAssembly = report.localAssembly || report.payload?.localAssembly || report.pdfReady?.localAssembly || {};
  assert(SUKYO_PDF_CONFIG.templateVersion === "sukuyo-premium-local-assembled-v2", `${label}: templateVersion mismatch`, SUKYO_PDF_CONFIG);
  assert(report.ok === true, `${label}: report not ok`, report);
  assert(report.qualityStatus === "passed", `${label}: qualityStatus mismatch`, report);
  assert(report.chapterCount === SUKYO_PDF_CHAPTER_COUNT, `${label}: chapterCount mismatch`, report);
  assert(chapters.length === SUKYO_PDF_CHAPTER_COUNT, `${label}: chapters length mismatch`, report);
  assert(localAssembly.enabled === true, `${label}: localAssembly enabled mismatch`, localAssembly);
  assert(localAssembly.externalGeneration === false, `${label}: localAssembly externalGeneration mismatch`, localAssembly);
  assert(localAssembly.externalCallsAllowed === false, `${label}: localAssembly externalCallsAllowed mismatch`, localAssembly);
  assert(localAssembly.chapterCount === SUKYO_PDF_CHAPTER_COUNT, `${label}: localAssembly chapterCount mismatch`, localAssembly);
  assert(localAssembly.expectedChapterCount === SUKYO_PDF_CHAPTER_COUNT, `${label}: localAssembly expectedChapterCount mismatch`, localAssembly);
  assert(localAssembly.templateVersion === SUKYO_PDF_CONFIG.templateVersion, `${label}: localAssembly templateVersion mismatch`, localAssembly);
  assert(chapters.every((chapter) => Array.isArray(chapter.sections) && chapter.sections.length === 5), `${label}: section count mismatch`, report);
  assert(chapters.every((chapter) => chapter.sections.every((section) => String(section.body || "").length >= 700)), `${label}: section too short`, report);
  assert(Boolean(String(report.pdfReady?.html || "")), `${label}: pdf html missing`, report);
  assert(String(report.pdfReady?.html || "").includes("<!DOCTYPE html>"), `${label}: pdf html shell missing`, report);

  const quality = validateSukyoCompatibilityPdfQuality(chapters, report.payload || {});
  assert(quality.ok === true, `${label}: manuscript quality failed`, quality);
  const chapterQuality = report.chapterQuality || report.payload?.chapterQuality || buildSukyoChapterQualityReport(report.payload || {}, chapters);
  assert(chapterQuality.ok === true, `${label}: chapter quality failed`, chapterQuality);
  assert(chapterQuality.chapters?.length === SUKYO_PDF_CHAPTER_COUNT, `${label}: chapter quality count mismatch`, chapterQuality);
  assert(chapterQuality.chapters.every((chapter) => chapter.ok === true), `${label}: chapter quality item failed`, chapterQuality);
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
  const report = await generateSukyoPremiumReport({}, buildSeed("local-only"));
  assertReadyReport("local-only", report);
  assert(report.manuscriptSource === SUKYO_PDF_CONFIG.generationMode, "local-only: source mismatch", report);
  return report;
}

async function runExternalGuardCase() {
  let externalGeneratorCalled = false;
  const report = await generateSukyoPremiumReport(
    { SUKUYO_EXTERNAL_GENERATION_ENABLED: "true" },
    buildSeed("external-guard"),
    {
      externalGenerator() {
        externalGeneratorCalled = true;
        throw new Error("external generator must stay unused");
      },
    },
  );
  assertReadyReport("external-guard", report);
  assert(externalGeneratorCalled === false, "external-guard: external generator was called", report);
  assert(report.manuscriptSource === SUKYO_PDF_CONFIG.generationMode, "external-guard: source mismatch", report);
  return report;
}

async function runDiversityCase(localOnly) {
  const variantSeed = buildSeed("diversity", {
    partner: {
      birthDate: "1998-11-25",
    },
  });
  const variant = await generateSukyoPremiumReport({}, variantSeed);
  assertReadyReport("diversity", variant);

  const baseJson = localOnly.payload?.localSukuyoCompatibilityJson || {};
  const variantJson = variant.payload?.localSukuyoCompatibilityJson || {};
  const baseSignature = [
    baseJson?.self?.sukuyoStar,
    baseJson?.partner?.sukuyoStar,
    baseJson?.relation?.typeKo,
    baseJson?.relation?.distanceLabel,
    localOnly.chapters?.[0]?.sections?.[0]?.body,
  ].join("|");
  const variantSignature = [
    variantJson?.self?.sukuyoStar,
    variantJson?.partner?.sukuyoStar,
    variantJson?.relation?.typeKo,
    variantJson?.relation?.distanceLabel,
    variant.chapters?.[0]?.sections?.[0]?.body,
  ].join("|");
  assert(baseSignature !== variantSignature, "diversity: local result did not change by input", {
    baseSignature,
    variantSignature,
  });
  return variant;
}

const localOnly = await runLocalOnlyCase();
const externalGuard = await runExternalGuardCase();
const diversity = await runDiversityCase(localOnly);

console.log("[verify-sukuyo-pdf-local-assembly] PASS", {
  localOnly: {
    chapterCount: localOnly.chapterCount,
    source: localOnly.manuscriptSource,
    templateVersion: SUKYO_PDF_CONFIG.templateVersion,
    htmlReady: Boolean(localOnly.pdfReady?.html),
  },
  externalGuard: {
    chapterCount: externalGuard.chapterCount,
    source: externalGuard.manuscriptSource,
    externalGeneration: externalGuard.localAssembly?.externalGeneration,
    htmlReady: Boolean(externalGuard.pdfReady?.html),
  },
  diversity: {
    chapterCount: diversity.chapterCount,
    source: diversity.manuscriptSource,
    htmlReady: Boolean(diversity.pdfReady?.html),
  },
});
