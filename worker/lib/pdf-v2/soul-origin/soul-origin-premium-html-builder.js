import { asArray, clean, escapeHtml } from "./soul-origin-premium.types.js";
import { renderSoulOriginList, validateSoulOriginFinalReportHtml } from "./soul-origin-premium.validator.js";

const elementLabels = {
  wood: "목",
  fire: "화",
  earth: "토",
  metal: "금",
  water: "수",
};

const systemLabels = {
  saju: "사주",
  ziwei: "자미두수",
  astrology: "서양점성",
  vedic: "베다점성",
  sukuyo: "숙요점",
  timing: "시기 흐름",
};

function paragraphHtml(value = "") {
  return String(value || "")
    .split(/\n{2,}/)
    .map((item) => clean(item))
    .filter(Boolean)
    .map((item) => `<p>${escapeHtml(item)}</p>`)
    .join("");
}

function normalizePercent(value, fallback = 0) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(0, Math.min(100, Math.round(number)));
}

function buildElementMetrics(input = {}) {
  const weights = input?.calculation?.saju?.elementWeights || {};
  const values = Object.keys(elementLabels).map((key) => ({
    key,
    label: elementLabels[key],
    raw: Math.max(0, Number(weights[key] || 0)),
  }));
  const max = Math.max(1, ...values.map((item) => item.raw));
  return values.map((item) => ({
    ...item,
    value: normalizePercent((item.raw / max) * 100, item.raw ? 20 : 8),
  }));
}

function renderElementGraph(input = {}) {
  const metrics = buildElementMetrics(input);
  return `
    <section class="visual-panel" data-visual="element-graph">
      <h2>오행 균형 그래프</h2>
      <div class="bar-list">
        ${metrics.map((item) => `
          <div class="bar-row">
            <span>${escapeHtml(item.label)}</span>
            <div class="bar-track"><i style="width:${item.value}%"></i></div>
            <strong>${item.value}</strong>
          </div>
        `).join("")}
      </div>
    </section>`;
}

function buildSignalRows(input = {}) {
  const calculation = input.calculation || {};
  const saju = calculation.saju || {};
  const ziwei = calculation.ziwei || {};
  const astrology = calculation.astrology || {};
  const vedic = calculation.vedic || {};
  const sukuyo = calculation.sukuyo || {};
  return [
    {
      system: "사주",
      signal: [saju.dayMaster, saju.monthBranch, saju.currentDaewun, saju.currentYearPillar].filter(Boolean).join(" / "),
    },
    {
      system: "자미두수",
      signal: [ziwei.mingGong, ziwei.shenGong].filter(Boolean).join(" / "),
    },
    {
      system: "서양점성",
      signal: [astrology.sun, astrology.moon, astrology.ascendant].filter(Boolean).join(" / "),
    },
    {
      system: "베다점성",
      signal: [vedic.lagna, vedic.moonNakshatra, vedic.currentDasha].filter(Boolean).join(" / "),
    },
    {
      system: "숙요점",
      signal: [sukuyo.natalStar, sukuyo.element, sukuyo.nature].filter(Boolean).join(" / "),
    },
  ].filter((row) => clean(row.signal));
}

function renderSignalTable(input = {}) {
  const rows = buildSignalRows(input);
  if (!rows.length) return "";
  return `
    <section class="visual-panel" data-visual="signal-table">
      <h2>핵심 계산 신호</h2>
      <table class="signal-table">
        <thead><tr><th>체계</th><th>확정 신호</th></tr></thead>
        <tbody>
          ${rows.map((row) => `<tr><td>${escapeHtml(row.system)}</td><td>${escapeHtml(row.signal)}</td></tr>`).join("")}
        </tbody>
      </table>
    </section>`;
}

