import { esc, markdownToHtml, renderDefaultChapterBlock, sanitizeChapterInput } from "./common.js";

export function renderSajuCh3Yongshin(chapter, index) {
  const safe = sanitizeChapterInput(chapter, index);
  const sections = Array.isArray(safe.chapterJson?.sections) ? safe.chapterJson.sections : [];
  const target = sections.slice(0, 5);
  if (!target.length) return renderDefaultChapterBlock(safe, index);

  return [
    '<section class="lb-chapter lb-chapter--ch3">',
    `<h1>${esc(safe.roman || "III")}. ${esc(safe.title)}</h1>`,
    safe.subtitle ? `<p class="lb-subtitle">${esc(safe.subtitle)}</p>` : "",
    `<article class="lb-content">${markdownToHtml(safe.contentMarkdown)}</article>`,
    '<div class="lb-grid-2">',
    target
      .map((item) => `<section class="lb-section-card"><h3>${esc(item?.title || "핵심 해석")}</h3><div>${markdownToHtml(item?.body || "해석 데이터를 준비 중입니다.")}</div></section>`)
      .join("\n"),
    "</div>",
    "</section>",
  ].join("\n");
}
