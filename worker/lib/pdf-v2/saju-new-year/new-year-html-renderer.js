import { clean } from "./saju-new-year-premium.types.js";

const DISCLAIMER = "본 리포트는 사주 명리학을 바탕으로 한 자기이해와 엔터테인먼트 목적의 신년운세 콘텐츠입니다. 중요한 의사결정은 현실의 정보, 전문가 상담, 본인의 판단을 함께 고려해 주세요.";

function esc(value) {
  return clean(value, 50000).replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch]));
}

function text(value, fallback = "") {
  const raw = clean(value, 1000);
  return raw || fallback;
}

function pillarLabel(pillar = {}) {
  if (typeof pillar === "string") return clean(pillar);
  return clean(pillar.label || `${clean(pillar.stem)}${clean(pillar.branch)}`);
}

function listText(values = [], fallback = "확인된 흐름 중심") {
  const list = Array.isArray(values) ? values.map((item) => clean(item)).filter(Boolean) : [];
  return list.slice(0, 4).join(", ") || fallback;
}

function renderSummaryCards(input = {}) {
  const chart = input.sajuChart || {};
  const annual = input.annualLuck || {};
  const cycle = Array.isArray(input.luckCycles) ? input.luckCycles[0] : input.luckCycles;
  const cards = [
    ["이름", input.userName || "상담자"],
    ["생년월일", input.birthDate],
    ["출생시간", input.birthTime || "미상"],
    ["대상 연도", `${input.targetYear}년`],
    ["일주", pillarLabel(chart.dayPillar) || "계산값 기준"],
    ["세운", pillarLabel(annual) || text(annual.yearGanji, "계산값 기준")],
    ["대운", text(cycle?.label || cycle?.pillar || cycle?.name, "계산값 기준")],
    ["오행", listText(chart.fiveElements?.strongest || chart.fiveElements?.weakest || [])],
  ];
  return cards.map(([label, value]) => `<div><strong>${esc(label)}</strong><span>${esc(value)}</span></div>`).join("");
}

function renderSajuOverview(input = {}) {
  const chart = input.sajuChart || {};
  const annual = input.annualLuck || {};
  return [
    ["사주 원국", [pillarLabel(chart.yearPillar), pillarLabel(chart.monthPillar), pillarLabel(chart.dayPillar), pillarLabel(chart.hourPillar)].filter(Boolean).join(" · ") || "기존 사주 엔진 계산값"],
    ["십성 흐름", text(chart.tenGods?.dominant || chart.tenGods?.summary || annual.tenGod || annual.tenGodToDayMaster, "십성 분포 계산값")],
    ["오행 균형", text(chart.fiveElements?.balanceSummary || chart.fiveElements?.summary, "오행 균형 계산값")],
    ["합충형해", listText([...(chart.combinations || []), ...(chart.clashes || [])].map((item) => item?.message || item), "원국과 세운의 관계 계산값")],
  ].map(([label, value]) => `<article><h3>${esc(label)}</h3><p>${esc(value)}</p></article>`).join("");
}

function renderMonthlyTable(input = {}) {
  const rows = Array.isArray(input.monthlyLuck) ? input.monthlyLuck : [];
  return `<table class="monthly-table"><thead><tr><th>월</th><th>월운</th><th>흐름</th><th>실천 기준</th></tr></thead><tbody>${rows.slice(0, 12).map((item, index) => {
    const month = Number(item.month || index + 1);
    const label = pillarLabel(item.pillar || item) || text(item.monthGanji, "월운");
    const flow = text(item.decision || item.tone || item.relation || item.flow, "균형");
    const advice = text(item.advice || item.actionHint || item.summary, "생활 리듬을 점검합니다.");
    return `<tr><td>${month}월</td><td>${esc(label)}</td><td>${esc(flow)}</td><td>${esc(advice)}</td></tr>`;
  }).join("")}</tbody></table>`;
}

function renderChapterToc(chapterPlan = []) {
  return `<ol>${chapterPlan.map((chapter, index) => `<li><span>${String(index + 1).padStart(2, "0")}</span><strong>${esc(chapter.title)}</strong><em>${esc(chapter.category)}</em></li>`).join("")}</ol>`;
}

