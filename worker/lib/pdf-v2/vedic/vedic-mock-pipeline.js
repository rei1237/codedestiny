export const VEDIC_PDF_CHAPTERS = Object.freeze([
  Object.freeze({ id: "intro", order: 1, title: "베다점 리딩의 전체 흐름" }),
  Object.freeze({ id: "birth-chart-summary", order: 2, title: "출생 차트와 기본 성향" }),
  Object.freeze({ id: "ascendant-moon", order: 3, title: "라그나와 달 별자리의 핵심 의미" }),
  Object.freeze({ id: "nakshatra", order: 4, title: "나크샤트라가 보여주는 타고난 기질" }),
  Object.freeze({ id: "planetary-strength", order: 5, title: "행성의 강약과 인생의 주요 테마" }),
  Object.freeze({ id: "dasha-flow", order: 6, title: "다샤 흐름과 현재 인생 주기" }),
  Object.freeze({ id: "career-money", order: 7, title: "직업운과 재물운" }),
  Object.freeze({ id: "love-relationship", order: 8, title: "연애운과 인간관계" }),
  Object.freeze({ id: "health-mind", order: 9, title: "건강운과 마음의 균형" }),
  Object.freeze({ id: "yearly-transit", order: 10, title: "올해의 고차라 흐름" }),
  Object.freeze({ id: "monthly-guide", order: 11, title: "월별 흐름과 주의점" }),
  Object.freeze({ id: "action-guide", order: 12, title: "실천 조언과 보완 방향" }),
]);

export const VEDIC_PDF_SERVICE_TYPE = "vedic_pdf";
export const VEDIC_PDF_REPORT_TYPE = "vedicPremium";
export const VEDIC_PDF_SERVICE_KEY = "vedic-pdf";

function clean(value, max = 100000) {
  const text = String(value == null ? "" : value).replace(/\s+/g, " ").trim();
  return Number.isFinite(max) ? text.slice(0, max) : text;
}

function block(value, max = 100000) {
  const text = String(value == null ? "" : value).replace(/\r/g, "").trim();
  return Number.isFinite(max) ? text.slice(0, max) : text;
}

function safeObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function readEnv(env = {}, key = "", fallback = "") {
  const direct = env && Object.prototype.hasOwnProperty.call(env, key) ? env[key] : undefined;
  if (direct !== undefined && direct !== null && String(direct) !== "") return String(direct);
  const processEnv = typeof process !== "undefined" ? process.env : undefined;
  const processValue = processEnv?.[key];
  if (processValue !== undefined && processValue !== null && String(processValue) !== "") return String(processValue);
  return fallback;
}

function readBool(env, key, fallback = false) {
  const value = readEnv(env, key, fallback ? "true" : "false").toLowerCase();
  return value === "true" || value === "1" || value === "yes" || value === "on";
}

function stableStringify(value) {
  const seen = new WeakSet();
  return JSON.stringify(value, (_key, item) => {
    if (typeof item === "number" && !Number.isFinite(item)) return null;
    if (item === undefined) return null;
    if (!item || typeof item !== "object") return item;
    if (seen.has(item)) return "[Circular]";
    seen.add(item);
    if (Array.isArray(item)) return item;
    return Object.keys(item).sort().reduce((acc, objectKey) => {
      acc[objectKey] = item[objectKey];
      return acc;
    }, {});
  });
}

