import { assertLifeBookPremiumChapterPlan, lifeBookPremiumChapterPlanV1 } from "./life-book-premium.chapter-plan.js";
import { asArray, clean, escapeHtml } from "./life-book-premium.types.js";
import { validateLifeBookFinalReportHtml } from "./life-book-premium.validator.js";

function metaItem(label, value) {
  const text = clean(value) || "미상";
  return `<div class="meta-item"><b>${escapeHtml(label)}</b><span>${escapeHtml(text)}</span></div>`;
}

function buildTableOfContents(chapters = []) {
  return asArray(chapters)
    .map((chapter) => `<li><a href="#chapter-${escapeHtml(chapter.id)}">${escapeHtml(chapter.order)}. ${escapeHtml(chapter.title)}</a></li>`)
    .join("");
}

function readPillarLabel(pillar = {}) {
  if (typeof pillar === "string") return clean(pillar);
  return clean(pillar.ganji || `${clean(pillar.stem)}${clean(pillar.branch)}`);
}

function buildPillarTable(input = {}) {
  const pillars = input.chart?.pillars || {};
  const rows = [
    ["연주", readPillarLabel(pillars.year)],
    ["월주", readPillarLabel(pillars.month)],
    ["일주", readPillarLabel(pillars.day)],
    ["시주", readPillarLabel(pillars.hour)],
  ];
  return `<table class="lb-table"><thead><tr><th>기둥</th><th>간지</th></tr></thead><tbody>${rows.map(([label, value]) => `<tr><td>${escapeHtml(label)}</td><td>${escapeHtml(value || "확인 범위")}</td></tr>`).join("")}</tbody></table>`;
}

function buildElementBars(input = {}) {
  const labels = {
    wood: "목",
    fire: "화",
    earth: "토",
    metal: "금",
    water: "수",
    "목": "목",
    "화": "화",
    "토": "토",
    "금": "금",
    "수": "수",
  };
  const source = input.chart?.elementBalance || {};
  const entries = Object.entries(labels).filter(([key], index, list) => list.findIndex(([itemKey]) => labels[itemKey] === labels[key]) === index)
    .map(([key, label]) => [label, Number(source[key] ?? source[label] ?? 0)])
    .filter(([, value]) => Number.isFinite(value));
  const max = Math.max(1, ...entries.map(([, value]) => value));
  return `<div class="element-bars">${entries.map(([label, value]) => {
    const width = Math.max(8, Math.round((value / max) * 100));
    return `<div class="element-row"><span>${escapeHtml(label)}</span><div class="element-track"><i style="width:${width}%"></i></div><b>${escapeHtml(value || 0)}</b></div>`;
  }).join("")}</div>`;
}

function buildTenGodTable(input = {}) {
  const source = input.chart?.tenGods || {};
  const entries = Object.entries(source)
    .map(([key, value]) => [clean(key, 40), Number(value)])
    .filter(([key, value]) => key && Number.isFinite(value))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);
  const rows = entries.length ? entries : [["확인 범위", 0]];
  return `<table class="lb-table"><thead><tr><th>십성</th><th>강도</th></tr></thead><tbody>${rows.map(([label, value]) => `<tr><td>${escapeHtml(label)}</td><td>${escapeHtml(value)}</td></tr>`).join("")}</tbody></table>`;
}

function cycleLabel(value = {}, limit = 100) {
  if (typeof value === "string" || typeof value === "number") return clean(value, limit);
  if (!value || typeof value !== "object") return "";
  return clean(value.ganji || value.label || value.pillar || value.summary || value.theme || value.name, limit);
}

function buildCycleTimeline(input = {}) {
  const cycles = input.chart?.cycles || {};
  const rows = [
    ["현재 대운", cycleLabel(cycles.currentDaewoon, 80)],
    ["대운 흐름", cycleLabel(cycles.daewoon, 100)],
    ["분석 세운", cycleLabel(cycles.yearly, 80) || clean(input.targetYear, 80)],
  ].filter(([, value]) => value);
  const items = rows.length ? rows : [["운의 흐름", "계산 근거 안에서 확인되는 흐름을 중심으로 해석합니다."]];
  return `<ol class="cycle-timeline">${items.map(([label, value]) => `<li><b>${escapeHtml(label)}</b><span>${escapeHtml(value)}</span></li>`).join("")}</ol>`;
}

