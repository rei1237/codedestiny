export function esc(value) {
  return String(value == null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function normalizeReadableText(value) {
  return String(value == null ? "" : value)
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

export function markdownToHtml(markdown) {
  const lines = String(markdown || "").replace(/\r/g, "").split("\n");
  const out = [];
  let inList = false;

  const closeList = () => {
    if (inList) {
      out.push("</ul>");
      inList = false;
    }
  };

  for (const raw of lines) {
    const line = normalizeReadableText(raw);
    if (!line) {
      closeList();
      continue;
    }

    if (/^###\s+/.test(line)) {
      closeList();
      out.push(`<h3>${esc(line.replace(/^###\s+/, ""))}</h3>`);
      continue;
    }

    if (/^##\s+/.test(line)) {
      closeList();
      out.push(`<h2>${esc(line.replace(/^##\s+/, ""))}</h2>`);
      continue;
    }

    if (/^#\s+/.test(line)) {
      closeList();
      out.push(`<h1>${esc(line.replace(/^#\s+/, ""))}</h1>`);
      continue;
    }

    if (/^-\s+/.test(line)) {
      if (!inList) {
        out.push("<ul>");
        inList = true;
      }
      out.push(`<li>${esc(line.replace(/^-\s+/, ""))}</li>`);
      continue;
    }

    closeList();
    out.push(`<p>${esc(line)}</p>`);
  }

  closeList();
  return out.join("\n");
}

export function renderDefaultChapterBlock(chapter, index) {
  const title = String(chapter?.title || `Chapter ${index + 1}`);
  const subtitle = String(chapter?.subtitle || "").trim();
  const summary = String(chapter?.summary || "").trim();
  const contentMarkdown = String(chapter?.contentMarkdown || "");
  const practicalAdvice = Array.isArray(chapter?.practicalAdvice) ? chapter.practicalAdvice : [];

  return [
    '<section class="lb-chapter">',
    `<h1>${esc(chapter?.roman || String(index + 1))}. ${esc(title)}</h1>`,
    subtitle ? `<p class="lb-subtitle">${esc(subtitle)}</p>` : "",
    `<article class="lb-content">${markdownToHtml(contentMarkdown)}</article>`,
    '<div class="lb-summary-box">',
    '<h3>핵심 요약</h3>',
    `<p>${esc(summary || "해석 데이터를 준비 중입니다.")}</p>`,
    "</div>",
    practicalAdvice.length
      ? `<div class="lb-advice-box"><h3>실전 조언</h3><ul>${practicalAdvice.map((line) => `<li>${esc(line)}</li>`).join("")}</ul></div>`
      : "",
    "</section>",
  ].join("\n");
}

export function sanitizeChapterInput(chapter, index) {
  const fallbackTitle = `Chapter ${index + 1}`;
  const safeChapter = chapter && typeof chapter === "object" ? chapter : {};
  const contentMarkdown = String(safeChapter.contentMarkdown || "").trim();
  return {
    ...safeChapter,
    title: String(safeChapter.title || fallbackTitle),
    subtitle: String(safeChapter.subtitle || ""),
    summary: String(safeChapter.summary || ""),
    contentMarkdown: contentMarkdown || "해석 데이터를 준비 중입니다.",
    practicalAdvice: Array.isArray(safeChapter.practicalAdvice) ? safeChapter.practicalAdvice : [],
  };
}
