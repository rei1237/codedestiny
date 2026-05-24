import { esc, markdownToHtml, renderDefaultChapterBlock, sanitizeChapterInput } from "./common.js";

export function renderSajuCh1Wonguk(chapter, index) {
  const safe = sanitizeChapterInput(chapter, index);
  const sections = Array.isArray(safe.chapterJson?.sections) ? safe.chapterJson.sections : [];
  const topSections = sections.slice(0, 6);
  if (!topSections.length) {
    return renderDefaultChapterBlock(safe, index);
  }

  const sectionHtml = topSections
    .map((section) => {
      const title = String(section?.title || "핵심 해석").trim();
      const body = String(section?.body || "해석 데이터를 준비 중입니다.").trim();
      return [
        '<section class="lb-section-card">',
        `<h3>${esc(title)}</h3>`,
        `<div>${markdownToHtml(body)}</div>`,
        "</section>",
      ].join("\n");
    })
    .join("\n");

  return [
    '<section class="lb-chapter lb-chapter--ch1">',
    `<h1>${esc(safe.roman || "I")}. ${esc(safe.title)}</h1>`,
    safe.subtitle ? `<p class="lb-subtitle">${esc(safe.subtitle)}</p>` : "",
    `<article class="lb-content">${markdownToHtml(safe.contentMarkdown)}</article>`,
    '<div class="lb-summary-box">',
    '<h3>원국 핵심 요약</h3>',
    `<p>${esc(safe.summary || "원국 분석 요약을 준비 중입니다.")}</p>`,
    "</div>",
    '<div class="lb-grid-2">',
    sectionHtml,
    "</div>",
    "</section>",
  ].join("\n");
}
