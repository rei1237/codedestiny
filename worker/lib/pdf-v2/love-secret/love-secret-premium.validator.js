import { asArray, clean, safeObject, stripTags } from "./love-secret-premium.types.js";

const unsafeValuePattern = /\b(?:undefined|null|NaN|\[object Object\])\b/i;
const markdownPattern = /```|^\s{0,3}#{1,6}\s|\*\*[^*]+\*\*/m;
const internalPattern = /\b(?:schema|json|payload|debug|prompt|api|rawResultSummary|calculationMode|localAssembly|fallback|templateParagraphBuilder|renderRawJsonReport|Workers AI|Gemini|provider|modelName)\b/i;
const rawJsonPattern = /^\s*[\[{]|"[^"]+"\s*:/m;
const brokenEncodingPattern = /�|\?[\u3131-\uD7A3]|(?:Ã|Â|ì|ë|í|ê|ð|濡|怨|媛|\?쒖|\?곗|\?앹)/;
const overCertaintyPattern = /(?:100\s*%|무조건|반드시|절대|필연적으로|운명적으로)\s*(?:재회|결혼|이별|이어진다|헤어진다|만난다)|(?:결혼|재회|이별)\s*(?:확정|보장)/;

function escapeRegExp(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeText(value) {
  return clean(stripTags(value)).replace(/[^\uAC00-\uD7A3a-zA-Z0-9 ]/g, "").replace(/\s+/g, " ").trim();
}

function extractFirstTagText(html, tag) {
  const match = String(html || "").match(new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return match ? stripTags(match[1]) : "";
}

function extractTagTexts(html, tag) {
  const texts = [];
  const re = new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`, "gi");
  let match = null;
  while ((match = re.exec(String(html || "")))) {
    texts.push(stripTags(match[1]));
  }
  return texts;
}

function sectionTitle(value) {
  return clean(value?.title || value?.name || value);
}

function duplicateItems(items, minLength = 18) {
  const seen = new Map();
  const duplicates = [];
  for (const item of items) {
    const normalized = normalizeText(item);
    if (normalized.length < minLength) continue;
    const count = seen.get(normalized) || 0;
    seen.set(normalized, count + 1);
    if (count === 1) duplicates.push(normalized);
  }
  return duplicates;
}

function countSections(html) {
  return (String(html || "").match(/<section\b/gi) || []).length;
}

function countParagraphs(html) {
  return (String(html || "").match(/<p\b/gi) || []).length;
}

function hasArticleId(html, chapterId) {
  return new RegExp(`<article\\b[^>]*data-chapter-id=["']${escapeRegExp(chapterId)}["']`, "i").test(String(html || ""));
}

export function parseLoveSecretPremiumChapterHtml(html = "", chapter = {}) {
  const source = String(html || "").trim();
  return {
    html: source,
    text: stripTags(source),
    h1: clean(extractFirstTagText(source, "h1")),
    h2: extractTagTexts(source, "h2").map((item) => clean(item)).filter(Boolean),
    paragraphs: extractTagTexts(source, "p").map((item) => clean(item)).filter(Boolean),
    hasArticle: hasArticleId(source, clean(chapter.id)),
    sectionCount: countSections(source),
    paragraphCount: countParagraphs(source),
  };
}

export function validateLoveSecretPremiumChapterHtml(html = "", chapter = {}) {
  const errors = [];
  const source = String(html || "");
  const parsed = parseLoveSecretPremiumChapterHtml(source, chapter);
  const title = clean(chapter.title);
  const sections = asArray(chapter.sections).map(sectionTitle).filter(Boolean);
  const textLength = clean(parsed.text).replace(/\s/g, "").length;

  if (!clean(source)) errors.push("empty_html");
  if (markdownPattern.test(source)) errors.push("markdown_or_code_fence");
  if (rawJsonPattern.test(source)) errors.push("raw_json_like_output");
  if (internalPattern.test(source)) errors.push("internal_key_leak");
  if (unsafeValuePattern.test(source)) errors.push("unsafe_value_leak");
  if (brokenEncodingPattern.test(source)) errors.push("broken_encoding_noise");
  if (overCertaintyPattern.test(source)) errors.push("over_certain_love_claim");
  if (!parsed.hasArticle) errors.push("article_id_missing");
  if (parsed.h1 !== title) errors.push("h1_title_mismatch");
  for (const section of sections) {
    const count = parsed.h2.filter((item) => item === section).length;
    if (count !== 1) errors.push(`h2_missing_or_duplicated:${section}`);
  }
  if (parsed.sectionCount < sections.length) errors.push("section_missing");
  if (parsed.paragraphCount < sections.length * 2) errors.push("section_paragraph_missing");
  if (textLength < Number(chapter.minLength || 1200)) errors.push("chapter_too_short");
  if (duplicateItems(parsed.h2, 8).length) errors.push("repeated_heading");
  if (duplicateItems(parsed.paragraphs, 32).length) errors.push("repeated_paragraph");

  return {
    ok: errors.length === 0,
    errors,
    parsed,
    textLength,
  };
}

