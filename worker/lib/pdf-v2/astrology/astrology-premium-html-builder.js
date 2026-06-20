import { asArray, clean, escapeHtml } from "./astrology-premium.types.js";
import { astrologyPremiumChapterPlanV2 } from "./astrology-premium.chapter-plan.js";
import {
  assertAllConfiguredChaptersIncluded,
  assertAstrologyVisualBlocksIncluded,
  assertEachChapterRenderedOnce,
  assertNoForeignSystemTermsLeaked,
  assertNoRawJsonLeak,
  assertNoRepeatedHeadings,
  assertNoUnexpectedForeignTokens,
  assertNoUndefinedValues,
} from "./astrology-premium.validator.js";

function field(label, value) {
  const text = clean(value);
  if (!text) return "";
  return `<li><strong>${escapeHtml(label)}</strong><span>${escapeHtml(text)}</span></li>`;
}

function compactJoin(values = [], limit = 0) {
  const items = asArray(values).map((value) => clean(value)).filter(Boolean);
  const sliced = limit > 0 ? items.slice(0, limit) : items;
  return sliced.join(", ");
}

function displayZodiacType(value) {
  const key = clean(value).toLowerCase();
  if (key === "tropical") return "열대 황도";
  if (key === "sidereal") return "항성 황도";
  return key ? "제공된 황도 기준" : "";
}

function displayHouseSystem(value) {
  const key = clean(value).toLowerCase();
  if (key === "placidus") return "플라시두스";
  if (key === "whole-sign" || key === "whole sign" || key === "wholesign") return "홀사인";
  if (key === "koch") return "코흐";
  if (key === "equal") return "이퀄 하우스";
  return key ? "제공된 하우스 시스템" : "";
}

function hasLongLatinToken(value) {
  return /\b[A-Za-z][A-Za-z0-9_-]{2,}\b/.test(clean(value));
}

function displayProfileName(value) {
  const text = clean(value);
  if (!text) return "사용자";
  return hasLongLatinToken(text) ? "사용자" : text;
}

function displayGender(value) {
  const key = clean(value).toLowerCase();
  if (["female", "f", "woman", "여", "여성"].includes(key)) return "여성";
  if (["male", "m", "man", "남", "남성"].includes(key)) return "남성";
  return key ? "입력된 성별" : "";
}

function displayTimezone(value) {
  const key = clean(value).toLowerCase();
  if (key === "asia/seoul" || key === "kst" || key === "+09:00" || key === "9") return "한국 표준시";
  return key ? "입력된 시간대" : "";
}

function displayBirthPlace(value) {
  const text = clean(value);
  if (!text) return "";
  return hasLongLatinToken(text) ? "입력된 출생지" : text;
}

function planetSummary(planets = []) {
  return compactJoin(asArray(planets).map((planet) => {
    const parts = [
      clean(planet.name),
      clean(planet.sign),
      Number.isFinite(Number(planet.house)) ? `${Number(planet.house)}하우스` : "",
      clean(planet.retrograde ? "역행" : ""),
    ].filter(Boolean);
    return parts.join(" ");
  }), 12);
}

function aspectSummary(aspects = []) {
  return compactJoin(asArray(aspects).map((aspect) => {
    const pair = [clean(aspect.planetA), clean(aspect.planetB)].filter(Boolean).join("-");
    return [pair, clean(aspect.type), clean(aspect.orb)].filter(Boolean).join(" ");
  }), 8);
}

function transitSummary(transits = []) {
  return compactJoin(asArray(transits).map((transit) => (
    [clean(transit.planet), clean(transit.sign), clean(transit.aspectToNatal), clean(transit.theme)].filter(Boolean).join(" ")
  )), 6);
}

function tableCell(value) {
  return `<td>${escapeHtml(clean(value) || "제공된 계산 결과 기준에서는 확인이 제한됩니다")}</td>`;
}

function buildPlanetTable(planets = []) {
  const rows = asArray(planets).slice(0, 12).map((planet) => `<tr>
    ${tableCell(planet.name)}
    ${tableCell(planet.sign)}
    ${tableCell(Number.isFinite(Number(planet.house)) ? `${Number(planet.house)}하우스` : "")}
    ${tableCell(planet.degree)}
    ${tableCell(planet.retrograde ? "역행" : "순행")}
  </tr>`).join("");
  return `<table class="astro-table astro-planet-table">
    <thead><tr><th>행성</th><th>별자리</th><th>하우스</th><th>도수</th><th>상태</th></tr></thead>
    <tbody>${rows || `<tr>${tableCell("행성 정보 제한")}${tableCell("")}${tableCell("")}${tableCell("")}${tableCell("")}</tr>`}</tbody>
  </table>`;
}

