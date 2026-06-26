import { asArray, clean, escapeHtml, stripTags, stableStringify } from "./soul-origin-premium.types.js";
import { validateKarmaFinalReportHtml } from "./karma-validator.js";
import { usedSystemsLabel } from "./karma-data-orchestrator.js";

export const KARMA_INTEGRATED_DISCLAIMER = "본 리포트는 사주 명리학, 베다 점성술, 서양 점성술 등 다양한 운세 체계를 바탕으로 한 자기이해와 엔터테인먼트 목적의 콘텐츠입니다. ‘업’은 삶에서 반복되는 패턴과 과제를 상징적으로 표현한 것이며, 중요한 의사결정은 현실의 정보, 전문가 상담, 본인의 판단을 함께 고려해 주세요.";

function shortValue(value, limit = 140) {
  if (value == null) return "";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return clean(value, limit);
  return clean(stableStringify(value), limit);
}

function keyRows(items = []) {
  return asArray(items)
    .filter((item) => clean(item.value))
    .map((item) => `<div class="karma-fact"><b>${escapeHtml(item.label)}</b><span>${escapeHtml(shortValue(item.value, item.limit || 180))}</span></div>`)
    .join("");
}

function systemSummary(integratedData = {}) {
  const systems = [];
  if (integratedData.systemStatus?.saju) systems.push("사주 명리학");
  if (integratedData.systemStatus?.vedic) systems.push("베다점");
  if (integratedData.systemStatus?.astrology) systems.push("서양 점성술");
  if (integratedData.systemStatus?.sukuyo) systems.push("숙요점");
  if (integratedData.systemStatus?.ziwei) systems.push("자미두수");
  return systems.length ? systems.join(" · ") : "계산 데이터 확인 필요";
}

function renderSystemPanel(title, rows) {
  const body = keyRows(rows);
  if (!body) return "";
  return `<section class="karma-system-panel"><h2>${escapeHtml(title)}</h2><div class="karma-facts">${body}</div></section>`;
}

function extractClassText(html = "", className = "") {
  const match = String(html || "").match(new RegExp(`<div\\b[^>]*class=["'][^"']*${className}[^"']*["'][^>]*>([\\s\\S]*?)<\\/div>`, "i"));
  return clean(stripTags(match?.[1] || ""), 1200);
}

