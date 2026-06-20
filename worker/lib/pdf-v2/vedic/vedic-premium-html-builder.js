import { asArray, clean, escapeHtml } from "./vedic-premium.types.js";
import { vedicPremiumChapterPlanV2 } from "./vedic-premium.chapter-plan.js";
import {
  assertAllConfiguredChaptersIncluded,
  assertNoForeignSystemTermsLeaked,
  assertNoRawJsonLeak,
  assertNoUndefinedValues,
  assertVedicVisualElementsIncluded,
  validateVedicFinalReportHtml,
} from "./vedic-premium.validator.js";

function valueOrDash(value) {
  return clean(value) || "-";
}

function summaryRows(input = {}) {
  const profile = input.userProfile || {};
  const chart = input.chart || {};
  const currentDasha = asArray(chart.dashas)[0];
  const yogas = asArray(chart.yogas).slice(0, 3).map((row) => row.name).filter(Boolean).join(", ");
  return [
    ["이름", valueOrDash(profile.name)],
    ["성별", valueOrDash(profile.gender)],
    ["생년월일", valueOrDash(profile.birthDate)],
    ["출생시간", valueOrDash(profile.birthTime)],
    ["출생지", valueOrDash(profile.birthPlace)],
    ["라그나", valueOrDash(chart.lagna || chart.ascendant)],
    ["문사인", valueOrDash(chart.moonSign)],
    ["태양사인", valueOrDash(chart.sunSign)],
    ["나크샤트라", valueOrDash(chart.nakshatra)],
    ["현재 다샤", valueOrDash(currentDasha?.planet)],
    ["핵심 요가", valueOrDash(yogas)],
  ];
}

function chartHighlights(input = {}) {
  const chart = input.chart || {};
  const planetCount = asArray(chart.planets).length;
  const houseCount = asArray(chart.rashiChart).length;
  const dashaCount = asArray(chart.dashas).length;
  return [
    `라시 차트는 ${houseCount || "제공된"} 하우스 정보를 기준으로 정리했습니다.`,
    `행성 배치는 ${planetCount || "제공된"} 그라하 정보를 중심으로 해석했습니다.`,
    `다샤 흐름은 ${dashaCount ? "제공된 비무쇼타리 다샤" : "제공된 계산 결과의 현재 흐름"} 기준으로 다룹니다.`,
  ];
}

function rashiHouseRows(input = {}) {
  const houses = new Map(asArray(input?.chart?.rashiChart).map((row) => [Number(row.house), row]));
  return Array.from({ length: 12 }).map((_, index) => {
    const houseNumber = index + 1;
    const row = houses.get(houseNumber) || {};
    const planets = asArray(row.planets).map((planet) => clean(planet)).filter(Boolean);
    return {
      house: houseNumber,
      sign: valueOrDash(row.sign),
      lord: valueOrDash(row.lord),
      planets,
      planetText: planets.length ? planets.join(", ") : "-",
    };
  });
}

function renderSummaryTable(rows = []) {
  return `<table class="summary-table" data-vedic-visual="summary-table"><tbody>${rows.map(([label, value]) => (
    `<tr><th>${escapeHtml(label)}</th><td>${escapeHtml(value)}</td></tr>`
  )).join("")}</tbody></table>`;
}

function renderRashiHouseGrid(input = {}) {
  const rows = rashiHouseRows(input);
  return `<div class="rashi-grid" data-vedic-visual="rashi-house-grid">${rows.map((row) => (
    `<div class="house-cell" data-house="${row.house}"><strong>${row.house}H</strong><span>${escapeHtml(row.sign)}</span><small>${escapeHtml(row.planetText)}</small></div>`
  )).join("")}</div>`;
}

function renderPlanetDensityBars(input = {}) {
  const rows = rashiHouseRows(input);
  const maxCount = Math.max(1, ...rows.map((row) => row.planets.length));
  return `<div class="bar-chart" data-vedic-visual="planet-density-bars">${rows.map((row) => {
    const width = Math.max(4, Math.round((row.planets.length / maxCount) * 100));
    const label = `${row.house}H ${row.sign}`;
    return `<div class="bar-row"><span>${escapeHtml(label)}</span><div class="bar-track"><i class="bar-fill" style="width:${width}%"></i></div><b>${row.planets.length}</b></div>`;
  }).join("")}</div>`;
}