function buildVisualSummary(input = {}) {
  return `<section class="visual-summary">
    <h2>사주 핵심 시각 요약</h2>
    <div class="visual-grid">
      <div class="viz-card"><h3>사주 네 기둥</h3>${buildPillarTable(input)}</div>
      <div class="viz-card"><h3>오행 균형 그래프</h3>${buildElementBars(input)}</div>
      <div class="viz-card"><h3>십성 분포</h3>${buildTenGodTable(input)}</div>
      <div class="viz-card"><h3>운의 흐름</h3>${buildCycleTimeline(input)}</div>
    </div>
  </section>`;
}

function buildChapterFlowVisual(chapter = {}) {
  const sections = asArray(chapter.sections);
  if (!sections.length) return "";
  const rows = sections.map((section, index) => {
    const title = clean(section.title || section.heading || `흐름 ${index + 1}`, 80);
    const body = clean(section.body, 86) || "상담문에 반영된 흐름";
    return `<tr><td>${escapeHtml(index + 1)}</td><td>${escapeHtml(title)}</td><td>${escapeHtml(body)}</td></tr>`;
  }).join("");
  const bars = sections.map((section, index) => {
    const title = clean(section.title || section.heading || `흐름 ${index + 1}`, 50);
    const width = Math.max(28, Math.round(((index + 1) / sections.length) * 100));
    return `<div class="chapter-flow-row"><span>${escapeHtml(title)}</span><div class="chapter-flow-track"><i style="width:${width}%"></i></div></div>`;
  }).join("");
  return `<aside class="chapter-flow" data-chapter-flow="${escapeHtml(chapter.id)}">
    <h2>장별 흐름표</h2>
    <table class="lb-table chapter-flow-table"><thead><tr><th>순서</th><th>섹션</th><th>핵심 문장</th></tr></thead><tbody>${rows}</tbody></table>
    <div class="chapter-flow-bars">${bars}</div>
  </aside>`;
}

function normalizeChapterHtml(chapter) {
  const article = String(chapter?.html || "")
    .replace(/<article\b/i, `<article id="chapter-${escapeHtml(chapter.id)}"`)
    .trim();
  const flowVisual = buildChapterFlowVisual(chapter);
  if (!flowVisual) return article;
  return article.replace(/(<h1\b[^>]*>[\s\S]*?<\/h1>)/i, `$1${flowVisual}`);
}