function extractAdviceItems(html = "") {
  const advice = String(html || "").match(/<div\b[^>]*class=["'][^"']*chapter-advice[^"']*["'][^>]*>([\s\S]*?)<\/div>/i)?.[1] || "";
  return (advice.match(/<li\b[^>]*>([\s\S]*?)<\/li>/gi) || [])
    .map((item) => clean(stripTags(item), 220))
    .filter(Boolean);
}

function renderIntegratedClosing(chapterRecords = []) {
  const summaries = chapterRecords
    .map((chapter) => extractClassText(chapter.html, "chapter-summary"))
    .filter(Boolean)
    .slice(0, 4);
  const advice = chapterRecords.flatMap((chapter) => extractAdviceItems(chapter.html)).slice(0, 8);
  return `
    <section class="karma-final-synthesis">
      <h2>통합 카르마 해석</h2>
      ${summaries.map((item) => `<p>${escapeHtml(item)}</p>`).join("")}
    </section>
    <section class="karma-final-prescription">
      <h2>업을 푸는 실천 처방</h2>
      <ul>${advice.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
    </section>`;
}

export function assembleKarmaIntegratedFinalHtml({ integratedData = {}, chapterPlan = {}, chapterRecords = [], reportId = "", generatedAt = "" } = {}) {
  const saju = integratedData.sajuChart || {};
  const vedic = integratedData.vedicChart || {};
  const astrology = integratedData.astrologyChart || {};
  const chapters = asArray(chapterRecords);
  const toc = asArray(chapterPlan.chapters)
    .map((chapter) => `<li><span>${String(chapter.order).padStart(2, "0")}</span>${escapeHtml(chapter.title)}</li>`)
    .join("");
  const html = `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>운명의 업 프리미엄 상담서</title>
  <style>
    :root{color-scheme:light;--ink:#21192a;--muted:#66526f;--line:#ded2ea;--paper:#fffaf5;--deep:#24132f;--gold:#b98242;--moon:#f4ecff}
    *{box-sizing:border-box}
    body{margin:0;background:#f6f0ea;color:var(--ink);font-family:"Noto Serif KR","Apple SD Gothic Neo",serif;line-height:1.82}
    .karma-page{max-width:980px;margin:0 auto;padding:30px 22px 70px}
    .karma-cover{min-height:360px;padding:42px 34px;border-radius:8px;background:radial-gradient(circle at 20% 10%,rgba(244,236,255,.22),transparent 28%),linear-gradient(135deg,#24132f,#3d2537 54%,#6c4a39);color:#fffaf2;display:flex;flex-direction:column;justify-content:flex-end}
    .karma-cover__eyebrow{margin:0 0 8px;color:#f3d8a6;font-size:13px;letter-spacing:0;font-weight:700}
    h1{margin:0;font-size:42px;line-height:1.2;letter-spacing:0}
    h2{margin:0 0 12px;color:#3b2349;font-size:22px;line-height:1.32;letter-spacing:0}
    h3{margin:0 0 8px;color:#5e3e28;font-size:17px;letter-spacing:0}
    p{margin:0 0 10px;white-space:pre-wrap;word-break:keep-all;overflow-wrap:break-word}
    .karma-band,.karma-system-panel,.karma-integrated-chapter,.karma-final-synthesis,.karma-final-prescription,.karma-disclaimer{margin-top:18px;padding:20px;border:1px solid var(--line);border-radius:8px;background:var(--paper)}
    .karma-meta{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}
    .karma-facts{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
    .karma-fact{padding:12px;border:1px solid #eadfef;border-radius:8px;background:#fff}
    .karma-fact b{display:block;margin-bottom:4px;color:#6a3f31}
    .karma-fact span{display:block;color:var(--muted)}
    .karma-toc ol{margin:0;padding-left:0;list-style:none;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px}
    .karma-toc li{padding:8px 10px;border:1px solid #eadfef;border-radius:8px;background:#fff}
    .karma-toc span{display:inline-block;width:30px;color:#93662f;font-weight:700}
    .karma-integrated-chapter{break-before:page;page-break-before:always}
    .karma-integrated-chapter h2{font-size:25px}
    .chapter-meta,.chapter-summary,.chapter-advice{margin:12px 0;padding:14px;border:1px solid #eadfef;border-radius:8px;background:#fff}
    .chapter-body p{margin-bottom:12px}
    .chapter-advice ul,.karma-final-prescription ul{margin:0;padding-left:20px}
    li{margin:6px 0}
    .karma-disclaimer{font-size:13px;color:#6d5c70}
    @page{size:A4;margin:16mm 14mm 18mm}
    @media print{body{background:#fff}.karma-page{padding:0}.karma-cover,.karma-band,.karma-system-panel,.karma-integrated-chapter,.karma-final-synthesis,.karma-final-prescription,.karma-disclaimer{border-radius:0}}
    @media (max-width:720px){.karma-page{padding:18px 14px 50px}.karma-meta,.karma-facts,.karma-toc ol{grid-template-columns:1fr}h1{font-size:32px}.karma-cover{min-height:300px;padding:30px 22px}}
  </style>
</head>
<body>
  <main class="karma-page" data-report-id="${escapeHtml(reportId)}" data-engine="karma-integrated-llm">
    <section class="karma-cover">
      <p class="karma-cover__eyebrow">CODE DESTINY PREMIUM PDF</p>
      <h1>운명의 업</h1>
      <p>${escapeHtml(clean(integratedData.userName || "사용자"))}</p>
      <p>${escapeHtml(clean(`${integratedData.birthDate || ""} ${integratedData.birthTime || ""}`))}</p>
    </section>
    <section class="karma-band">
      <h2>사용자 입력 요약</h2>
      <div class="karma-meta">
        ${keyRows([
          { label: "이름", value: integratedData.userName },
          { label: "생년월일시", value: `${integratedData.birthDate || ""} ${integratedData.birthTime || ""}` },
          { label: "출생지", value: integratedData.birthPlace || "미입력" },
        ])}
      </div>
    </section>
    <section class="karma-band">
      <h2>사용된 운세 로직 요약</h2>
      <p>${escapeHtml(systemSummary(integratedData))}</p>
      <p>${escapeHtml(`챕터별 참조 로직은 ${asArray(chapterPlan.chapters).length}개 기존 운명의 업 챕터 설정에 맞춰 선별되었습니다.`)}</p>
    </section>
    ${renderSystemPanel("사주 핵심 요약", [
      { label: "연월일시", value: [saju.yearPillar, saju.monthPillar, saju.dayPillar, saju.hourPillar].map(shortValue).filter(Boolean).join(" / ") },
      { label: "십성", value: saju.tenGods },
      { label: "오행", value: saju.fiveElements },
      { label: "대운·세운", value: saju.annualLuck },
    ])}
    ${renderSystemPanel("베다 차트 핵심 요약", [
      { label: "라그나", value: vedic.lagna },
      { label: "나크샤트라", value: vedic.moonNakshatra || vedic.nakshatras },
      { label: "다샤", value: vedic.currentDasha || vedic.dashas },
      { label: "라후·케투", value: [vedic.rahu, vedic.ketu].filter(Boolean).join(" / ") },
    ])}
    ${renderSystemPanel("서양 점성술 차트 핵심 요약", [
      { label: "태양·달·상승궁", value: [astrology.sun, astrology.moon, astrology.ascendant].filter(Boolean).join(" / ") },
      { label: "행성", value: astrology.planets },
      { label: "하우스", value: astrology.houses },
      { label: "어스펙트", value: astrology.aspects },
    ])}
    <section class="karma-band karma-toc">
      <h2>기존 운명의 업 챕터</h2>
      <ol>${toc}</ol>
    </section>
    ${chapters.map((chapter) => chapter.html).join("\n")}
    ${renderIntegratedClosing(chapters)}
    <section class="karma-disclaimer">${escapeHtml(KARMA_INTEGRATED_DISCLAIMER)}</section>
  </main>
</body>
</html>`;
  const validation = validateKarmaFinalReportHtml(html, { chapterPlan, chapters });
  if (!validation.ok) {
    throw Object.assign(new Error("KARMA_FINAL_HTML_INVALID"), {
      code: "KARMA_FINAL_HTML_INVALID",
      status: 422,
      issues: validation.issues,
      failedStep: "rendering",
    });
  }
  return html;
}
