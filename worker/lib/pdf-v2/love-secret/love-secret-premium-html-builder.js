import { asArray, clean, escapeHtml } from "./love-secret-premium.types.js";
import {
  assertAllConfiguredChaptersIncluded,
  assertNoForeignSystemTermsLeaked,
  assertNoRawJsonLeak,
  assertNoUndefinedValues,
  validateLoveSecretFinalReportHtml,
} from "./love-secret-premium.validator.js";

function valueOrDash(value) {
  return clean(value) || "-";
}

function summaryRows(input = {}) {
  const profile = input.userProfile || {};
  const partner = input.partnerProfile || {};
  const saju = input.saju || {};
  const love = input.love || {};
  const luck = input.luck || {};
  const rows = [
    ["이름", valueOrDash(profile.name)],
    ["생년월일", valueOrDash(profile.birthDate)],
    ["출생시간", valueOrDash(profile.birthTime)],
    ["일간", valueOrDash(saju.dayMaster)],
    ["사주 네 기둥", valueOrDash(Object.values(saju.pillars || {}).filter(Boolean).join(" "))],
    ["연애 상태", valueOrDash(love.relationshipStatus)],
    ["현재 질문", valueOrDash(love.currentConcern)],
    ["연애운 기준", valueOrDash(luck.loveWindow || luck.yearLuck || love.targetYear)],
  ];
  if (input.mode === "compatibility") {
    rows.splice(3, 0, ["상대", valueOrDash(partner.name)], ["상대 생년월일", valueOrDash(partner.birthDate)]);
  }
  return rows;
}

function highlightRows(input = {}) {
  const saju = input.saju || {};
  const love = input.love || {};
  const compatibility = input.compatibility || {};
  return [
    ["연애성", valueOrDash(saju.loveStar || saju.peachBlossom || "확인 가능한 계산 신호 안에서 해석")],
    ["배우자성", valueOrDash(saju.spouseStar || "확인 가능한 계산 신호 안에서 해석")],
    ["오행 흐름", valueOrDash([saju.elementBalance?.dominant, saju.elementBalance?.weak].filter(Boolean).join(" / "))],
    ["관계 주제", valueOrDash(love.desiredOutcome || love.relationshipType)],
    ["궁합 핵심", valueOrDash(compatibility.emotionalMatch || compatibility.communicationMatch || compatibility.longTermPotential)],
  ];
}

function hashText(value) {
  const text = clean(value);
  let hash = 0;
  for (let index = 0; index < text.length; index += 1) {
    hash = Math.imul(hash ^ text.charCodeAt(index), 2654435761);
  }
  return Math.abs(hash);
}

function metricValue(seed, offset = 0) {
  return 42 + ((hashText(`${seed}:${offset}`) % 45));
}

function visualMetrics(input = {}, chapter = {}) {
  const seed = `${input.normalizedInputHash || input.userProfile?.name || "love"}:${chapter.id}:${chapter.order}`;
  return [
    ["감정 반응", metricValue(seed, 1)],
    ["소통 선명도", metricValue(seed, 2)],
    ["관계 안정감", metricValue(seed, 3)],
    ["시기 활용도", metricValue(seed, 4)],
  ];
}

function chapterVisualRows(input = {}, chapter = {}) {
  const love = input.love || {};
  const saju = input.saju || {};
  const luck = input.luck || {};
  return [
    ["핵심 신호", valueOrDash(saju.loveStar || saju.spouseStar || saju.dayMaster)],
    ["관계 과제", valueOrDash(love.currentConcern || love.relationshipStatus)],
    ["시기 기준", valueOrDash(luck.loveWindow || luck.yearLuck || love.targetYear)],
    ["챕터 역할", valueOrDash(chapter.title)],
  ];
}

function tableHtml(title, rows, className = "pdf-table") {
  return `<section class="${escapeHtml(className)}"><h2>${escapeHtml(title)}</h2><table><tbody>${rows.map(([label, value]) => `<tr><th>${escapeHtml(label)}</th><td>${escapeHtml(value)}</td></tr>`).join("")}</tbody></table></section>`;
}

function barHtml(label, value) {
  const percent = Math.max(8, Math.min(96, Number(value) || 0));
  return `<div class="metric-row"><span>${escapeHtml(label)}</span><div class="metric-track"><i style="width:${percent}%"></i></div><strong>${percent}</strong></div>`;
}

function overviewVisualHtml(input = {}) {
  const metrics = visualMetrics(input, { id: "overview", order: 0 });
  const highlights = highlightRows(input).filter(([, value]) => clean(value) && value !== "-").slice(0, 4);
  return `<section class="visual-summary">
    <h2>시각 요약</h2>
    <div class="visual-grid">
      <div class="visual-card visual-card--wide">
        <strong>관계 에너지 그래프</strong>
        ${metrics.map(([label, value]) => barHtml(label, value)).join("")}
      </div>
      <div class="visual-card">
        <strong>핵심 신호 표</strong>
        <table><tbody>${highlights.map(([label, value]) => `<tr><th>${escapeHtml(label)}</th><td>${escapeHtml(value)}</td></tr>`).join("")}</tbody></table>
      </div>
    </div>
  </section>`;
}