export function assembleLifeBookPremiumHtml({ input = {}, chapters = [], reportId = "" } = {}) {
  assertLifeBookPremiumChapterPlan(lifeBookPremiumChapterPlanV1);
  const profile = input.userProfile || {};
  const generatedAt = new Date().toLocaleDateString("ko-KR");
  const chapterHtml = asArray(chapters).map(normalizeChapterHtml).join("\n");
  const toc = buildTableOfContents(chapters);
  const visualSummary = buildVisualSummary(input);
  const fullHtml = `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>사주 인생의 책</title>
  <style>
    :root{color-scheme:light}
    *{box-sizing:border-box}
    body{margin:0;font-family:"Noto Serif KR","Apple SD Gothic Neo",serif;background:#fbf6ed;color:#24170f;line-height:1.82}
    .page{max-width:980px;margin:0 auto;padding:30px 22px 68px}
    .cover{padding:34px;border-radius:22px;background:#2b1a10;color:#fff7ed}
    .cover h1{margin:8px 0 10px;font-size:38px;line-height:1.2}
    .cover p{margin:4px 0;color:#f3ddc5}
    .meta,.toc,.visual-summary,article,.closing{margin-top:20px;padding:20px;border:1px solid #e3d0b8;background:#fffaf3;border-radius:16px}
    .meta-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}
    .meta-item{padding:12px;border:1px solid #ead9c3;border-radius:12px;background:#fbf2e5}
    .meta-item b{display:block;margin-bottom:4px;color:#6b4428}
    .visual-summary h2{margin:0 0 14px;color:#4c2f1a}
    .visual-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}
    .viz-card{padding:14px;border:1px solid #ead9c3;border-radius:14px;background:#fff7eb}
    .viz-card h3{margin:0 0 10px;font-size:17px;color:#6b4428}
    .lb-table{width:100%;border-collapse:collapse;font-size:13px}
    .lb-table th,.lb-table td{border:1px solid #e2cfb8;padding:7px 8px;text-align:left;vertical-align:top}
    .lb-table th{background:#f1dfc5;color:#5a3822}
    .element-row{display:grid;grid-template-columns:34px 1fr 34px;align-items:center;gap:8px;margin:8px 0;font-size:13px}
    .element-track{height:12px;border-radius:999px;background:#ead9c3;overflow:hidden}
    .element-track i{display:block;height:100%;border-radius:999px;background:linear-gradient(90deg,#9f6a3d,#d7aa68)}
    .cycle-timeline{margin:0;padding:0;list-style:none}
    .cycle-timeline li{position:relative;margin:0 0 10px;padding-left:18px}
    .cycle-timeline li::before{content:"";position:absolute;left:0;top:.7em;width:8px;height:8px;border-radius:50%;background:#9f6a3d}
    .cycle-timeline b{display:block;color:#6b4428}
    .cycle-timeline span{font-size:13px;color:#5c4433}
    .chapter-flow{margin:14px 0 20px;padding:14px;border:1px solid #ead9c3;background:#fff7eb;border-radius:8px}
    .chapter-flow h2{margin:0 0 10px;font-size:17px;color:#6b4428}
    .chapter-flow-table{margin-bottom:12px}
    .chapter-flow-table th:first-child,.chapter-flow-table td:first-child{width:48px;text-align:center}
    .chapter-flow-bars{display:grid;gap:8px}
    .chapter-flow-row{display:grid;grid-template-columns:150px 1fr;align-items:center;gap:10px;font-size:13px;color:#5c4433}
    .chapter-flow-track{height:10px;border-radius:999px;background:#ead9c3;overflow:hidden}
    .chapter-flow-track i{display:block;height:100%;border-radius:999px;background:linear-gradient(90deg,#7f5636,#c99451)}
    .toc ol{margin:0;padding-left:22px}
    .toc a{color:#4f301d;text-decoration:none}
    article{break-inside:avoid-page;page-break-inside:avoid}
    article h1{margin:0 0 14px;font-size:27px;color:#4c2f1a}
    section{margin:16px 0 0}
    section h2{margin:0 0 8px;font-size:20px;color:#6b4428}
    section p{margin:8px 0;white-space:pre-wrap}
    .closing{font-size:14px;color:#5c4433;text-align:center}
    @page{size:A4;margin:16mm 14mm 18mm}
    @media print{body{background:#fff}.page{padding:0}.cover,.meta,.toc,.visual-summary,article,.closing{box-shadow:none}article{break-before:page;page-break-before:always}article:first-of-type{break-before:auto;page-break-before:auto}}
    @media (max-width:720px){.meta-grid,.visual-grid{grid-template-columns:1fr}.chapter-flow-row{grid-template-columns:1fr}.cover h1{font-size:30px}}
  </style>
</head>
<body>
  <main class="page" data-report-id="${escapeHtml(reportId)}">
    <section class="cover">
      <p>Code Destiny Premium</p>
      <h1>사주 인생의 책</h1>
      <p>${escapeHtml(clean(profile.name || "사용자"))}님의 사주 원국과 운의 흐름을 한 권의 상담문으로 엮었습니다.</p>
      <p>${escapeHtml(clean(profile.birthDate))} ${escapeHtml(clean(profile.birthTime))}</p>
    </section>
    <section class="meta">
      <div class="meta-grid">
        ${metaItem("발행일", generatedAt)}
        ${metaItem("분석 연도", input.targetYear)}
        ${metaItem("출생지", profile.birthplace)}
      </div>
    </section>
    <section class="toc">
      <h2>목차</h2>
      <ol>${toc}</ol>
    </section>
    ${visualSummary}
    ${chapterHtml}
    <section class="closing">이 문서는 사주 원국과 운의 흐름을 바탕으로 삶의 방향과 선택의 때를 살피는 프리미엄 상담문입니다.</section>
  </main>
</body>
</html>`;
  const validation = validateLifeBookFinalReportHtml(fullHtml, chapters);
  if (!validation.ok) {
    throw Object.assign(new Error("LIFE_BOOK_FINAL_HTML_INVALID"), {
      code: "LIFE_BOOK_FINAL_HTML_INVALID",
      status: 422,
      issues: validation.issues,
    });
  }
  return fullHtml;
}
