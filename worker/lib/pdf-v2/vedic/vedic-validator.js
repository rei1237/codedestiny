import { asArray, clean, escapeHtml, stripTags } from "./vedic-premium.types.js";
import { VEDIC_LLM_VERSION, vedicPremiumChapterPlanV2 } from "./vedic-chapters.js";

const codeFencePattern = /```|~~~|^\s*`{3}/m;
const rawJsonPattern = /^\s*[{[]|["']chapters?["']\s*:|["']html["']\s*:/i;
const internalPattern = /\b(?:schema|json|payload|debug|prompt|api|raw calculation|rawResultSummary|calculationMode|localAssembly|fallback|mock|sample|templateParagraphBuilder|renderRawJsonReport)\b/i;
const forbiddenCopyPattern = /샘플|예시|placeholder|Lorem ipsum/i;
const foreignSystemPattern = /사주|자미두수|숙요점|서양\s*점성술|타로|四柱|紫微|宿曜/i;
const mojibakePattern = /�|踰|李|怨|瑜|異|臾|洹|援|媛|醫/;
const vedicTermPattern = /베다|조티쉬|라그나|라시|그라하|바바|하우스|나크샤트라|다샤|비무쇼타리|나바암샤|라후|케투|요가|고차라|찬드라|수리야/i;

function escapeRegExp(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function findVedicChapterSection(html, chapterId) {
  const source = String(html || "").trim();
  const id = escapeRegExp(chapterId);
  const pattern = new RegExp(`<section\\b(?=[^>]*class=["'][^"']*\\bvedic-chapter\\b[^"']*["'])(?=[^>]*data-chapter-id=["']${id}["'])[^>]*>[\\s\\S]*?<\\/section>`, "i");
  const match = source.match(pattern);
  return match ? match[0] : "";
}

function readBlock(html, className) {
  const pattern = new RegExp(`<div\\b(?=[^>]*class=["'][^"']*\\b${escapeRegExp(className)}\\b[^"']*["'])[^>]*>[\\s\\S]*?<\\/div>`, "i");
  const match = String(html || "").match(pattern);
  return match ? match[0] : "";
}

function readHeading(html, tag) {
  const match = String(html || "").match(new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return clean(stripTags(match ? match[1] : ""));
}

function readParagraphs(html) {
  return (String(html || "").match(/<p\b[^>]*>[\s\S]*?<\/p>/gi) || []).map(stripTags).map((item) => clean(item)).filter(Boolean);
}

function readAdviceItems(html) {
  return (String(html || "").match(/<li\b[^>]*>[\s\S]*?<\/li>/gi) || []).map(stripTags).map((item) => clean(item)).filter(Boolean);
}

function repeatedSentenceIssue(text) {
  const counts = new Map();
  const sentences = String(text || "")
    .split(/[.!?。？！\n]+/)
    .map((item) => clean(item))
    .filter((item) => item.length >= 24);
  for (const sentence of sentences) {
    const count = (counts.get(sentence) || 0) + 1;
    if (count >= 3) return true;
    counts.set(sentence, count);
  }
  return false;
}

function koreanDominanceIssue(text) {
  const source = stripTags(text);
  if (source.replace(/\s+/g, "").length < 180) return false;
  const koreanCount = (source.match(/[가-힣]/g) || []).length;
  const latinCount = (source.match(/[A-Za-z]/g) || []).length;
  return koreanCount < 140 || latinCount > koreanCount * 0.65;
}

function containsChartGrounding(text) {
  return vedicTermPattern.test(stripTags(text));
}

export function validateVedicInput(input = {}) {
  const issues = [];
  const service = clean(input.service || input.serviceKey || "vedic");
  if (service && !/vedic/i.test(service)) issues.push("service.invalid");
  const birthDate = clean(input.birthDate || input.userProfile?.birthDate || input.birthInput?.birthDate);
  if (!birthDate) issues.push("birthDate.missing");
  const chart = input.vedicChart || input.chart || input.vedicBase?.chart || input.localVedicChartJson?.chart || {};
  const hasChart = Boolean(
    chart?.lagna
    || chart?.lagnaSign
    || chart?.ascendantSidereal
    || chart?.ascendant
    || asArray(chart?.planets).length
    || Object.keys(chart?.planets || {}).length
    || asArray(chart?.houses).length
  );
  if (!hasChart) issues.push("vedicChart.missing");
  return { ok: issues.length === 0, issues };
}

export function validateVedicChapterHtml(html, chapter, input = {}) {
  const issues = [];
  const raw = String(html || "").trim();
  if (!raw) issues.push("html.empty");
  if (/<(?:html|head|body)\b/i.test(raw)) issues.push("html.full_document");
  if (codeFencePattern.test(raw)) issues.push("html.markdown_code_fence");
  if (rawJsonPattern.test(raw)) issues.push("html.json_like");
  if (internalPattern.test(raw)) issues.push("html.internal_key");
  if (forbiddenCopyPattern.test(raw)) issues.push("html.placeholder_copy");
  if (foreignSystemPattern.test(raw)) issues.push("html.foreign_system");
  if (mojibakePattern.test(raw)) issues.push("html.mojibake");

  const section = findVedicChapterSection(raw, chapter.id);
  if (!section) issues.push("section.vedic_chapter_missing");
  if (section && (raw.match(/class=["'][^"']*\bvedic-chapter\b/gi) || []).length !== 1) issues.push("section.count");

  const h2 = readHeading(section, "h2");
  if (!h2) issues.push("h2.missing");
  if (h2 && clean(h2) !== clean(chapter.title)) issues.push("h2.title");

  const summary = readBlock(section, "chapter-summary");
  const body = readBlock(section, "chapter-body");
  const advice = readBlock(section, "chapter-advice");
  if (!summary) issues.push("chapter-summary.missing");
  if (!body) issues.push("chapter-body.missing");
  if (!advice) issues.push("chapter-advice.missing");

  const summaryParagraphs = readParagraphs(summary);
  const bodyParagraphs = readParagraphs(body);
  const adviceItems = readAdviceItems(advice);
  if (!summaryParagraphs.length) issues.push("chapter-summary.p_missing");
  if (bodyParagraphs.length < 5) issues.push("chapter-body.p_min_5");
  if (adviceItems.length < 3) issues.push("chapter-advice.li_min_3");

  const plain = stripTags(section);
  if (plain.replace(/\s+/g, "").length < Number(chapter.minLength || 900)) issues.push("body.too_short");
  if (repeatedSentenceIssue(plain)) issues.push("body.repetition");
  if (koreanDominanceIssue(plain)) issues.push("body.korean_required");
  if (!containsChartGrounding(plain)) issues.push("body.vedic_grounding_missing");
  if (!input || typeof input !== "object") issues.push("input.missing");

  return {
    ok: issues.length === 0,
    issues: Array.from(new Set(issues)),
    html: section || raw,
  };
}

export function parseVedicChapterHtml(html, chapter, input = {}) {
  const validation = validateVedicChapterHtml(html, chapter, input);
  const section = validation.html;
  const summary = readParagraphs(readBlock(section, "chapter-summary"));
  const bodyParagraphs = readParagraphs(readBlock(section, "chapter-body"));
  const adviceItems = readAdviceItems(readBlock(section, "chapter-advice"));
  return {
    id: chapter.id,
    order: Number(chapter.order),
    category: chapter.category,
    title: chapter.title,
    html: section,
    summary: summary.join(" "),
    bodyParagraphs,
    adviceItems,
    sections: [
      { heading: "핵심 요약", title: "핵심 요약", body: summary.join(" ") },
      { heading: "차트 기반 본문", title: "차트 기반 본문", body: bodyParagraphs.join(" ") },
      { heading: "베다 처방", title: "베다 처방", body: adviceItems.join(" ") },
    ],
    categories: asArray(chapter.sections).map((title, index) => ({
      id: `${chapter.id}-cat-${index + 1}`,
      title,
      body: index === 0 ? summary.join(" ") : bodyParagraphs.concat(adviceItems).join(" "),
    })),
    sectionCount: 3,
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
  const source = String(fullHtml || "");
  if (foreignSystemPattern.test(source) || mojibakePattern.test(source) || forbiddenCopyPattern.test(source)) {
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
  if ((source.match(/data-house="/g) || []).length !== 12) {
    throw Object.assign(new Error("VEDIC_PDF_RASHI_GRID_INCOMPLETE"), { code: "VEDIC_PDF_RASHI_GRID_INCOMPLETE", status: 422 });
  }
  if ((source.match(/class="bar-row"/g) || []).length !== 12 || (source.match(/class="bar-fill"/g) || []).length !== 12) {
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
  if (asArray(chapters).some((chapter) => !clean(chapter.html))) issues.push("chapter.empty");
  if (!String(fullHtml || "").includes("<!doctype html>")) issues.push("html.doctype");
  if (!String(fullHtml || "").includes(VEDIC_LLM_VERSION)) issues.push("html.version_marker");
  return { ok: issues.length === 0, issues: Array.from(new Set(issues)) };
}

export function validateVedicPdfCompletionPayload({ pdfReady = {}, chapters = [], requireDownloadUrl = false, chapterPlan = vedicPremiumChapterPlanV2 } = {}) {
  const issues = [];
  const llmAssembly = pdfReady?.llmAssembly || {};
  if (!clean(pdfReady.html)) issues.push("pdfReady.html");
  if (requireDownloadUrl && !clean(pdfReady.downloadUrl || pdfReady.pdfUrl || pdfReady.htmlUrl)) issues.push("pdfReady.url");
  if (clean(pdfReady.renderFormat) !== "pdf-archive") issues.push("pdfReady.renderFormat");
  if (clean(pdfReady.mimeType) !== "application/pdf") issues.push("pdfReady.mimeType");
  if (llmAssembly.enabled !== true) issues.push("llmAssembly.enabled");
  if (llmAssembly.externalGeneration !== true) issues.push("llmAssembly.externalGeneration");
  if (llmAssembly.fallbackUsed === true) issues.push("llmAssembly.fallbackUsed");
  if (asArray(chapters).length !== asArray(chapterPlan.chapters).length) issues.push("chapter.count");
  if (clean(pdfReady.html) && validateVedicFinalReportHtml(pdfReady.html, chapters, chapterPlan).ok !== true) issues.push("html.final");
  return { ok: issues.length === 0, issues: Array.from(new Set(issues)) };
}

export function renderMissingDataNotice(label) {
  return `<p>${escapeHtml(label)} 정보는 제공된 베다 계산 결과 안에서 확인이 제한됩니다.</p>`;
}
