import {
  LIFE_BOOK_PREMIUM_MANUSCRIPT_SOURCE,
  LIFE_BOOK_PREMIUM_WRITING_PIPELINE,
  asArray,
  clean,
  escapeHtml,
  stripTags,
} from "./life-book-premium.types.js";
import { lifeBookPremiumChapterPlanV1 } from "./life-book-premium.chapter-plan.js";

const forbiddenTerms = [
  "undefined",
  "null",
  "NaN",
  "[object Object]",
  "local-assembled",
  "localAssembly",
  "fallback",
  "templateParagraphBuilder",
  "renderRawJsonReport",
];

const forbiddenPattern = new RegExp(forbiddenTerms.map((term) => term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|"), "i");
const internalPattern = /\b(?:schema|json|payload|debug|prompt|api|raw calculation|rawResultSummary|calculationMode|localAssembly|fallback|templateParagraphBuilder|renderRawJsonReport)\b/i;
const codeFencePattern = /```|~~~|^\s*`{3}/m;
const mojibakePlaceholderPattern = /\uFFFD|\?{3,}/;

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

function readSectionHeadings(articleHtml) {
  const matches = String(articleHtml || "").matchAll(/<section\b[^>]*>[\s\S]*?<h2\b[^>]*>([\s\S]*?)<\/h2>[\s\S]*?<\/section>/gi);
  return [...matches].map((match) => clean(stripTags(match[1])));
}

function repeatedSentenceIssue(text) {
  const counts = new Map();
  const sentences = String(text || "")
    .split(/[.!?。？！\n]/)
    .map((item) => clean(item))
    .filter((item) => item.length >= 24);
  for (const sentence of sentences) {
    const count = (counts.get(sentence) || 0) + 1;
    if (count >= 3) return true;
    counts.set(sentence, count);
  }
  return false;
}

export function validateLifeBookPremiumChapterHtml(html, chapter) {
  const issues = [];
  const raw = String(html || "").trim();
  if (!raw) issues.push("html.empty");
  if (codeFencePattern.test(raw)) issues.push("html.markdown_code_fence");
  if (mojibakePlaceholderPattern.test(raw)) issues.push("html.mojibake_placeholder");
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
  const actualHeadings = readSectionHeadings(article);
  if (actualHeadings.length !== headings.length) issues.push(`section.count.${actualHeadings.length}`);
  actualHeadings.forEach((heading, index) => {
    if (!headings.includes(heading)) issues.push(`section.unexpected.${heading || index + 1}`);
    if (headings[index] && heading !== headings[index]) issues.push(`section.order.${index + 1}`);
  });
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
    if (paragraphs.map(stripTags).join(" ").length < 120) issues.push(`section.too_short.${heading}`);
  }

  const plain = stripTags(article);
  if (plain.replace(/\s+/g, "").length < Number(chapter.minLength || 0)) issues.push("body.minLength");
  if (repeatedSentenceIssue(plain)) issues.push("body.repetition");
  if (!/<\/article>\s*$/i.test(article)) issues.push("html.article_not_closed");

  return { ok: issues.length === 0, issues, html: article || raw };
}

export function parseLifeBookPremiumChapterHtml(html, chapter) {
  const validation = validateLifeBookPremiumChapterHtml(html, chapter);
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
    categories: sections.map((section) => ({
      title: section.title,
      finalText: section.body,
      body: section.body,
    })),
    text: sections.map((section) => `## ${section.title}\n${section.body}`).join("\n\n"),
    sectionCount: sections.length,
    validation,
  };
}

export function assertAllLifeBookChaptersIncluded(fullHtml, chapters = lifeBookPremiumChapterPlanV1.chapters) {
  const source = String(fullHtml || "");
  for (const chapter of chapters) {
    const count = (source.match(new RegExp(`data-chapter-id=["']${escapeRegExp(chapter.id)}["']`, "g")) || []).length;
    if (count !== 1) {
      throw Object.assign(new Error(`LIFE_BOOK_CHAPTER_RENDER_COUNT:${chapter.id}:${count}`), {
        code: "LIFE_BOOK_CHAPTER_RENDER_COUNT",
        status: 422,
        chapterId: chapter.id,
      });
    }
  }
  return true;
}

export function assertLifeBookChapterVisualsIncluded(fullHtml, chapters = lifeBookPremiumChapterPlanV1.chapters) {
  const source = String(fullHtml || "");
  for (const chapter of chapters) {
    const count = (source.match(new RegExp(`data-chapter-flow=["']${escapeRegExp(chapter.id)}["']`, "g")) || []).length;
    if (count !== 1) {
      throw Object.assign(new Error(`LIFE_BOOK_CHAPTER_VISUAL_COUNT:${chapter.id}:${count}`), {
        code: "LIFE_BOOK_CHAPTER_VISUAL_COUNT",
        status: 422,
        chapterId: chapter.id,
      });
    }
  }
  return true;
}