export function hashVedicPdfInput(value) {
  const text = stableStringify(value);
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

export function normalizeVedicPdfInput(body = {}) {
  const source = safeObject(body.input || body.birthInput || body.vedicInput || body);
  const birthTimeUnknown = source.birthTimeUnknown === true || source.isTimeUnknown === true || source.birthHour == null && !clean(source.birthTime);
  const birthTime = birthTimeUnknown ? "" : clean(source.birthTime || (
    source.birthHour != null
      ? `${String(Math.max(0, Math.min(23, Math.floor(Number(source.birthHour))))).padStart(2, "0")}:${String(Math.max(0, Math.min(59, Math.floor(Number(source.birthMinute || 0))))).padStart(2, "0")}`
      : ""
  ));
  const targetYear = Number(source.targetYear || body.targetYear || new Date().getFullYear());
  return {
    name: clean(source.name) || undefined,
    gender: ["male", "female", "other"].includes(clean(source.gender)) ? clean(source.gender) : undefined,
    birthDate: clean(source.birthDate),
    birthTime,
    birthTimeUnknown,
    calendarType: clean(source.calendarType || "solar") === "lunar" ? "lunar" : "solar",
    isLeapMonth: source.isLeapMonth === true,
    birthPlace: clean(source.birthPlace) || undefined,
    timezone: clean(source.timezone || "Asia/Seoul") || "Asia/Seoul",
    latitude: Number.isFinite(Number(source.latitude)) ? Number(source.latitude) : undefined,
    longitude: Number.isFinite(Number(source.longitude)) ? Number(source.longitude) : undefined,
    targetYear: Number.isFinite(targetYear) ? Math.max(1900, Math.min(2200, Math.trunc(targetYear))) : new Date().getFullYear(),
    readingType: ["personal", "yearly", "love", "career", "money", "relationship"].includes(clean(source.readingType)) ? clean(source.readingType) : "personal",
    memo: clean(source.memo, 1000) || undefined,
  };
}

export function validateVedicPdfInput(input = {}) {
  const missing = [];
  if (!clean(input.birthDate)) missing.push("birthDate");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(clean(input.birthDate))) missing.push("birthDate:YYYY-MM-DD");
  if (!clean(input.timezone)) missing.push("timezone");
  if (missing.length) {
    return {
      ok: false,
      code: "INVALID_INPUT",
      missing,
      message: "베다점 PDF 생성에 필요한 입력값이 부족합니다. 생년월일과 시간대 정보를 확인해 주세요.",
    };
  }
  return { ok: true, missing: [] };
}

export function buildVedicPdfContext(body = {}, input = {}) {
  const provided = safeObject(body.context || body.vedicContext || body.contextSnapshot);
  const chart = safeObject(body.localVedicChartJson?.chart || body.vedicBase?.chart || body.chartSource || body.localVedicChartJson || body.vedicBase);
  const nakshatra = safeObject(chart.nakshatra || chart.moonNakshatra || provided.nakshatra);
  const dashas = safeObject(chart.dashas || provided.dashas);
  const warnings = [];
  if (input.birthTimeUnknown) {
    warnings.push("출생시간을 모르는 상태이므로 라그나와 하우스 기반 해석은 제한적으로 다루어집니다.");
  }
  return {
    ascendant: clean(provided.ascendant || chart.lagnaSign || chart.lagna || chart.ascendant),
    moonSign: clean(provided.moonSign || chart.moonSign),
    sunSign: clean(provided.sunSign || chart.sunSign),
    moonNakshatra: clean(provided.moonNakshatra || nakshatra.name || nakshatra.moonNakshatra),
    ascendantNakshatra: clean(provided.ascendantNakshatra || chart.ascendantNakshatra),
    rashiChart: provided.rashiChart || chart.rashiChart || chart.houses || null,
    navamsaChart: provided.navamsaChart || chart.navamsaChart || null,
    mahadasha: clean(provided.mahadasha || dashas.currentMahaDasha || dashas.mahadasha || dashas.current),
    antardasha: clean(provided.antardasha || dashas.currentAntarDasha || dashas.antardasha),
    pratyantardasha: clean(provided.pratyantardasha || dashas.currentPratyantarDasha || dashas.pratyantardasha),
    transitSummary: clean(provided.transitSummary || chart.transitSummary || (input.targetYear ? `${input.targetYear}년 고차라 흐름은 mock context로 정리되었습니다.` : "")),
    yogas: asArray(provided.yogas || chart.yogas).map((item) => clean(item?.name || item)).filter(Boolean).slice(0, 12),
    warnings,
    calculatedAt: clean(provided.calculatedAt) || new Date().toISOString(),
    source: clean(provided.source) || (Object.keys(chart).length ? "existing_engine" : "mock_context"),
  };
}

export function calculateVedicPdfProgress(status, completedChapters = 0, totalChapters = VEDIC_PDF_CHAPTERS.length, provided) {
  const direct = Number(provided);
  if (Number.isFinite(direct) && direct >= 0 && direct <= 100) return Math.round(direct);
  const normalized = clean(status);
  if (normalized === "access_verifying") return 5;
  if (normalized === "access_verified" || normalized === "queued" || normalized === "created") return 10;
  if (normalized === "generating" || normalized === "chapter_generating") {
    const total = Math.max(1, Number(totalChapters || VEDIC_PDF_CHAPTERS.length));
    const completed = Math.max(0, Math.min(total, Number(completedChapters || 0)));
    return 10 + Math.floor((completed / total) * 70);
  }
  if (normalized === "rendering") return 85;
  if (normalized === "saving") return 95;
  if (normalized === "completed") return 100;
  if (normalized === "failed" || normalized === "cancelled") return Math.max(0, Math.min(100, Math.round(Number(provided || 0))));
  return 0;
}

