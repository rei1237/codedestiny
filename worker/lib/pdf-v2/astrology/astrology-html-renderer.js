import { asArray, clean, escapeHtml, stripTags } from "./astrology-premium.types.js";
import {
  assertAllConfiguredChaptersIncluded,
  assertAstrologyVisualBlocksIncluded,
  assertNoForeignSystemTermsLeaked,
  assertNoRawJsonLeak,
  assertNoRepeatedHeadings,
  assertNoUndefinedValues,
  validateAstrologyFinalReportHtml,
} from "./astrology-validator.js";

export const ASTROLOGY_DISCLAIMER = "본 리포트는 점성술을 바탕으로 한 자기이해와 엔터테인먼트 목적의 콘텐츠입니다. 중요한 의사결정은 현실의 정보, 전문가 상담, 본인의 판단을 함께 고려해 주세요.";

function valueText(value, fallback = "제공된 계산 결과 안에서 확인합니다.") {
  const text = clean(value);
  return escapeHtml(text || fallback);
}

function pointText(point) {
  if (!point) return "";
  if (typeof point !== "object") return clean(point);
  return [point.name || point.label, point.sign || point.signKo, point.house ? `${point.house}하우스` : "", point.degree || point.longitude]
    .map((item) => clean(item))
    .filter(Boolean)
    .join(" ");
}

function tableCell(value) {
  return `<td>${valueText(value, "제한")}</td>`;
}

function buildPlanetTable(planets = []) {
  const rows = asArray(planets).slice(0, 12).map((planet) => `<tr>
    ${tableCell(planet.name || planet.label || planet.planet)}
    ${tableCell(planet.sign || planet.signKo || planet.zodiacSign)}
    ${tableCell(Number.isFinite(Number(planet.house)) ? `${Number(planet.house)}하우스` : "")}
    ${tableCell(planet.degree || planet.longitude)}
    ${tableCell(planet.retrograde ? "역행" : "순행")}
  </tr>`).join("");
  return `<table class="astro-table astro-planet-table">
    <thead><tr><th>행성</th><th>별자리</th><th>하우스</th><th>도수</th><th>상태</th></tr></thead>
    <tbody>${rows || `<tr>${tableCell("행성 정보 제한")}${tableCell("")}${tableCell("")}${tableCell("")}${tableCell("")}</tr>`}</tbody>
  </table>`;
}

function buildHouseTable(houses = []) {
  const rows = asArray(houses).slice(0, 12).map((house) => `<tr>
    ${tableCell(Number.isFinite(Number(house.house || house.number)) ? `${Number(house.house || house.number)}하우스` : "")}
    ${tableCell(house.sign || house.signKo)}
    ${tableCell(house.cuspDegree || house.degree || house.longitude)}
    ${tableCell(asArray(house.planets).map((planet) => clean(planet?.name || planet?.label || planet)).filter(Boolean).slice(0, 5).join(", "))}
  </tr>`).join("");
  return `<table class="astro-table astro-house-table">
    <thead><tr><th>하우스</th><th>커스프 별자리</th><th>도수</th><th>배치 행성</th></tr></thead>
    <tbody>${rows || `<tr>${tableCell("하우스 정보 제한")}${tableCell("")}${tableCell("")}${tableCell("")}</tr>`}</tbody>
  </table>`;
}

function buildAspectTable(aspects = []) {
  const rows = asArray(aspects).slice(0, 12).map((aspect) => `<tr>
    ${tableCell([aspect.planetA || aspect.p1 || aspect.from, aspect.planetB || aspect.p2 || aspect.to].map(clean).filter(Boolean).join(" - "))}
    ${tableCell(aspect.type || aspect.aspect)}
    ${tableCell(aspect.orb)}
    ${tableCell(aspect.applying ? "접근" : "확인")}
  </tr>`).join("");
  return `<table class="astro-table astro-aspect-table">
    <thead><tr><th>행성 연결</th><th>어스펙트</th><th>오브</th><th>흐름</th></tr></thead>
    <tbody>${rows || `<tr>${tableCell("어스펙트 정보 제한")}${tableCell("")}${tableCell("")}${tableCell("")}</tr>`}</tbody>
  </table>`;
}

