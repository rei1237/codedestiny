import { asArray, clean, stripTags } from "./astrology-premium.types.js";
import { astrologyPremiumChapterPlanV2 } from "./astrology-premium.chapter-plan.js";

const forbiddenTerms = [
  "숙요",
  "안괴",
  "영친",
  "자미두수",
  "명궁",
  "신궁",
  "사화",
  "십성",
  "용신",
  "격국",
  "라그나",
  "나바암샤",
  "다샤",
  "undefined",
  "null",
  "NaN",
  "[object Object]",
  "cũ",
  "huy",
  "satisfaction",
];

const forbiddenPattern = new RegExp(forbiddenTerms.map((term) => term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|"), "i");
const internalPattern = /\b(?:schema|json|payload|debug|prompt|api|raw calculation|rawResultSummary|calculationMode|localAssembly|fallback|templateParagraphBuilder|renderRawJsonReport|appendGenericAdviceSections)\b/i;
const codeFencePattern = /```|~~~|^\s*`{3}/m;
const astrologyTerms = [
  "점성술",
  "출생 차트",
  "태양",
  "달",
  "상승궁",
  "수성",
  "금성",
  "화성",
  "목성",
  "토성",
  "천왕성",
  "해왕성",
  "명왕성",
  "하우스",
  "애스펙트",
  "트라인",
  "스퀘어",
  "오포지션",
  "컨정션",
  "섹스타일",
  "원소",
  "모달리티",
  "트랜짓",
  "프로그레션",
  "솔라리턴",
  "MC",
  "IC",
  "디센던트",
];

const allowedLatinTokens = new Set(["mc", "ic", "asc", "pdf", "html"]);

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
  const sentences = String(text || "")
    .split(/[.!?。！？\n]+/)
    .map((item) => clean(item))
    .filter((item) => item.length >= 22);
  for (const sentence of sentences) {
    const count = (counts.get(sentence) || 0) + 1;
    if (count >= 3) return true;
    counts.set(sentence, count);
  }
  return false;
}

function headingTexts(html, tag = "h2") {
  return Array.from(String(html || "").matchAll(new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`, "gi")))
    .map((match) => clean(stripTags(match[1])))
    .filter(Boolean);
}

function astrologyTermCount(text) {
  const source = String(text || "");
  return astrologyTerms.reduce((count, term) => count + (source.includes(term) ? 1 : 0), 0);
}

function requiredTermCount(text, terms = []) {
  const source = String(text || "");
  return asArray(terms).reduce((count, term) => count + (clean(term) && source.includes(clean(term)) ? 1 : 0), 0);
}

function unexpectedForeignTokens(text) {
  return Array.from(String(text || "").matchAll(/\b[A-Za-z][A-Za-z0-9_-]{2,}\b/g))
    .map((match) => clean(match[0]).toLowerCase())
    .filter((token) => token && !allowedLatinTokens.has(token));
}

function paragraphText(html) {
  return (String(html || "").match(/<p\b[^>]*>[\s\S]*?<\/p>/gi) || [])
    .map(stripTags)
    .join(" ");
}

export function validateAstrologyPremiumChapterHtml(html, chapter) {
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

  const plannedHeadings = asArray(chapter.sections);
  const seenPlan = new Set();
  for (const heading of plannedHeadings) {
    const count = countHeading(article, heading);
    if (count !== 1) issues.push(`h2.${heading}.${count || "missing"}`);
    if (seenPlan.has(heading)) issues.push(`h2.duplicate_plan.${heading}`);
    seenPlan.add(heading);
    const section = sectionBlockForHeading(article, heading);
    if (!section) {
      issues.push(`section.missing.${heading}`);
      continue;
    }
    const paragraphs = section.match(/<p\b[^>]*>[\s\S]*?<\/p>/gi) || [];
    if (!paragraphs.length) issues.push(`section.p_missing.${heading}`);
    if (paragraphs.map(stripTags).join(" ").length < 180) issues.push(`section.too_short.${heading}`);
  }

  const actualHeadings = headingTexts(article, "h2");
  if (new Set(actualHeadings).size !== actualHeadings.length) issues.push("h2.duplicate_output");

  const plain = stripTags(article);
  const bodyText = paragraphText(article);
  if (plain.replace(/\s+/g, "").length < Number(chapter.minLength || 0)) issues.push("body.minLength");
  if (astrologyTermCount(bodyText) < 3) issues.push("body.astrology_terms");
  if (asArray(chapter.groundingTerms).length && requiredTermCount(bodyText, chapter.groundingTerms) < 2) {
    issues.push("body.chapter_grounding_terms");
  }
  if (unexpectedForeignTokens(bodyText).length) issues.push("body.foreign_tokens");
  if (repeatedSentenceIssue(plain)) issues.push("body.repetition");
  if (!/<\/article>\s*$/i.test(article)) issues.push("html.article_not_closed");

  return { ok: issues.length === 0, issues, html: article || raw };
}

export function parseAstrologyPremiumChapterHtml(html, chapter) {
  const validation = validateAstrologyPremiumChapterHtml(html, chapter);
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

export function assertAllConfiguredChaptersIncluded(fullHtml, chapters = astrologyPremiumChapterPlanV2.chapters) {
  const source = String(fullHtml || "");
  for (const chapter of chapters) {
    const count = (source.match(new RegExp(`data-chapter-id=["']${escapeRegExp(chapter.id)}["']`, "g")) || []).length;
    if (count !== 1) {
      throw Object.assign(new Error(`ASTROLOGY_CHAPTER_RENDER_COUNT:${chapter.id}:${count}`), {
        code: "ASTROLOGY_CHAPTER_RENDER_COUNT",
        status: 422,
        chapterId: chapter.id,
      });
    }
  }
  return true;
}

export function assertEachChapterRenderedOnce(fullHtml, chapters = astrologyPremiumChapterPlanV2.chapters) {
  return assertAllConfiguredChaptersIncluded(fullHtml, chapters);
}

export function assertNoRepeatedHeadings(fullHtml) {
  const headings = headingTexts(fullHtml, "h1").concat(headingTexts(fullHtml, "h2"));
  const seen = new Set();
  for (const heading of headings) {
    const key = heading.toLowerCase();
    if (seen.has(key)) {
      throw Object.assign(new Error("ASTROLOGY_PDF_REPEATED_HEADING"), { code: "ASTROLOGY_PDF_REPEATED_HEADING", status: 422 });
    }
    seen.add(key);
  }
  return true;
}

export function assertNoRawJsonLeak(fullHtml) {
  const source = String(fullHtml || "");
  if (/^\s*[{[]/.test(stripTags(source)) || /"rawResultSummary"\s*:|```|schema|payload|debug|prompt/i.test(source)) {
    throw Object.assign(new Error("ASTROLOGY_PDF_RAW_JSON_LEAK"), { code: "ASTROLOGY_PDF_RAW_JSON_LEAK", status: 422 });
  }
  return true;
}

export function assertNoUndefinedValues(fullHtml) {
  if (/\b(?:undefined|null|NaN)\b|\[object Object\]/i.test(String(fullHtml || ""))) {
    throw Object.assign(new Error("ASTROLOGY_PDF_UNDEFINED_VALUE_LEAK"), { code: "ASTROLOGY_PDF_UNDEFINED_VALUE_LEAK", status: 422 });
  }
  return true;
}

export function assertNoForeignSystemTermsLeaked(fullHtml) {
  if (forbiddenPattern.test(String(fullHtml || ""))) {
    throw Object.assign(new Error("ASTROLOGY_PDF_FOREIGN_SYSTEM_TERM"), { code: "ASTROLOGY_PDF_FOREIGN_SYSTEM_TERM", status: 422 });
  }
  return true;
}

export function assertNoUnexpectedForeignTokens(fullHtml) {
  const text = stripTags(fullHtml);
  const tokens = unexpectedForeignTokens(text);
  if (tokens.length) {
    throw Object.assign(new Error("ASTROLOGY_PDF_FOREIGN_TOKEN"), {
      code: "ASTROLOGY_PDF_FOREIGN_TOKEN",
      status: 422,
      tokens: tokens.slice(0, 8),
    });
  }
  return true;
}

export function assertAstrologyVisualBlocksIncluded(fullHtml) {
  const source = String(fullHtml || "");
  const required = [
    "astro-visual-section",
    "astro-planet-table",
    "astro-house-table",
    "astro-aspect-table",
    "astro-balance-bars",
    "astro-transit-timeline",
  ];
  for (const marker of required) {
    if (!source.includes(marker)) {
      throw Object.assign(new Error(`ASTROLOGY_PDF_VISUAL_BLOCK_MISSING:${marker}`), {
        code: "ASTROLOGY_PDF_VISUAL_BLOCK_MISSING",
        status: 422,
        marker,
      });
    }
  }
  return true;
}

export function validateAstrologyFinalReportHtml(fullHtml, chapters = [], plan = astrologyPremiumChapterPlanV2) {
  const issues = [];
  try { assertAllConfiguredChaptersIncluded(fullHtml, plan.chapters); } catch (error) { issues.push(error.code || "chapter.include"); }
  try { assertNoRepeatedHeadings(fullHtml); } catch (error) { issues.push(error.code || "heading.repeat"); }
  try { assertNoRawJsonLeak(fullHtml); } catch (error) { issues.push(error.code || "raw_json"); }
  try { assertNoUndefinedValues(fullHtml); } catch (error) { issues.push(error.code || "undefined"); }
  try { assertNoForeignSystemTermsLeaked(fullHtml); } catch (error) { issues.push(error.code || "foreign_terms"); }
  try { assertNoUnexpectedForeignTokens(fullHtml); } catch (error) { issues.push(error.code || "foreign_tokens"); }
  try { assertAstrologyVisualBlocksIncluded(fullHtml); } catch (error) { issues.push(error.code || "visual"); }
  if (asArray(chapters).length !== asArray(plan.chapters).length) issues.push("chapter.count");
  if (!String(fullHtml || "").includes("<!doctype html>")) issues.push("html.doctype");
  return { ok: issues.length === 0, issues };
}

export function validateAstrologyPdfCompletionPayload({ pdfReady = {}, chapters = [], requireDownloadUrl = false } = {}) {
  const issues = [];
  const llmAssembly = pdfReady?.llmAssembly || {};
  if (!clean(pdfReady.html)) issues.push("pdfReady.html");
  if (requireDownloadUrl && !clean(pdfReady.downloadUrl || pdfReady.pdfUrl || pdfReady.htmlUrl)) issues.push("pdfReady.url");
  if (clean(pdfReady.renderFormat) !== "pdf-archive") issues.push("pdfReady.renderFormat");
  if (clean(pdfReady.mimeType) !== "application/pdf") issues.push("pdfReady.mimeType");
  if (llmAssembly.enabled !== true) issues.push("llmAssembly.enabled");
  if (llmAssembly.externalGeneration !== true) issues.push("llmAssembly.externalGeneration");
  if (llmAssembly.fallbackUsed === true) issues.push("llmAssembly.fallbackUsed");
  if (asArray(chapters).length !== astrologyPremiumChapterPlanV2.chapters.length) issues.push("chapter.count");
  if (clean(pdfReady.html) && validateAstrologyFinalReportHtml(pdfReady.html, chapters).ok !== true) issues.push("html.final");
  return { ok: issues.length === 0, issues };
}
