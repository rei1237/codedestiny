import { asArray, clean, escapeHtml } from "./vedic-premium.types.js";
import { VEDIC_LLM_VERSION, vedicPremiumChapterPlanV2 } from "./vedic-chapters.js";
import {
  assertAllConfiguredChaptersIncluded,
  assertNoForeignSystemTermsLeaked,
  assertNoRawJsonLeak,
  assertNoUndefinedValues,
  assertVedicVisualElementsIncluded,
  validateVedicFinalReportHtml,
} from "./vedic-validator.js";

function valueOrDash(value) {
  return clean(value) || "-";
}

function summaryRows(input = {}) {
  const profile = input.userProfile || {};
  const chart = input.chart || {};
  const basis = input.calculationBasis || {};
  const currentDasha = chart.currentDasha || asArray(chart.dashas)[0] || {};
  return [
    ["이름", valueOrDash(profile.name)],
    ["성별", valueOrDash(profile.gender)],
    ["생년월일", valueOrDash(profile.birthDate)],
    ["출생시간", valueOrDash(profile.birthTime)],
    ["출생지", valueOrDash(profile.birthPlace)],
    ["시간대", valueOrDash(profile.timezone || basis.timezone)],
    ["아야남샤", valueOrDash(basis.ayanamsa || chart.ayanamsa)],
    ["조디악", valueOrDash(basis.zodiacType || basis.zodiac || "sidereal")],
    ["출생시간 정확도", valueOrDash(basis.birthTimeConfidence || input.birthTimeConfidence || "provided")],
    ["라그나", valueOrDash(chart.lagna || chart.ascendant)],
    ["달", valueOrDash(chart.moonSign)],
    ["태양", valueOrDash(chart.sunSign)],
    ["나크샤트라", valueOrDash(chart.nakshatra)],
    ["현재 다샤", valueOrDash(currentDasha.planet || currentDasha.lord || currentDasha.name)],
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

function renderChapterPlanTable(chapters = [], chapterPlan = vedicPremiumChapterPlanV2) {
  const byId = new Map(asArray(chapters).map((chapter) => [chapter.id, chapter]));
  return `<table class="chapter-plan-table" data-vedic-visual="chapter-plan-table"><thead><tr><th>순서</th><th>카테고리</th><th>장</th><th>상태</th></tr></thead><tbody>${asArray(chapterPlan.chapters).map((plan) => {
    const chapter = byId.get(plan.id) || {};
    const status = clean(chapter.status) || "completed";
    return `<tr><td>${plan.order}</td><td>${escapeHtml(plan.category)}</td><td>${escapeHtml(plan.title)}</td><td>${escapeHtml(status)}</td></tr>`;
  }).join("")}</tbody></table>`;
}

function renderVisualDashboard(input = {}, chapters = [], chapterPlan = vedicPremiumChapterPlanV2) {
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
        ${renderChapterPlanTable(chapters, chapterPlan)}
      </div>
    </section>`;
}

function renderCoreChartList(input = {}) {
  const chart = input.chart || {};
  const planets = asArray(chart.planets).slice(0, 9).map((planet) => `${valueOrDash(planet.name)} ${valueOrDash(planet.sign)} ${valueOrDash(planet.house ? `${planet.house}H` : "")}`.trim());
  const nakshatras = [chart.nakshatra, ...asArray(chart.nakshatras).map((item) => item?.name || item)].map(valueOrDash).filter((item) => item !== "-").slice(0, 5);
  const yogas = asArray(chart.yogas).map((item) => valueOrDash(item.name)).filter((item) => item !== "-").slice(0, 5);
  return `<ul>
    <li>라그나: ${escapeHtml(valueOrDash(chart.lagna || chart.ascendant))}</li>
    <li>달: ${escapeHtml(valueOrDash(chart.moonSign))}</li>
    <li>태양: ${escapeHtml(valueOrDash(chart.sunSign))}</li>
    <li>주요 행성: ${escapeHtml(planets.length ? planets.join(" / ") : "제공된 계산 결과 기준에서 제한적으로 확인됩니다")}</li>
    <li>주요 나크샤트라: ${escapeHtml(nakshatras.length ? nakshatras.join(" / ") : "제공된 계산 결과 기준에서 제한적으로 확인됩니다")}</li>
    <li>현재 다샤: ${escapeHtml(valueOrDash(chart.currentDasha?.planet || asArray(chart.dashas)[0]?.planet))}</li>
    <li>주요 요가: ${escapeHtml(yogas.length ? yogas.join(" / ") : "제공된 계산 결과 기준에서 제한적으로 확인됩니다")}</li>
  </ul>`;
}

function renderIntegratedAdvice(chapters = []) {
  const advice = chapters.flatMap((chapter) => asArray(chapter.adviceItems)).map(clean).filter(Boolean).slice(0, 7);
  const rows = advice.length ? advice : ["차트가 강하게 비추는 흐름을 하루의 작은 선택으로 낮추어 꾸준히 실천하세요."];
  return `<section class="integrated-advice">
    <h2>종합 베다 처방</h2>
    <ul>${rows.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
  </section>`;
}

export function assembleFinalVedicHtml({ input, chapters, reportId = "", chapterPlan = vedicPremiumChapterPlanV2 }) {
  const rows = summaryRows(input);
  const visuals = renderVisualDashboard(input, chapters, chapterPlan);
  const toc = chapters.map((chapter) => `<li><span>${chapter.order}</span>${escapeHtml(chapter.title)}</li>`).join("");
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
    body{margin:0;background:#f4ecdd;color:#241b16;font-family:"Noto Serif KR","Noto Sans KR",serif;line-height:1.78}
    .page{max-width:980px;margin:0 auto;background:#fffaf2;min-height:100vh;padding:56px 64px}
    .cover{position:relative;padding:82px 0 52px;border-bottom:1px solid #d5bf91;text-align:center}
    .cover:before{content:"";position:absolute;inset:22px auto auto 50%;width:164px;height:164px;transform:translateX(-50%);border:1px solid rgba(173,123,52,.42);border-radius:50%;box-shadow:0 0 0 18px rgba(201,144,49,.08),0 0 0 38px rgba(107,63,19,.05)}
    .kicker{position:relative;letter-spacing:.18em;color:#8b5e18;font-size:13px;font-weight:800}
    h1{position:relative;font-size:31px;margin:18px 0 12px;color:#3b2414;letter-spacing:0}
    h2{font-size:20px;margin:0 0 12px;color:#6b3f13;letter-spacing:0}
    h3{font-size:16px;margin:0 0 10px;color:#7b4b16;letter-spacing:0}
    p{font-size:16px;margin:0 0 13px}
    .intro,.summary,.chart-basis,.chart-core,.visual-dashboard,.toc,.notice,.integrated-advice,.disclaimer{margin:34px 0}
    table{width:100%;border-collapse:collapse;margin:14px 0 22px;font-size:14px;break-inside:avoid}
    th,td{border:1px solid #decba6;padding:9px 10px;text-align:left;vertical-align:top}
    th{background:#f0dfbd;color:#6b3f13;font-weight:800}
    td{background:#fff8eb}
    .summary-table th{width:28%}
    .visual-grid{display:grid;grid-template-columns:1.1fr .9fr;gap:16px;margin:14px 0 22px}
    .visual-card{border:1px solid #d8c293;background:#fff5e4;padding:16px;border-radius:8px;break-inside:avoid}
    .rashi-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:7px}
    .house-cell{min-height:76px;border:1px solid #e2cfaa;background:#fffaf2;padding:8px;border-radius:6px}
    .house-cell strong{display:block;color:#8b5e18}
    .house-cell span{display:block;font-size:13px;font-weight:800;margin-top:2px}
    .house-cell small{display:block;font-size:11px;color:#65564a;margin-top:4px;line-height:1.35}
    .bar-row{display:grid;grid-template-columns:70px 1fr 24px;gap:8px;align-items:center;margin:7px 0;font-size:12px}
    .bar-track{height:9px;background:#ead9b7;border-radius:999px;overflow:hidden}
    .bar-fill{display:block;height:100%;background:linear-gradient(90deg,#8b5e18,#c99031)}
    .visual-table-wrap{break-inside:avoid;margin:24px 0}
    .chart-core ul,.integrated-advice ul,.toc ol{padding-left:22px}
    .toc{break-after:page}
    .toc li{margin:8px 0}
    .toc span{display:inline-block;width:28px;color:#8b5e18;font-weight:800}
    .vedic-chapter{break-before:page;padding:28px 0}
    .vedic-chapter>h2{border-bottom:2px solid #ad7b34;padding-bottom:12px;font-size:24px}
    .chapter-summary,.chapter-body,.chapter-advice{margin:24px 0;break-inside:avoid}
    .chapter-summary{border-left:4px solid #c99031;background:#fff5e4;padding:15px 17px}
    .chapter-advice{border:1px solid #decba6;background:#fff8eb;padding:17px;border-radius:8px}
    .notice,.integrated-advice,.disclaimer{border-top:1px solid #d5bf91;padding-top:18px;color:#5f4d3d}
    @media print{body{background:#fff}.page{padding:40px 48px;max-width:none}.vedic-chapter{break-before:page}}
  </style>
</head>
<body>
  <main class="page" data-vedic-premium-report-id="${escapeHtml(reportId)}" data-vedic-llm-version="${escapeHtml(VEDIC_LLM_VERSION)}">
    <section class="cover">
      <div class="kicker">VEDIC JYOTISH PREMIUM</div>
      <h1>베다점 프리미엄 PDF</h1>
      <p>라그나, 나크샤트라, 다샤와 그라하의 흐름이 지금의 삶을 차분히 비춥니다.</p>
    </section>
    <section class="summary">
      <h2>태어난 순간의 기준</h2>
      ${renderSummaryTable(rows)}
    </section>
    <section class="chart-basis">
      <h2>베다 차트 기준 정보</h2>
      <p>아야남샤와 조디악 기준, 출생지, 시간대, 출생시간 정확도는 제공된 계산값에 맞추어 표시했습니다.</p>
    </section>
    <section class="chart-core">
      <h2>핵심 차트 요약</h2>
      ${renderCoreChartList(input)}
    </section>
    ${visuals}
    ${warningHtml}
    <section class="toc">
      <h1>목차</h1>
      <ol>${toc}</ol>
    </section>
    ${chapterHtml}
    ${renderIntegratedAdvice(chapters)}
    <section class="disclaimer">
      <h2>안내</h2>
      <p>본 리포트는 베다 점성술을 바탕으로 한 자기이해와 엔터테인먼트 목적의 콘텐츠입니다. 중요한 의사결정은 현실의 정보, 전문가 상담, 본인의 판단을 함께 고려해 주세요.</p>
    </section>
  </main>
</body>
</html>`;

  assertAllConfiguredChaptersIncluded(html, chapterPlan.chapters);
  assertNoRawJsonLeak(html);
  assertNoUndefinedValues(html);
  assertNoForeignSystemTermsLeaked(html);
  assertVedicVisualElementsIncluded(html);
  const validation = validateVedicFinalReportHtml(html, chapters, chapterPlan);
  if (!validation.ok) {
    throw Object.assign(new Error("VEDIC_FINAL_HTML_INVALID"), {
      code: "VEDIC_FINAL_HTML_INVALID",
      status: 422,
      issues: validation.issues,
    });
  }
  return html;
}

export const assembleVedicPremiumHtml = assembleFinalVedicHtml;
