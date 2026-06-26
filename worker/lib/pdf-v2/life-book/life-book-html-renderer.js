import { asArray, clean, escapeHtml, stableStringify } from "./life-book-premium.types.js";
import { validateLifeBookFinalHtml } from "./life-book-validator.js";

const DISCLAIMER = "본 리포트는 사주 명리학을 바탕으로 한 자기이해와 엔터테인먼트 목적의 콘텐츠입니다. 중요한 의사결정은 현실의 정보, 전문가 상담, 본인의 판단을 함께 고려해 주세요.";

function stringifyCell(value, limit = 180) {
  if (value === null || value === undefined || value === "") return "미상";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return clean(value, limit) || "미상";
  return clean(stableStringify(value), limit) || "미상";
}

function metaItem(label, value) {
  return `<div class="meta-item"><b>${escapeHtml(label)}</b><span>${escapeHtml(stringifyCell(value, 220))}</span></div>`;
}

function table(headers = [], rows = []) {
  return `<table class="lb-table"><thead><tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("")}</tr></thead><tbody>${rows.map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(stringifyCell(cell, 260))}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
}

function pillarLabel(pillar) {
  if (typeof pillar === "string") return clean(pillar, 80);
  if (!pillar || typeof pillar !== "object") return "";
  return clean(pillar.ganji || pillar.label || `${clean(pillar.stem || pillar.heavenlyStem || pillar.gan)}${clean(pillar.branch || pillar.earthlyBranch || pillar.zhi)}`, 120);
}

function buildPillarTable(input = {}) {
  const chart = input.sajuChart || {};
  return table(["기둥", "간지", "십성/오행"], [
    ["년주", pillarLabel(chart.yearPillar), stringifyCell(chart.yearPillar?.tenGod || chart.yearPillar?.element, 80)],
    ["월주", pillarLabel(chart.monthPillar), stringifyCell(chart.monthPillar?.tenGod || chart.monthPillar?.element, 80)],
    ["일주", pillarLabel(chart.dayPillar), stringifyCell(chart.dayPillar?.tenGod || chart.dayPillar?.element, 80)],
    ["시주", pillarLabel(chart.hourPillar) || (input.birthTime ? "" : "출생시간 미상"), stringifyCell(chart.hourPillar?.tenGod || chart.hourPillar?.element, 80)],
  ]);
}

function objectRows(source = {}, fallbackLabel = "확인 범위") {
  const entries = Object.entries(source || {}).slice(0, 10);
  if (!entries.length) return [[fallbackLabel, "계산된 사주 자료 안에서 확인 가능한 범위로 해석합니다."]];
  return entries.map(([key, value]) => [key, value]);
}

function buildElementSummary(input = {}) {
  return table(["오행", "흐름"], objectRows(input.sajuChart?.fiveElements || {}, "오행"));
}

function buildTenGodSummary(input = {}) {
  return table(["십성", "분포/의미"], objectRows(input.sajuChart?.tenGods || {}, "십성"));
}

function buildLuckSummary(input = {}) {
  return table(["구분", "흐름"], [
    ["대운", input.luckCycles || "대운 자료 미제공"],
    ["세운", input.annualLuck || "세운 자료 미제공"],
    ["용신/구조", input.sajuChart?.usefulGod || input.sajuChart?.structure || "사주 구조 자료 기준"],
  ]);
}

function buildChapterToc(chapters = []) {
  return `<ol class="toc-list">${asArray(chapters).map((chapter) => `<li><a href="#chapter-${escapeHtml(chapter.id)}"><b>${escapeHtml(String(chapter.order).padStart(2, "0"))}</b><span>${escapeHtml(chapter.category)}</span>${escapeHtml(chapter.title)}</a></li>`).join("")}</ol>`;
}

function buildFinalAdvice(chapters = []) {
  const adviceItems = asArray(chapters)
    .flatMap((chapter) => asArray(chapter.advice).slice(0, 1).map((item) => ({ chapter, item })))
    .slice(0, 8);
  return `<section class="final-advice">
    <h2>종합 인생 처방</h2>
    <ul>${adviceItems.map(({ chapter, item }) => `<li><b>${escapeHtml(chapter.category)}</b>${escapeHtml(item)}</li>`).join("")}</ul>
  </section>`;
}

function normalizeChapterHtml(chapter = {}) {
  return String(chapter.html || "")
    .replace(/<section\b/i, `<section id="chapter-${escapeHtml(chapter.id)}"`)
    .trim();
}

export function assembleFinalHtml({ input = {}, chapters = [], chapterPlan = [], reportId = "" } = {}) {
  const generatedAt = new Date().toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul" });
  const userName = clean(input.userName || "고객", 80);
  const chapterHtml = asArray(chapters).map(normalizeChapterHtml).join("\n");
  const fullHtml = `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(userName)}의 인생의 책</title>
  <style>
    :root{color-scheme:light;--ink:#241910;--muted:#6f5a45;--paper:#fffaf2;--line:#e1ceb6;--gold:#b9843a;--night:#1e1726}
    *{box-sizing:border-box}
    body{margin:0;background:#f5ecdc;color:var(--ink);font-family:"Noto Serif KR","Apple SD Gothic Neo",serif;line-height:1.78}
    .book-page{max-width:980px;margin:0 auto;padding:32px 22px 70px}
    .cover{min-height:420px;padding:54px 42px;border:1px solid #d9bd8d;background:linear-gradient(135deg,#201629,#46311e 58%,#9a6f36);color:#fff7e8;display:flex;flex-direction:column;justify-content:flex-end;page-break-after:always}
    .cover .kicker{font-size:13px;letter-spacing:.08em;color:#efd7aa;text-transform:uppercase}
    .cover h1{margin:14px 0 18px;font-size:42px;line-height:1.18}
    .cover p{max-width:720px;margin:4px 0;color:#f7e7cb}
    .panel{margin-top:22px;padding:22px;border:1px solid var(--line);background:var(--paper)}
    .panel h2{margin:0 0 14px;font-size:24px;color:#4b2f19}
    .meta-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}
    .meta-item{padding:12px;border:1px solid #ead9c3;background:#fff5e8}
    .meta-item b{display:block;margin-bottom:4px;color:#6b4428}
    .lb-table{width:100%;border-collapse:collapse;font-size:13px}
    .lb-table th,.lb-table td{border:1px solid #dfcbb2;padding:8px 9px;text-align:left;vertical-align:top}
    .lb-table th{background:#f0dfc6;color:#4e311d}
    .summary-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}
    .summary-grid .panel{margin:0}
    .toc-list{margin:0;padding-left:22px;columns:2;column-gap:28px}
    .toc-list li{break-inside:avoid;margin:0 0 8px}
    .toc-list a{color:#352315;text-decoration:none}
    .toc-list b{margin-right:8px;color:var(--gold)}
    .toc-list span{margin-right:8px;color:var(--muted)}
    .life-book-chapter{margin-top:26px;padding:28px 26px;border:1px solid var(--line);background:#fffdf8;page-break-before:always}
    .life-book-chapter h2{margin:0 0 16px;font-size:28px;line-height:1.32;color:#402816}
    .chapter-summary{padding:15px 17px;background:#f8ead5;border-left:4px solid var(--gold)}
    .chapter-summary p,.chapter-body p{margin:0 0 12px}
    .chapter-body{margin-top:18px}
    .chapter-advice{margin-top:20px;padding:16px 18px;border:1px solid #e6d2b6;background:#fff7ea}
    .chapter-advice h3{margin:0 0 10px;color:#6b4428}
    .chapter-advice li{margin:6px 0}
    .final-advice{margin-top:26px;padding:24px;border:1px solid #d9bd8d;background:#2a1d16;color:#fff6e8;page-break-before:always}
    .final-advice h2{margin:0 0 12px}
    .final-advice b{display:inline-block;min-width:96px;color:#e6bd74}
    .disclaimer{margin-top:18px;padding:18px;border:1px solid var(--line);background:#fffaf2;color:#5c4936;font-size:13px}
    @page{size:A4;margin:16mm 14mm 18mm}
    @media print{body{background:#fff}.book-page{padding:0}.panel,.life-book-chapter,.final-advice,.disclaimer{break-inside:avoid}.cover{break-after:page}}
    @media (max-width:720px){.book-page{padding:18px 12px 44px}.cover{min-height:360px;padding:34px 24px}.cover h1{font-size:34px}.meta-grid,.summary-grid{grid-template-columns:1fr}.toc-list{columns:1}.life-book-chapter{padding:22px 18px}.life-book-chapter h2{font-size:23px}}
  </style>
</head>
<body>
  <main class="book-page" data-report-id="${escapeHtml(reportId)}">
    <section class="cover">
      <div class="kicker">Code Destiny Premium</div>
      <h1>${escapeHtml(userName)}의 인생의 책</h1>
      <p>사주 팔자와 대운, 세운의 흐름을 한 권의 상담문으로 엮었습니다.</p>
      <p>${escapeHtml(clean(input.birthDate))} ${escapeHtml(clean(input.birthTime || "출생시간 미상"))}</p>
    </section>
    <section class="panel">
      <h2>사용자 입력 요약</h2>
      <div class="meta-grid">
        ${metaItem("이름", userName)}
        ${metaItem("성별", input.gender || "미상")}
        ${metaItem("발행일", generatedAt)}
        ${metaItem("출생일", input.birthDate)}
        ${metaItem("출생시간", input.birthTime || "출생시간 미상")}
        ${metaItem("출생지", input.birthPlace || "미상")}
      </div>
    </section>
    <section class="panel">
      <h2>사주 팔자 핵심 표</h2>
      ${buildPillarTable(input)}
    </section>
    <div class="summary-grid">
      <section class="panel"><h2>오행 균형 요약</h2>${buildElementSummary(input)}</section>
      <section class="panel"><h2>십성 요약</h2>${buildTenGodSummary(input)}</section>
      <section class="panel"><h2>대운·세운 요약</h2>${buildLuckSummary(input)}</section>
      <section class="panel"><h2>목차</h2>${buildChapterToc(chapterPlan)}</section>
    </div>
    ${chapterHtml}
    ${buildFinalAdvice(chapters)}
    <section class="disclaimer">${escapeHtml(DISCLAIMER)}</section>
  </main>
</body>
</html>`;
  const validation = validateLifeBookFinalHtml(fullHtml, chapters, chapterPlan);
  if (!validation.ok) {
    throw Object.assign(new Error("LIFE_BOOK_FINAL_HTML_INVALID"), {
      code: "LIFE_BOOK_FINAL_HTML_INVALID",
      status: 422,
      issues: validation.issues,
    });
  }
  return fullHtml;
}

export { DISCLAIMER as LIFE_BOOK_DISCLAIMER };
