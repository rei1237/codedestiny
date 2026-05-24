import { renderSajuChapter } from "./renderers/index.js";

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

export function renderLifeBookPdf(params = {}) {
  const reportId = String(params.reportId || "").trim();
  const lifeBookInputData = params.lifeBookInputData || {};
  const chapters = Array.isArray(params.chapters) ? params.chapters : [];
  const generatedAt = params.generatedAt || new Date().toISOString();

  const tocRows = chapters
    .map((chapter, index) => `<li>${esc(chapter.roman || String(index + 1))}. ${esc(chapter.title || `Chapter ${index + 1}`)}</li>`)
    .join("\n");

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
    'body{margin:0;padding:26px;font-family:Georgia,"Times New Roman",serif;background:#f6f2eb;color:#1f2937;line-height:1.72}',
    '.lb-cover{padding:26px;border-radius:16px;background:linear-gradient(135deg,#15131f,#31244a);color:#f3e9d2;margin-bottom:24px}',
    '.lb-cover h1{font-size:38px;margin:0 0 8px}',
    '.lb-cover p{margin:3px 0;color:#f0e3c4}',
    '.lb-preface{padding:18px;border:1px solid #dccfb8;border-radius:12px;background:#fffaf2;margin-bottom:18px}',
    '.lb-preface h2{margin:0 0 10px;color:#4f3a21}',
    '.lb-card{padding:18px;border:1px solid #dccfb8;border-radius:12px;background:#fffaf2;margin-bottom:18px}',
    '.lb-card h2{margin:0 0 12px;color:#4f3a21}',
    '.lb-chapter{padding:18px;border:1px solid #e9dfcf;border-radius:14px;background:#fff;margin-bottom:20px}',
    '.lb-chapter h1{margin:0 0 8px;font-size:28px;color:#352515}',
    '.lb-subtitle{margin:0 0 14px;color:#7a5a3b}',
    '.lb-content h2{margin-top:14px;color:#5a3c21;font-size:20px}',
    '.lb-content h3{margin-top:12px;color:#69492a;font-size:17px}',
    '.lb-summary-box,.lb-advice-box{margin-top:14px;padding:12px;border-radius:10px}',
    '.lb-summary-box{background:#f8f0e3;border:1px solid #e1d0b6}',
    '.lb-advice-box{background:#edf7ef;border:1px solid #b9dec0}',
    '.lb-grid-2{display:grid;gap:12px;grid-template-columns:repeat(2,minmax(0,1fr));margin-top:14px}',
    '.lb-section-card{padding:12px;border-radius:10px;background:#f6efe2;border:1px solid #deceb3}',
    '.lb-split{display:grid;gap:14px;grid-template-columns:minmax(0,2fr) minmax(0,1fr)}',
    '.lb-side-box{padding:12px;border-radius:10px;background:#f8f0e3;border:1px solid #e1d0b6}',
    '@media(max-width:900px){.lb-grid-2,.lb-split{grid-template-columns:1fr}}',
    '.lb-closing{padding:18px;border:1px solid #dccfb8;border-radius:12px;background:#fffaf2;margin-top:10px;margin-bottom:18px}',
    '.lb-closing h2{margin:0 0 10px;color:#4f3a21}',
    '.lb-footer{padding:16px;border-radius:12px;background:#f5f5f5;border:1px solid #d9d9d9;color:#4b5563;font-size:12px}',
    '@media print{body{padding:0;background:#fff}.lb-cover,.lb-card,.lb-chapter,.lb-footer{border:none;box-shadow:none}}',
    "</style>",
    "</head>",
    "<body>",
    '<section class="lb-cover">',
    "<h1>인생의 책</h1>",
    "<p>사주가 들려주는 나의 운명 사용 설명서</p>",
    `<p>${esc(lifeBookInputData?.userProfile?.name || "사용자")}</p>`,
    `<p>생성일 ${esc(formatDate(generatedAt))}</p>`,
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
    '<p>Code Destiny Premium Report</p>',
    '<p>본 리포트는 자기이해와 성찰을 위한 콘텐츠이며, 법률/의학/투자 판단을 대체하지 않습니다.</p>',
    "</section>",
    "</body>",
    "</html>",
  ].join("\n");

  return {
    ok: true,
    html,
    fileName: `lifebook-${reportId || Date.now()}.html`,
    generatedAt,
    chapterCount: chapters.length,
  };
}