function buildHouseTable(houses = []) {
  const rows = asArray(houses).slice(0, 12).map((house) => `<tr>
    ${tableCell(Number.isFinite(Number(house.house)) ? `${Number(house.house)}하우스` : "")}
    ${tableCell(house.sign)}
    ${tableCell(house.cuspDegree)}
    ${tableCell(compactJoin(house.planets, 5))}
  </tr>`).join("");
  return `<table class="astro-table astro-house-table">
    <thead><tr><th>하우스</th><th>커스프 별자리</th><th>도수</th><th>배치 행성</th></tr></thead>
    <tbody>${rows || `<tr>${tableCell("하우스 정보 제한")}${tableCell("")}${tableCell("")}${tableCell("")}</tr>`}</tbody>
  </table>`;
}

function buildAspectTable(aspects = []) {
  const rows = asArray(aspects).slice(0, 10).map((aspect) => `<tr>
    ${tableCell([aspect.planetA, aspect.planetB].filter(Boolean).join(" - "))}
    ${tableCell(aspect.type)}
    ${tableCell(aspect.orb)}
    ${tableCell(aspect.applying ? "접근" : "분리 또는 확인 제한")}
  </tr>`).join("");
  return `<table class="astro-table astro-aspect-table">
    <thead><tr><th>행성 연결</th><th>애스펙트</th><th>오브</th><th>흐름</th></tr></thead>
    <tbody>${rows || `<tr>${tableCell("애스펙트 정보 제한")}${tableCell("")}${tableCell("")}${tableCell("")}</tr>`}</tbody>
  </table>`;
}

function barWidth(value, maxValue) {
  const current = Number(value);
  const max = Math.max(1, Number(maxValue || 0));
  if (!Number.isFinite(current) || current <= 0) return 4;
  return Math.max(8, Math.min(100, Math.round((current / max) * 100)));
}

function buildBarList(title, values = {}, labels = []) {
  const maxValue = Math.max(...labels.map((item) => Number(values[item.key] || 0)), 1);
  return `<div class="astro-bar-card">
    <h3>${escapeHtml(title)}</h3>
    <div class="astro-bar-list astro-balance-bars">${labels.map((item) => {
      const value = Number(values[item.key] || 0);
      return `<div class="astro-bar-row">
        <span>${escapeHtml(item.label)}</span>
        <div class="astro-bar-track"><i style="width:${barWidth(value, maxValue)}%"></i></div>
        <b>${Number.isFinite(value) ? value : 0}</b>
      </div>`;
    }).join("")}</div>
  </div>`;
}

function buildTransitTimeline(transits = []) {
  const items = asArray(transits).slice(0, 6);
  return `<ol class="astro-transit-timeline">
    ${(items.length ? items : [{ theme: "제공된 점성술 계산 결과 기준에서는 현재 주요 트랜짓 확인이 제한됩니다" }]).map((transit, index) => `<li>
      <span>${escapeHtml(`흐름 ${index + 1}`)}</span>
      <p>${escapeHtml([transit.planet, transit.sign, transit.aspectToNatal, transit.theme].filter(Boolean).join(" · "))}</p>
    </li>`).join("")}
  </ol>`;
}

function buildVisualSummary(input = {}) {
  const chart = input.chart || {};
  return `<section class="astro-visual-section">
    <h2>차트 시각 요약</h2>
    <div class="astro-visual-grid">
      <section class="astro-visual-panel"><h3>주요 행성 배치표</h3>${buildPlanetTable(chart.planets)}</section>
      <section class="astro-visual-panel"><h3>12하우스 분포표</h3>${buildHouseTable(chart.houses)}</section>
      <section class="astro-visual-panel"><h3>핵심 애스펙트표</h3>${buildAspectTable(chart.aspects)}</section>
      <section class="astro-visual-panel">${buildBarList("원소 균형 그래프", chart.elements, [
        { key: "fire", label: "불" },
        { key: "earth", label: "흙" },
        { key: "air", label: "공기" },
        { key: "water", label: "물" },
      ])}</section>
      <section class="astro-visual-panel">${buildBarList("모달리티 균형 그래프", chart.modalities, [
        { key: "cardinal", label: "카디널" },
        { key: "fixed", label: "픽스드" },
        { key: "mutable", label: "뮤터블" },
      ])}</section>
      <section class="astro-visual-panel"><h3>트랜짓 흐름 타임라인</h3>${buildTransitTimeline(chart.transits)}</section>
    </div>
  </section>`;
}

