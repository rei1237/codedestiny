import { esc, markdownToHtml, renderDefaultChapterBlock, sanitizeChapterInput } from "./common.js";

export function renderSajuCh2Design(chapter, index) {
  const safe = sanitizeChapterInput(chapter, index);
  const sections = Array.isArray(safe.chapterJson?.sections) ? safe.chapterJson.sections : [];
  const keySection = sections.find((item) => String(item?.title || "").includes("조후")) || sections[0] || null;
  if (!keySection) {
    return renderDefaultChapterBlock(safe, index);
  }

  const bodyHtml = markdownToHtml(safe.contentMarkdown);
  const keyTitle = String(keySection?.title || "핵심 해석").trim();
  const keyBody = String(keySection?.body || "해석 데이터를 준비 중입니다.").trim();

  return [
    '<section class="lb-chapter lb-chapter--ch2">',
    `<h1>${esc(safe.roman || "II")}. ${esc(safe.title)}</h1>`,
    safe.subtitle ? `<p class="lb-subtitle">${esc(safe.subtitle)}</p>` : "",
    '<div class="lb-split">',
    `<article class="lb-content">${bodyHtml}</article>`,
    '<aside class="lb-side-box">',
    `<h3>${esc(keyTitle)}</h3>`,
    `<div>${markdownToHtml(keyBody)}</div>`,
    "</aside>",
    "</div>",
    '<div class="lb-summary-box">',
    '<h3>설계도 요약</h3>',
    `<p>${esc(safe.summary || "기질 설계도 요약을 준비 중입니다.")}</p>`,
    "</div>",
    "</section>",
  ].join("\n");
}