export function assembleFinalNewYearHtml({ input, chapterPlan, chapterHtmlFragments }) {
  const chapters = Array.isArray(chapterHtmlFragments) ? chapterHtmlFragments.join("\n") : "";
  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <title>${esc(input.userName || "상담자")}님의 ${esc(input.targetYear)}년 신년운세</title>
  <style>
    @page{size:A4;margin:14mm;}*{box-sizing:border-box;}body{margin:0;background:#fffaf7;color:#24180f;font-family:"Noto Serif KR","Malgun Gothic",serif;line-height:1.78;word-break:keep-all;overflow-wrap:break-word;}
    .cover{min-height:760px;padding:70px 56px;background:radial-gradient(circle at 72% 18%,rgba(255,230,160,.34),transparent 24%),linear-gradient(142deg,#111827,#4a1d28 52%,#8a5a16);color:#fff;page-break-after:always;}
    .brand{font-size:18px;font-weight:700;letter-spacing:.08em}.eyebrow{margin-top:72px;color:#fde68a;font-size:13px;letter-spacing:.2em}.cover h1{margin:16px 0 10px;font-size:46px;color:#fff7d6}.cover p{max-width:620px;color:#fff1bf;font-size:17px}.cover-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin-top:34px}.cover-grid div,.overview article,.note{border:1px solid #ead7a6;border-radius:8px;background:#fffaf0;padding:12px}.cover-grid div{background:rgba(255,255,255,.08);border-color:rgba(253,230,138,.42)}.cover-grid strong,.overview strong{display:block;color:#fde68a}.cover-grid span,.overview span{display:block}
    nav,.input-summary,.saju-summary,.monthly-summary,.chapters,.final-advice{padding:42px 48px;background:#fff;page-break-after:always;}nav h2,.input-summary h2,.saju-summary h2,.monthly-summary h2,.final-advice h2{margin:0 0 20px;color:#7f1d1d;font-size:26px}nav ol{list-style:none;margin:0;padding:0}nav li{display:grid;grid-template-columns:44px 1fr auto;gap:12px;border-bottom:1px solid #ead7a6;padding:12px 0}nav span{color:#991b1b;font-weight:800}nav em{font-style:normal;color:#8a5a16}.summary-grid,.overview{display:grid;grid-template-columns:repeat(2,1fr);gap:12px}.summary-grid div{border:1px solid #ead7a6;border-radius:8px;background:#fffaf0;padding:12px}.summary-grid strong{display:block;color:#7f1d1d}.overview article h3{margin:0 0 8px;color:#7f1d1d;font-size:17px}.overview article p{margin:0}
    table{width:100%;border-collapse:collapse;background:#fff}th,td{border:1px solid #ead7a6;padding:8px;text-align:left;font-size:12px;line-height:1.55}th{background:#7f1d1d;color:#fff}.chapters{page-break-after:auto}.new-year-chapter{page-break-before:always;padding-top:10px}.new-year-chapter h2{border-bottom:2px solid #d97706;margin:0 0 18px;padding-bottom:12px;color:#7f1d1d;font-size:25px}.chapter-summary,.chapter-body,.chapter-advice{border-left:4px solid #d97706;background:#fffaf0;border-radius:0 8px 8px 0;padding:16px 18px;margin:16px 0}.chapter-summary p,.chapter-body p{margin:0 0 12px}.chapter-advice h3{margin:0 0 10px;color:#92400e}.chapter-advice li{margin-bottom:6px}.final-advice{page-break-before:always}.disclaimer{font-size:12px;color:#6b4b2a;border-top:1px solid #ead7a6;margin-top:28px;padding-top:14px}
  </style>
</head>
<body>
  <section class="cover">
    <div class="brand">Code Destiny</div>
    <div class="eyebrow">PREMIUM SAJU NEW YEAR</div>
    <h1>${esc(input.targetYear)}년 신년운세</h1>
    <p>원국과 대운, 세운, 월운이 맞물리며 열리는 올해의 흐름을 차분히 짚어 봅니다.</p>
    <div class="cover-grid">${renderSummaryCards(input)}</div>
  </section>
  <nav><h2>목차</h2>${renderChapterToc(chapterPlan)}</nav>
  <section class="input-summary"><h2>상담 기준</h2><div class="summary-grid">${renderSummaryCards(input)}</div></section>
  <section class="saju-summary"><h2>사주와 세운의 기본 결</h2><div class="overview">${renderSajuOverview(input)}</div></section>
  <section class="monthly-summary"><h2>월운 요약표</h2>${renderMonthlyTable(input)}</section>
  <main class="chapters">${chapters}</main>
  <section class="final-advice">
    <h2>올해의 종합 실천 처방</h2>
    <p>올해의 운은 강하게 밀어붙이는 달과 조용히 다듬어야 하는 달을 구분할 때 더 맑게 열립니다. 세운이 요구하는 역할을 받아들이되, 월운의 속도에 맞춰 일, 돈, 관계, 건강의 우선순위를 매달 다시 정리하십시오.</p>
    <p class="disclaimer">${DISCLAIMER}</p>
  </section>
</body>
</html>`;
}