function buildInputSummary(input = {}) {
  const profile = input.userProfile || {};
  const chart = input.chart || {};
  const items = [
    field("이름 또는 닉네임", displayProfileName(profile.name)),
    field("성별", displayGender(profile.gender)),
    field("생년월일", profile.birthDate),
    field("출생시간", profile.birthTime),
    field("출생지", displayBirthPlace(profile.birthPlace)),
    field("시간대", displayTimezone(profile.timezone)),
    field("태양 별자리", chart.sunSign),
    field("달 별자리", chart.moonSign),
    field("상승궁", chart.risingSign || chart.ascendant),
    field("MC", chart.midheaven),
    field("주요 행성 배치", planetSummary(chart.planets)),
    field("핵심 애스펙트", aspectSummary(chart.aspects)),
    field("현재 주요 트랜짓", transitSummary(chart.transits)),
  ].filter(Boolean).join("");
  return `<section class="astro-summary-block">
    <h2>입력 정보와 차트 요약</h2>
    <ul class="astro-summary-list">${items}</ul>
  </section>`;
}

function buildChartCoreSummary(input = {}) {
  const chart = input.chart || {};
  const warnings = asArray(input.warnings).map((item) => clean(item)).filter(Boolean);
  const elements = chart.elements || {};
  const modalities = chart.modalities || {};
  return `<section class="astro-summary-block">
    <h2>출생 차트 핵심 신호</h2>
    <p>이 리포트는 제공된 출생 차트 계산 결과를 기준으로 태양, 달, 상승궁, 행성, 하우스, 애스펙트, 원소, 모달리티의 흐름을 함께 읽습니다.</p>
    <p>${escapeHtml([
      displayHouseSystem(chart.houseSystem) ? `하우스 시스템은 ${displayHouseSystem(chart.houseSystem)}` : "",
      displayZodiacType(chart.zodiacType) ? `황도 기준은 ${displayZodiacType(chart.zodiacType)}` : "",
      chart.ascendant ? `상승궁은 ${chart.ascendant}` : "",
      chart.midheaven ? `MC는 ${chart.midheaven}` : "",
    ].filter(Boolean).join(", ") || "차트 기준 정보 일부는 제공된 계산 결과 안에서 제한적으로 확인됩니다.")}</p>
    <p>${escapeHtml([
      Number.isFinite(Number(elements.fire)) ? `불 ${elements.fire}` : "",
      Number.isFinite(Number(elements.earth)) ? `흙 ${elements.earth}` : "",
      Number.isFinite(Number(elements.air)) ? `공기 ${elements.air}` : "",
      Number.isFinite(Number(elements.water)) ? `물 ${elements.water}` : "",
      Number.isFinite(Number(modalities.cardinal)) ? `카디널 ${modalities.cardinal}` : "",
      Number.isFinite(Number(modalities.fixed)) ? `픽스드 ${modalities.fixed}` : "",
      Number.isFinite(Number(modalities.mutable)) ? `뮤터블 ${modalities.mutable}` : "",
    ].filter(Boolean).join(" · ") || "원소와 모달리티의 세부 수치는 제공된 계산 결과 기준에서는 확인이 제한됩니다.")}</p>
    ${warnings.length ? `<p>${escapeHtml(warnings.join(" "))}</p>` : ""}
  </section>`;
}

function buildToc(chapters = []) {
  return `<nav class="astro-toc">
    <h2>목차</h2>
    <ol>${chapters.map((chapter) => `<li>${escapeHtml(chapter.title)}</li>`).join("")}</ol>
  </nav>`;
}

function buildFinalSummary(chapters = []) {
  const firstBodies = asArray(chapters)
    .map((chapter) => clean(chapter.sections?.[0]?.body || ""))
    .filter(Boolean)
    .slice(0, 3)
    .join(" ");
  return `<section class="astro-final-summary">
    <h2>마지막 별빛의 정리</h2>
    <p>${escapeHtml(firstBodies.slice(0, 700) || "이 점성술 리포트는 출생 차트와 현재 하늘의 흐름을 자기이해의 언어로 정리합니다.")}</p>
    <p>이 해석은 삶을 단정하기보다 선택의 감각을 또렷하게 비추기 위한 안내입니다. 중요한 결정은 현실의 조건, 관계의 대화, 자신의 몸과 마음이 보내는 신호를 함께 살피며 천천히 다루는 것이 좋습니다.</p>
  </section>`;
}