export function assertAllConfiguredChaptersIncluded({ html = "", chapters = [] } = {}) {
  const missing = [];
  for (const chapter of asArray(chapters)) {
    if (!hasArticleId(html, clean(chapter.id))) missing.push(clean(chapter.id));
  }
  if (missing.length) {
    const error = new Error(`LOVE_SECRET_CHAPTERS_MISSING:${missing.join(",")}`);
    error.code = "LOVE_SECRET_CHAPTERS_MISSING";
    error.status = 422;
    error.missing = missing;
    throw error;
  }
  return true;
}

export function assertNoRawJsonLeak(html = "") {
  if (rawJsonPattern.test(String(html || "")) || internalPattern.test(String(html || ""))) {
    const error = new Error("LOVE_SECRET_RAW_JSON_OR_INTERNAL_LEAK");
    error.code = "LOVE_SECRET_RAW_JSON_OR_INTERNAL_LEAK";
    error.status = 422;
    throw error;
  }
  return true;
}

export function assertNoUndefinedValues(html = "") {
  if (unsafeValuePattern.test(String(html || ""))) {
    const error = new Error("LOVE_SECRET_UNSAFE_VALUE_LEAK");
    error.code = "LOVE_SECRET_UNSAFE_VALUE_LEAK";
    error.status = 422;
    throw error;
  }
  return true;
}

export function assertNoForeignSystemTermsLeaked(html = "") {
  const source = String(html || "");
  if (markdownPattern.test(source) || brokenEncodingPattern.test(source) || overCertaintyPattern.test(source)) {
    const error = new Error("LOVE_SECRET_FOREIGN_OR_UNSAFE_TEXT_LEAK");
    error.code = "LOVE_SECRET_FOREIGN_OR_UNSAFE_TEXT_LEAK";
    error.status = 422;
    throw error;
  }
  return true;
}

export function validateLoveSecretFinalReportHtml({ html = "", chapters = [] } = {}) {
  const errors = [];
  const source = String(html || "");
  if (!clean(source)) errors.push("empty_html");
  if (!/<html\b/i.test(source) || !/<body\b/i.test(source)) errors.push("document_shell_missing");
  if (markdownPattern.test(source)) errors.push("markdown_or_code_fence");
  if (rawJsonPattern.test(source)) errors.push("raw_json_like_output");
  if (internalPattern.test(source)) errors.push("internal_key_leak");
  if (unsafeValuePattern.test(source)) errors.push("unsafe_value_leak");
  if (brokenEncodingPattern.test(source)) errors.push("broken_encoding_noise");
  if (overCertaintyPattern.test(source)) errors.push("over_certain_love_claim");
  for (const chapter of asArray(chapters)) {
    if (!hasArticleId(source, clean(chapter.id))) errors.push(`chapter_missing:${clean(chapter.id)}`);
    for (const section of asArray(chapter.sections).map(sectionTitle).filter(Boolean)) {
      if (!new RegExp(`<h2\\b[^>]*>\\s*${escapeRegExp(section)}\\s*<\\/h2>`, "i").test(source)) {
        errors.push(`section_missing:${clean(chapter.id)}:${section}`);
      }
    }
  }
  const chapterHeadings = extractTagTexts(source, "h1");
  if (duplicateItems(chapterHeadings, 8).length) errors.push("repeated_heading");
  if (duplicateItems(extractTagTexts(source, "p"), 36).length) errors.push("repeated_paragraph");
  return { ok: errors.length === 0, errors };
}

export function validateLoveSecretPdfCompletionPayload(payload = {}) {
  const source = safeObject(payload);
  const pdfReady = safeObject(source.pdfReady);
  const chapters = asArray(source.chapters);
  const llmAssembly = safeObject(source.llmAssembly);
  const expectedChapterCount = Number(source.expectedChapterCount || source.chapterCount || chapters.length);
  const errors = [];

  if (!chapters.length) errors.push("chapters_empty");
  if (expectedChapterCount > 0 && chapters.length < expectedChapterCount) errors.push("chapter_count_mismatch");
  if (chapters.some((chapter) => !["completed", "cached"].includes(clean(chapter.status)))) errors.push("chapter_not_completed");
  if (chapters.some((chapter) => !["llm", "llm-cache"].includes(clean(chapter.source)))) errors.push("chapter_source_not_llm");
  if (llmAssembly.enabled !== true || llmAssembly.externalGeneration !== true) errors.push("llm_assembly_not_external");
  if (llmAssembly.fallbackUsed === true || llmAssembly.localFallback === true) errors.push("local_fallback_used");
  if (clean(pdfReady.renderFormat) !== "pdf-archive") errors.push("render_format_invalid");
  if (clean(pdfReady.mimeType || pdfReady.contentType) !== "application/pdf") errors.push("mime_type_invalid");
  if (!clean(pdfReady.downloadUrl || pdfReady.pdfUrl)) errors.push("download_url_missing");
  if (!clean(pdfReady.htmlUrl)) errors.push("html_url_missing");
  if (!clean(pdfReady.html)) errors.push("html_missing");
  const htmlValidation = validateLoveSecretFinalReportHtml({ html: pdfReady.html, chapters });
  if (!htmlValidation.ok) errors.push(...htmlValidation.errors.map((error) => `html:${error}`));

  return {
    ok: errors.length === 0,
    errors,
    htmlValidation,
  };
}
