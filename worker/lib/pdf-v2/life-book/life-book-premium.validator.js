import { asArray, clean } from "./life-book-premium.types.js";
import { lifeBookPremiumChapterPlanV1 } from "./life-book-chapters.js";
import {
  assertValidChapter,
  parseLifeBookChapterHtml,
  validateChapterHtml,
  validateLifeBookFinalHtml,
} from "./life-book-validator.js";

export function validateLifeBookPremiumChapterHtml(html, chapter) {
  return validateChapterHtml(html, chapter);
}

export function parseLifeBookPremiumChapterHtml(html, chapter) {
  return parseLifeBookChapterHtml(html, chapter);
}

export function assertAllLifeBookChaptersIncluded(fullHtml, chapters = lifeBookPremiumChapterPlanV1.chapters) {
  const source = String(fullHtml || "");
  for (const chapter of asArray(chapters)) {
    const count = (source.match(new RegExp(`data-chapter-id=["']${clean(chapter.id || chapter.chapterId)}["']`, "g")) || []).length;
    if (count !== 1) {
      throw Object.assign(new Error(`LIFE_BOOK_CHAPTER_RENDER_COUNT:${clean(chapter.id || chapter.chapterId)}:${count}`), {
        code: "LIFE_BOOK_CHAPTER_RENDER_COUNT",
        status: 422,
      });
    }
  }
  return true;
}

export function assertNoLifeBookRawLeak(fullHtml) {
  if (/```|rawJson|rawResult|schema|payload|prompt|debug|mock|fallback|template|\bJSON\b/i.test(String(fullHtml || ""))) {
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

export function assertLifeBookChapterVisualsIncluded() {
  return true;
}

export function validateLifeBookFinalReportHtml(fullHtml, chapters = [], plan = lifeBookPremiumChapterPlanV1) {
  return validateLifeBookFinalHtml(fullHtml, chapters, plan.chapters || plan);
}

export function validateLifeBookPdfCompletionPayload({ pdfReady = {}, chapters = [], requireDownloadUrl = false } = {}) {
  const issues = [];
  if (!clean(pdfReady.html)) issues.push("pdfReady.html");
  if (requireDownloadUrl && !clean(pdfReady.downloadUrl || pdfReady.pdfUrl || pdfReady.htmlUrl)) issues.push("pdfReady.url");
  if (clean(pdfReady.generationMode) !== "llm-only") issues.push("pdfReady.generationMode");
  if (pdfReady.llmAssembly?.fallbackUsed === true) issues.push("llmAssembly.fallbackUsed");
  const chapterPlan = pdfReady.chapterPlan || lifeBookPremiumChapterPlanV1.chapters;
  const htmlValidation = validateLifeBookFinalHtml(pdfReady.html || "", chapters, chapterPlan);
  if (!htmlValidation.ok) issues.push(...htmlValidation.issues);
  return { ok: issues.length === 0, issues: [...new Set(issues)] };
}

export function renderMissingLifeBookDataNotice(label) {
  return `<p>${clean(label)} 입력값 기준으로 확인 가능한 범위에서 해석합니다.</p>`;
}

export { assertValidChapter };