function buildTransitList(transits = []) {
  const items = asArray(transits).slice(0, 8);
  return `<ol class="astro-transit-list">
    ${(items.length ? items : [{ theme: "현재 트랜짓 정보는 제공된 계산 결과 안에서 제한적으로 확인합니다." }]).map((transit) => `<li>${valueText([
      transit.planet,
      transit.sign,
      transit.aspectToNatal,
      transit.theme,
    ].map(clean).filter(Boolean).join(" · "))}</li>`).join("")}
  </ol>`;
}

function buildInputSummary(input = {}) {
  const rows = [
    ["이름", input.userName],
    ["성별", input.gender],
    ["생년월일", input.birthDate],
    ["출생시간", input.birthTime || "미상"],
    ["출생지", input.birthPlace || "미입력"],
    ["시간대", input.timezone || "미입력"],
    ["황도 기준", input.zodiacType || "제공 기준"],
    ["하우스 시스템", input.houseSystem || "제공 기준"],
  ];
  return `<section class="astro-input-summary">
    <h2>사용자 입력 요약</h2>
    <table class="astro-table astro-input-table"><tbody>${rows.map(([label, value]) => `<tr><th>${escapeHtml(label)}</th>${tableCell(value)}</tr>`).join("")}</tbody></table>
  </section>`;
}

function buildChartBasis(input = {}) {
  const chart = input.astrologyChart || {};
  const warnings = asArray(input.warnings).map((item) => clean(item)).filter(Boolean);
  return `<section class="astro-chart-basis">
    <h2>차트 기준 정보</h2>
    <ul>
      <li>황도 기준: ${valueText(input.zodiacType || chart.zodiacType || "제공 기준")}</li>
      <li>하우스 시스템: ${valueText(input.houseSystem || chart.houseSystem || "제공 기준")}</li>
      <li>출생지: ${valueText(input.birthPlace || "미입력")}</li>
      <li>시간대: ${valueText(input.timezone || "미입력")}</li>
      <li>출생시간 정확도: ${valueText(input.birthTime ? "입력된 출생시간 기준" : "출생시간 미상, 상승궁·하우스·MC 해석 제한")}</li>
    </ul>
    ${warnings.length ? `<p class="astro-note">${escapeHtml(warnings.join(" "))}</p>` : ""}
  </section>`;
}

function buildCoreChartSummary(input = {}) {
  const chart = input.astrologyChart || {};
  return `<section class="astro-core-summary">
    <h2>핵심 차트 요약</h2>
    <div class="astro-core-grid">
      <p><strong>태양</strong>${valueText(pointText(chart.sun))}</p>
      <p><strong>달</strong>${valueText(pointText(chart.moon))}</p>
      <p><strong>상승궁</strong>${valueText(pointText(chart.ascendant), "출생시간 기준 정보가 제한됩니다.")}</p>
      <p><strong>MC</strong>${valueText(pointText(chart.midheaven), "출생시간 기준 정보가 제한됩니다.")}</p>
    </div>
    ${buildPlanetTable(chart.planets)}
    ${buildHouseTable(chart.houses)}
    ${buildAspectTable(chart.aspects)}
    <section class="astro-transit-panel">
      <h3>주요 트랜짓</h3>
      ${buildTransitList(chart.transits)}
    </section>
  </section>`;
}

function extractAdvice(chapters = []) {
  const advice = [];
  for (const chapter of asArray(chapters)) {
    for (const item of asArray(chapter.advice)) {
      if (clean(item) && advice.length < 12) advice.push(clean(item));
    }
  }
  return advice;
}

function buildFinalAdvice(chapters = []) {
  const advice = extractAdvice(chapters);
  return `<section class="astro-final-advice">
    <h2>종합 별자리 처방</h2>
    <ul>${(advice.length ? advice : ["차트에서 반복되는 신호를 하루의 선택 기준으로 삼아 보세요.", "관계와 일의 리듬을 분리해 무리한 결정을 늦추세요.", "현재 트랜짓이 건드리는 영역을 기록하며 작은 실천으로 운을 조율하세요."]).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
  </section>`;
}