export function assembleAstrologyPremiumHtml({ input = {}, chapters = [], reportId = "" } = {}) {
  const chapterHtml = asArray(chapters).map((chapter) => String(chapter.html || "").trim()).filter(Boolean).join("\n");
  const generatedAt = new Date().toISOString();
  const title = `${displayProfileName(input?.userProfile?.name)} 점성술 프리미엄 리포트`;
  const fullHtml = `<!doctype html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(title)}</title>
  <style>
    body{font-family:"Noto Sans KR","Apple SD Gothic Neo",Arial,sans-serif;color:#211b2f;background:#fff;line-height:1.72;margin:0;padding:42px;}
    .astro-cover{min-height:520px;display:flex;flex-direction:column;justify-content:center;border-bottom:1px solid #ddd2ef;margin-bottom:34px;}
    .astro-cover p{max-width:720px;font-size:15px;color:#5a5367;}
    h1{font-size:28px;line-height:1.35;margin:0 0 18px;}
    h2{font-size:18px;margin:28px 0 10px;color:#32244a;}
    p{font-size:13.5px;margin:0 0 12px;}
    article{page-break-before:always;margin-top:34px;}
    section{margin:0 0 22px;}
    .astro-summary-block,.astro-toc,.astro-final-summary{page-break-inside:avoid;margin:28px 0;padding:18px 0;border-top:1px solid #e6deef;}
    .astro-summary-list{list-style:none;padding:0;margin:0;display:block;}
    .astro-summary-list li{display:flex;gap:12px;border-bottom:1px solid #eee8f4;padding:7px 0;font-size:12.5px;}
    .astro-summary-list strong{min-width:112px;color:#44345f;}
    .astro-summary-list span{flex:1;}
    .astro-visual-section{page-break-inside:avoid;margin:30px 0;padding:18px 0;border-top:1px solid #e6deef;}
    .astro-visual-grid{display:block;}
    .astro-visual-panel{margin:0 0 18px;page-break-inside:avoid;}
    .astro-visual-panel h3,.astro-bar-card h3{font-size:14px;margin:0 0 8px;color:#493760;}
    .astro-table{width:100%;border-collapse:collapse;margin:0 0 10px;font-size:11.5px;}
    .astro-table th{background:#f2edf8;color:#3b2d52;text-align:left;border:1px solid #ded2ec;padding:6px;}
    .astro-table td{border:1px solid #e7dfef;padding:6px;vertical-align:top;}
    .astro-bar-row{display:flex;align-items:center;gap:8px;margin:7px 0;font-size:11.5px;}
    .astro-bar-row span{width:58px;color:#44345f;}
    .astro-bar-row b{width:28px;text-align:right;color:#2f2441;}
    .astro-bar-track{flex:1;height:10px;background:#eee8f4;border-radius:999px;overflow:hidden;}
    .astro-bar-track i{display:block;height:100%;background:#7f5fb4;border-radius:999px;}
    .astro-transit-timeline{list-style:none;margin:0;padding:0;border-left:2px solid #d8c9ec;}
    .astro-transit-timeline li{margin:0 0 10px;padding-left:12px;position:relative;}
    .astro-transit-timeline li:before{content:"";position:absolute;left:-5px;top:6px;width:8px;height:8px;border-radius:50%;background:#7f5fb4;}
    .astro-transit-timeline span{font-size:11px;color:#604a7f;font-weight:bold;}
    .astro-transit-timeline p{font-size:12px;margin:2px 0 0;}
    .astro-toc ol{margin:0;padding-left:20px;}
    .astro-toc li{margin:4px 0;font-size:13px;}
    .astro-note{font-size:12px;color:#6b6378;}
  </style>
</head>
<body>
  <section class="astro-cover">
    <p>서양 점성술 프리미엄 리포트</p>
    <h1>${escapeHtml(title)}</h1>
    <p>출생 차트의 행성, 하우스, 애스펙트와 현재 하늘의 흐름을 바탕으로 작성한 개인 점성술 리딩입니다.</p>
    <p class="astro-note">생성 시각 ${escapeHtml(generatedAt)}</p>
  </section>
  <section class="astro-summary-block">
    <h2>리딩 안내</h2>
    <p>이 문서는 점성술을 통한 자기이해와 성찰을 돕기 위한 리포트입니다. 삶의 결과를 단정하지 않으며, 건강·재물·관계·미래에 관한 중요한 판단은 현실의 전문적 조언과 함께 살피는 것이 좋습니다.</p>
  </section>
  ${buildInputSummary(input)}
  ${buildChartCoreSummary(input)}
  ${buildVisualSummary(input)}
  ${buildToc(astrologyPremiumChapterPlanV2.chapters)}
  ${chapterHtml}
  ${buildFinalSummary(chapters)}
</body>
</html>`;

  assertAllConfiguredChaptersIncluded(fullHtml, astrologyPremiumChapterPlanV2.chapters);
  assertEachChapterRenderedOnce(fullHtml, astrologyPremiumChapterPlanV2.chapters);
  assertNoRepeatedHeadings(fullHtml);
  assertNoRawJsonLeak(fullHtml);
  assertNoUndefinedValues(fullHtml);
  assertNoForeignSystemTermsLeaked(fullHtml);
  assertNoUnexpectedForeignTokens(fullHtml);
  assertAstrologyVisualBlocksIncluded(fullHtml);

  return fullHtml;
}
