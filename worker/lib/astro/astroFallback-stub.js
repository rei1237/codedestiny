/**
 * Astro Western Premium - Fallback Prevention (STUB)
 * 
 * DEPRECATED: This module is intentionally stubbed out.
 * Fallback text generation is NOT ALLOWED.
 * PDF generation must FAIL explicitly if data is missing or LLM fails.
 */

export function generateAstroFallbackText(chapterNum, chart = {}) {
  // INTENTIONAL STUB
  // This function should NEVER be called.
  // If called, throw immediately to prevent skeleton output.
  throw new Error(
    `[AstroBook] FATAL ERROR: Fallback text generation attempted for chapter ${chapterNum}. ` +
    `Fallback text is strictly disabled. PDF generation must fail explicitly with proper error message.`
  );
}

/**
 * Legacy export for compatibility
 * Do not use - throws immediately
 */
export function getVedicFallbackText(chapterNum, vedicChart = {}) {
  throw new Error(
    `[AstroBook] FATAL ERROR: Vedic fallback text generation attempted for chapter ${chapterNum}. ` +
    `Fallback text is strictly disabled.`
  );
}
