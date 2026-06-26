import { clean } from "./saju-new-year-premium.types.js";

export class NewYearPdfGenerationError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = "NewYearPdfGenerationError";
    this.code = clean(options.code || "GENERATION_FAILED");
    this.status = Number(options.status || 500);
    this.stage = clean(options.stage || "generation");
    this.errors = Array.isArray(options.errors) ? options.errors : [];
    this.cause = options.cause;
  }
}

const FORBIDDEN_OUTPUT_RE = /```|<html\b|<head\b|<body\b|<\/html>|<\/head>|<\/body>|"schemaVersion"|"sections"\s*:|"chapterNo"\s*:|샘플|예시|placeholder|Lorem ipsum|프롬프트 원문|systemPrompt|userPrompt|개발자|디버그/i;
const OTHER_DIVINATION_RE = /타로|점성술|숙요|자미두수|베다|수비학|꿈\s*상징/;
const DATA_ANCHOR_RE = /사주|원국|대운|세운|월운|십성|오행|용신|기신|합|충|형|해|지장간/;

function textOnly(html = "") {
  return clean(String(html || "").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<[^>]+>/g, " "), 300000);
}

function countMatches(text = "", re) {
  return (String(text || "").match(re) || []).length;
}

function getClassBlock(html = "", className = "") {
  const re = new RegExp(`<div\\b[^>]*class=["'][^"']*${className}[^"']*["'][^>]*>([\\s\\S]*?)<\\/div>`, "i");
  return String(html || "").match(re)?.[1] || "";
}

function repeatedSentenceIssues(text = "") {
  const counts = new Map();
  for (const raw of text.split(/[.!?。！？]\s*|\n+/)) {
    const sentence = clean(raw).replace(/\s+/g, " ");
    if (sentence.length < 24) continue;
    counts.set(sentence, (counts.get(sentence) || 0) + 1);
  }
  return [...counts.entries()].filter(([, count]) => count >= 3).map(([sentence]) => sentence.slice(0, 80));
}

export function validateNewYearInput(input = {}) {
  const errors = [];
  if (clean(input.service) !== "new-year") errors.push("service");
  if (!Number.isFinite(Number(input.targetYear))) errors.push("targetYear");
  if (Number(input.targetYear) < 1900 || Number(input.targetYear) > 2100) errors.push("targetYear_range");
  if (!clean(input.birthDate)) errors.push("birthDate");
  if (!input.sajuChart || typeof input.sajuChart !== "object") errors.push("sajuChart");
  if (!input.annualLuck || typeof input.annualLuck !== "object") errors.push("annualLuck");
  if (!Array.isArray(input.monthlyLuck) || input.monthlyLuck.length < 12) errors.push("monthlyLuck");
  return { ok: errors.length === 0, errors };
}

export function validateNewYearChapterPlan(plan = {}) {
  const chapters = Array.isArray(plan.chapters) ? plan.chapters : [];
  const errors = [];
  if (!chapters.length) errors.push("chapter_plan_empty");
  if (plan.source === "default-13" && chapters.length !== 13) errors.push("default_chapter_count");
  chapters.forEach((chapter, index) => {
    if (!clean(chapter.id)) errors.push(`chapter_${index + 1}_id`);
    if (!clean(chapter.title)) errors.push(`chapter_${index + 1}_title`);
    if (!clean(chapter.category)) errors.push(`chapter_${index + 1}_category`);
  });
  return { ok: errors.length === 0, errors };
}

export function validateNewYearChapterHtml(html = "", chapter = {}, options = {}) {
  const source = clean(html, 300000);
  const targetYear = Number(options.targetYear || 0);
  const errors = [];
  if (!source) errors.push("empty_html");
  if (FORBIDDEN_OUTPUT_RE.test(source)) errors.push("forbidden_output");
  if (/^\s*[\[{]/.test(source) && /[\]}]\s*$/.test(source)) errors.push("json_only_output");
  const id = clean(chapter.id);
  const sectionRe = new RegExp(`<section\\b[^>]*class=["'][^"']*new-year-chapter[^"']*["'][^>]*data-chapter-id=["']${id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["'][^>]*>`, "i");
  if (!sectionRe.test(source)) errors.push("section_or_chapter_id");
  if (!/<h2\b[^>]*>[\s\S]*?<\/h2>/i.test(source)) errors.push("h2");
  const summary = getClassBlock(source, "chapter-summary");
  const body = getClassBlock(source, "chapter-body");
  const advice = getClassBlock(source, "chapter-advice");
  if (!summary) errors.push("chapter_summary");
  if (!body) errors.push("chapter_body");
  if (!advice) errors.push("chapter_advice");
  if (countMatches(body, /<p\b[^>]*>[\s\S]*?<\/p>/gi) < 5) errors.push("body_paragraph_count");
  if (countMatches(advice, /<li\b[^>]*>[\s\S]*?<\/li>/gi) < 3) errors.push("advice_li_count");
  const plain = textOnly(source);
  if (!DATA_ANCHOR_RE.test(plain)) errors.push("saju_data_anchor_missing");
  if (OTHER_DIVINATION_RE.test(plain)) errors.push("other_divination_mixed");
  if (targetYear) {
    const otherYears = [...plain.matchAll(/\b(19\d{2}|20\d{2}|21\d{2})년/g)]
      .map((match) => Number(match[1]))
      .filter((year) => year !== targetYear);
    if (otherYears.length) errors.push("target_year_mismatch");
  }
  const repeats = repeatedSentenceIssues(plain);
  if (repeats.length) errors.push("sentence_repetition");
  return { ok: errors.length === 0, errors };
}

export function validateFinalNewYearPdfPayload({ html = "", chapters = [], chapterPlan = [], targetYear, requireDownloadUrl = false, downloadUrl = "" } = {}) {
  const errors = [];
  const plan = Array.isArray(chapterPlan) ? chapterPlan : [];
  const list = Array.isArray(chapters) ? chapters : [];
  if (!String(html || "").includes("<!DOCTYPE html>")) errors.push("html_shell_missing");
  if (requireDownloadUrl && !clean(downloadUrl)) errors.push("download_url_missing");
  if (plan.length && list.length !== plan.length) errors.push("chapter_count_mismatch");
  list.forEach((chapter, index) => {
    const spec = plan[index] || chapter;
    const validation = validateNewYearChapterHtml(chapter.html || "", spec, { targetYear });
    if (!validation.ok) errors.push(`chapter_${index + 1}:${validation.errors.join("|")}`);
  });
  const plain = textOnly(html);
  if (FORBIDDEN_OUTPUT_RE.test(plain)) errors.push("forbidden_terms_detected");
  if (/[\uFFFD]|\[object Object\]|\bundefined\b|\bnull\b|\bNaN\b/i.test(plain)) errors.push("broken_text_detected");
  return { ok: errors.length === 0, errors, chapterCount: list.length, expectedChapterCount: plan.length, htmlLength: String(html || "").length };
}