export function assembleFinalHtml({ input = {}, chapters = [], chapterPlan = {}, reportId = "" } = {}) {
  const safeChapters = asArray(chapters);
  const generatedAt = new Date().toISOString();
  const title = `${clean(input.userName) || "나"}의 점성술 프리미엄 리포트`;
  const chapterHtml = safeChapters.map((chapter) => String(chapter.html || "").trim()).filter(Boolean).join("\n");
  const fullHtml = `<!doctype html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(title)}</title>
  <style>
    body{font-family:"Noto Sans KR","Apple SD Gothic Neo",Arial,sans-serif;color:#1e1a2d;background:#fbf8ff;line-height:1.72;margin:0;padding:42px;}
    .astro-cover{min-height:520px;display:flex;flex-direction:column;justify-content:center;border-bottom:1px solid #d8cbe8;margin-bottom:32px;background:linear-gradient(135deg,#f8f2ff,#eef7ff);padding:40px;}
    .astro-cover h1{font-size:30px;line-height:1.35;margin:0 0 18px;color:#241936;}
    .astro-cover p{max-width:760px;font-size:14px;color:#5a5367;}
    h2{font-size:20px;line-height:1.45;margin:30px 0 12px;color:#302047;}
    h3{font-size:15px;margin:22px 0 8px;color:#493760;}
    p,li{font-size:13.5px;}
    p{margin:0 0 12px;}
    .astro-input-summary,.astro-chart-basis,.astro-core-summary,.astro-final-advice,.astro-disclaimer{page-break-inside:avoid;margin:28px 0;padding:18px 0;border-top:1px solid #ded2ec;}
    .astrology-chapter{page-break-before:always;margin:34px 0 0;padding-top:8px;}
    .chapter-summary{border-left:3px solid #7f5fb4;padding-left:14px;margin:12px 0 18px;color:#403452;}
    .chapter-body p{margin-bottom:13px;}
    .chapter-advice{background:#f3eef9;border:1px solid #e1d7ee;padding:14px 18px;margin-top:18px;}
    .astro-table{width:100%;border-collapse:collapse;margin:12px 0 18px;font-size:11.5px;background:#fff;}
    .astro-table th{background:#eee7f7;color:#3b2d52;text-align:left;border:1px solid #d8cbe8;padding:7px;vertical-align:top;}
    .astro-table td{border:1px solid #e7dfef;padding:7px;vertical-align:top;}
    .astro-core-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin:14px 0;}
    .astro-core-grid p{background:#fff;border:1px solid #e7dfef;padding:10px;margin:0;}
    .astro-core-grid strong{display:block;color:#604a7f;margin-bottom:4px;}
    .astro-transit-list{background:#fff;border:1px solid #e7dfef;margin:8px 0 18px;padding:12px 12px 12px 28px;}
    .astro-note,.astro-disclaimer p{font-size:12px;color:#675d75;}
  </style>
</head>
<body>
  <section class="astro-cover">
    <p>서양 점성술 프리미엄 리포트</p>
    <h1>${escapeHtml(title)}</h1>
    <p>계산된 출생 차트와 현재 트랜짓을 바탕으로 성격, 관계, 직업, 재물, 전환점의 흐름을 상담형으로 정리했습니다.</p>
    <p class="astro-note">리포트 ID ${escapeHtml(reportId)} · 생성 시각 ${escapeHtml(generatedAt)}</p>
  </section>
  ${buildInputSummary(input)}
  ${buildChartBasis(input)}
  ${buildCoreChartSummary(input)}
  ${chapterHtml}
  ${buildFinalAdvice(safeChapters)}
  <section class="astro-disclaimer">
    <h2>안내</h2>
    <p>${escapeHtml(ASTROLOGY_DISCLAIMER)}</p>
  </section>
</body>
</html>`;

  assertAllConfiguredChaptersIncluded(fullHtml, chapterPlan.chapters || []);
  assertNoRepeatedHeadings(fullHtml);
  assertNoRawJsonLeak(fullHtml);
  assertNoUndefinedValues(fullHtml);
  assertNoForeignSystemTermsLeaked(fullHtml);
  assertAstrologyVisualBlocksIncluded(fullHtml);
  const validation = validateAstrologyFinalReportHtml(fullHtml, safeChapters, chapterPlan);
  if (!validation.ok) {
    throw Object.assign(new Error("ASTROLOGY_FINAL_HTML_INVALID"), {
      code: "ASTROLOGY_FINAL_HTML_INVALID",
      status: 422,
      issues: validation.issues,
    });
  }
  return fullHtml;
}

export function extractPlainPdfText(html) {
  return stripTags(html);
}