function accessMethod(access = {}, fallback = "payment") {
  const method = clean(access.method || access.accessMethod || access.accessType).toLowerCase();
  if (method === "debug_mock") return "debug_mock";
  if (method.includes("pass") || method.includes("membership") || method.includes("unlock")) return "pass";
  return fallback === "debug_mock" ? "debug_mock" : "payment";
}

export function buildVedicPdfAccess(access = {}, method = "payment") {
  const resolvedMethod = accessMethod(access, method);
  return {
    verified: true,
    method: resolvedMethod,
    paymentId: resolvedMethod === "payment" ? clean(access.matchedTransactionId || access.transactionId || access.paymentId || access.purchaseId) || undefined : undefined,
    passId: resolvedMethod === "pass" ? clean(access.entitlementId || access.passTier || access.accessType) || undefined : undefined,
    verifiedAt: new Date().toISOString(),
  };
}

export function buildVedicPdfJob({ jobId, userId, input, context, access }) {
  const now = new Date().toISOString();
  const chapters = VEDIC_PDF_CHAPTERS.map((chapter) => ({
    id: chapter.id,
    title: chapter.title,
    order: chapter.order,
    status: "pending",
    provider: "mock",
    tokensUsed: 0,
    cost: 0,
    isMock: true,
  }));
  return {
    id: clean(jobId) || `vedic_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    userId: clean(userId) || undefined,
    serviceType: VEDIC_PDF_SERVICE_TYPE,
    status: "queued",
    inputHash: hashVedicPdfInput(input),
    inputSnapshot: input,
    contextSnapshot: context,
    access,
    totalChapters: VEDIC_PDF_CHAPTERS.length,
    completedChapters: 0,
    currentChapterId: "",
    currentChapterTitle: "",
    progressPercent: calculateVedicPdfProgress("queued", 0, VEDIC_PDF_CHAPTERS.length),
    chapters,
    provider: "mock",
    tokensUsed: 0,
    cost: 0,
    isMock: true,
    pdfUrl: "",
    errorMessage: "",
    createdAt: now,
    updatedAt: now,
  };
}

export function generateMockVedicChapterContent(params = {}) {
  const input = safeObject(params.input);
  const context = safeObject(params.context);
  return `
# ${Number(params.chapterOrder || 1)}. ${clean(params.chapterTitle)}

이 챕터는 베다점 PDF 생성 파이프라인을 검증하기 위한 mock 콘텐츠입니다.

## 생성 정보

- PDF 서비스: 베다점 PDF
- Job ID: ${clean(params.jobId)}
- Chapter ID: ${clean(params.chapterId)}
- 챕터 순서: ${Number(params.chapterOrder || 1)} / ${Number(params.totalChapters || VEDIC_PDF_CHAPTERS.length)}
- Provider: mock
- 실제 LLM 호출 여부: 아니오
- 사용 토큰: 0
- 예상 비용: 0원

## 사용자 입력 요약

- 이름: ${clean(input.name) || "미입력"}
- 성별: ${clean(input.gender) || "미입력"}
- 생년월일: ${clean(input.birthDate) || "미입력"}
- 출생시간: ${input.birthTimeUnknown ? "출생시간 모름" : clean(input.birthTime) || "미입력"}
- 출생지: ${clean(input.birthPlace) || "미입력"}
- 시간대: ${clean(input.timezone) || "미입력"}
- 기준 연도: ${clean(input.targetYear) || "미입력"}
- 리딩 유형: ${clean(input.readingType) || "미입력"}

## 베다점 Context 요약

- 라그나: ${clean(context.ascendant) || "mock 또는 미계산"}
- 달 별자리: ${clean(context.moonSign) || "mock 또는 미계산"}
- 태양 별자리: ${clean(context.sunSign) || "mock 또는 미계산"}
- 달 나크샤트라: ${clean(context.moonNakshatra) || "mock 또는 미계산"}
- 마하다샤: ${clean(context.mahadasha) || "mock 또는 미계산"}
- 안타르다샤: ${clean(context.antardasha) || "mock 또는 미계산"}
- 계산 소스: ${clean(context.source) || "mock_context"}

${asArray(context.warnings).length ? `## 계산 안내\n\n${context.warnings.map((item) => `- ${clean(item)}`).join("\n")}\n` : ""}
## 테스트 본문

이 문단은 실제 LLM 결과를 대신하여 베다점 PDF의 챕터별 생성, 상태 저장, 진행률 반영, PDF 렌더링, 다운로드 URL 생성이 정상적으로 작동하는지 확인하기 위한 내용입니다.

베다점 PDF는 각 챕터가 순서대로 생성되어야 하며, 한 챕터가 완료될 때마다 completedChapters 값과 progressPercent 값이 갱신되어야 합니다. 프론트 화면에서는 현재 생성 중인 챕터 제목과 전체 진행률을 정확히 표시해야 합니다.

이 mock 콘텐츠는 실제 베다 점성술 해석 품질을 검증하기 위한 것이 아닙니다. 이 작업의 목적은 오직 PDF 생성 파이프라인의 안정성을 검증하는 것입니다.

## 베다점 PDF 검증 포인트

- 라그나, 달 별자리, 나크샤트라 등 context가 누락되어도 PDF가 끝까지 생성되는가
- 출생시간 모름 상태에서도 파이프라인이 멈추지 않는가
- 챕터 제목이 PDF 목차와 본문에 표시되는가
- 한글이 깨지지 않는가
- 챕터 순서가 유지되는가
- 현재 챕터 상태가 generating에서 completed로 바뀌는가
- 진행률 UI가 실제 상태와 일치하는가
- 전체 챕터 완료 후 PDF 렌더링 단계로 넘어가는가

## 결론

이 챕터는 실제 Gemini, Workers AI, OpenAI, Claude를 호출하지 않고 생성되었습니다.
따라서 개발 중 이 PDF 생성 테스트에서는 LLM 비용이 발생하지 않아야 합니다.
`.trim();
}

export async function generateVedicPdfChapterContent(params = {}, env = {}) {
  const failChapterId = readEnv(env, "PDF_MOCK_FAIL_CHAPTER_ID", "")
    .split(",")
    .map((item) => clean(item))
    .filter(Boolean);
  if (failChapterId.includes(clean(params.chapterId))) {
    const error = new Error(`PDF_MOCK_CHAPTER_FAILED:${clean(params.chapterId)}`);
    error.code = "PDF_MOCK_CHAPTER_FAILED";
    error.status = 503;
    error.chapterId = clean(params.chapterId);
    throw error;
  }
  const dryRun = readBool(env, "LLM_DRY_RUN", true);
  const provider = readEnv(env, "PDF_LLM_PROVIDER", "mock").toLowerCase();
  const maxCalls = Number(readEnv(env, "PDF_LLM_MAX_CALLS_PER_JOB", "0"));
  const blocked = dryRun || provider === "mock" || !Number.isFinite(maxCalls) || maxCalls <= 0;
  if (!blocked) {
    throw Object.assign(new Error("VEDIC_PDF_LLM_CALLS_DISABLED"), {
      code: "VEDIC_PDF_LLM_CALLS_DISABLED",
      status: 503,
    });
  }
  return {
    content: generateMockVedicChapterContent(params),
    provider: "mock",
    tokensUsed: 0,
    cost: 0,
    isMock: true,
  };
}

function markdownToHtml(markdown = "") {
  return block(markdown)
    .split(/\n{2,}/)
    .map((chunk) => {
      const text = block(chunk);
      if (!text) return "";
      if (text.startsWith("# ")) return `<h2>${escapeHtml(text.replace(/^#\s+/, ""))}</h2>`;
      if (text.startsWith("## ")) return `<h3>${escapeHtml(text.replace(/^##\s+/, ""))}</h3>`;
      if (/^- /m.test(text)) {
        const items = text.split("\n").filter((line) => line.trim().startsWith("- ")).map((line) => `<li>${escapeHtml(line.replace(/^- /, ""))}</li>`).join("");
        return `<ul>${items}</ul>`;
      }
      return `<p>${escapeHtml(text)}</p>`;
    })
    .join("\n");
}

export function buildVedicMockArchiveChapters(job = {}) {
  return asArray(job.chapters).map((chapter, index) => {
    const content = block(chapter.content);
    const sectionBody = content || `${chapter.title} mock content`;
    return {
      id: clean(chapter.id),
      order: Number(chapter.order || index + 1),
      no: Number(chapter.order || index + 1),
      title: clean(chapter.title),
      status: clean(chapter.status || "completed"),
      content,
      text: content,
      html: `<section class="vedic-chapter" data-chapter-id="${escapeHtml(chapter.id)}">${markdownToHtml(content)}</section>`,
      sections: [
        {
          title: "Mock 생성 본문",
          body: sectionBody,
          text: sectionBody,
          finalText: sectionBody,
        },
      ],
      categories: [
        {
          title: "Mock 생성 본문",
          body: sectionBody,
          text: sectionBody,
          finalText: sectionBody,
        },
      ],
      provider: "mock",
      tokensUsed: 0,
      cost: 0,
      isMock: true,
      source: "mock",
    };
  });
}

function renderInputRows(input = {}, context = {}) {
  const rows = [
    ["이름", clean(input.name) || "미입력"],
    ["성별", clean(input.gender) || "미입력"],
    ["생년월일", clean(input.birthDate) || "미입력"],
    ["출생시간", input.birthTimeUnknown ? "출생시간 모름" : clean(input.birthTime) || "미입력"],
    ["출생지", clean(input.birthPlace) || "미입력"],
    ["시간대", clean(input.timezone) || "미입력"],
    ["기준 연도", clean(input.targetYear) || "미입력"],
    ["라그나", clean(context.ascendant) || "mock 또는 미계산"],
    ["달 별자리", clean(context.moonSign) || "mock 또는 미계산"],
    ["달 나크샤트라", clean(context.moonNakshatra) || "mock 또는 미계산"],
    ["다샤", [context.mahadasha, context.antardasha].map(clean).filter(Boolean).join(" / ") || "mock 또는 미계산"],
    ["계산 소스", clean(context.source) || "mock_context"],
  ];
  return `<table><tbody>${rows.map(([label, value]) => `<tr><th>${escapeHtml(label)}</th><td>${escapeHtml(value)}</td></tr>`).join("")}</tbody></table>`;
}

export function buildVedicMockPdfHtml(job = {}, archiveChapters = buildVedicMockArchiveChapters(job)) {
  const input = safeObject(job.inputSnapshot);
  const context = safeObject(job.contextSnapshot);
  const toc = archiveChapters.map((chapter) => `<li><span>${Number(chapter.order || chapter.no)}</span>${escapeHtml(chapter.title)}</li>`).join("");
  const chaptersHtml = archiveChapters.map((chapter) => chapter.html).join("\n");
  return `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <title>베다점 PDF Mock Report</title>
  <style>
    body{margin:0;background:#f5efe5;color:#241b16;font-family:"Noto Serif KR","Noto Sans KR",serif;line-height:1.78}
    .page{max-width:960px;margin:0 auto;background:#fffaf2;min-height:100vh;padding:52px 62px}
    .cover{text-align:center;padding:68px 0 42px;border-bottom:2px solid #c9983f}
    .kicker{color:#8b5e18;font-size:13px;font-weight:800;letter-spacing:.16em}
    h1{margin:16px 0 10px;font-size:32px;color:#3b2414;letter-spacing:0}
    h2{font-size:23px;color:#6b3f13;letter-spacing:0}
    h3{font-size:17px;color:#7b4b16;letter-spacing:0}
    p,li{font-size:15px}
    table{width:100%;border-collapse:collapse;margin:18px 0 28px;font-size:14px}
    th,td{border:1px solid #decba6;padding:9px 10px;text-align:left;vertical-align:top}
    th{width:28%;background:#f0dfbd;color:#6b3f13}
    td{background:#fff8eb}
    .toc{break-after:page;margin:36px 0}
    .toc li{margin:8px 0}
    .toc span{display:inline-block;width:30px;color:#8b5e18;font-weight:800}
    .vedic-chapter{break-before:page;padding:28px 0}
    .vedic-chapter>h2{border-bottom:2px solid #ad7b34;padding-bottom:12px}
    .notice{margin:28px 0;padding:16px;border:1px solid #decba6;background:#fff8eb}
    @media print{body{background:#fff}.page{padding:40px 48px}.vedic-chapter{break-before:page}}
  </style>
</head>
<body>
  <main class="page" data-vedic-mock-job-id="${escapeHtml(job.id)}">
    <section class="cover">
      <div class="kicker">VEDIC JYOTISH MOCK PIPELINE</div>
      <h1>베다점 PDF Mock Report</h1>
      <p>실제 LLM 호출 없이 베다점 PDF 생성 파이프라인을 검증합니다.</p>
    </section>
    <section class="summary">
      <h2>입력 정보와 Mock Context</h2>
      ${renderInputRows(input, context)}
    </section>
    ${asArray(context.warnings).length ? `<section class="notice"><h2>계산 안내</h2>${context.warnings.map((item) => `<p>${escapeHtml(item)}</p>`).join("")}</section>` : ""}
    <section class="toc">
      <h1>목차</h1>
      <ol>${toc}</ol>
    </section>
    ${chaptersHtml}
  </main>
</body>
</html>`;
}

export function buildVedicArchiveUrls(origin = "", jobId = "") {
  const base = origin && jobId ? `${origin}/api/premium/pdf-archive/${encodeURIComponent(jobId)}` : "";
  return {
    archiveUrl: base,
    pdfUrl: base ? `${base}?format=pdf` : "",
    htmlUrl: base ? `${base}?format=html` : "",
    downloadUrl: base ? `${base}?format=pdf` : "",
  };
}

export function buildVedicPdfStatusPayload(job = {}) {
  const chapters = asArray(job.chapters).map((chapter) => ({
    id: clean(chapter.id),
    title: clean(chapter.title),
    order: Number(chapter.order || 0),
    status: clean(chapter.status || "pending"),
    startedAt: clean(chapter.startedAt) || undefined,
    completedAt: clean(chapter.completedAt) || undefined,
    errorMessage: clean(chapter.errorMessage) || undefined,
  }));
  return {
    ok: clean(job.status) !== "failed",
    jobId: clean(job.id),
    reportId: clean(job.id),
    serviceType: VEDIC_PDF_SERVICE_TYPE,
    serviceKey: VEDIC_PDF_SERVICE_KEY,
    status: clean(job.status || "created"),
    progressPercent: calculateVedicPdfProgress(job.status, job.completedChapters, job.totalChapters, job.progressPercent),
    totalChapters: Number(job.totalChapters || VEDIC_PDF_CHAPTERS.length),
    completedChapters: Number(job.completedChapters || 0),
    currentChapterId: clean(job.currentChapterId) || null,
    currentChapterTitle: clean(job.currentChapterTitle) || null,
    chapters,
    pdfUrl: clean(job.pdfUrl) || null,
    errorMessage: clean(job.errorMessage) || null,
    provider: "mock",
    tokensUsed: 0,
    cost: 0,
    isMock: true,
    updatedAt: clean(job.updatedAt) || null,
    completedAt: clean(job.completedAt) || null,
  };
}

export function buildVedicPdfResultPayload(job = {}, metadata = {}) {
  const archive = safeObject(metadata.archive);
  const payload = safeObject(archive.payload);
  const pdfReady = safeObject(archive.pdfReady || payload.pdfReady);
  if (clean(job.status) !== "completed") {
    return {
      ok: true,
      jobId: clean(job.id),
      reportId: clean(job.id),
      status: clean(job.status || "created"),
      pdfUrl: null,
      message: "아직 베다점 PDF 생성이 완료되지 않았습니다.",
      provider: "mock",
      tokensUsed: 0,
      cost: 0,
      isMock: true,
    };
  }
  const chapters = asArray(payload.chapters).length ? payload.chapters : buildVedicMockArchiveChapters(job);
  return {
    ok: true,
    jobId: clean(job.id),
    reportId: clean(job.id),
    status: "completed",
    pdfUrl: clean(job.pdfUrl || payload.pdfUrl || pdfReady.pdfUrl || pdfReady.downloadUrl),
    htmlUrl: clean(payload.htmlUrl || pdfReady.htmlUrl),
    downloadUrl: clean(payload.downloadUrl || pdfReady.downloadUrl || job.pdfUrl),
    completedAt: clean(job.completedAt),
    chapters,
    inputSnapshot: job.inputSnapshot || null,
    contextSnapshot: job.contextSnapshot || null,
    payload,
    pdfReady,
    provider: "mock",
    tokensUsed: 0,
    cost: 0,
    isMock: true,
    canDownload: true,
    canReopen: true,
  };
}
