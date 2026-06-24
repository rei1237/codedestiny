import {
  LIFE_BOOK_PREMIUM_MANUSCRIPT_SOURCE,
  LIFE_BOOK_PREMIUM_WRITING_PIPELINE,
  asArray,
  clean,
  escapeHtml,
  stripTags,
} from "./life-book-premium.types.js";
import { LIFE_BOOK_PREMIUM_CHAPTER_CONTRACT, getLifeBookPremiumChapterContractByChapterId } from "./life-book-premium.chapter-plan.js";

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
const internalPattern = /\b(?:schema|json|payload|prompt|api|raw calculation|rawResultSummary|calculationMode|localAssembly|fallback|templateParagraphBuilder|renderRawJsonReport)\b/i;
const codeFencePattern = /```|~~~|^\s*`{3}/m;
const mojibakePlaceholderPattern = /\uFFFD|\?{3,}/;

function escapeRegExp(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeMatchText(value) {
  return clean(value)
    .toLowerCase()
    .replace(/[\u2000-\u206F\u2E00-\u2E7F\\'\"'`~!@#$%^&*()_+=[\]{}|;:,.< >/?-]/g, "")
    .replace(/\s+/g, "")
    .replace(/\b(section|섹션|category|카테고리)\b/g, "")
    .trim();
}

function levenshteinDistance(left = "", right = "") {
  const source = String(left || "");
  const target = String(right || "");
  if (source === target) return 0;
  if (!source.length) return target.length;
  if (!target.length) return source.length;
  const matrix = Array.from({ length: target.length + 1 }, () => 0);
  const previous = Array.from({ length: target.length + 1 }, (_, index) => index);
  for (let sourceIndex = 1; sourceIndex <= source.length; sourceIndex += 1) {
    const char = source[sourceIndex - 1];
    let previousCell = sourceIndex - 1;
    matrix[0] = sourceIndex;
    for (let targetIndex = 1; targetIndex <= target.length; targetIndex += 1) {
      const insertCost = matrix[targetIndex - 1] + 1;
      const deleteCost = previous[targetIndex] + 1;
      const replaceCost = previousCell + (char === target[targetIndex - 1] ? 0 : 1);
      const minCost = Math.min(insertCost, deleteCost, replaceCost);
      previousCell = matrix[targetIndex];
      matrix[targetIndex] = minCost;
    }
    for (let targetIndex = 0; targetIndex <= target.length; targetIndex += 1) {
      previous[targetIndex] = matrix[targetIndex];
    }
  }
  return previous[target.length];
}

function similarityText(left, right) {
  const a = normalizeMatchText(left);
  const b = normalizeMatchText(right);
  if (!a || !b) return 0;
  if (a === b) return 1;
  if (a.includes(b) || b.includes(a)) return 0.9;
  const distance = levenshteinDistance(a, b);
  const maxLen = Math.max(a.length, b.length);
  if (!maxLen) return 0;
  return Math.max(0, 1 - distance / maxLen);
}

function toChapterContract(chapter = {}) {
  const rawContract = getLifeBookPremiumChapterContractByChapterId(chapter.chapterId || chapter.id, chapter.chapterContract || LIFE_BOOK_PREMIUM_CHAPTER_CONTRACT);
  if (rawContract && asArray(rawContract.sections).length) {
    return {
      chapterId: clean(rawContract.chapterId || chapter.id),
      chapterOrder: Number.isFinite(Number(rawContract.chapterOrder)) ? Number(rawContract.chapterOrder) : (Number.isFinite(Number(chapter.order)) ? Number(chapter.order) : 0),
      chapterTitle: clean(rawContract.chapterTitle || chapter.title),
      sections: asArray(rawContract.sections).map((section, index) => ({
        chapterId: clean(rawContract.chapterId || chapter.id),
        sectionId: clean(section.sectionId || `${clean(chapter.id)}-${String(index + 1).padStart(2, "0")}`),
        sectionTitle: clean(section.sectionTitle || section.title || ""),
        sectionIntent: clean(section.sectionIntent || section.intent || section.description || "", 240),
        sectionOrder: Number.isFinite(Number(section.sectionOrder || index + 1)) ? Number(section.sectionOrder || index + 1) : index + 1,
      })),
    };
  }
  const fallbackSections = asArray(chapter.sections).map((section, index) => ({
    chapterId: clean(chapter.id),
    sectionId: `${clean(chapter.id)}-${String(index + 1).padStart(2, "0")}`,
    sectionTitle: clean(section),
    sectionIntent: clean(section, 240),
    sectionOrder: index + 1,
  }));
  return {
    chapterId: clean(chapter.id || chapter.chapterId),
    chapterTitle: clean(chapter.title || chapter.chapterTitle),
    sections: fallbackSections,
  };
}

function extractAttribute(tag, key) {
  const match = String(tag || "").match(new RegExp(`${key}=["']([^"']*)["']`, "i"));
  return clean(match ? match[1] : "");
}

function stripSectionHeading(sectionHtml = "", heading = "") {
  const safeHeading = clean(heading, 240);
  if (!safeHeading) return clean(stripTags(sectionHtml), 5000);
  return clean(stripTags(sectionHtml.replace(new RegExp(`<h2\\b[^>]*>\\s*${escapeRegExp(safeHeading)}\\s*<\\/h2>`, "i"), " ")), 5000);
}

function parseSectionBlocks(articleHtml = "") {
  const source = String(articleHtml || "");
  const matches = [...source.matchAll(/<section\b[^>]*>[\s\S]*?<\/section>/gi)];
  return matches.map((match) => {
    const block = String(match[0] || "");
    const heading = readHeading(block, "h2");
    const normalizedHeading = normalizeMatchText(heading);
    const categoryId = extractAttribute(block, "data-category-id") || "";
    return {
      block,
      heading,
      headingNormalized: normalizedHeading,
      categoryId: clean(categoryId),
      categoryIdNormalized: normalizeMatchText(categoryId),
      index: match.index == null ? -1 : Number(match.index),
    };
  });
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

function readSectionHeadings(articleHtml) {
  const matches = String(articleHtml || "").matchAll(/<section\b[^>]*>[\s\S]*?<h2\b[^>]*>([\s\S]*?)<\/h2>[\s\S]*?<\/section>/gi);
  return [...matches].map((match) => ({
    raw: String(match[0] || ""),
    heading: clean(stripTags(match[1])),
    headingNormalized: normalizeMatchText(match[1]),
  }));
}

function countHeading(articleHtml, heading) {
  const pattern = new RegExp(`<h2\\b[^>]*>\\s*${escapeRegExp(heading)}\\s*<\\/h2>`, "gi");
  return (String(articleHtml || "").match(pattern) || []).length;
}

function repeatedSentenceIssue(text) {
  const counts = new Map();
  const sentences = String(text || "")
    .split(/[.!?]\s+|\n{2,}/)
    .map((item) => clean(item))
    .filter((item) => item.length >= 24);
  for (const sentence of sentences) {
    const count = (counts.get(sentence) || 0) + 1;
    if (count >= 3) return true;
    counts.set(sentence, count);
  }
  return false;
}

function matchSectionToContract(contractSection, candidates, usedIndexes = new Set()) {
  const byId = candidates.findIndex((candidate, candidateIndex) => {
    if (usedIndexes.has(candidateIndex)) return false;
    if (!candidate.categoryIdNormalized) return false;
    return candidate.categoryIdNormalized === normalizeMatchText(contractSection.sectionId);
  });
  if (byId >= 0) return { index: byId, score: 1, reason: "category-id" };

  let best = { index: -1, score: 0, reason: "" };
  for (let candidateIndex = 0; candidateIndex < candidates.length; candidateIndex += 1) {
    if (usedIndexes.has(candidateIndex)) continue;
    const candidate = candidates[candidateIndex];
    const score = similarityText(candidate.heading, contractSection.sectionTitle);
    if (score > best.score) {
      best = {
        index: candidateIndex,
        score,
        reason: "title-similarity",
      };
    }
  }
  if (best.score >= 0.82) return best;
  return { index: -1, score: 0, reason: "no-match" };
}

export function validateLifeBookPremiumChapterHtml(html, chapter) {
  const issues = [];
  const raw = String(html || "").trim();
  if (!raw) issues.push("html.empty");
  if (codeFencePattern.test(raw)) issues.push("html.markdown_code_fence");
  if (mojibakePlaceholderPattern.test(raw)) issues.push("html.mojibake_placeholder");
  if (/^\s*[{[]/.test(raw) || /"chapters?"\s*:/.test(raw)) issues.push("html.json_like");
  if (internalPattern.test(raw)) issues.push("html.internal_key");
  if (forbiddenPattern.test(raw)) issues.push("html.forbidden_term");

  const chapterContract = toChapterContract(chapter);
  const article = findArticle(raw, chapterContract.chapterId);
  if (!article) issues.push("article.missing");
  if (article && (article.match(/<article\b/gi) || []).length !== 1) issues.push("article.count");

  const headingMismatchPenalty = [];
  const h1 = readHeading(article, "h1");
  const h1Expected = clean(chapterContract.chapterTitle);
  if (h1 && normalizeMatchText(h1) !== normalizeMatchText(h1Expected)) {
    issues.push("h1.title");
    headingMismatchPenalty.push("h1");
  }

  const sectionCandidates = parseSectionBlocks(article);
  const sectionContractSections = asArray(chapterContract.sections);
  const sectionMatches = [];
  const usedCandidates = new Set();
  const missingCategories = [];

  for (let index = 0; index < sectionContractSections.length; index += 1) {
    const planSection = sectionContractSections[index];
    const match = matchSectionToContract(planSection, sectionCandidates, usedCandidates);
    if (match.index >= 0) {
      usedCandidates.add(match.index);
      const candidate = sectionCandidates[match.index];
      sectionMatches.push({
        sectionId: clean(planSection.sectionId),
        sectionTitle: planSection.sectionTitle,
        expectedIndex: index,
        actualIndex: match.index,
        matchScore: match.score,
        matchReason: match.reason,
        block: candidate.block,
        heading: candidate.heading,
      });
      continue;
    }
    missingCategories.push({
      sectionId: planSection.sectionId,
      sectionTitle: planSection.sectionTitle,
      sectionOrder: planSection.sectionOrder,
    });
  }

  const extraCategories = sectionCandidates
    .map((candidate, index) => ({ ...candidate, actualIndex: index }))
    .filter((candidate) => !usedCandidates.has(candidate.actualIndex))
    .filter((candidate) => Boolean(candidate.heading))
    .map((candidate) => ({
      sectionId: candidate.categoryId || `unmatched-${candidate.actualIndex + 1}`,
      sectionTitle: candidate.heading,
      sectionOrder: candidate.actualIndex + 1,
    }));

  const sectionActualHeadings = readSectionHeadings(article);
  if (sectionActualHeadings.length !== sectionContractSections.length) {
    issues.push(`section.count.${sectionActualHeadings.length}`);
  }

  const matchedByExpected = sectionMatches.map((match) => match.actualIndex).filter((index) => Number.isFinite(index));
  const orderIssues = [];
  const isStrictlyIncreasing = [...matchedByExpected].every((value, valueIndex) => valueIndex === 0 || value > matchedByExpected[valueIndex - 1]);
  if (!isStrictlyIncreasing) {
    issues.push("section.order");
    for (let index = 1; index < matchedByExpected.length; index += 1) {
      const current = matchedByExpected[index];
      const previous = matchedByExpected[index - 1];
      if (current <= previous) {
        orderIssues.push(`${sectionMatches[index].sectionId}:${index + 1}`);
      }
    }
  }

  const seenHeading = new Set();
  for (const heading of sectionContractSections) {
    const headingText = clean(heading.sectionTitle);
    const expectedNormalized = normalizeMatchText(headingText);
    const matchedSection = sectionMatches.find((item) => item.sectionId === heading.sectionId || clean(item.sectionTitle) === headingText);
    const candidate = matchedSection ? sectionCandidates[matchedSection.actualIndex] : null;

    if (!candidate) {
      issues.push(`section.missing.${heading.sectionId}`);
      continue;
    }

    const exactHeadingCount = countHeading(article, headingText);
    const normalizedCount = sectionActualHeadings.filter((section) => section.headingNormalized === expectedNormalized).length;
    if (exactHeadingCount > 1 || normalizedCount > 1) {
      issues.push(`h2.duplicate_plan.${heading.sectionId}`);
    }

    const paragraphText = stripTags(candidate.block || "");
    const paragraphs = (candidate.block || "").match(/<p\b[^>]*>[\s\S]*?<\/p>/gi) || [];
    if (!paragraphs.length) issues.push(`section.p_missing.${heading.sectionId}`);
    if (paragraphText.replace(/\s+/g, "").length < 120) issues.push(`section.too_short.${heading.sectionId}`);

    if (seenHeading.has(candidate.headingNormalized)) {
      issues.push(`section.duplicate.${heading.sectionId}`);
    }
    seenHeading.add(candidate.headingNormalized);
  }

  const plain = stripTags(article);
  if (plain.replace(/\s+/g, "").length < Number(chapterContract.minLength || 0)) issues.push("body.minLength");
  if (repeatedSentenceIssue(plain)) issues.push("body.repetition");
  if (!/<\/article>\s*$/i.test(article)) issues.push("html.article_not_closed");

  const expectedSectionCount = sectionContractSections.length;
  const matchedCount = sectionMatches.length;
  const penalty = Math.min(0.55, issues.length * 0.08 + headingMismatchPenalty.length * 0.06 + extraCategories.length * 0.06);
  const baseConfidence = expectedSectionCount ? matchedCount / expectedSectionCount : 0;
  const confidence = Number(Math.max(0, Math.min(1, Number((baseConfidence - penalty).toFixed(2)))).toFixed(2));

  return {
    ok: issues.length === 0,
    issues,
    html: article || raw,
    chapterContract,
    missingCategories,
    extraCategories,
    orderIssues,
    matchedCount,
    matchedSections: sectionMatches,
    expectedSectionCount,
    actualSectionCount: sectionActualHeadings.length,
    confidence,
  };
}

export function parseLifeBookPremiumChapterHtml(html, chapter) {
  const validation = validateLifeBookPremiumChapterHtml(html, chapter);
  const article = validation.html;
  const chapterContract = validation.chapterContract || toChapterContract(chapter);
  const sections = asArray(chapterContract.sections).map((contractSection) => {
    const match = asArray(validation.matchedSections).find((item) => item.sectionId === contractSection.sectionId);
    const block = match ? match.block : "";
    const body = stripSectionHeading(block, match?.heading || contractSection.sectionTitle);
    return {
      sectionId: contractSection.sectionId,
      sectionOrder: contractSection.sectionOrder,
      heading: clean(contractSection.sectionTitle),
      title: clean(contractSection.sectionTitle),
      body,
      chapterId: contractSection.chapterId,
    };
  });

  return {
    id: chapterContract.chapterId,
    order: Number(chapterContract.chapterOrder || chapter.order || 0),
    title: chapterContract.chapterTitle,
    html: article,
    sections,
    categories: sections.map((section) => ({
      id: section.sectionId,
      title: section.title,
      finalText: section.body,
      body: section.body,
      sectionId: section.sectionId,
    })),
    text: sections.map((section) => `## ${section.title}\n${section.body}`).join("\n\n"),
    sectionCount: sections.length,
    validation,
  };
}

export function assertAllLifeBookChaptersIncluded(fullHtml, chapters = LIFE_BOOK_PREMIUM_CHAPTER_CONTRACT.chapters) {
  const source = String(fullHtml || "");
  for (const chapter of chapters) {
    const count = (source.match(new RegExp(`data-chapter-id=["']${escapeRegExp(chapter.chapterId || chapter.id)}["']`, "g")) || []).length;
    if (count !== 1) {
      throw Object.assign(new Error(`LIFE_BOOK_CHAPTER_RENDER_COUNT:${chapter.chapterId || chapter.id}:${count}`), {
        code: "LIFE_BOOK_CHAPTER_RENDER_COUNT",
        status: 422,
        chapterId: chapter.chapterId || chapter.id,
      });
    }
  }
  return true;
}

export function assertLifeBookChapterVisualsIncluded(fullHtml, chapters = LIFE_BOOK_PREMIUM_CHAPTER_CONTRACT.chapters) {
  const source = String(fullHtml || "");
  for (const chapter of chapters) {
    const count = (source.match(new RegExp(`data-chapter-flow=["']${escapeRegExp(chapter.chapterId || chapter.id)}["']`, "g")) || []).length;
    if (count !== 1) {
      throw Object.assign(new Error(`LIFE_BOOK_CHAPTER_VISUAL_COUNT:${chapter.chapterId || chapter.id}:${count}`), {
        code: "LIFE_BOOK_CHAPTER_VISUAL_COUNT",
        status: 422,
        chapterId: chapter.chapterId || chapter.id,
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

export function validateLifeBookFinalReportHtml(fullHtml, chapters = [], plan = LIFE_BOOK_PREMIUM_CHAPTER_CONTRACT) {
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
  for (const label of ["사주의 중심 기운", "강하게 흐르는 오행", "건강의 신호", "재물의 움직임", "관계에서의 흐름"]) {
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
  if (Number(llmAssembly.chapterCount || 0) !== LIFE_BOOK_PREMIUM_CHAPTER_CONTRACT.chapters.length) issues.push("llmAssembly.chapterCount");
  if (Number(llmAssembly.expectedChapterCount || 0) !== LIFE_BOOK_PREMIUM_CHAPTER_CONTRACT.chapters.length) issues.push("llmAssembly.expectedChapterCount");
  if (asArray(chapters).length !== LIFE_BOOK_PREMIUM_CHAPTER_CONTRACT.chapters.length) issues.push("chapter.count");
  if (clean(pdfReady.html) && validateLifeBookFinalReportHtml(pdfReady.html, chapters).ok !== true) issues.push("html.final");
  return { ok: issues.length === 0, issues };
}

export function renderMissingLifeBookDataNotice(label) {
  return `<p>${escapeHtml(label)} 입력값 기반 결과를 불러오지 못했습니다.</p>`;
}
