import { asArray, clean, stripTags } from "./life-book-premium.types.js";

const forbiddenPatterns = [
  /```|~~~/,
  /\b(?:JSON|schema|payload|prompt|debug|mock|fallback|template)\b/i,
  /샘플|예시|placeholder|Lorem ipsum/i,
  /\b(?:undefined|null|NaN)\b|\[object Object\]/i,
  /\uFFFD|\?{3,}/,
];

const nonLifeBookDomainPattern = /궁합|타로|자미두수|명반|주성|12궁|베다|숙요/i;
const sajuGroundingPattern = /사주|팔자|원국|일간|월령|오행|십성|대운|세운|용신|지장간|합충|형충|시주|재성|관성|인성|식상|비겁/;

function escapeRegExp(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeText(value) {
  return clean(stripTags(value)).replace(/\s+/g, " ").trim();
}

function getClassBlock(html = "", className = "") {
  const pattern = new RegExp(`<div\\b(?=[^>]*class=["'][^"']*\\b${escapeRegExp(className)}\\b[^"']*["'])[^>]*>[\\s\\S]*?<\\/div>`, "i");
  const match = String(html || "").match(pattern);
  return match ? match[0] : "";
}

function readTagText(html = "", tag = "h2") {
  const match = String(html || "").match(new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return normalizeText(match ? match[1] : "");
}

function readParagraphs(html = "") {
  return [...String(html || "").matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)]
    .map((match) => normalizeText(match[1]))
    .filter(Boolean);
}

function readListItems(html = "") {
  return [...String(html || "").matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi)]
    .map((match) => normalizeText(match[1]))
    .filter(Boolean);
}

function hasRepeatedParagraph(paragraphs = []) {
  const seen = new Map();
  for (const paragraph of paragraphs) {
    const key = paragraph.replace(/\s+/g, "").slice(0, 240);
    if (key.length < 60) continue;
    const count = (seen.get(key) || 0) + 1;
    if (count >= 2) return true;
    seen.set(key, count);
  }
  return false;
}

function findChapterSection(raw = "", chapterId = "") {
  const id = escapeRegExp(chapterId);
  const pattern = new RegExp(`<section\\b(?=[^>]*class=["'][^"']*\\blife-book-chapter\\b[^"']*["'])(?=[^>]*data-chapter-id=["']${id}["'])[^>]*>[\\s\\S]*<\\/section>`, "i");
  const match = String(raw || "").trim().match(pattern);
  return match ? match[0] : "";
}

export function validateChapterHtml(html = "", chapter = {}) {
  const issues = [];
  const raw = String(html || "").trim();
  const chapterId = clean(chapter.id);

  if (!raw) issues.push("html.empty");
  if (/^\s*[{[]/.test(raw) || /"chapters?"\s*:/.test(raw)) issues.push("html.json_only");
  if (/<(?:html|head|body)\b/i.test(raw)) issues.push("html.full_document");
  forbiddenPatterns.forEach((pattern) => {
    if (pattern.test(raw)) issues.push("html.forbidden_term");
  });
  if (nonLifeBookDomainPattern.test(raw)) issues.push("html.non_lifebook_domain");

  const chapterMatches = raw.match(/class=["'][^"']*\blife-book-chapter\b[^"']*["']/gi) || [];
  if (chapterMatches.length !== 1) issues.push(`chapter.count.${chapterMatches.length}`);

  const section = findChapterSection(raw, chapterId);
  if (!section) issues.push("section.life_book_chapter_missing");
  if (section && !new RegExp(`data-chapter-id=["']${escapeRegExp(chapterId)}["']`, "i").test(section)) issues.push("chapter.id_mismatch");

  const h2 = readTagText(section, "h2");
  if (!h2) issues.push("h2.missing");
  if (h2 && clean(chapter.title) && h2 !== clean(chapter.title)) issues.push("h2.title_mismatch");

  const summary = getClassBlock(section, "chapter-summary");
  const body = getClassBlock(section, "chapter-body");
  const advice = getClassBlock(section, "chapter-advice");
  if (!summary) issues.push("chapter_summary.missing");
  if (!body) issues.push("chapter_body.missing");
  if (!advice) issues.push("chapter_advice.missing");

  const bodyParagraphs = readParagraphs(body);
  const allParagraphs = readParagraphs(section);
  const adviceItems = readListItems(advice);
  if (bodyParagraphs.length < 5) issues.push(`chapter_body.paragraph_count.${bodyParagraphs.length}`);
  if (adviceItems.length < 3) issues.push(`chapter_advice.li_count.${adviceItems.length}`);
  if (hasRepeatedParagraph(allParagraphs)) issues.push("body.repetition");

  const plain = normalizeText(section);
  if (plain.replace(/\s+/g, "").length < Number(chapter.minLength || 900)) issues.push("body.too_short");
  if (!sajuGroundingPattern.test(plain)) issues.push("body.saju_grounding_missing");
  if (!/(현실|자료|전문가|판단)/.test(plain)) issues.push("body.real_world_decision_notice_missing");

  return {
    ok: issues.length === 0,
    issues: [...new Set(issues)],
    html: section || raw,
    paragraphs: allParagraphs,
    bodyParagraphs,
    adviceItems,
  };
}

export function assertValidChapter(html = "", chapter = {}) {
  const validation = validateChapterHtml(html, chapter);
  if (!validation.ok) {
    throw Object.assign(new Error(`LIFE_BOOK_CHAPTER_HTML_INVALID:${clean(chapter.id)}`), {
      code: "LIFE_BOOK_CHAPTER_HTML_INVALID",
      status: 422,
      chapterId: clean(chapter.id),
      issues: validation.issues,
    });
  }
  return validation;
}

export function parseLifeBookChapterHtml(html = "", chapter = {}) {
  const validation = assertValidChapter(html, chapter);
  const section = validation.html;
  const summary = getClassBlock(section, "chapter-summary");
  const body = getClassBlock(section, "chapter-body");
  const advice = getClassBlock(section, "chapter-advice");
  const summaryText = readParagraphs(summary).join("\n\n");
  const bodyParagraphs = readParagraphs(body);
  const adviceItems = readListItems(advice);
  const text = [
    `## ${clean(chapter.title)}`,
    summaryText,
    bodyParagraphs.join("\n\n"),
    "### 인생 처방",
    adviceItems.map((item) => `- ${item}`).join("\n"),
  ].filter(Boolean).join("\n\n");

  const categories = [
    { id: `${chapter.id}-summary`, title: "핵심 요약", finalText: summaryText, body: summaryText },
    { id: `${chapter.id}-body`, title: "본문", finalText: bodyParagraphs.join("\n\n"), body: bodyParagraphs.join("\n\n") },
    { id: `${chapter.id}-advice`, title: "인생 처방", finalText: adviceItems.join("\n"), body: adviceItems.join("\n") },
  ];

  return {
    id: clean(chapter.id),
    order: Number(chapter.order || 0),
    category: clean(chapter.category),
    title: clean(chapter.title),
    purpose: clean(chapter.purpose || chapter.description),
    html: section,
    summary: summaryText,
    body: bodyParagraphs.join("\n\n"),
    advice: adviceItems,
    text,
    categories,
    sections: categories.map((item, index) => ({
      sectionId: item.id,
      sectionOrder: index + 1,
      title: item.title,
      body: item.body,
      chapterId: clean(chapter.id),
    })),
    sectionCount: 3,
    validation,
  };
}

export function validateLifeBookFinalHtml(fullHtml = "", chapters = [], chapterPlan = []) {
  const issues = [];
  const html = String(fullHtml || "");
  const contentOnly = html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ");
  if (!/^<!doctype html>/i.test(html.trim())) issues.push("html.doctype");
  if (!/<meta charset="utf-8"/i.test(html)) issues.push("html.charset");
  if ((html.match(/class=["'][^"']*\blife-book-chapter\b[^"']*["']/gi) || []).length !== asArray(chapterPlan).length) {
    issues.push("chapter.count");
  }
  asArray(chapterPlan).forEach((chapter) => {
    const count = (html.match(new RegExp(`data-chapter-id=["']${escapeRegExp(chapter.id)}["']`, "g")) || []).length;
    if (count !== 1) issues.push(`chapter.render_count.${chapter.id}.${count}`);
  });
  forbiddenPatterns.forEach((pattern) => {
    if (pattern.test(contentOnly)) issues.push("html.forbidden_term");
  });
  if (/프롬프트 원문|디버그|rawResult|rawJson/i.test(contentOnly)) issues.push("html.debug_leak");
  if (!html.includes("본 리포트는 사주 명리학을 바탕으로 한 자기이해와 엔터테인먼트 목적의 콘텐츠입니다.")) {
    issues.push("disclaimer.missing");
  }
  if (asArray(chapters).length !== asArray(chapterPlan).length) issues.push("chapter.payload_count");
  return { ok: issues.length === 0, issues: [...new Set(issues)] };
}