export function assertNoLifeBookRawLeak(fullHtml) {
  const source = String(fullHtml || "");
  if (/^\s*[{[]/.test(stripTags(source)) || /"rawResultSummary"\s*:|```|schema|payload|debug|prompt/i.test(source)) {
    throw Object.assign(new Error("LIFE_BOOK_PDF_RAW_LEAK"), { code: "LIFE_BOOK_PDF_RAW_LEAK", status: 422 });
  }
  return true;
}

export function assertNoLifeBookUndefinedValues(fullHtml) {
  if (/\b(?:undefined|null|NaN)\b|\[object Object\]/i.test(String(fullHtml || ""))) {
    throw Object.assign(new Error("LIFE_BOOK_PDF_UNDEFINED_VALUE_LEAK"), { code: "LIFE_BOOK_PDF_UNDEFINED_VALUE_LEAK", status: 422 });
  }
  return true;
}

export function validateLifeBookFinalReportHtml(fullHtml, chapters = [], plan = lifeBookPremiumChapterPlanV1) {
  const issues = [];
  try { assertAllLifeBookChaptersIncluded(fullHtml, plan.chapters); } catch (error) { issues.push(error.code || "chapter.include"); }
  try { assertLifeBookChapterVisualsIncluded(fullHtml, plan.chapters); } catch (error) { issues.push(error.code || "chapter.visual"); }
  try { assertNoLifeBookRawLeak(fullHtml); } catch (error) { issues.push(error.code || "raw_leak"); }
  try { assertNoLifeBookUndefinedValues(fullHtml); } catch (error) { issues.push(error.code || "undefined"); }
  if (forbiddenPattern.test(String(fullHtml || ""))) issues.push("html.forbidden_term");
  if (mojibakePlaceholderPattern.test(String(fullHtml || ""))) issues.push("html.mojibake_placeholder");
  if (asArray(chapters).length !== asArray(plan.chapters).length) issues.push("chapter.count");
  if (!String(fullHtml || "").includes("<!doctype html>")) issues.push("html.doctype");
  if (!/class=["'][^"']*visual-summary/i.test(String(fullHtml || ""))) issues.push("visual.summary");
  if (!/class=["'][^"']*lb-table/i.test(String(fullHtml || ""))) issues.push("visual.table");
  if (!/class=["'][^"']*element-bars/i.test(String(fullHtml || ""))) issues.push("visual.element_graph");
  if (!/class=["'][^"']*cycle-timeline/i.test(String(fullHtml || ""))) issues.push("visual.timeline");
  if (!/class=["'][^"']*chapter-flow/i.test(String(fullHtml || ""))) issues.push("visual.chapter_flow");
  if (!/class=["'][^"']*chapter-flow-bars/i.test(String(fullHtml || ""))) issues.push("visual.chapter_flow_bars");
  for (const label of ["사주 네 기둥", "오행 균형 그래프", "십성 분포", "운의 흐름"]) {
    if (!String(fullHtml || "").includes(label)) issues.push(`visual.label.${label}`);
  }
  return { ok: issues.length === 0, issues };
}

export function validateLifeBookPdfCompletionPayload({ pdfReady = {}, chapters = [], requireDownloadUrl = false } = {}) {
  const issues = [];
  const llmAssembly = pdfReady?.llmAssembly || {};
  if (!clean(pdfReady.html)) issues.push("pdfReady.html");
  if (requireDownloadUrl && !clean(pdfReady.downloadUrl || pdfReady.pdfUrl || pdfReady.htmlUrl)) issues.push("pdfReady.url");
  if (clean(pdfReady.renderFormat) !== "pdf-archive") issues.push("pdfReady.renderFormat");
  if (clean(pdfReady.mimeType) !== "application/pdf") issues.push("pdfReady.mimeType");
  if (clean(pdfReady.manuscriptSource) !== LIFE_BOOK_PREMIUM_MANUSCRIPT_SOURCE) issues.push("pdfReady.manuscriptSource");
  if (clean(pdfReady.generationMode) !== "llm-only") issues.push("pdfReady.generationMode");
  if (clean(pdfReady.writingPipeline) !== LIFE_BOOK_PREMIUM_WRITING_PIPELINE) issues.push("pdfReady.writingPipeline");
  if (llmAssembly.enabled !== true) issues.push("llmAssembly.enabled");
  if (llmAssembly.externalGeneration !== true) issues.push("llmAssembly.externalGeneration");
  if (llmAssembly.fallbackUsed === true) issues.push("llmAssembly.fallbackUsed");
  if (Number(llmAssembly.chapterCount || 0) !== lifeBookPremiumChapterPlanV1.chapters.length) issues.push("llmAssembly.chapterCount");
  if (Number(llmAssembly.expectedChapterCount || 0) !== lifeBookPremiumChapterPlanV1.chapters.length) issues.push("llmAssembly.expectedChapterCount");
  if (asArray(chapters).length !== lifeBookPremiumChapterPlanV1.chapters.length) issues.push("chapter.count");
  if (clean(pdfReady.html) && validateLifeBookFinalReportHtml(pdfReady.html, chapters).ok !== true) issues.push("html.final");
  return { ok: issues.length === 0, issues };
}

export function renderMissingLifeBookDataNotice(label) {
  return `<p>${escapeHtml(label)} 정보는 사주 계산 근거 안에서 확인되는 범위까지만 차분히 해석합니다.</p>`;
}
