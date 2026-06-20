import { asArray, clean, escapeHtml, stripTags } from "./vedic-premium.types.js";
import { vedicPremiumChapterPlanV2 } from "./vedic-premium.chapter-plan.js";

const forbiddenTerms = [
  "숙요", "안괴", "영친", "업태", "자미두수", "명궁", "신궁", "사화", "십성", "용신", "격국",
  "undefined", "null", "NaN", "[object Object]",
];

const forbiddenPattern = new RegExp(forbiddenTerms.map((term) => term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|"), "i");
const internalPattern = /\b(?:schema|json|payload|debug|prompt|api|raw calculation|rawResultSummary|calculationMode|localAssembly|fallback|templateParagraphBuilder|renderRawJsonReport)\b/i;
const codeFencePattern = /```|~~~|^\s*`{3}/m;

function escapeRegExp(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function findArticle(html, chapterId) {
  const source = String(html || "").trim();
  const match = source.match(new RegExp(`<article\\b[^>]*data-chapter-id=["']${escapeRegExp(chapterId)}["'][^>]*>[\\s\\S]*?<\\/article>`, "i"));
  return match ? match[0] : "";
}

function readHeading(html, tag) {
  const match = String(html || "").match(new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return clean(stripTags(match ? match[1] : ""));
}

function sectionBlockForHeading(articleHtml, heading) {
  const pattern = new RegExp(`<section\\b[^>]*>[\\s\\S]*?<h2\\b[^>]*>\\s*${escapeRegExp(heading)}\\s*<\\/h2>[\\s\\S]*?<\\/section>`, "i");
  const match = String(articleHtml || "").match(pattern);
  return match ? match[0] : "";
}

function countHeading(articleHtml, heading) {
  const pattern = new RegExp(`<h2\\b[^>]*>\\s*${escapeRegExp(heading)}\\s*<\\/h2>`, "gi");
  return (String(articleHtml || "").match(pattern) || []).length;
}

function repeatedSentenceIssue(text) {
  const counts = new Map();
  const sentences = String(text || "").split(/[.!?。！？\n]|다\.|요\./).map((item) => clean(item)).filter((item) => item.length >= 22);
  for (const sentence of sentences) {
    const count = (counts.get(sentence) || 0) + 1;
    if (count >= 3) return true;
    counts.set(sentence, count);
  }
  return false;
}

function koreanDominanceIssue(text) {
  const source = stripTags(text);
  if (source.replace(/\s+/g, "").length < 120) return false;
  const koreanCount = (source.match(/[가-힣]/g) || []).length;
  const latinCount = (source.match(/[A-Za-z]/g) || []).length;
  return koreanCount < 120 || latinCount > koreanCount * 0.8;
}

export function validateVedicPremiumChapterHtml(html, chapter) {
  const issues = [];
  const raw = String(html || "").trim();
  if (!raw) issues.push("html.empty");
  if (codeFencePattern.test(raw)) issues.push("html.markdown_code_fence");
  if (/^\s*[{[]/.test(raw) || /["']chapters?["']\s*:/.test(raw)) issues.push("html.json_like");
  if (internalPattern.test(raw)) issues.push("html.internal_key");
  if (forbiddenPattern.test(raw)) issues.push("html.forbidden_term");

  const article = findArticle(raw, chapter.id);
  if (!article) issues.push("article.missing");
  if (article && (article.match(/<article\b/gi) || []).length !== 1) issues.push("article.count");

  const h1 = readHeading(article, "h1");
  if (!h1) issues.push("h1.missing");
  if (h1 && clean(h1) !== clean(chapter.title)) issues.push("h1.title");

  const headings = asArray(chapter.sections);
  const seen = new Set();
  for (const heading of headings) {
    const count = countHeading(article, heading);
    if (count !== 1) issues.push(`h2.${heading}.${count || "missing"}`);
    if (seen.has(heading)) issues.push(`h2.duplicate_plan.${heading}`);
    seen.add(heading);
    const section = sectionBlockForHeading(article, heading);
    if (!section) {
      issues.push(`section.missing.${heading}`);
      continue;
    }
    const paragraphs = section.match(/<p\b[^>]*>[\s\S]*?<\/p>/gi) || [];
    if (!paragraphs.length) issues.push(`section.p_missing.${heading}`);
    if (paragraphs.map(stripTags).join(" ").length < 180) issues.push(`section.too_short.${heading}`);
  }

  const plain = stripTags(article);
  if (plain.replace(/\s+/g, "").length < Number(chapter.minLength || 0)) issues.push("body.minLength");
  if (repeatedSentenceIssue(plain)) issues.push("body.repetition");
  if (koreanDominanceIssue(plain)) issues.push("body.korean_required");
  if (!/<\/article>\s*$/i.test(article)) issues.push("html.article_not_closed");

  return { ok: issues.length === 0, issues, html: article || raw };
}

export function parseVedicPremiumChapterHtml(html, chapter) {
  const validation = validateVedicPremiumChapterHtml(html, chapter);
  const article = validation.html;
  const sections = asArray(chapter.sections).map((heading) => {
    const block = sectionBlockForHeading(article, heading);
    return {
      heading,
      title: heading,
      body: stripTags(block.replace(new RegExp(`<h2\\b[^>]*>\\s*${escapeRegExp(heading)}\\s*<\\/h2>`, "i"), " ")),
    };
  });
  return {
    id: chapter.id,
    order: chapter.order,
    title: chapter.title,
    html: article,
    sections,
    sectionCount: sections.length,
    validation,
  };
}

export function assertAllConfiguredChaptersIncluded(fullHtml, chapters = vedicPremiumChapterPlanV2.chapters) {
  const source = String(fullHtml || "");
  for (const chapter of chapters) {
    const count = (source.match(new RegExp(`data-chapter-id=["']${escapeRegExp(chapter.id)}["']`, "g")) || []).length;
    if (count !== 1) {
      throw Object.assign(new Error(`VEDIC_CHAPTER_RENDER_COUNT:${chapter.id}:${count}`), {
        code: "VEDIC_CHAPTER_RENDER_COUNT",
        status: 422,
        chapterId: chapter.id,
      });
    }
  }
  return true;
}

export function assertNoRawJsonLeak(fullHtml) {
  const source = String(fullHtml || "");
  if (/^\s*[{[]/.test(stripTags(source)) || /"rawResultSummary"\s*:|```|schema|payload|debug|prompt/i.test(source)) {
    throw Object.assign(new Error("VEDIC_PDF_RAW_JSON_LEAK"), { code: "VEDIC_PDF_RAW_JSON_LEAK", status: 422 });
  }
  return true;
}

export function assertNoUndefinedValues(fullHtml) {
  if (/\b(?:undefined|null|NaN)\b|\[object Object\]/i.test(String(fullHtml || ""))) {
    throw Object.assign(new Error("VEDIC_PDF_UNDEFINED_VALUE_LEAK"), { code: "VEDIC_PDF_UNDEFINED_VALUE_LEAK", status: 422 });
  }
  return true;
}

export function assertNoForeignSystemTermsLeaked(fullHtml) {
  if (forbiddenPattern.test(String(fullHtml || ""))) {
    throw Object.assign(new Error("VEDIC_PDF_FOREIGN_SYSTEM_TERM"), { code: "VEDIC_PDF_FOREIGN_SYSTEM_TERM", status: 422 });
  }
  return true;
}

export function assertVedicVisualElementsIncluded(fullHtml) {
  const source = String(fullHtml || "");
  const requiredMarkers = [
    "summary-table",
    "chart-dashboard",
    "rashi-house-grid",
    "planet-density-bars",
    "dasha-table",
    "yoga-table",
    "chapter-plan-table",
  ];
  for (const marker of requiredMarkers) {
    if (!source.includes(`data-vedic-visual="${marker}"`)) {
      throw Object.assign(new Error(`VEDIC_PDF_VISUAL_MISSING:${marker}`), {
        code: "VEDIC_PDF_VISUAL_MISSING",
        status: 422,
        marker,
      });
    }
  }
  const houseCells = (source.match(/data-house="/g) || []).length;
  if (houseCells !== 12) {
    throw Object.assign(new Error("VEDIC_PDF_RASHI_GRID_INCOMPLETE"), { code: "VEDIC_PDF_RASHI_GRID_INCOMPLETE", status: 422 });
  }
  const tableCount = (source.match(/<table\b/gi) || []).length;
  const barRows = (source.match(/class="bar-row"/g) || []).length;
  const barFills = (source.match(/class="bar-fill"/g) || []).length;
  if (tableCount < 4 || barRows !== 12 || barFills !== 12 || !/class="bar-fill"/.test(source)) {
    throw Object.assign(new Error("VEDIC_PDF_VISUAL_STRUCTURE_INVALID"), { code: "VEDIC_PDF_VISUAL_STRUCTURE_INVALID", status: 422 });
  }
  return true;
}

export function assertVedicChapterPlanCoverage(chapters = [], plan = vedicPremiumChapterPlanV2) {
  const actualChapters = asArray(chapters);
  const expectedChapters = asArray(plan.chapters);
  if (actualChapters.length !== expectedChapters.length) {
    throw Object.assign(new Error("VEDIC_CHAPTER_PLAN_COVERAGE_COUNT"), { code: "VEDIC_CHAPTER_PLAN_COVERAGE_COUNT", status: 422 });
  }
  expectedChapters.forEach((expected, index) => {
    const actual = actualChapters[index] || {};
    if (clean(actual.id) !== clean(expected.id) || clean(actual.title) !== clean(expected.title)) {
      throw Object.assign(new Error(`VEDIC_CHAPTER_PLAN_COVERAGE_MISMATCH:${expected.id}`), {
        code: "VEDIC_CHAPTER_PLAN_COVERAGE_MISMATCH",
        status: 422,
        chapterId: expected.id,
      });
    }
    if (Number(actual.order) !== Number(expected.order)) {
      throw Object.assign(new Error(`VEDIC_CHAPTER_PLAN_ORDER_MISMATCH:${expected.id}`), {
        code: "VEDIC_CHAPTER_PLAN_ORDER_MISMATCH",
        status: 422,
        chapterId: expected.id,
      });
    }
    const actualSections = asArray(actual.sections).map((section) => clean(section.heading || section.title));
    const expectedSections = asArray(expected.sections).map((section) => clean(section));
    if (actualSections.length !== expectedSections.length || actualSections.some((heading, sectionIndex) => heading !== expectedSections[sectionIndex])) {
      throw Object.assign(new Error(`VEDIC_CHAPTER_SECTION_COVERAGE_MISMATCH:${expected.id}`), {
        code: "VEDIC_CHAPTER_SECTION_COVERAGE_MISMATCH",
        status: 422,
        chapterId: expected.id,
      });
    }
  });
  return true;
}

export function validateVedicFinalReportHtml(fullHtml, chapters = [], plan = vedicPremiumChapterPlanV2) {
  const issues = [];
  try { assertAllConfiguredChaptersIncluded(fullHtml, plan.chapters); } catch (error) { issues.push(error.code || "chapter.include"); }
  try { assertVedicChapterPlanCoverage(chapters, plan); } catch (error) { issues.push(error.code || "chapter.coverage"); }
  try { assertNoRawJsonLeak(fullHtml); } catch (error) { issues.push(error.code || "raw_json"); }
  try { assertNoUndefinedValues(fullHtml); } catch (error) { issues.push(error.code || "undefined"); }
  try { assertNoForeignSystemTermsLeaked(fullHtml); } catch (error) { issues.push(error.code || "foreign_terms"); }
  try { assertVedicVisualElementsIncluded(fullHtml); } catch (error) { issues.push(error.code || "visuals"); }
  if (asArray(chapters).length !== asArray(plan.chapters).length) issues.push("chapter.count");
  if (!String(fullHtml || "").includes("<!doctype html>")) issues.push("html.doctype");
  return { ok: issues.length === 0, issues };
}

export function validateVedicPdfCompletionPayload({ pdfReady = {}, chapters = [], requireDownloadUrl = false } = {}) {
  const issues = [];
  const llmAssembly = pdfReady?.llmAssembly || {};
  if (!clean(pdfReady.html)) issues.push("pdfReady.html");
  if (requireDownloadUrl && !clean(pdfReady.downloadUrl || pdfReady.pdfUrl || pdfReady.htmlUrl)) issues.push("pdfReady.url");
  if (clean(pdfReady.renderFormat) !== "pdf-archive") issues.push("pdfReady.renderFormat");
  if (clean(pdfReady.mimeType) !== "application/pdf") issues.push("pdfReady.mimeType");
  if (llmAssembly.enabled !== true) issues.push("llmAssembly.enabled");
  if (llmAssembly.externalGeneration !== true) issues.push("llmAssembly.externalGeneration");
  if (llmAssembly.fallbackUsed === true) issues.push("llmAssembly.fallbackUsed");
  if (asArray(chapters).length !== vedicPremiumChapterPlanV2.chapters.length) issues.push("chapter.count");
  if (clean(pdfReady.html) && validateVedicFinalReportHtml(pdfReady.html, chapters).ok !== true) issues.push("html.final");
  return { ok: issues.length === 0, issues };
}

export function renderMissingDataNotice(label) {
  return `<p>${escapeHtml(label)} 정보는 제공된 베다점 계산 결과 기준에서는 확인이 제한됩니다.</p>`;
}
