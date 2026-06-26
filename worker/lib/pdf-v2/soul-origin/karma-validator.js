import { asArray, clean, escapeHtml, stripTags } from "./soul-origin-premium.types.js";

const forbiddenTerms = /```|<html\b|<head\b|<body\b|prompt|schema|payload|debug|fallback|template|mock|placeholder|Lorem ipsum|샘플|예시|이 기능은|이 결과는|분석 결과는/i;
const fearTerms = /(?:반드시|무조건)\s*(?:망|실패|이혼|파산|죽|불행)|(?:죽는다|파멸한다|끝장난다|저주받|업보로\s*벌)|100\s*%/i;
const systemKeywords = Object.freeze({
  saju: /사주|명리|원국|일간|월지|오행|십성|시주|대운|세운|용신|기신|합|충/,
  vedic: /베다|죠티시|라그나|나크샤트라|다샤|라후|케투|D9|나밤사|요가|아야남샤/,
  astrology: /서양\s*점성|점성술|태양|달|상승궁|어센던트|미드헤븐|행성|하우스|어스펙트|트랜짓|역행/,
  sukuyo: /숙요|본명숙|업태|영친|안괴|성위|인연/,
  ziwei: /자미두수|명궁|신궁|궁/,
});

function escapeRegex(value = "") {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function decodeEntities(value = "") {
  return String(value || "")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

function extractClassBlock(source = "", className = "") {
  const pattern = new RegExp(`<div\\b[^>]*class=["'][^"']*${escapeRegex(className)}[^"']*["'][^>]*>([\\s\\S]*?)<\\/div>`, "i");
  return source.match(pattern)?.[1] || "";
}

function countTags(source = "", tag = "p") {
  return (String(source || "").match(new RegExp(`<${tag}\\b`, "gi")) || []).length;
}

function repeatedSentence(text = "") {
  const counts = new Map();
  const sentences = String(text || "")
    .split(/[.!?。！？\n]|다\.|요\.|니다\./)
    .map((item) => clean(item))
    .filter((item) => item.length >= 24);
  for (const sentence of sentences) {
    const count = (counts.get(sentence) || 0) + 1;
    if (count >= 3) return true;
    counts.set(sentence, count);
  }
  return false;
}

function onlyJson(source = "") {
  const text = clean(source);
  return (/^[{\[][\s\S]*[}\]]$/.test(text) && !/<section\b/i.test(text));
}