function renderEvidenceTable(chapter = {}) {
  const rows = asArray(chapter.evidencePoints);
  if (!rows.length) return "";
  return `
      <section class="evidence-panel" data-visual="chapter-evidence">
        <h3>장별 핵심 근거</h3>
        <table class="evidence-table">
          <thead><tr><th>체계</th><th>신호</th><th>상담 해석</th></tr></thead>
          <tbody>
            ${rows.map((point) => `
              <tr>
                <td>${escapeHtml(systemLabels[point.system] || point.system)}</td>
                <td>${escapeHtml(point.signal)}</td>
                <td>${escapeHtml(point.reading)}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </section>`;
}

function sectionHtml(section = {}) {
  return `
      <section class="chapter-section">
        <h3>${escapeHtml(section.title)}</h3>
        ${paragraphHtml(section.body)}
      </section>`;
}

function chapterHtml(chapter = {}) {
  return `
    <article class="chapter" data-chapter-number="${Number(chapter.chapterNumber || 0)}">
      <h2>${escapeHtml(chapter.title)}</h2>
      <p class="chapter-subtitle">${escapeHtml(chapter.subtitle)}</p>
      <div class="chapter-summary">${paragraphHtml(chapter.summary)}</div>
      ${renderEvidenceTable(chapter)}
      ${asArray(chapter.sections).map(sectionHtml).join("\n")}
      <section class="guidance-grid">
        <div>
          <h3>실천 조언</h3>
          <ul>${renderSoulOriginList(chapter.practicalAdvice)}</ul>
        </div>
        <div>
          <h3>주의할 흐름</h3>
          <ul>${renderSoulOriginList(chapter.cautionPoints)}</ul>
        </div>
      </section>
    </article>`;
}

export function renderSoulOriginPdfFromLlmResult({ input = {}, result = {}, reportId = "", generatedAt = "" } = {}) {
  const person = input.person || {};
  const birth = person.birthSummary || {};
  const chapters = asArray(result.chapters);
  const toc = chapters.map((chapter) => `<li>${escapeHtml(chapter.chapterNumber)}. ${escapeHtml(chapter.title)}</li>`).join("");
  const html = `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(result.reportTitle || "운명의 업 프리미엄 상담서")}</title>
  <style>
    :root{color-scheme:light}
    *{box-sizing:border-box}
    body{margin:0;font-family:"Noto Serif KR","Apple SD Gothic Neo",serif;background:#fbf7f0;color:#24170f;line-height:1.86}
    .page{max-width:980px;margin:0 auto;padding:28px 22px 64px}
    .cover{padding:34px;border-radius:20px;background:#2a1a12;color:#fff7ec}
    .cover h1{margin:8px 0 10px;font-size:38px;line-height:1.22}
    .cover p{margin:4px 0;color:#f0dcc4}
    .meta,.toc,.opening,.chapter,.closing,.visual-panel{margin-top:18px;padding:20px;border:1px solid #e2d2bf;background:#fffaf4;border-radius:14px}
    .meta-grid,.visual-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}
    .meta-grid{grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}
    .meta-item{padding:12px;border:1px solid #eadbc8;border-radius:10px;background:#fbf0e4}
    .meta-item b{display:block;margin-bottom:4px;color:#6a442a}
    .toc ol{margin:0;padding-left:22px}
    .visual-panel h2{margin:0 0 12px;color:#4f311e;font-size:20px}
    .signal-table,.evidence-table{width:100%;border-collapse:collapse;table-layout:fixed}
    .signal-table th,.signal-table td,.evidence-table th,.evidence-table td{border:1px solid #eadbc8;padding:9px 10px;text-align:left;vertical-align:top;word-break:keep-all;overflow-wrap:break-word}
    .signal-table th,.evidence-table th{background:#f4e6d3;color:#5b3921}
    .bar-list{display:flex;flex-direction:column;gap:10px}
    .bar-row{display:grid;grid-template-columns:42px 1fr 42px;gap:10px;align-items:center}
    .bar-row span,.bar-row strong{font-weight:700;color:#684529}
    .bar-row strong{text-align:right}
    .bar-track{height:12px;border-radius:999px;background:#eadbc8;overflow:hidden}
    .bar-track i{display:block;height:100%;border-radius:inherit;background:linear-gradient(90deg,#8d5e32,#d4a24c)}
    .chapter{break-inside:avoid-page;page-break-inside:avoid}
    .chapter h2{margin:0 0 8px;color:#4f311e;font-size:27px;line-height:1.32}
    .chapter-subtitle{margin:0 0 14px;color:#755234;font-weight:700}
    .chapter-summary{padding:12px 14px;border-left:4px solid #b98145;background:#fff4e6}
    .evidence-panel{margin-top:14px;padding:14px;border:1px solid #eadbc8;border-radius:12px;background:#fff7ee}
    .evidence-panel h3{margin:0 0 10px;color:#684529;font-size:18px}
    .chapter-section{margin-top:14px;padding-top:12px;border-top:1px solid #eadbc8}
    .chapter-section h3,.guidance-grid h3{margin:0 0 8px;color:#684529;font-size:18px}
    p{white-space:pre-wrap;word-break:keep-all;overflow-wrap:break-word}
    ul{margin:0;padding-left:20px}
    li{margin:6px 0}
    .guidance-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px;margin-top:16px}
    .guidance-grid>div{padding:14px;border:1px solid #eadbc8;border-radius:12px;background:#fff7ee}
    .closing{font-size:15px;color:#5e4630}
    @page{size:A4;margin:16mm 14mm 18mm}
    @media print{body{background:#fff}.page{padding:0}.chapter{break-before:page;page-break-before:always}.chapter:first-of-type{break-before:auto;page-break-before:auto}}
    @media (max-width:720px){.meta-grid,.visual-grid,.guidance-grid{grid-template-columns:1fr}.cover h1{font-size:30px}}
  </style>
</head>
<body>
  <main class="page" data-report-id="${escapeHtml(reportId)}">
    <section class="cover">
      <p>Code Destiny Premium PDF</p>
      <h1>${escapeHtml(result.reportTitle || "운명의 업 프리미엄 상담서")}</h1>
      <p>${escapeHtml(clean(person.displayName || "사용자"))}</p>
      <p>${escapeHtml(clean(`${birth.birthDate || ""} ${birth.birthTime || ""}`))}</p>
    </section>
    <section class="meta">
      <div class="meta-grid">
        <div class="meta-item"><b>발행일</b>${escapeHtml(new Date(generatedAt || Date.now()).toLocaleString("ko-KR"))}</div>
        <div class="meta-item"><b>구성</b>${chapters.length}장 운명의 업 상담</div>
        <div class="meta-item"><b>출생지</b>${escapeHtml(clean(birth.birthplace || "미상"))}</div>
      </div>
    </section>
    <section class="opening">${paragraphHtml(result.openingSummary)}</section>
    <div class="visual-grid">
      ${renderSignalTable(input)}
      ${renderElementGraph(input)}
    </div>
    <section class="toc">
      <h2>목차</h2>
      <ol>${toc}</ol>
    </section>
    ${chapters.map(chapterHtml).join("\n")}
    <section class="closing">
      ${paragraphHtml(result.finalMessage)}
      ${paragraphHtml(result.disclaimer)}
    </section>
  </main>
</body>
</html>`;
  const validation = validateSoulOriginFinalReportHtml(html, result);
  if (!validation.ok) {
    throw Object.assign(new Error("PDF_RENDER_FAILED"), {
      code: "PDF_RENDER_FAILED",
      status: 422,
      issues: validation.issues,
    });
  }
  return html;
}
