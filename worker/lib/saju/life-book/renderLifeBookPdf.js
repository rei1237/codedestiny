function esc(value) {
  return String(value == null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function normalizeReadableText(value) {
  return String(value == null ? "" : value)
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function markdownToHtml(markdown) {
  const lines = String(markdown || "").replace(/\r/g, "").split("\n");
  const out = [];
  let inList = false;

  const closeList = () => {
    if (inList) {
      out.push("</ul>");
      inList = false;
    }
  };

  for (const raw of lines) {
    const line = normalizeReadableText(raw);
    if (!line) {
      closeList();
      continue;
    }

    if (/^###\s+/.test(line)) {
      closeList();
      out.push(`<h3>${esc(line.replace(/^###\s+/, ""))}</h3>`);
      continue;
    }

    if (/^##\s+/.test(line)) {
      closeList();
      out.push(`<h2>${esc(line.replace(/^##\s+/, ""))}</h2>`);
      continue;
    }

    if (/^#\s+/.test(line)) {
      closeList();
      out.push(`<h1>${esc(line.replace(/^#\s+/, ""))}</h1>`);
      continue;
    }

    if (/^-\s+/.test(line)) {
      if (!inList) {
        out.push("<ul>");
        inList = true;
      }
      out.push(`<li>${esc(line.replace(/^-\s+/, ""))}</li>`);
      continue;
    }

    closeList();
    out.push(`<p>${esc(line)}</p>`);
  }

  closeList();
  return out.join("\n");
}

function formatDate(dateInput) {
  const d = dateInput instanceof Date ? dateInput : new Date(dateInput || Date.now());
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}.${mm}.${dd}`;
}

function buildChartSummary(lifeBookInputData) {
  const user = lifeBookInputData?.userProfile || {};
  const chart = lifeBookInputData?.sajuChart || {};
  const elements = lifeBookInputData?.fiveElements || {};
  const yongshin = lifeBookInputData?.yongshin || {};
  const tenGods = lifeBookInputData?.tenGods || {};
  const daeun = Array.isArray(lifeBookInputData?.daeun) ? lifeBookInputData.daeun[0] : null;

  const tenGodLine = Object.entries(tenGods?.verifiedStemTenGodMap || {})
    .filter(([stem, god]) => String(stem || "").trim() && String(god || "").trim())
    .map(([stem, god]) => `${stem}:${god}`)
    .join(", ") || "미제공";

  return [
    ["이름", user.name || "사용자"],
    ["생년월일", user.birthDate || "미제공"],
    ["출생시각", user.birthTime || "미제공"],
    ["년주", chart.yearPillar || "미제공"],
    ["월주", chart.monthPillar || "미제공"],
    ["일주", chart.dayPillar || "미제공"],
    ["시주", chart.hourPillar || "미제공"],
    ["일간", chart.dayMaster || "미제공"],
    ["오행 분포", `목 ${Number(elements.wood || 0)} / 화 ${Number(elements.fire || 0)} / 토 ${Number(elements.earth || 0)} / 금 ${Number(elements.metal || 0)} / 수 ${Number(elements.water || 0)}`],
    ["십성 기준표", tenGodLine],
    ["용신/희신", `${(yongshin.yongshin || []).join(", ") || "미제공"} / ${(yongshin.heeshin || []).join(", ") || "미제공"}`],
    ["현재 대운 요약", daeun ? `${daeun.ageStart || "?"}세~${daeun.ageEnd || "?"}세 ${daeun.pillar || ""} ${daeun.summary || ""}` : "미제공"],
  ];
}

export function renderLifeBookPdf(params = {}) {
  const reportId = String(params.reportId || "").trim();
  const lifeBookInputData = params.lifeBookInputData || {};
  const chapters = Array.isArray(params.chapters) ? params.chapters : [];
  const generatedAt = params.generatedAt || new Date().toISOString();

  const chartRows = buildChartSummary(lifeBookInputData)
    .map(([label, value]) => `<tr><th>${esc(label)}</th><td>${esc(value)}</td></tr>`)
    .join("\n");

  const tocRows = chapters
    .map((chapter, index) => `<li>${esc(chapter.roman || String(index + 1))}. ${esc(chapter.title || `Chapter ${index + 1}`)}</li>`)
    .join("\n");

  const chapterBlocks = chapters
    .map((chapter, index) => {
      const advice = Array.isArray(chapter.practicalAdvice) ? chapter.practicalAdvice : [];
      const warnings = Array.isArray(chapter.warnings) ? chapter.warnings : [];
      return [
        '<section class="lb-chapter">',
        `<h1>${esc(chapter.roman || String(index + 1))}. ${esc(chapter.title || `Chapter ${index + 1}`)}</h1>`,
        chapter.subtitle ? `<p class="lb-subtitle">${esc(chapter.subtitle)}</p>` : "",
        `<article class="lb-content">${markdownToHtml(chapter.contentMarkdown || "")}</article>`,
        '<div class="lb-summary-box">',
        '<h3>핵심 요약</h3>',
        `<p>${esc(chapter.summary || "")}</p>`,
        "</div>",
        advice.length
          ? `<div class="lb-advice-box"><h3>실전 조언</h3><ul>${advice.map((line) => `<li>${esc(line)}</li>`).join("")}</ul></div>`
          : "",
        warnings.length
          ? `<div class="lb-warning-box"><h3>주의할 점</h3><ul>${warnings.map((line) => `<li>${esc(line)}</li>`).join("")}</ul></div>`
          : "",
        "</section>",
      ].join("\n");
    })
    .join("\n");

  const html = [
    "<!doctype html>",
    '<html lang="ko">',
    "<head>",
    '<meta charset="utf-8" />',
    "<title>인생의 책</title>",
    "<style>",
    'body{margin:0;padding:26px;font-family:Georgia,"Times New Roman",serif;background:#f6f2eb;color:#1f2937;line-height:1.72}',
    '.lb-cover{padding:26px;border-radius:16px;background:linear-gradient(135deg,#15131f,#31244a);color:#f3e9d2;margin-bottom:24px}',
    '.lb-cover h1{font-size:38px;margin:0 0 8px}',
    '.lb-cover p{margin:3px 0;color:#f0e3c4}',
    '.lb-card{padding:18px;border:1px solid #dccfb8;border-radius:12px;background:#fffaf2;margin-bottom:18px}',
    '.lb-card h2{margin:0 0 12px;color:#4f3a21}',
    '.lb-summary-table{width:100%;border-collapse:collapse}',
    '.lb-summary-table th,.lb-summary-table td{border:1px solid #e4d9c7;padding:8px 10px;text-align:left;font-size:13px;vertical-align:top}',
    '.lb-summary-table th{width:170px;background:#f8efe1;color:#5f4528}',
    '.lb-chapter{padding:18px;border:1px solid #e9dfcf;border-radius:14px;background:#fff;margin-bottom:20px}',
    '.lb-chapter h1{margin:0 0 8px;font-size:28px;color:#352515}',
    '.lb-subtitle{margin:0 0 14px;color:#7a5a3b}',
    '.lb-content h2{margin-top:14px;color:#5a3c21;font-size:20px}',
    '.lb-content h3{margin-top:12px;color:#69492a;font-size:17px}',
    '.lb-summary-box,.lb-advice-box,.lb-warning-box{margin-top:14px;padding:12px;border-radius:10px}',
    '.lb-summary-box{background:#f8f0e3;border:1px solid #e1d0b6}',
    '.lb-advice-box{background:#edf7ef;border:1px solid #b9dec0}',
    '.lb-warning-box{background:#fff2ef;border:1px solid #efc2b6}',
    '.lb-footer{padding:16px;border-radius:12px;background:#f5f5f5;border:1px solid #d9d9d9;color:#4b5563;font-size:12px}',
    '@media print{body{padding:0;background:#fff}.lb-cover,.lb-card,.lb-chapter,.lb-footer{border:none;box-shadow:none}}',
    "</style>",
    "</head>",
    "<body>",
    '<section class="lb-cover">',
    "<h1>인생의 책</h1>",
    "<p>사주가 들려주는 나의 운명 사용 설명서</p>",
    `<p>${esc(lifeBookInputData?.userProfile?.name || "사용자")}</p>`,
    `<p>생성일 ${esc(formatDate(generatedAt))}</p>`,
    reportId ? `<p>리포트 ID ${esc(reportId)}</p>` : "",
    "</section>",
    '<section class="lb-card">',
    "<h2>기본 명식 요약</h2>",
    '<table class="lb-summary-table">',
    chartRows,
    "</table>",
    "</section>",
    '<section class="lb-card">',
    "<h2>목차</h2>",
    `<ol>${tocRows}</ol>`,
    "</section>",
    chapterBlocks,
    '<section class="lb-footer">',
    '<p>Code Destiny Premium Report</p>',
    '<p>본 리포트는 자기이해와 성찰을 위한 콘텐츠이며, 법률/의학/투자 판단을 대체하지 않습니다.</p>',
    "</section>",
    "</body>",
    "</html>",
  ].join("\n");

  return {
    ok: true,
    html,
    fileName: `lifebook-${reportId || Date.now()}.html`,
    generatedAt,
    chapterCount: chapters.length,
  };
}
