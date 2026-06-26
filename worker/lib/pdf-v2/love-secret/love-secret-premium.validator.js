import { asArray, clean, safeObject, stripTags } from "./love-secret-premium.types.js";

const unsafeValuePattern = /\b(?:undefined|null|NaN|\[object Object\])\b/i;
const markdownPattern = /```|^\s{0,3}#{1,6}\s|\*\*[^*]+\*\*/m;
const internalPattern = /\b(?:schema|json|payload|debug|prompt|api|rawResultSummary|calculationMode|localAssembly|fallback|templateParagraphBuilder|renderRawJsonReport|Workers AI|Gemini|provider|modelName|AI로 생성된|AI 생성)\b/i;
const jsonOnlyPattern = /^\s*(?:\{[\s\S]*\}|\[[\s\S]*\])\s*$/;
const rawJsonPattern = /^\s*[\[{]|"[^"]+"\s*:/m;
const forbiddenSamplePattern = /(?:Lorem ipsum|샘플|예시 텍스트|sample chapter|mock|placeholder)/i;
const brokenEncodingPattern = /占?\?[\u3131-\uD7A3]|(?:횄|횂|챙|챘|챠|챗|챨|嚥|揶|�)/;
const overCertaintyPattern = /(?:100\s*%|무조건|반드시\s*(?:결혼|이별|헤어|재회|만난다|끝난다)|망한다|저주|파멸)/i;

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

function findChapterSection(html, chapterId) {
  const id = escapeRegExp(chapterId);
  const source = String(html || "");
  const re = new RegExp(`<section\\b(?=[^>]*class=["'][^"']*\\blove-secret-chapter\\b[^"']*["'])(?=[^>]*data-chapter-id=["']${id}["'])[^>]*>[\\s\\S]*?<\\/section>`, "i");
  const match = source.match(re);
  return match ? match[0] : "";
}

function hasClass(html, className) {
  return new RegExp(`class=["'][^"']*\\b${escapeRegExp(className)}\\b[^"']*["']`, "i").test(String(html || ""));
}

function countChapterSections(html, chapterId) {
  const id = escapeRegExp(chapterId);
  const source = String(html || "");
  const re = new RegExp(`<section\\b(?=[^>]*class=["'][^"']*\\blove-secret-chapter\\b[^"']*["'])(?=[^>]*data-chapter-id=["']${id}["'])`, "gi");
  return (source.match(re) || []).length;
}

function missingRequiredPerspectives(text, chapter = {}) {
  const source = stripTags(text);
  return asArray(chapter.requiredPerspectives).filter((item) => !source.includes(clean(item)));
}

export function parseLoveSecretPremiumChapterHtml(html = "", chapter = {}) {
  const source = String(html || "").trim();
  const chapterId = clean(chapter.id);
  const section = findChapterSection(source, chapterId);
  return {
    html: source,
    chapterSectionHtml: section,
    text: stripTags(section || source),
    h2: clean(extractFirstTagText(section || source, "h2")),
    h3: extractTagTexts(section || source, "h3").map((item) => clean(item)).filter(Boolean),
    paragraphs: extractTagTexts(section || source, "p").map((item) => clean(item)).filter(Boolean),
    listItems: extractTagTexts(section || source, "li").map((item) => clean(item)).filter(Boolean),
    hasChapterSection: Boolean(section),
    hasSummary: hasClass(section, "chapter-summary"),
    hasBody: hasClass(section, "chapter-body"),
    hasAdvice: hasClass(section, "chapter-advice"),
    chapterSectionCount: countChapterSections(source, chapterId),
  };
}