function renderDashaTable(input = {}) {
  const dashas = asArray(input?.chart?.dashas).slice(0, 6);
  const rows = dashas.length ? dashas : [{ type: "-", planet: "-", startDate: "-", endDate: "-", theme: "제공된 계산 결과 기준에서는 확인이 제한됩니다" }];
  return `<table class="visual-table" data-vedic-visual="dasha-table"><thead><tr><th>구분</th><th>그라하</th><th>시작</th><th>종료</th><th>흐름</th></tr></thead><tbody>${rows.map((row) => (
    `<tr><td>${escapeHtml(valueOrDash(row.type))}</td><td>${escapeHtml(valueOrDash(row.planet))}</td><td>${escapeHtml(valueOrDash(row.startDate))}</td><td>${escapeHtml(valueOrDash(row.endDate))}</td><td>${escapeHtml(valueOrDash(row.theme))}</td></tr>`
  )).join("")}</tbody></table>`;
}

function renderYogaTable(input = {}) {
  const yogas = asArray(input?.chart?.yogas).slice(0, 6);
  const rows = yogas.length ? yogas : [{ name: "-", strength: "-", meaning: "제공된 계산 결과 기준에서는 확인이 제한됩니다" }];
  return `<table class="visual-table" data-vedic-visual="yoga-table"><thead><tr><th>요가</th><th>강도</th><th>의미</th></tr></thead><tbody>${rows.map((row) => (
    `<tr><td>${escapeHtml(valueOrDash(row.name))}</td><td>${escapeHtml(valueOrDash(row.strength))}</td><td>${escapeHtml(valueOrDash(row.meaning))}</td></tr>`
  )).join("")}</tbody></table>`;
}

function renderChapterPlanTable(chapters = []) {
  const byId = new Map(asArray(chapters).map((chapter) => [chapter.id, chapter]));
  return `<table class="chapter-plan-table" data-vedic-visual="chapter-plan-table"><thead><tr><th>순서</th><th>장</th><th>소제목</th><th>상태</th></tr></thead><tbody>${vedicPremiumChapterPlanV2.chapters.map((plan) => {
    const chapter = byId.get(plan.id) || {};
    const sectionCount = asArray(chapter.sections).length || asArray(plan.sections).length;
    const status = clean(chapter.status) || "completed";
    return `<tr><td>${plan.order}</td><td>${escapeHtml(plan.title)}</td><td>${sectionCount}/${plan.sections.length}</td><td>${escapeHtml(status)}</td></tr>`;
  }).join("")}</tbody></table>`;
}

function renderVisualDashboard(input = {}, chapters = []) {
  return `<section class="visual-dashboard" data-vedic-visual="chart-dashboard">
      <h2>차트 시각 요약</h2>
      <div class="visual-grid">
        <div class="visual-card">
          <h3>라시 하우스 배열</h3>
          ${renderRashiHouseGrid(input)}
        </div>
        <div class="visual-card">
          <h3>하우스별 그라하 밀도</h3>
          ${renderPlanetDensityBars(input)}
        </div>
      </div>
      <div class="visual-table-wrap">
        <h3>비무쇼타리 다샤 흐름</h3>
        ${renderDashaTable(input)}
      </div>
      <div class="visual-table-wrap">
        <h3>핵심 요가</h3>
        ${renderYogaTable(input)}
      </div>
      <div class="visual-table-wrap">
        <h3>전체 장 구성</h3>
        ${renderChapterPlanTable(chapters)}
      </div>
    </section>`;
}

