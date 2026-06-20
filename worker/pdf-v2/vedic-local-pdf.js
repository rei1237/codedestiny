const REMOVED_CODE = "VEDIC_LOCAL_PDF_REMOVED";

function createRemovedVedicLocalPdfError(details = null) {
  const error = new Error("Vedic premium local PDF assembly has been removed.");
  error.code = REMOVED_CODE;
  error.status = 503;
  if (details) error.details = details;
  return error;
}

export function assertVedicLocalPdfResult() {
  return {
    ok: false,
    issues: ["vedic_local_pdf_removed"],
    legacyDisabled: true,
    generationMode: "vedic-premium-llm-only",
    writingPipeline: "vedic-calculation-to-llm-authored-pdf",
  };
}

export async function generateVedicLocalPdf(input = {}, options = {}) {
  throw createRemovedVedicLocalPdfError({
    reportId: input?.reportId || "",
    featureKey: input?.featureKey || "",
    expectedChapterCount: Number(options?.expectedChapterCount || 0),
  });
}