export function validateLoveSecretPremiumChapterHtml(html = "", chapter = {}) {
  const errors = [];
  const source = String(html || "");
  const parsed = parseLoveSecretPremiumChapterHtml(source, chapter);
  const title = clean(chapter.title);
  const textLength = clean(parsed.text).replace(/\s/g, "").length;

  if (!clean(source)) errors.push("empty_html");
  if (markdownPattern.test(source)) errors.push("markdown_or_code_fence");
  if (jsonOnlyPattern.test(source) || rawJsonPattern.test(source)) errors.push("raw_json_like_output");
  if (internalPattern.test(source)) errors.push("internal_key_leak");
  if (unsafeValuePattern.test(source)) errors.push("unsafe_value_leak");
  if (forbiddenSamplePattern.test(source)) errors.push("sample_or_placeholder_text");
  if (brokenEncodingPattern.test(source)) errors.push("broken_encoding_noise");
  if (overCertaintyPattern.test(source)) errors.push("over_certain_love_claim");
  if (!parsed.hasChapterSection) errors.push("chapter_section_missing");
  if (parsed.chapterSectionCount !== 1) errors.push(`chapter_section_count:${parsed.chapterSectionCount}`);
  if (parsed.h2 !== title) errors.push("h2_title_mismatch");
  if (!parsed.hasSummary) errors.push("chapter_summary_missing");
  if (!parsed.hasBody) errors.push("chapter_body_missing");
  if (!parsed.hasAdvice) errors.push("chapter_advice_missing");
  if (parsed.paragraphs.length < 5) errors.push("paragraph_count_too_low");
  if (parsed.listItems.length < 3) errors.push("advice_list_too_low");
  if (textLength < Number(chapter.minLength || 1500)) errors.push("chapter_too_short");
  if (duplicateItems(parsed.paragraphs, 32).length) errors.push("repeated_paragraph");
  const missingPerspectives = missingRequiredPerspectives(parsed.text, chapter);
  if (missingPerspectives.length) errors.push(`required_perspective_missing:${missingPerspectives.join("|")}`);

  return {
    ok: errors.length === 0,
    errors,
    parsed,
    textLength,
  };
}

export function assertAllConfiguredChaptersIncluded({ html = "", chapters = [] } = {}) {
  const missing = [];
  const duplicated = [];
  for (const chapter of asArray(chapters)) {
    const count = countChapterSections(html, clean(chapter.id));
    if (count === 0) missing.push(clean(chapter.id));
    if (count > 1) duplicated.push(`${clean(chapter.id)}:${count}`);
  }
  if (missing.length || duplicated.length) {
    const error = new Error(`LOVE_SECRET_CHAPTER_RENDER_INVALID:${missing.join(",")}:${duplicated.join(",")}`);
    error.code = "LOVE_SECRET_CHAPTER_RENDER_INVALID";
    error.status = 422;
    error.missing = missing;
    error.duplicated = duplicated;
    throw error;
  }
  return true;
}

export function assertNoRawJsonLeak(html = "") {
  const source = String(html || "");
  const rawJsonMatch = source.match(jsonOnlyPattern) || source.match(rawJsonPattern);
  const internalMatch = source.match(internalPattern);
  if (rawJsonMatch || internalMatch) {
    const error = new Error("LOVE_SECRET_RAW_JSON_OR_INTERNAL_LEAK");
    error.code = "LOVE_SECRET_RAW_JSON_OR_INTERNAL_LEAK";
    error.status = 422;
    error.detail = {
      rawJsonMatch: rawJsonMatch?.[0] || "",
      internalMatch: internalMatch?.[0] || "",
    };
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
  const text = stripTags(source);
  if (markdownPattern.test(source) || forbiddenSamplePattern.test(text) || brokenEncodingPattern.test(text) || overCertaintyPattern.test(text)) {
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
  const text = stripTags(source);
  if (!clean(source)) errors.push("empty_html");
  if (!/<html\b/i.test(source) || !/<body\b/i.test(source)) errors.push("document_shell_missing");
  if (markdownPattern.test(source)) errors.push("markdown_or_code_fence");
  if (jsonOnlyPattern.test(source) || rawJsonPattern.test(source)) errors.push("raw_json_like_output");
  if (internalPattern.test(source)) errors.push("internal_key_leak");
  if (unsafeValuePattern.test(source)) errors.push("unsafe_value_leak");
  if (forbiddenSamplePattern.test(text)) errors.push("sample_or_placeholder_text");
  if (brokenEncodingPattern.test(text)) errors.push("broken_encoding_noise");
  if (overCertaintyPattern.test(text)) errors.push("over_certain_love_claim");
  for (const chapter of asArray(chapters)) {
    const count = countChapterSections(source, clean(chapter.id));
    if (count !== 1) errors.push(`chapter_render_count:${clean(chapter.id)}:${count}`);
    const section = findChapterSection(source, clean(chapter.id));
    const validation = validateLoveSecretPremiumChapterHtml(section, chapter);
    if (!validation.ok) errors.push(...validation.errors.map((error) => `chapter:${clean(chapter.id)}:${error}`));
  }
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
  if (expectedChapterCount > 0 && chapters.length !== expectedChapterCount) errors.push("chapter_count_mismatch");
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