export function assembleVedicPremiumHtml({ input, chapters, reportId = "" }) {
  const rows = summaryRows(input);
  const highlights = chartHighlights(input);
  const visuals = renderVisualDashboard(input, chapters);
  const toc = chapters
    .map((chapter) => `<li><span>${chapter.order}</span>${escapeHtml(chapter.title)}</li>`)
    .join("");
  const chapterHtml = chapters.map((chapter) => chapter.html).join("\n");
  const warningHtml = asArray(input.warnings).length
    ? `<section class="notice"><h2>계산 정보 안내</h2>${input.warnings.map((item) => `<p>${escapeHtml(item)}</p>`).join("")}</section>`
    : "";

  const html = `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <title>베다점 프리미엄 PDF</title>
  <style>
    body{margin:0;background:#f5efe4;color:#241b16;font-family:"Noto Serif KR","Noto Sans KR",serif;line-height:1.78}
    .page{max-width:980px;margin:0 auto;background:#fffaf2;min-height:100vh;padding:56px 64px}
    .cover{padding:72px 0 46px;border-bottom:1px solid #d5bf91;text-align:center}
    .kicker{letter-spacing:.22em;color:#8b5e18;font-size:13px;font-weight:800}
    h1{font-size:31px;margin:18px 0 12px;color:#3b2414;letter-spacing:0}
    h2{font-size:20px;margin:0 0 12px;color:#6b3f13;letter-spacing:0}
    p{font-size:16px;margin:0 0 13px}
    .intro,.summary,.chart,.visual-dashboard,.toc,.notice,.closing{margin:34px 0}
    table{width:100%;border-collapse:collapse;margin:14px 0 22px;font-size:14px;break-inside:avoid}
    th,td{border:1px solid #decba6;padding:9px 10px;text-align:left;vertical-align:top}
    th{background:#f0dfbd;color:#6b3f13;font-weight:800}
    td{background:#fff8eb}
    .summary-table th{width:28%}
    .visual-grid{display:grid;grid-template-columns:1.1fr .9fr;gap:16px;margin:14px 0 22px}
    .visual-card{border:1px solid #d8c293;background:#fff5e4;padding:16px;border-radius:8px;break-inside:avoid}
    .visual-card h3,.visual-table-wrap h3{font-size:16px;margin:0 0 12px;color:#7b4b16}
    .rashi-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:7px}
    .house-cell{min-height:76px;border:1px solid #e2cfaa;background:#fffaf2;padding:8px;border-radius:6px}
    .house-cell strong{display:block;color:#8b5e18}
    .house-cell span{display:block;font-size:13px;font-weight:800;margin-top:2px}
    .house-cell small{display:block;font-size:11px;color:#65564a;margin-top:4px;line-height:1.35}
    .bar-row{display:grid;grid-template-columns:70px 1fr 24px;gap:8px;align-items:center;margin:7px 0;font-size:12px}
    .bar-track{height:9px;background:#ead9b7;border-radius:999px;overflow:hidden}
    .bar-fill{display:block;height:100%;background:linear-gradient(90deg,#8b5e18,#c99031)}
    .visual-table-wrap{break-inside:avoid;margin:24px 0}
    .chart ul,.toc ol{padding-left:22px}
    .toc{break-after:page}
    .toc li{margin:8px 0}
    .toc span{display:inline-block;width:28px;color:#8b5e18;font-weight:800}
    article{break-before:page;padding:28px 0}
    article h1{border-bottom:2px solid #ad7b34;padding-bottom:12px}
    article section{margin:28px 0;break-inside:avoid}
    .notice,.closing{border-top:1px solid #d5bf91;padding-top:18px;color:#5f4d3d}
    @media print{body{background:#fff}.page{padding:40px 48px;max-width:none}article{break-before:page}}
  </style>
</head>
<body>
  <main class="page" data-vedic-premium-report-id="${escapeHtml(reportId)}">
    <section class="cover">
      <div class="kicker">VEDIC JYOTISH PREMIUM</div>
      <h1>베다점 프리미엄 PDF</h1>
      <p>라그나, 나크샤트라, 다샤와 그라하의 흐름을 바탕으로 지금의 삶을 차분히 비춥니다.</p>
    </section>
    <section class="intro">
      <h2>안내</h2>
      <p>이 리딩은 제공된 베다점 계산 결과를 바탕으로 한 자기이해와 성찰 목적의 상담형 해석입니다.</p>
    </section>
    <section class="summary">
      <h2>입력 정보 요약</h2>
      ${renderSummaryTable(rows)}
    </section>
    <section class="chart">
      <h2>베다 차트 핵심 요약</h2>
      <ul>${highlights.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
    </section>
    ${visuals}
    ${warningHtml}
    <section class="toc">
      <h1>목차</h1>
      <ol>${toc}</ol>
    </section>
    ${chapterHtml}
    <section class="closing">
      <h2>최종 요약</h2>
      <p>전체 차트는 삶을 하나의 고정된 결론으로 묶기보다, 반복되는 선택의 리듬과 성장의 방향을 조용히 드러냅니다.</p>
      <p>중요한 건강, 법률, 투자, 결혼 결정은 이 리딩만으로 단정하지 말고 현실의 전문가 조언과 함께 판단해 주세요.</p>
    </section>
  </main>
</body>
</html>`;

  assertAllConfiguredChaptersIncluded(html, vedicPremiumChapterPlanV2.chapters);
  assertNoRawJsonLeak(html);
  assertNoUndefinedValues(html);
  assertNoForeignSystemTermsLeaked(html);
  assertVedicVisualElementsIncluded(html);
  const validation = validateVedicFinalReportHtml(html, chapters, vedicPremiumChapterPlanV2);
  if (!validation.ok) {
    throw Object.assign(new Error("VEDIC_FINAL_HTML_INVALID"), {
      code: "VEDIC_FINAL_HTML_INVALID",
      status: 422,
      issues: validation.issues,
    });
  }
  return html;
}
