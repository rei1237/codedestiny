import { clean, hashStable } from "./saju-new-year-premium.types.js";

export const NEW_YEAR_LLM_VERSION = "2026-06-new-year-llm-v1";

function hasHangul(value = "") {
  return /[가-힣]/.test(String(value || ""));
}

function looksBrokenText(value = "") {
  const text = clean(value, 1000);
  if (!text) return true;
  if (text.includes("\uFFFD") || /\?{2,}/.test(text)) return true;
  return !hasHangul(text);
}

function normalizeExistingChapter(item = {}, index = 0, targetYear) {
  const no = Number(item.no || item.order || index + 1);
  const categories = Array.isArray(item.categories)
    ? item.categories.map((category) => clean(category)).filter((category) => category && !looksBrokenText(category))
    : [];
  const id = clean(item.id || item.chapterId || `newyear-${String(no).padStart(2, "0")}`);
  const title = clean(item.title).replace(/\{YEAR\}/g, String(targetYear));
  const category = clean(item.category || item.domain || categories[0] || title);
  const purpose = clean(item.purpose || item.description || item.focus || item.summary || categories.join(" / "));
  if (!id || !title || !category || looksBrokenText(title) || looksBrokenText(category)) return null;
  return {
    id,
    no,
    category,
    title,
    purpose: purpose && !looksBrokenText(purpose) ? purpose : `${category}의 흐름을 세운과 월운에 맞추어 해석한다.`,
    categories,
  };
}

export function normalizeChapterPlan(sourceChapters = [], options = {}) {
  const targetYear = Number(options.targetYear || 0);
  const sourceList = Array.isArray(sourceChapters) ? sourceChapters : [];
  const existing = Array.isArray(sourceChapters)
    ? sourceChapters.map((item, index) => normalizeExistingChapter(item, index, targetYear)).filter(Boolean)
    : [];
  const existingUsable = sourceList.length > 0
    && existing.length === sourceList.length
    && existing.every((chapter) => chapter.id && chapter.title && chapter.category);
  const chapters = existingUsable ? existing : [];
  return {
    source: existingUsable ? "existing-config" : "missing-config",
    chapterConfigVersion: existingUsable
      ? `existing:${hashStable(chapters.map(({ id, title, category, purpose, categories }) => ({ id, title, category, purpose, categories })))}`
      : "missing-config",
    chapters,
    expectedChapterCount: chapters.length,
  };
}

export function toLegacyChapterSpec(chapter) {
  return {
    no: Number(chapter.no || 0),
    id: clean(chapter.id),
    category: clean(chapter.category),
    title: clean(chapter.title),
    focus: clean(chapter.purpose),
    purpose: clean(chapter.purpose),
    categories: (Array.isArray(chapter.categories) ? chapter.categories : [])
      .map((category) => clean(category))
      .filter(Boolean)
      .concat(Array.isArray(chapter.categories) && chapter.categories.length ? [] : [clean(chapter.purpose)].filter(Boolean)),
  };
}