function hasSystemData(value) {
  const text = JSON.stringify(value || {});
  return text.replace(/[{}\[\]":,\s]/g, "").length > 8;
}

function systemMentioned(text = "", system = "") {
  const pattern = systemKeywords[system];
  return pattern ? pattern.test(text) : true;
}

export function validateKarmaIntegratedChapterHtml(html = "", chapter = {}, chapterData = {}) {
  const source = String(html || "").trim();
  const issues = [];
  if (!source) issues.push("html.empty");
  if (onlyJson(source)) issues.push("html.json_only");
  if (forbiddenTerms.test(source)) issues.push("html.forbidden_token");
  if (fearTerms.test(stripTags(source))) issues.push("html.fear_determinism");

  const sectionPattern = new RegExp(
    `<section\\b(?=[^>]*class=["'][^"']*karma-integrated-chapter[^"']*["'])(?=[^>]*data-chapter-id=["']${escapeRegex(chapter.id)}["'])[\\s\\S]*<\\/section>`,
    "i",
  );
  if (!sectionPattern.test(source)) issues.push("section.missing_or_id");

  const h2 = decodeEntities(stripTags(source.match(/<h2\b[^>]*>([\s\S]*?)<\/h2>/i)?.[1] || ""));
  if (!h2) issues.push("h2.missing");
  if (clean(h2) !== clean(chapter.title)) issues.push("h2.title_changed");

  const meta = extractClassBlock(source, "chapter-meta");
  const summary = extractClassBlock(source, "chapter-summary");
  const body = extractClassBlock(source, "chapter-body");
  const advice = extractClassBlock(source, "chapter-advice");
  if (!meta) issues.push("chapter-meta.missing");
  if (!summary) issues.push("chapter-summary.missing");
  if (!body) issues.push("chapter-body.missing");
  if (!advice) issues.push("chapter-advice.missing");
  if (countTags(body, "p") < 5) issues.push("chapter-body.paragraph_count");
  if (countTags(advice, "li") < 3) issues.push("chapter-advice.li_count");

  const text = stripTags(source);
  if (repeatedSentence(text)) issues.push("text.repetition");

  const systems = asArray(chapter.requiredSystems || chapterData.systems).map((item) => clean(item).toLowerCase()).filter(Boolean);
  for (const system of systems) {
    if (system === "saju" && hasSystemData(chapterData.saju) && !systemMentioned(text, "saju")) issues.push("system.saju_ignored");
    if (system === "vedic" && hasSystemData(chapterData.vedic) && !systemMentioned(text, "vedic")) issues.push("system.vedic_ignored");
    if (system === "astrology" && hasSystemData(chapterData.astrology) && !systemMentioned(text, "astrology")) issues.push("system.astrology_ignored");
    if (system === "sukuyo" && chapterData.extra?.sukuyo && !systemMentioned(text, "sukuyo")) issues.push("system.sukuyo_ignored");
    if (system === "ziwei" && chapterData.extra?.ziwei && !systemMentioned(text, "ziwei")) issues.push("system.ziwei_ignored");
  }
  if (systems.length > 1) {
    const ignored = issues.filter((issue) => /^system\.(vedic|astrology|sukuyo|ziwei)_ignored$/.test(issue));
    if (systems.includes("saju") && ignored.length === systems.filter((system) => system !== "saju").length) {
      issues.push("system.only_saju_used_for_integrated_chapter");
    }
  }
  if (!systems.some((system) => systemMentioned(text, system))) issues.push("evidence.general_only");

  return {
    ok: issues.length === 0,
    errors: issues,
    html: source,
  };
}

export function validateKarmaFinalReportHtml(fullHtml = "", { chapterPlan = {}, chapters = [] } = {}) {
  const source = String(fullHtml || "");
  const issues = [];
  if (!/<!doctype html>/i.test(source)) issues.push("html.doctype");
  if (!/<meta\s+charset=["']?utf-8["']?/i.test(source)) issues.push("html.charset");
  if (forbiddenTerms.test(stripTags(source))) issues.push("html.forbidden_token");
  for (const chapter of asArray(chapterPlan.chapters)) {
    if (!source.includes(`data-chapter-id="${chapter.id}"`)) issues.push(`chapter.${chapter.id}.missing`);
  }
  if (asArray(chapters).length !== asArray(chapterPlan.chapters).length) issues.push("chapters.count");
  if (!source.includes("본 리포트는 사주 명리학, 베다 점성술, 서양 점성술")) issues.push("disclaimer.missing");
  return { ok: issues.length === 0, issues };
}

export function validateKarmaIntegratedPdfCompletionPayload({ pdfReady = {}, chapterPlan = {}, chapters = [], requireDownloadUrl = false } = {}) {
  const issues = [];
  if (!clean(pdfReady.html)) issues.push("pdfReady.html");
  if (clean(pdfReady.renderFormat) !== "pdf-archive") issues.push("pdfReady.renderFormat");
  if (clean(pdfReady.mimeType) !== "application/pdf") issues.push("pdfReady.mimeType");
  if (clean(pdfReady.contentType) !== "application/pdf") issues.push("pdfReady.contentType");
  if (pdfReady.llmAssemblyOnly !== true) issues.push("llmAssemblyOnly");
  if (pdfReady.llmAssembly?.externalGeneration !== true) issues.push("llmAssembly.externalGeneration");
  if (pdfReady.llmAssembly?.fallbackUsed === true) issues.push("llmAssembly.fallbackUsed");
  if (requireDownloadUrl && !/\/api\/premium\/pdf-archive\/.+[?&]format=pdf(?:&|$)/i.test(clean(pdfReady.pdfUrl || pdfReady.downloadUrl))) {
    issues.push("downloadUrl.archivePdfFormat");
  }
  const htmlValidation = validateKarmaFinalReportHtml(pdfReady.html, { chapterPlan, chapters });
  if (!htmlValidation.ok) issues.push(...htmlValidation.issues.map((issue) => `html.${issue}`));
  return { ok: issues.length === 0, issues };
}

export function renderListItems(items = []) {
  return asArray(items).map((item) => `<li>${escapeHtml(item)}</li>`).join("");
}
