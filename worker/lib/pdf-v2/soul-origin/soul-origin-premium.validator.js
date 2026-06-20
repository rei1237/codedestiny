import { asArray, clean, cleanMultiline, escapeHtml, stripTags } from "./soul-origin-premium.types.js";
import { soulOriginChapterPlanV1 } from "./soul-origin-premium.chapter-plan.js";

const evidenceSystems = new Set(["saju", "ziwei", "astrology", "vedic", "sukuyo", "timing"]);
const internalTerms = [
  "undefined",
  "null",
  "NaN",
  "[object Object]",
  "schema",
  "payload",
  "debug",
  "prompt",
  "api",
  "raw",
  "fallback",
  "template",
  "mock",
  "localAssembly",
  "local-master",
  "SOUL_ORIGIN_LOCAL",
];
const internalPattern = new RegExp(internalTerms.map((term) => term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|"), "i");
const placeholderPattern = /\b(?:TODO|TBD|N\/A|placeholder|sample|example|lorem)\b|예시\s*문장|샘플\s*문장/i;
const fearPattern = /(?:반드시|무조건)\s*(?:망|실패|이혼|파산|죽|불행)|(?:죽는다|파멸한다|끝장난다)|100\s*%/i;

function extractJsonText(value = "") {
  const source = String(value || "").trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```$/i, "")
    .trim();
  const first = source.indexOf("{");
  const last = source.lastIndexOf("}");
  if (first < 0 || last <= first) return source;
  return source.slice(first, last + 1);
}

function normalizeText(value, limit = 0) {
  return cleanMultiline(value, limit);
}

function sentenceList(value = "") {
  return String(value || "")
    .split(/[.!?。！？\n]+/)
    .map((item) => clean(item))
    .filter((item) => item.length >= 24);
}

function hasRepeatedSentence(text = "") {
  const counts = new Map();
  for (const sentence of sentenceList(text)) {
    const count = (counts.get(sentence) || 0) + 1;
    if (count >= 3) return true;
    counts.set(sentence, count);
  }
  return false;
}

function hasBadText(value = "") {
  const text = String(value || "");
  return internalPattern.test(text) || placeholderPattern.test(text) || fearPattern.test(text);
}

function normalizeSection(section = {}) {
  return {
    title: normalizeText(section?.title, 120),
    body: normalizeText(section?.body, 2400),
  };
}

function normalizeEvidencePoint(point = {}) {
  return {
    system: normalizeText(point?.system, 40).toLowerCase(),
    signal: normalizeText(point?.signal, 180),
    reading: normalizeText(point?.reading, 520),
  };
}

function normalizeChapter(chapter = {}, plan = {}) {
  const sections = asArray(chapter.sections).map(normalizeSection).filter((section) => section.title || section.body);
  return {
    chapterNumber: Number(chapter.chapterNumber || plan.chapterNumber || 0),
    title: normalizeText(chapter.title || plan.title, 160),
    subtitle: normalizeText(chapter.subtitle, 220),
    summary: normalizeText(chapter.summary, 1000),
    evidencePoints: asArray(chapter.evidencePoints).map(normalizeEvidencePoint).filter((point) => point.system || point.signal || point.reading).slice(0, 8),
    sections,
    practicalAdvice: asArray(chapter.practicalAdvice).map((item) => normalizeText(item, 260)).filter(Boolean).slice(0, 8),
    cautionPoints: asArray(chapter.cautionPoints).map((item) => normalizeText(item, 260)).filter(Boolean).slice(0, 8),
  };
}

function sectionMatchesRequired(section = {}, required = "") {
  const title = clean(section.title);
  const body = clean(section.body);
  const target = clean(required);
  return title.includes(target) || body.includes(target);
}

export function parseSoulOriginLlmJson(text = "") {
  const jsonText = extractJsonText(text);
  try {
    return JSON.parse(jsonText);
  } catch (error) {
    throw Object.assign(new Error("INVALID_LLM_RESPONSE"), {
      code: "INVALID_LLM_RESPONSE",
      status: 502,
      details: clean(error?.message || error, 300),
    });
  }
}

export function normalizeSoulOriginPdfResult(raw = {}) {
  const chapters = soulOriginChapterPlanV1.chapters.map((plan, index) => {
    const source = asArray(raw?.chapters).find((chapter) => Number(chapter?.chapterNumber) === index + 1)
      || asArray(raw?.chapters)[index]
      || {};
    return normalizeChapter(source, plan);
  });
  return {
    reportTitle: normalizeText(raw.reportTitle, 160),
    openingSummary: normalizeText(raw.openingSummary, 1800),
    chapters,
    finalMessage: normalizeText(raw.finalMessage, 1600),
    disclaimer: normalizeText(raw.disclaimer, 900),
  };
}

export function validateSoulOriginPdfResult(raw = {}) {
  const result = normalizeSoulOriginPdfResult(raw);
  const issues = [];
  if (!result.reportTitle) issues.push("reportTitle.missing");
  if (result.openingSummary.replace(/\s+/g, "").length < 160) issues.push("openingSummary.too_short");
  if (result.chapters.length !== soulOriginChapterPlanV1.chapters.length) issues.push("chapters.count");
  result.chapters.forEach((chapter, index) => {
    const plan = soulOriginChapterPlanV1.chapters[index];
    const prefix = `chapter.${String(index + 1).padStart(2, "0")}`;
    if (chapter.chapterNumber !== index + 1) issues.push(`${prefix}.number`);
    if (clean(chapter.title) !== clean(plan.title)) issues.push(`${prefix}.title`);
    if (!chapter.subtitle) issues.push(`${prefix}.subtitle`);
    if (chapter.summary.replace(/\s+/g, "").length < 120) issues.push(`${prefix}.summary.too_short`);
    if (chapter.sections.length < 4) issues.push(`${prefix}.sections.count`);
    const bodyText = [
      chapter.subtitle,
      chapter.summary,
      ...chapter.evidencePoints.flatMap((point) => [point.system, point.signal, point.reading]),
      ...chapter.sections.flatMap((section) => [section.title, section.body]),
      ...chapter.practicalAdvice,
      ...chapter.cautionPoints,
    ].join("\n");
    if (bodyText.replace(/\s+/g, "").length < 1100) issues.push(`${prefix}.body.too_short`);
    if (hasBadText(bodyText)) issues.push(`${prefix}.body.bad_text`);
    if (hasRepeatedSentence(bodyText)) issues.push(`${prefix}.body.repetition`);
    asArray(plan.requiredSections).forEach((required, requiredIndex) => {
      const orderedSection = chapter.sections[requiredIndex];
      if (!sectionMatchesRequired(orderedSection, required)) issues.push(`${prefix}.required_order.${required}`);
      const found = chapter.sections.some((section) => sectionMatchesRequired(section, required));
      if (!found) issues.push(`${prefix}.required.${required}`);
    });
    chapter.sections.forEach((section, sectionIndex) => {
      if (!section.title) issues.push(`${prefix}.section.${sectionIndex + 1}.title`);
      if (section.body.replace(/\s+/g, "").length < 120) issues.push(`${prefix}.section.${sectionIndex + 1}.body.too_short`);
      if (hasBadText(`${section.title}\n${section.body}`)) issues.push(`${prefix}.section.${sectionIndex + 1}.bad_text`);
    });
    if (chapter.evidencePoints.length < 3) issues.push(`${prefix}.evidence.count`);
    const systems = new Set(chapter.evidencePoints.map((point) => point.system).filter(Boolean));
    if (systems.size < 2) issues.push(`${prefix}.evidence.system_variety`);
    chapter.evidencePoints.forEach((point, pointIndex) => {
      if (!evidenceSystems.has(point.system)) issues.push(`${prefix}.evidence.${pointIndex + 1}.system`);
      if (point.signal.replace(/\s+/g, "").length < 8) issues.push(`${prefix}.evidence.${pointIndex + 1}.signal`);
      if (point.reading.replace(/\s+/g, "").length < 50) issues.push(`${prefix}.evidence.${pointIndex + 1}.reading`);
      if (hasBadText(`${point.system}\n${point.signal}\n${point.reading}`)) issues.push(`${prefix}.evidence.${pointIndex + 1}.bad_text`);
    });
    if (chapter.practicalAdvice.length < 3) issues.push(`${prefix}.advice.count`);
    if (chapter.cautionPoints.length < 2) issues.push(`${prefix}.caution.count`);
  });
  const tailText = `${result.openingSummary}\n${result.finalMessage}\n${result.disclaimer}`;
  if (result.finalMessage.replace(/\s+/g, "").length < 140) issues.push("finalMessage.too_short");
  if (result.disclaimer.replace(/\s+/g, "").length < 80) issues.push("disclaimer.too_short");
  if (hasBadText(tailText)) issues.push("tail.bad_text");
  if (hasRepeatedSentence(tailText)) issues.push("tail.repetition");
  return {
    ok: issues.length === 0,
    issues,
    result,
    qualityReport: {
      status: issues.length === 0 ? "passed" : "failed",
      score: Math.max(0, 100 - issues.length * 4),
      issues,
      schema: "DestinyKarmaPdfResult",
      chapterAccuracy: {
        expectedChapterCount: soulOriginChapterPlanV1.chapters.length,
        actualChapterCount: result.chapters.length,
        requiredEvidencePerChapter: 3,
        requiredSectionOrder: true,
      },
    },
  };
}

export function validateSoulOriginFinalReportHtml(fullHtml, result = {}) {
  const issues = [];
  const source = String(fullHtml || "");
  if (!/<!doctype html>/i.test(source)) issues.push("html.doctype");
  if (!/<meta\s+charset=["']?utf-8["']?/i.test(source)) issues.push("html.charset");
  if (internalPattern.test(stripTags(source))) issues.push("html.internal_term");
  if (placeholderPattern.test(stripTags(source))) issues.push("html.placeholder");
  for (const plan of soulOriginChapterPlanV1.chapters) {
    const marker = `data-chapter-number="${plan.chapterNumber}"`;
    if (!source.includes(marker)) issues.push(`html.chapter.${plan.chapterNumber}`);
  }
  if (!source.includes('data-visual="signal-table"')) issues.push("html.signal_table");
  if (!source.includes('data-visual="element-graph"')) issues.push("html.element_graph");
  if (!source.includes('data-visual="chapter-evidence"')) issues.push("html.chapter_evidence");
  const resultValidation = validateSoulOriginPdfResult(result);
  if (!resultValidation.ok) issues.push(...resultValidation.issues.map((issue) => `result.${issue}`));
  return { ok: issues.length === 0, issues };
}

export function validateSoulOriginPdfCompletionPayload({ pdfReady = {}, result = {}, requireDownloadUrl = false } = {}) {
  const issues = [];
  const html = clean(pdfReady?.html);
  if (!html) issues.push("pdfReady.html");
  if (clean(pdfReady?.renderFormat) !== "pdf-archive") issues.push("pdfReady.renderFormat");
  if (clean(pdfReady?.mimeType) !== "application/pdf") issues.push("pdfReady.mimeType");
  if (clean(pdfReady?.contentType) !== "application/pdf") issues.push("pdfReady.contentType");
  if (pdfReady?.llmAssemblyOnly !== true) issues.push("llmAssemblyOnly");
  if (pdfReady?.llmAssembly?.externalGeneration !== true) issues.push("llmAssembly.externalGeneration");
  if (pdfReady?.llmAssembly?.fallbackUsed === true) issues.push("llmAssembly.fallbackUsed");
  const pdfUrl = clean(pdfReady?.pdfUrl || pdfReady?.downloadUrl);
  const htmlUrl = clean(pdfReady?.htmlUrl);
  const downloadUrl = clean(pdfReady?.downloadUrl || pdfReady?.pdfUrl || pdfReady?.htmlUrl);
  if (requireDownloadUrl && !downloadUrl) issues.push("downloadUrl.missing");
  if (requireDownloadUrl && !/\/api\/premium\/pdf-archive\/.+[?&]format=pdf(?:&|$)/i.test(pdfUrl)) issues.push("downloadUrl.archivePdfFormat");
  if (requireDownloadUrl && !/\/api\/premium\/pdf-archive\/.+[?&]format=html(?:&|$)/i.test(htmlUrl)) issues.push("htmlUrl.archiveHtmlFormat");
  const htmlValidation = html ? validateSoulOriginFinalReportHtml(html, result) : { ok: false, issues: ["html.missing"] };
  if (!htmlValidation.ok) issues.push(...htmlValidation.issues.map((issue) => `html.${issue}`));
  return { ok: issues.length === 0, issues };
}

export function renderSoulOriginList(items = []) {
  return asArray(items).map((item) => `<li>${escapeHtml(item)}</li>`).join("");
}
