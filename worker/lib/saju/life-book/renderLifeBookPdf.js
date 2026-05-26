import { renderSajuChapter } from "./renderers/index.js";
import { assertNoSajuLifeBookFallbackText } from "./lifeBookPdfContract.js";

function esc(value) {
  return String(value == null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function normalizeReadableText(value) {
  return String(value == null ? "" : value)
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function markdownToHtml(markdown) {
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

function formatDate(dateInput) {
  const d = dateInput instanceof Date ? dateInput : new Date(dateInput || Date.now());
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}.${mm}.${dd}`;
}

function renderLifeBookCoverGlyph() {
  return [
    '<svg viewBox="0 0 220 90" role="img" aria-label="lifebook cover icon">',
    '<path d="M16 70h188" stroke="rgba(255,244,226,0.55)" stroke-width="1.6"/>',
    '<path d="M40 70V22h42v48" fill="none" stroke="rgba(255,244,226,0.82)" stroke-width="2.6"/>',
    '<path d="M86 70V22h42v48" fill="none" stroke="rgba(255,244,226,0.82)" stroke-width="2.6"/>',
    '<circle cx="61" cy="43" r="8" fill="rgba(255,244,226,0.82)"/>',
    '<circle cx="107" cy="43" r="8" fill="rgba(255,244,226,0.82)"/>',
    '<path d="M148 24h38M148 36h38M148 48h38M148 60h30" stroke="rgba(255,244,226,0.76)" stroke-width="2.2" stroke-linecap="round"/>',
    '</svg>',
  ].join("");
}

export function renderLifeBookPdf(params = {}) {
  const reportId = String(params.reportId || "").trim();
  const lifeBookInputData = params.lifeBookInputData || {};
  const chapters = Array.isArray(params.chapters) ? params.chapters : [];
  const generatedAt = params.generatedAt || new Date().toISOString();

  const tocRows = chapters
    .map((chapter, index) => `<li>${esc(chapter.roman || String(index + 1))}${chapter?.title ? `. ${esc(chapter.title)}` : ""}</li>`)
    .join("\n");

  const totalChars = chapters.reduce((sum, chapter) => sum + String(chapter?.contentMarkdown || "").length, 0);
  const avgChars = chapters.length ? Math.round(totalChars / chapters.length) : 0;
  const adviceCount = chapters.reduce((sum, chapter) => sum + (Array.isArray(chapter?.practicalAdvice) ? chapter.practicalAdvice.length : 0), 0);
  const warningCount = chapters.reduce((sum, chapter) => sum + (Array.isArray(chapter?.warnings) ? chapter.warnings.length : 0), 0);

  const seenChapterKeys = new Set();
  const chapterBlocks = chapters
    .map((chapter, index) => {
      const chapterKey = String(chapter?.id || chapter?.roman || chapter?.title || `chapter-${index + 1}`)
        .trim()
        .toLowerCase();
      if (!chapterKey) return "";
      if (seenChapterKeys.has(chapterKey)) return "";
      seenChapterKeys.add(chapterKey);
      return renderSajuChapter(chapter, index);
    })
    .filter(Boolean)
    .join("\n");

  const html = [
    "<!doctype html>",
    '<html lang="ko">',
    "<head>",
    '<meta charset="utf-8" />',
    "<title>인생의 책</title>",
    "<style>",
    '@import url("https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700&family=Noto+Serif+KR:wght@500;600;700&display=swap");',
    '*{box-sizing:border-box}',
    'body{margin:0;padding:28px;font-family:"Noto Serif KR","Noto Sans KR",serif;background:radial-gradient(circle at 14% -10%,#fffaf4 0%,#f6efe4 42%,#f3eadf 100%);color:#1f172a;line-height:1.84;word-break:keep-all}',
    '.lb-cover{padding:30px;border-radius:22px;background:linear-gradient(140deg,#2d1f17 0%,#5a3c28 62%,#7b5338 100%);color:#f9ecdc;margin-bottom:24px;position:relative;overflow:hidden}',
    '.lb-cover::after{content:"";position:absolute;right:-40px;top:-46px;width:180px;height:180px;border-radius:50%;background:rgba(255,255,255,0.13)}',
    '.lb-cover h1{font-size:38px;line-height:1.3;letter-spacing:-0.01em;margin:0 0 8px}',
    '.lb-cover p{margin:3px 0;color:#f6dec1;font-size:13px;letter-spacing:0.01em}',
    '.lb-cover-art{margin:12px 0 2px;width:228px;max-width:100%;opacity:0.95}',
    '.lb-cover-art svg{display:block;width:100%;height:auto}',
    '.lb-preface{padding:18px;border:1px solid #dccfb8;border-radius:12px;background:#fffaf2;margin-bottom:18px}',
    '.lb-preface h2{margin:0 0 10px;color:#4f3a21}',
    '.lb-card{padding:18px;border:1px solid #dccfb8;border-radius:12px;background:#fffaf2;margin-bottom:18px}',
    '.lb-card h2{margin:0 0 12px;color:#4f3a21}',
    '.lb-chapter{padding:20px;border:1px solid #e3d4be;border-radius:16px;background:#fffaf2;margin-bottom:22px;box-shadow:0 14px 30px rgba(83,60,35,0.09);break-inside:avoid-page;page-break-inside:avoid}',
    '.lb-chapter h1{margin:0 0 8px;font-size:28px;color:#352515;line-height:1.4}',
    '.lb-subtitle{margin:0 0 14px;color:#7a5a3b}',
    '.lb-content h2{margin-top:14px;padding:8px 12px;border-left:4px solid #9f6940;background:#efe3d2;border-radius:8px;color:#5a3c21;font-size:19px}',
    '.lb-content h3{margin-top:12px;color:#69492a;font-size:16px}',
    '.lb-content p{font-family:"Noto Sans KR","Noto Serif KR",sans-serif;font-size:14px;line-height:1.86}',
    '.lb-summary-box,.lb-advice-box{margin-top:14px;padding:12px;border-radius:10px}',
    '.lb-summary-box{background:#f8f0e3;border:1px solid #e1d0b6}',
    '.lb-advice-box{background:#edf7ef;border:1px solid #b9dec0}',
    '.lb-grid-2{display:grid;gap:12px;grid-template-columns:repeat(2,minmax(0,1fr));margin-top:14px}',
    '.lb-kpi-strip{display:grid;gap:10px;grid-template-columns:repeat(4,minmax(0,1fr));margin-bottom:18px}',
    '.lb-kpi-card{padding:10px;border-radius:10px;background:#f7efe4;border:1px solid #e6d5bd}',
    '.lb-kpi-label{display:block;font-size:11px;color:#7a634a}',
    '.lb-kpi-value{display:block;margin-top:4px;font-size:15px;font-weight:700;color:#3f2b1a}',
    '.lb-section-card{padding:12px;border-radius:10px;background:#f6efe2;border:1px solid #deceb3}',
    '.lb-split{display:grid;gap:14px;grid-template-columns:minmax(0,2fr) minmax(0,1fr)}',
    '.lb-side-box{padding:12px;border-radius:10px;background:#f8f0e3;border:1px solid #e1d0b6}',
    '@media(max-width:900px){.lb-grid-2,.lb-split,.lb-kpi-strip{grid-template-columns:1fr 1fr}}',
    '.lb-closing{padding:18px;border:1px solid #dccfb8;border-radius:12px;background:#fffaf2;margin-top:10px;margin-bottom:18px}',
    '.lb-closing h2{margin:0 0 10px;color:#4f3a21}',
    '.lb-footer{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:12px 0;border-top:1px solid #d9d1c3;color:#4b5563;font-size:11px;font-family:"Noto Sans KR",sans-serif}',
    '.lb-footer-page::after{content:"Page " counter(page) " / " counter(pages)}',
    '@page{size:A4;margin:14mm}',
    '@media print{body{padding:0;background:#fff}.lb-cover,.lb-card,.lb-chapter{box-shadow:none}}',
    "</style>",
    "</head>",
    "<body>",
    '<section class="lb-cover">',
    "<h1>인생의 책</h1>",
    "<p>사주가 들려주는 나의 운명 사용 설명서</p>",
    `<p>${esc(lifeBookInputData?.userProfile?.name || "")}</p>`,
    `<p>생성일 ${esc(formatDate(generatedAt))}</p>`,
    `<div class="lb-cover-art">${renderLifeBookCoverGlyph()}</div>`,
    "</section>",
    '<section class="lb-kpi-strip">',
    `<div class="lb-kpi-card"><span class="lb-kpi-label">총 챕터</span><strong class="lb-kpi-value">${chapters.length}</strong></div>`,
    `<div class="lb-kpi-card"><span class="lb-kpi-label">총 분량</span><strong class="lb-kpi-value">${totalChars.toLocaleString()}자</strong></div>`,
    `<div class="lb-kpi-card"><span class="lb-kpi-label">평균 분량</span><strong class="lb-kpi-value">${avgChars.toLocaleString()}자</strong></div>`,
    `<div class="lb-kpi-card"><span class="lb-kpi-label">행동/주의 신호</span><strong class="lb-kpi-value">${adviceCount + warningCount}개</strong></div>`,
    "</section>",
    '<section class="lb-preface">',
    "<h2>서문</h2>",
    "<p>이 리포트는 사용자 프로필과 사주 분석 데이터를 바탕으로 삶의 방향을 입체적으로 정리한 프리미엄 상담문입니다.</p>",
    "<p>각 장은 서로 다른 관점에서 선택 기준과 실행 전략을 제시하며, 실제 생활에 적용 가능한 조언으로 구성되어 있습니다.</p>",
    "</section>",
    '<section class="lb-card">',
    "<h2>목차</h2>",
    `<ol>${tocRows}</ol>`,
    "</section>",
    chapterBlocks,
    '<section class="lb-closing">',
    "<h2>마지막 마무리</h2>",
    "<p>당신의 운은 정해진 결론이 아니라 선택의 축적입니다. 이 책의 해석을 기준으로 현실의 우선순위를 세우고, 매일의 행동으로 운의 방향을 직접 설계하세요.</p>",
    "<p>실천 조언: 한 번에 전부 바꾸기보다 2주 단위로 핵심 습관 하나를 고정하고, 관계·일·돈·회복의 균형을 주기적으로 점검하세요.</p>",
    "</section>",
    '<section class="lb-footer">',
    '<span>Code Destiny Premium Report</span>',
    '<span>본 리포트는 자기이해와 성찰을 위한 콘텐츠입니다.</span>',
    '<span class="lb-footer-page"></span>',
    "</section>",
    "</body>",
    "</html>",
  ].join("\n");

  assertNoSajuLifeBookFallbackText(html, {
    mode: "lifeBook",
    chapterId: "render",
    hasSourceData: true,
  });

  return {
    ok: true,
    html,
    fileName: `lifebook-${reportId || Date.now()}.html`,
    generatedAt,
    chapterCount: chapters.length,
  };
}