function chapterVisualHtml(input = {}, chapter = {}) {
  const metrics = visualMetrics(input, chapter);
  return `<div class="chapter-visual" aria-label="챕터 시각 요약">
    <div class="chapter-visual__head">
      <strong>${escapeHtml(String(chapter.order || "").padStart(2, "0"))}</strong>
      <span>${escapeHtml(chapter.title)}</span>
    </div>
    <div class="chapter-visual__body">
      <div class="visual-card">
        <strong>흐름 그래프</strong>
        ${metrics.map(([label, value]) => barHtml(label, value)).join("")}
      </div>
      <div class="visual-card">
        <strong>상담 기준표</strong>
        <table><tbody>${chapterVisualRows(input, chapter).map(([label, value]) => `<tr><th>${escapeHtml(label)}</th><td>${escapeHtml(value)}</td></tr>`).join("")}</tbody></table>
      </div>
    </div>
  </div>`;
}

function injectChapterVisual(html, visual) {
  const source = String(html || "");
  if (/<\/h2>/i.test(source)) return source.replace(/<\/h2>/i, `</h2>${visual}`);
  return `${visual}${source}`;
}

export function assembleLoveSecretPremiumHtml({ input, chapters, reportId = "" }) {
  const safeChapters = asArray(chapters);
  const title = input.mode === "compatibility" ? "궁합 연애 비책" : "연애 비책";
  const displayName = input.mode === "compatibility"
    ? `${clean(input.userProfile?.name || "의뢰인")} · ${clean(input.partnerProfile?.name || "상대")}`
    : clean(input.userProfile?.name || "의뢰인");
  const generatedAt = new Date().toISOString();
  const toc = safeChapters
    .map((chapter) => `<li><span>${chapter.order}</span><a href="#${escapeHtml(chapter.id)}">${escapeHtml(chapter.title)}</a></li>`)
    .join("");
  const warnings = asArray(input.warnings).length
    ? `<section class="notice"><h2>해석 기준</h2>${input.warnings.map((item) => `<p>${escapeHtml(item)}</p>`).join("")}</section>`
    : "";
  const chapterHtml = safeChapters
    .map((chapter) => {
      const baseHtml = String(chapter.html || "").replace(/<section\b([^>]*class=["'][^"']*\blove-secret-chapter\b[^"']*["'][^>]*)>/i, (match, attrs) => {
        if (/\bid=["']/i.test(match)) return match;
        return `<section id="${escapeHtml(chapter.id)}"${attrs}>`;
      });
      return injectChapterVisual(baseHtml, chapterVisualHtml(input, chapter));
    })
    .join("\n");

  const html = `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(displayName)} ${escapeHtml(title)} PDF</title>
  <style>
    @page{size:A4;margin:14mm;}
    *{box-sizing:border-box;}
    body{margin:0;background:#fffaf7;color:#24151b;font-family:"Noto Serif KR","Malgun Gothic",serif;}
    .cover{min-height:760px;padding:76px 58px;background:radial-gradient(circle at 78% 18%,rgba(255,243,217,.4),transparent 16%),radial-gradient(circle at 20% 82%,rgba(255,210,224,.36),transparent 18%),linear-gradient(145deg,#210a15,#71344b 58%,#1d1514);color:#fff;page-break-after:always;}
    .cover .brand{font-size:13px;letter-spacing:.22em;text-transform:uppercase;color:#f8d7df;}
    .cover h1{margin:120px 0 18px;font-size:48px;line-height:1.2;letter-spacing:0;}
    .cover p{max-width:620px;font-size:17px;line-height:1.9;color:#ffe7ed;}
    .meta{margin-top:52px;font-size:14px;color:#f7d4dd;line-height:1.8;}
    .toc,.summary,.notice,.visual-summary{page-break-after:always;padding:48px 54px;background:#fff;}
    h2{margin:0 0 18px;color:#743148;font-size:24px;letter-spacing:0;}
    .toc ol{list-style:none;margin:0;padding:0;}
    .toc li{display:grid;grid-template-columns:46px 1fr;gap:14px;border-bottom:1px solid #ecd2d7;padding:12px 0;font-size:14px;}
    .toc span{font-weight:700;color:#a43d61;}
    .toc a{color:#25161b;text-decoration:none;}
    .pdf-table{margin:0 0 24px;page-break-inside:avoid;}
    table{width:100%;border-collapse:collapse;background:#fff;}
    th,td{border:1px solid #ead2d8;padding:10px 12px;text-align:left;font-size:12px;line-height:1.55;vertical-align:top;}
    th{width:150px;background:#fff1f3;color:#783149;}
    .notice p{font-size:13px;line-height:1.85;margin:0 0 10px;color:#5e4750;}
    .visual-grid{display:grid;grid-template-columns:1.2fr .8fr;gap:16px;}
    .visual-card{border:1px solid #ead2d8;background:#fff8fa;border-radius:8px;padding:15px;page-break-inside:avoid;}
    .visual-card>strong{display:block;margin:0 0 12px;color:#7b2f4a;font-size:13px;}
    .visual-card--wide{background:linear-gradient(180deg,#fff8fa,#fff);}
    .metric-row{display:grid;grid-template-columns:92px 1fr 38px;align-items:center;gap:10px;margin:10px 0;font-size:11px;color:#4e3942;}
    .metric-track{height:9px;background:#f3dde4;border-radius:999px;overflow:hidden;}
    .metric-track i{display:block;height:100%;background:linear-gradient(90deg,#9f345b,#d98aa3);border-radius:999px;}
    .metric-row strong{text-align:right;color:#7b2f4a;font-size:11px;}
    main{padding:0 54px 48px;background:#fff;}
    .love-secret-chapter{page-break-before:always;padding-top:42px;}
    .love-secret-chapter>h2{margin:0 0 22px;padding-bottom:16px;border-bottom:1px solid #e8cbd2;color:#6f2c46;font-size:31px;line-height:1.35;letter-spacing:0;}
    section{page-break-inside:avoid;margin:0 0 24px;}
    section h2{font-size:19px;color:#8a3756;margin:0 0 10px;}
    p{font-size:14px;line-height:1.92;margin:0 0 12px;}
    .chapter-summary{border-left:4px solid #d98aa3;background:#fff7f9;padding:16px 18px;margin:0 0 24px;}
    .chapter-body{margin:0 0 24px;}
    .chapter-advice{border:1px solid #ead2d8;background:#fffafc;border-radius:8px;padding:18px 20px;page-break-inside:avoid;}
    .chapter-advice h3{margin:0 0 10px;color:#7b2f4a;font-size:17px;}
    .chapter-advice ul{margin:0;padding-left:20px;}
    .chapter-advice li{font-size:13px;line-height:1.75;margin:0 0 7px;}
    .chapter-visual{border:1px solid #ead2d8;background:#fff8fa;border-radius:10px;padding:16px;margin:0 0 26px;page-break-inside:avoid;}
    .chapter-visual__head{display:flex;align-items:center;gap:12px;margin-bottom:14px;}
    .chapter-visual__head strong{display:inline-flex;width:38px;height:38px;border-radius:50%;align-items:center;justify-content:center;background:#7b2f4a;color:#fff;font-size:13px;}
    .chapter-visual__head span{color:#5d263a;font-size:16px;font-weight:700;}
    .chapter-visual__body{display:grid;grid-template-columns:1fr 1fr;gap:14px;}
    .closing{page-break-before:always;padding:60px 54px;background:#fff;}
    .closing p{font-size:14px;color:#4d3b42;}
  </style>
</head>
<body>
  <header class="cover">
    <div class="brand">Code Destiny Premium</div>
    <h1>${escapeHtml(title)}</h1>
    <p>${escapeHtml(displayName)}님의 사주와 연애 흐름을 바탕으로, 사랑이 열리고 머무르는 방식을 차분히 읽어냅니다.</p>
    <div class="meta">
      <div>문서 번호: ${escapeHtml(reportId)}</div>
      <div>작성일: ${escapeHtml(generatedAt)}</div>
    </div>
  </header>
  <nav class="toc"><h2>목차</h2><ol>${toc}</ol></nav>
  <section class="summary">
    ${tableHtml("기본 정보", summaryRows(input))}
    ${tableHtml("해석 신호", highlightRows(input))}
  </section>
  ${overviewVisualHtml(input)}
  ${warnings}
  <main>${chapterHtml}</main>
  <section class="closing"><h2>마지막 실천 조언</h2><p>이 비책은 정해진 결말을 선언하지 않습니다. 다만 지금의 사주 신호와 관계 흐름 안에서, 마음을 덜 흔들고 더 선명하게 선택할 수 있는 기준을 남깁니다. 오늘 바로 바꿀 수 있는 표현 하나, 지켜야 할 경계 하나, 관계를 살리는 행동 하나를 작게 정해 꾸준히 실천해 주세요.</p><p>본 리포트는 사주 명리학과 연애 상담 관점을 결합한 엔터테인먼트·자기이해 목적의 콘텐츠입니다. 중요한 관계 결정은 현실의 대화와 상황을 함께 고려해 주세요.</p></section>
</body>
</html>`;

  assertAllConfiguredChaptersIncluded({ html, chapters: safeChapters });
  assertNoRawJsonLeak(html);
  assertNoUndefinedValues(html);
  assertNoForeignSystemTermsLeaked(html);
  const validation = validateLoveSecretFinalReportHtml({ html, chapters: safeChapters });
  if (!validation.ok) {
    const error = new Error(`LOVE_SECRET_FINAL_HTML_INVALID:${validation.errors.join(",")}`);
    error.code = "LOVE_SECRET_FINAL_HTML_INVALID";
    error.status = 422;
    error.validation = validation;
    throw error;
  }
  return html;
}
