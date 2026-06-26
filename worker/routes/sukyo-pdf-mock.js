import { getRoutePath, handleRouteError, json, methodNotAllowed, notFound, readJson } from "../lib/http.js";
import { requireAuth } from "../lib/auth.js";
import { requirePremiumReportAccess } from "../lib/access-control.js";
import { connectDb } from "../lib/db.js";
import { ServiceExecutionTransaction } from "../lib/models.js";

const SUKYO_PDF_FEATURE_KEY = "premium-sukuyo-report-compat";
const SUKYO_PDF_ALIAS_FEATURE_KEY = "premium_pdf_sukyo_compat";
const SUKYO_PDF_REPORT_TYPE = "sookyoPremium";
const SUKYO_PDF_SERVICE_TYPE = "sukyo_pdf";
const SUKYO_PDF_MOCK_REPORT_TYPE = "sukyo_pdf_mock";
const JOB_TTL_MS = 1000 * 60 * 60 * 24 * 7;
const ACCESS_GRANT_TTL_MS = 1000 * 60 * 20;
const MOCK_STEP_DELAY_MS = 180;

export const SUKYO_RELATIONSHIP_PDF_CHAPTERS = Object.freeze([
  { id: "intro", order: 1, title: "두 사람의 숙요점 관계 흐름" },
  { id: "person-a-lodge", order: 2, title: "나의 본명숙과 관계 성향" },
  { id: "person-b-lodge", order: 3, title: "상대의 본명숙과 관계 성향" },
  { id: "relation-type", order: 4, title: "두 사람의 숙요 관계 유형" },
  { id: "attraction-conflict", order: 5, title: "끌림과 충돌의 지점" },
  { id: "love-compatibility", order: 6, title: "연애와 결혼 가능성" },
  { id: "timing", order: 7, title: "관계가 깊어지는 시기와 흔들리는 시기" },
  { id: "healing-guide", order: 8, title: "관계 회복과 소통 조언" },
  { id: "final-guide", order: 9, title: "최종 관계 조언" },
]);

export const SUKYO_PDF_CHAPTERS = Object.freeze([
  { id: "intro", order: 1, title: "숙요점 리딩의 전체 흐름" },
  { id: "birth-lodge", order: 2, title: "나의 본명숙과 기본 기질" },
  { id: "emotional-pattern", order: 3, title: "감정 패턴과 관계 방식" },
  { id: "relationship-karma", order: 4, title: "인연의 구조와 숙명적 관계성" },
  { id: "love-flow", order: 5, title: "연애운과 애정 흐름" },
  { id: "social-connection", order: 6, title: "인간관계와 사회적 인연" },
  { id: "yearly-flow", order: 7, title: "올해의 숙요점 흐름" },
  { id: "monthly-guide", order: 8, title: "월별 관계운과 주의점" },
  { id: "action-guide", order: 9, title: "관계 회복과 실천 조언" },
]);

const accessGrants = new Map();
const memoryJobs = new Map();
const activeJobRuns = new Set();

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
  return value === "true" || value === "1" || value === "yes";
}

function isProductionEnv(env = {}) {
  const mode = [
    readEnv(env, "NODE_ENV", ""),
    readEnv(env, "ENV", ""),
    readEnv(env, "APP_ENV", ""),
    readEnv(env, "CF_PAGES_BRANCH", ""),
  ].join(" ").toLowerCase();
  return /\bprod(?:uction)?\b/.test(mode) || readBool(env, "PRODUCTION", false);
}

function isDebugMockAccessEnabled(env = {}) {
  return readBool(env, "PDF_DEBUG_MODE", !isProductionEnv(env)) && !isProductionEnv(env);
}

function isPersistableUserId(userId = "") {
  return /^[a-f0-9]{24}$/i.test(clean(userId));
}

function nowIso() {
  return new Date().toISOString();
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, Math.max(0, Number(ms) || 0)));
}

function createId(prefix) {
  const random = Math.random().toString(36).slice(2, 10);
  return `${prefix}_${Date.now().toString(36)}_${random}`;
}

function stableStringify(value) {
  if (value == null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(",")}}`;
}

function hashStable(value) {
  const input = stableStringify(value);
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function markdownToTextBlocks(markdown = "") {
  return block(markdown)
    .split(/\n{2,}/)
    .map((part) => clean(part.replace(/^#{1,6}\s+/gm, "").replace(/^- /gm, "• ")))
    .filter(Boolean);
}

function normalizeGender(value) {
  const raw = clean(value).toLowerCase();
  if (["m", "male", "man", "남", "남자"].includes(raw)) return "male";
  if (["f", "female", "woman", "여", "여자"].includes(raw)) return "female";
  if (["other", "o", "기타"].includes(raw)) return "other";
  return undefined;
}

function normalizeCalendarType(value) {
  const raw = clean(value || "solar").toLowerCase();
  if (raw === "lunar" || raw === "lunar_leap") return "lunar";
  return "solar";
}

function normalizeBirthDate(source = {}) {
  const direct = clean(source.birthDate || source.dob || source.date);
  if (/^\d{4}-\d{2}-\d{2}$/.test(direct)) return direct;
  const year = Number(source.birthYear ?? source.year ?? source.birth?.year);
  const month = Number(source.birthMonth ?? source.month ?? source.birth?.month);
  const day = Number(source.birthDay ?? source.day ?? source.birth?.day);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return "";
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function normalizeBirthTime(source = {}) {
  const direct = clean(source.birthTime || source.time);
  if (/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(direct)) return direct;
  const hour = Number(source.birthHour ?? source.hour ?? source.birth?.hour);
  const minute = Number(source.birthMinute ?? source.minute ?? source.birth?.minute ?? 0);
  if (!Number.isFinite(hour) || hour < 0 || hour > 23) return "";
  const safeMinute = Number.isFinite(minute) && minute >= 0 && minute <= 59 ? minute : 0;
  return `${String(hour).padStart(2, "0")}:${String(safeMinute).padStart(2, "0")}`;
}

function normalizeSukyoPdfInput(source = {}) {
  const input = safeObject(source.input || source.sukyoInput || source);
  const self = safeObject(input.self || input.personA || input.user || {});
  const partner = safeObject(input.partner || input.personB || input.target || {});
  const selfCalendarRaw = clean(input.calendarType || self.calendarType || self.calType || "solar");
  const partnerCalendarRaw = clean(input.partnerCalendarType || partner.calendarType || partner.calType || "solar");
  const partnerBirthDate = clean(input.partnerBirthDate) || normalizeBirthDate(partner);
  const readingType = clean(input.readingType || input.mode || source.readingType || source.mode || (partnerBirthDate ? "relationship" : "personal")).toLowerCase();
  return {
    name: clean(input.name || self.name || self.displayName, 80) || undefined,
    gender: normalizeGender(input.gender || self.gender || self.sex),
    birthDate: clean(input.birthDate) || normalizeBirthDate(self),
    birthTime: clean(input.birthTime) || normalizeBirthTime(self) || undefined,
    calendarType: normalizeCalendarType(selfCalendarRaw),
    isLeapMonth: input.isLeapMonth === true || self.isLeapMonth === true || selfCalendarRaw === "lunar_leap",
    targetYear: Number.isFinite(Number(input.targetYear || source.targetYear)) ? Number(input.targetYear || source.targetYear) : new Date().getFullYear(),
    partnerName: clean(input.partnerName || partner.name || partner.displayName, 80) || undefined,
    partnerGender: normalizeGender(input.partnerGender || partner.gender || partner.sex),
    partnerBirthDate: partnerBirthDate || undefined,
    partnerBirthTime: clean(input.partnerBirthTime) || normalizeBirthTime(partner) || undefined,
    partnerCalendarType: normalizeCalendarType(partnerCalendarRaw),
    partnerIsLeapMonth: input.partnerIsLeapMonth === true || partner.isLeapMonth === true || partnerCalendarRaw === "lunar_leap",
    readingType: ["personal", "relationship", "yearly", "love"].includes(readingType) ? readingType : "relationship",
  };
}

function validateSukyoPdfInput(input = {}) {
  const missing = [];
  if (!/^\d{4}-\d{2}-\d{2}$/.test(clean(input.birthDate))) missing.push("birthDate");
  if (!["solar", "lunar"].includes(clean(input.calendarType))) missing.push("calendarType");
  if (["relationship", "love"].includes(clean(input.readingType))) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(clean(input.partnerBirthDate))) missing.push("partnerBirthDate");
  }
  return {
    ok: missing.length === 0,
    missing,
    message: missing.length ? "숙요점 PDF 생성에 필요한 생년월일과 달력 기준을 확인해 주세요." : "",
  };
}

function selectChapters(input = {}) {
  return ["relationship", "love"].includes(clean(input.readingType)) ? SUKYO_RELATIONSHIP_PDF_CHAPTERS : SUKYO_PDF_CHAPTERS;
}

function createChapters(input = {}) {
  return selectChapters(input).map((chapter) => ({
    id: chapter.id,
    title: chapter.title,
    order: chapter.order,
    status: "pending",
    provider: "mock",
    tokensUsed: 0,
    cost: 0,
    isMock: true,
  }));
}

function buildMockContext(input = {}) {
  return {
    mainLodge: "각수",
    moonLodge: "달빛 월숙",
    dayLodge: "관계 일숙",
    sukyoRelation: ["relationship", "love"].includes(clean(input.readingType)) ? "안괴" : "본명숙 중심",
    partnerLodge: clean(input.partnerBirthDate) ? "삼수" : undefined,
    relationshipType: clean(input.partnerBirthDate) ? "안괴의 끌림과 조율" : undefined,
    calculatedAt: nowIso(),
    source: "mock_context",
  };
}

function computeProgress(status, completedChapters, totalChapters) {
  const total = Math.max(1, Number(totalChapters) || 1);
  const completed = Math.max(0, Math.min(total, Number(completedChapters) || 0));
  if (status === "access_verifying") return 5;
  if (status === "access_verified" || status === "created" || status === "queued") return 10;
  if (status === "generating" || status === "chapter_generating") return 10 + Math.floor((completed / total) * 70);
  if (status === "rendering") return 85;
  if (status === "saving") return 95;
  if (status === "completed") return 100;
  return 0;
}

function toPublicChapter(chapter = {}, includeContent = false) {
  return {
    id: clean(chapter.id),
    title: clean(chapter.title),
    order: Number(chapter.order || 0),
    status: clean(chapter.status || "pending"),
    content: includeContent ? block(chapter.content || "") : undefined,
    provider: "mock",
    tokensUsed: 0,
    cost: 0,
    isMock: true,
    startedAt: chapter.startedAt || undefined,
    completedAt: chapter.completedAt || undefined,
    errorMessage: chapter.errorMessage || undefined,
  };
}

function toStatusPayload(job = {}, request = null, includeContent = false) {
  const origin = request ? new URL(request.url).origin : "";
  const pdfUrl = clean(job.pdfUrl) || (origin && job.status === "completed" ? `${origin}/api/premium/pdf-archive/${encodeURIComponent(job.id)}?format=pdf` : "");
  return {
    ok: true,
    jobId: job.id,
    serviceType: SUKYO_PDF_SERVICE_TYPE,
    status: job.status,
    progressPercent: Number(job.progressPercent || 0),
    totalChapters: Number(job.totalChapters || 0),
    completedChapters: Number(job.completedChapters || 0),
    currentChapterId: job.currentChapterId || null,
    currentChapterTitle: job.currentChapterTitle || null,
    chapters: Array.isArray(job.chapters) ? job.chapters.map((chapter) => toPublicChapter(chapter, includeContent)) : [],
    pdfUrl: pdfUrl || null,
    htmlUrl: job.htmlUrl || null,
    downloadUrl: job.downloadUrl || pdfUrl || null,
    errorMessage: job.errorMessage || null,
    provider: "mock",
    tokensUsed: 0,
    cost: 0,
    isMock: true,
    access: {
      verified: job.access?.verified === true,
      method: job.access?.method || null,
      verifiedAt: job.access?.verifiedAt || null,
    },
    createdAt: job.createdAt || null,
    updatedAt: job.updatedAt || null,
    completedAt: job.completedAt || null,
  };
}

function buildChapterSections(chapter = {}) {
  const blocks = markdownToTextBlocks(chapter.content || "");
  return blocks.slice(0, 8).map((text, index) => ({
    title: index === 0 ? clean(chapter.title) : `본문 ${index}`,
    body: text,
    finalText: text,
  }));
}

function buildSukyoPdfHtml(job = {}) {
  const title = `${clean(job.inputSnapshot?.name || "나")} · ${clean(job.inputSnapshot?.partnerName || "상대")} 숙요점 PDF`;
  const chapters = Array.isArray(job.chapters) ? job.chapters : [];
  return `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(title)}</title>
  <style>
    body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;margin:0;color:#251832;background:#fffaf7;line-height:1.72}
    .cover{min-height:720px;padding:72px 58px;background:linear-gradient(135deg,#180c2f,#3b1b6d);color:#fff7ed}
    .cover small{display:block;color:#d8c8ff;font-weight:700;letter-spacing:.08em;text-transform:uppercase}
    .cover h1{margin:22px 0 18px;font-size:38px;line-height:1.25}
    .cover p{max-width:680px;font-size:16px;color:#f7eaff}
    .meta{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:34px}
    .meta span{padding:12px;border:1px solid rgba(255,255,255,.18);border-radius:8px;background:rgba(255,255,255,.08)}
    .toc,.chapter{padding:46px 58px;page-break-before:always}
    .toc h2,.chapter h2{margin:0 0 18px;color:#3b1b6d}
    .toc ol{padding-left:24px}
    .toc li{margin:8px 0}
    .chapter article{max-width:760px}
    .chapter pre{white-space:pre-wrap;font-family:inherit}
  </style>
</head>
<body>
  <section class="cover">
    <small>Code Destiny Sukuyo Mock PDF</small>
    <h1>${escapeHtml(title)}</h1>
    <p>이 PDF는 실제 LLM 호출 없이 mock 챕터 생성, 진행 상태 저장, PDF 아카이브 저장, 다운로드 URL 반환을 검증하기 위해 생성되었습니다.</p>
    <div class="meta">
      <span>Job ID: ${escapeHtml(job.id)}</span>
      <span>Provider: mock</span>
      <span>Tokens: 0</span>
      <span>Cost: 0</span>
    </div>
  </section>
  <section class="toc">
    <h2>목차</h2>
    <ol>${chapters.map((chapter) => `<li>${escapeHtml(chapter.title)}</li>`).join("")}</ol>
  </section>
  ${chapters.map((chapter) => `<section class="chapter"><article><h2>${chapter.order}. ${escapeHtml(chapter.title)}</h2><pre>${escapeHtml(chapter.content || "")}</pre></article></section>`).join("\n")}
</body>
</html>`;
}

function buildArchive(job = {}) {
  const chapters = (Array.isArray(job.chapters) ? job.chapters : []).map((chapter) => ({
    id: chapter.id,
    title: chapter.title,
    order: chapter.order,
    status: chapter.status,
    content: chapter.content,
    body: chapter.content,
    finalText: chapter.content,
    sections: buildChapterSections(chapter),
    provider: "mock",
    tokensUsed: 0,
    cost: 0,
    isMock: true,
  }));
  const html = job.pdfHtml || buildSukyoPdfHtml(job);
  return {
    reportId: job.id,
    reportType: SUKYO_PDF_MOCK_REPORT_TYPE,
    reportTypeAliases: [SUKYO_PDF_REPORT_TYPE, "sukyoPremium", "sukyo_book"],
    serviceType: SUKYO_PDF_SERVICE_TYPE,
    serviceKey: "sukuyo-premium",
    status: "completed",
    serverStatus: "completed",
    qualityStatus: "passed",
    displayName: "숙요점 PDF mock 생성",
    title: `${clean(job.inputSnapshot?.name || "나")} · ${clean(job.inputSnapshot?.partnerName || "상대")} 숙요점 PDF`,
    mode: clean(job.inputSnapshot?.readingType || "relationship"),
    birthName: clean(job.inputSnapshot?.name || ""),
    targetName: clean(job.inputSnapshot?.partnerName || ""),
    summary: clean(chapters[0]?.content || "", 1000),
    chapterCount: chapters.length,
    expectedChapterCount: Number(job.totalChapters || chapters.length),
    llmDraftChapterCount: chapters.length,
    manuscriptSource: "mock",
    generationMode: "mock",
    provider: "mock",
    tokensUsed: 0,
    cost: 0,
    isMock: true,
    externalCallsAllowed: false,
    llmAssemblyOnly: false,
    chapters,
    payload: {
      ok: true,
      jobId: job.id,
      status: "completed",
      serviceType: SUKYO_PDF_SERVICE_TYPE,
      provider: "mock",
      tokensUsed: 0,
      cost: 0,
      isMock: true,
      input: job.inputSnapshot,
      context: job.contextSnapshot,
      chapters,
    },
    pdfReady: {
      reportId: job.id,
      html,
      htmlContent: html,
      htmlUrl: job.htmlUrl,
      pdfUrl: job.pdfUrl,
      downloadUrl: job.downloadUrl || job.pdfUrl,
      filename: `sukyo-mock-${job.id}.pdf`,
      mimeType: "application/pdf",
      renderFormat: "pdf-archive",
      canDownload: true,
      provider: "mock",
      tokensUsed: 0,
      cost: 0,
      isMock: true,
    },
    html,
    htmlContent: html,
    htmlUrl: job.htmlUrl,
    pdfUrl: job.pdfUrl,
    downloadUrl: job.downloadUrl || job.pdfUrl,
    canReopen: true,
    canDownload: true,
    completedAt: job.completedAt,
    createdAt: job.createdAt,
  };
}

async function requireAuthOrDebug(request, env) {
  try {
    return await requireAuth(request, env);
  } catch (error) {
    if (isDebugMockAccessEnabled(env)) {
      return { userId: "debug_mock_user", debugMock: true };
    }
    throw error;
  }
}

function cleanupAccessGrants() {
  const now = Date.now();
  for (const [id, grant] of accessGrants.entries()) {
    if (!grant || Number(grant.expiresAtMs || 0) <= now) accessGrants.delete(id);
  }
}

function normalizeAccessMethod(access = {}) {
  const raw = clean(access.accessType || access.accessMethod || access.paymentMode || access.method).toLowerCase();
  if (raw.includes("pass")) return "pass";
  if (raw.includes("subscription") || raw.includes("monthly")) return "pass";
  return "payment";
}

async function saveJob(env, job) {
  const nextJob = {
    ...job,
    updatedAt: nowIso(),
    progressPercent: computeProgress(job.status, job.completedChapters, job.totalChapters),
  };
  memoryJobs.set(nextJob.id, nextJob);
  if (!isPersistableUserId(nextJob.userId)) return nextJob;
  try {
    await connectDb(env);
    const archive = nextJob.status === "completed" ? buildArchive(nextJob) : undefined;
    await ServiceExecutionTransaction.findOneAndUpdate(
      { userId: nextJob.userId, reportId: nextJob.id, reportType: SUKYO_PDF_MOCK_REPORT_TYPE },
      {
        $set: {
          sessionId: nextJob.id,
          featureKey: SUKYO_PDF_FEATURE_KEY,
          status: nextJob.status === "completed" ? "success" : nextJob.status === "failed" ? "failed" : "pending",
          premiumStatus: nextJob.status === "completed" ? "completed" : nextJob.status === "failed" ? "failed" : "generating",
          completedAt: nextJob.status === "completed" ? new Date(nextJob.completedAt || Date.now()) : null,
          generationCompletedAt: nextJob.status === "completed" ? new Date(nextJob.completedAt || Date.now()) : null,
          generationFailedAt: nextJob.status === "failed" ? new Date() : null,
          reasonCode: nextJob.status === "failed" ? "SUKYO_MOCK_JOB_FAILED" : "",
          reasonMessage: nextJob.errorMessage || "",
          metadata: {
            sukyoPdfJob: nextJob,
            archive,
          },
        },
        $setOnInsert: {
          userId: nextJob.userId,
          executionKey: `sukyo_pdf_mock:${nextJob.userId}:${nextJob.id}`.slice(0, 120),
          reportType: SUKYO_PDF_MOCK_REPORT_TYPE,
          reportId: nextJob.id,
          cost: 0,
          coinAmount: 0,
          timeoutAt: new Date(Date.now() + JOB_TTL_MS),
          retentionUntil: new Date(Date.now() + JOB_TTL_MS),
        },
      },
      { upsert: true, new: true },
    ).lean();
  } catch (error) {
    console.warn("[SukyoPdfMock][SaveJobFallback]", {
      jobId: nextJob.id,
      code: clean(error?.code || ""),
      message: clean(error?.message || error, 180),
    });
  }
  return nextJob;
}

async function readJob(env, jobId, userId = "") {
  const id = clean(jobId, 160);
  if (!id) return null;
  const cached = memoryJobs.get(id);
  if (cached && (!userId || !cached.userId || cached.userId === userId || cached.userId === "debug_mock_user")) return cached;
  if (!isPersistableUserId(userId)) return null;
  try {
    await connectDb(env);
    const doc = await ServiceExecutionTransaction.findOne({
      userId,
      reportId: id,
      reportType: SUKYO_PDF_MOCK_REPORT_TYPE,
    }).lean();
    const job = doc?.metadata?.sukyoPdfJob || null;
    if (job?.id) {
      memoryJobs.set(job.id, job);
      return job;
    }
  } catch (error) {
    console.warn("[SukyoPdfMock][ReadJobFailed]", {
      jobId: id,
      code: clean(error?.code || ""),
      message: clean(error?.message || error, 180),
    });
  }
  return null;
}

function verifyStoredAccessGrant({ accessGrantId, userId, inputHash } = {}) {
  cleanupAccessGrants();
  const grant = accessGrants.get(clean(accessGrantId));
  if (!grant) return null;
  if (grant.userId !== userId) return null;
  if (grant.inputHash !== inputHash) return null;
  if (Number(grant.expiresAtMs || 0) <= Date.now()) {
    accessGrants.delete(clean(accessGrantId));
    return null;
  }
  return grant;
}

export function generateMockSukyoChapterContent(params = {}) {
  return `
# ${params.chapterOrder}. ${params.chapterTitle}

이 챕터는 숙요점 PDF 생성 파이프라인을 검증하기 위한 mock 콘텐츠입니다.

## 생성 정보

- PDF 서비스: 숙요점 PDF
- Job ID: ${params.jobId}
- Chapter ID: ${params.chapterId}
- 챕터 순서: ${params.chapterOrder} / ${params.totalChapters}
- Provider: mock
- 실제 LLM 호출 여부: 아니오
- 사용 토큰: 0
- 예상 비용: 0원

## 사용자 입력 요약

- 이름: ${params.input?.name ?? "미입력"}
- 성별: ${params.input?.gender ?? "미입력"}
- 생년월일: ${params.input?.birthDate ?? "미입력"}
- 출생시간: ${params.input?.birthTime ?? "출생시간 모름 또는 미입력"}
- 달력 기준: ${params.input?.calendarType ?? "미입력"}
- 기준 연도: ${params.input?.targetYear ?? "미입력"}
- 리딩 유형: ${params.input?.readingType ?? "미입력"}
- 상대 이름: ${params.input?.partnerName ?? "미입력"}
- 상대 생년월일: ${params.input?.partnerBirthDate ?? "미입력"}

## 숙요점 Context 요약

- 본명숙: ${params.context?.mainLodge ?? "mock 또는 미계산"}
- 월숙: ${params.context?.moonLodge ?? "mock 또는 미계산"}
- 일숙: ${params.context?.dayLodge ?? "mock 또는 미계산"}
- 상대 숙: ${params.context?.partnerLodge ?? "해당 없음 또는 미계산"}
- 관계 유형: ${params.context?.relationshipType ?? "해당 없음 또는 미계산"}

## 테스트 본문

이 문단은 실제 LLM 결과를 대신하여 숙요점 PDF의 챕터별 생성, 상태 저장, 진행률 반영, PDF 렌더링, 다운로드 URL 생성이 정상적으로 작동하는지 확인하기 위한 내용입니다.

숙요점 PDF는 각 챕터가 순서대로 생성되어야 하며, 한 챕터가 완료될 때마다 completedChapters 값과 progressPercent 값이 갱신되어야 합니다. 프론트 화면에서는 현재 생성 중인 챕터 제목과 전체 진행률을 정확히 표시해야 합니다.

이 mock 콘텐츠는 실제 숙요점 해석 품질을 검증하기 위한 것이 아닙니다. 이 작업의 목적은 오직 PDF 생성 파이프라인의 안정성을 검증하는 것입니다.

## 챕터 검증 포인트

- 이 챕터 제목이 PDF 목차와 본문에 표시되는가
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

export async function generateSukyoPdfChapterContent(params = {}, env = {}) {
  const failChapterId = clean(readEnv(env, "PDF_MOCK_FAIL_CHAPTER_ID", ""));
  if (failChapterId && failChapterId === clean(params.chapterId)) {
    const error = new Error(`PDF_MOCK_FAIL_CHAPTER_ID:${failChapterId}`);
    error.code = "SUKYO_MOCK_CHAPTER_FAILED";
    error.status = 503;
    error.chapterId = failChapterId;
    throw error;
  }
  return {
    content: generateMockSukyoChapterContent(params),
    provider: "mock",
    tokensUsed: 0,
    cost: 0,
    isMock: true,
  };
}

function failJobWithChapter(job, error, chapterId = "") {
  const message = clean(error?.message || error || "숙요점 PDF 생성 중 문제가 발생했습니다.", 500);
  const failedChapters = (Array.isArray(job.chapters) ? job.chapters : []).map((chapter) => {
    if (chapter.id !== chapterId) return chapter;
    return {
      ...chapter,
      status: "failed",
      errorMessage: message,
      completedAt: nowIso(),
    };
  });
  return {
    ...job,
    status: "failed",
    chapters: failedChapters,
    errorMessage: message,
    progressPercent: computeProgress("failed", job.completedChapters, job.totalChapters),
  };
}

async function runGenerateMockJob(env, request, jobId, userId) {
  if (activeJobRuns.has(jobId)) return readJob(env, jobId, userId);
  activeJobRuns.add(jobId);
  try {
    let job = await readJob(env, jobId, userId);
    if (!job) {
      const error = new Error("Job을 찾을 수 없습니다.");
      error.status = 404;
      throw error;
    }
    if (job.access?.verified !== true) {
      const error = new Error("결제 또는 이용권 검증이 완료되지 않았습니다.");
      error.status = 403;
      throw error;
    }
    if (job.status === "completed") return job;
    if (["rendering", "saving"].includes(job.status)) return job;

    job = await saveJob(env, {
      ...job,
      status: "generating",
      progressPercent: computeProgress("generating", job.completedChapters, job.totalChapters),
    });

    const totalChapters = Number(job.totalChapters || job.chapters.length);
    for (const chapter of job.chapters) {
      if (chapter.status === "completed") continue;

      const chapterIndex = job.chapters.findIndex((item) => item.id === chapter.id);
      const generatingChapter = {
        ...job.chapters[chapterIndex],
        status: "generating",
        startedAt: job.chapters[chapterIndex].startedAt || nowIso(),
      };
      const generatingChapters = job.chapters.slice();
      generatingChapters[chapterIndex] = generatingChapter;
      job = await saveJob(env, {
        ...job,
        status: "chapter_generating",
        currentChapterId: generatingChapter.id,
        currentChapterTitle: generatingChapter.title,
        chapters: generatingChapters,
      });
      await delay(MOCK_STEP_DELAY_MS);

      let generated;
      try {
        generated = await generateSukyoPdfChapterContent({
          jobId: job.id,
          chapterId: generatingChapter.id,
          chapterTitle: generatingChapter.title,
          chapterOrder: generatingChapter.order,
          totalChapters,
          input: job.inputSnapshot,
          context: job.contextSnapshot,
        }, env);
      } catch (error) {
        job = await saveJob(env, failJobWithChapter(job, error, generatingChapter.id));
        throw error;
      }

      const completedChapters = job.chapters.slice();
      completedChapters[chapterIndex] = {
        ...generatingChapter,
        status: "completed",
        content: generated.content,
        provider: "mock",
        tokensUsed: 0,
        cost: 0,
        isMock: true,
        completedAt: nowIso(),
      };
      const completedCount = completedChapters.filter((item) => item.status === "completed").length;
      job = await saveJob(env, {
        ...job,
        status: "chapter_generating",
        chapters: completedChapters,
        completedChapters: completedCount,
        currentChapterId: generatingChapter.id,
        currentChapterTitle: generatingChapter.title,
      });
      await delay(MOCK_STEP_DELAY_MS);
    }

    job = await saveJob(env, {
      ...job,
      status: "rendering",
      currentChapterId: undefined,
      currentChapterTitle: "PDF 문서를 렌더링하고 있습니다.",
    });
    await delay(MOCK_STEP_DELAY_MS);

    const html = buildSukyoPdfHtml(job);
    if (!clean(html) || !html.includes("<html")) {
      const error = new Error("PDF HTML 생성에 실패했습니다.");
      error.status = 500;
      throw error;
    }

    const origin = new URL(request.url).origin;
    const pdfUrl = `${origin}/api/premium/pdf-archive/${encodeURIComponent(job.id)}?format=pdf`;
    const htmlUrl = `${origin}/api/premium/pdf-archive/${encodeURIComponent(job.id)}?format=html`;
    job = await saveJob(env, {
      ...job,
      status: "saving",
      currentChapterTitle: "PDF 파일을 저장하고 있습니다.",
      pdfHtml: html,
      htmlUrl,
      pdfUrl,
      downloadUrl: pdfUrl,
    });
    await delay(MOCK_STEP_DELAY_MS);

    const completedAt = nowIso();
    job = await saveJob(env, {
      ...job,
      status: "completed",
      completedChapters: totalChapters,
      progressPercent: 100,
      currentChapterId: undefined,
      currentChapterTitle: undefined,
      pdfHtml: html,
      htmlUrl,
      pdfUrl,
      downloadUrl: pdfUrl,
      completedAt,
    });
    return job;
  } catch (error) {
    const job = await readJob(env, jobId, userId);
    if (job && job.status !== "failed") {
      await saveJob(env, failJobWithChapter(job, error, clean(error?.chapterId || "")));
    }
    console.error("[SukyoPdfMock][GenerateFailed]", {
      jobId,
      chapterId: clean(error?.chapterId || ""),
      errorCode: clean(error?.code || "SUKYO_MOCK_GENERATE_FAILED"),
      message: clean(error?.message || error, 220),
      stack: clean(error?.stack || "", 500),
    });
    throw error;
  } finally {
    activeJobRuns.delete(jobId);
  }
}

async function handleVerifyAccess(request, env) {
  const body = await readJson(request);
  const auth = await requireAuthOrDebug(request, env);
  const input = normalizeSukyoPdfInput(body);
  const validation = validateSukyoPdfInput(input);
  if (!validation.ok) {
    return json({ ok: false, code: "SUKYO_PDF_INPUT_INVALID", message: validation.message, missing: validation.missing }, { status: 400 });
  }

  const inputHash = hashStable(input);
  let access;
  if (isDebugMockAccessEnabled(env)) {
    access = {
      verified: true,
      method: "debug_mock",
      verifiedAt: nowIso(),
      accessType: "debug_mock",
    };
  } else {
    const decision = await requirePremiumReportAccess(env, auth.userId, SUKYO_PDF_REPORT_TYPE, {
      ...body,
      input,
      mode: "compatibility",
      reportMode: "compatibility",
      reportType: SUKYO_PDF_REPORT_TYPE,
      featureKey: body.featureKey || SUKYO_PDF_FEATURE_KEY,
      aliasFeatureKey: SUKYO_PDF_ALIAS_FEATURE_KEY,
      coinCost: 490,
      _accessRoute: "/api/pdf/sukyo/verify-access",
    });
    if (!decision?.ok) {
      return json({
        ok: false,
        accessGranted: false,
        code: clean(decision?.code || "SUKYO_PDF_ACCESS_REQUIRED"),
        message: clean(decision?.message || "숙요점 PDF 생성을 위해 결제 또는 이용권 확인이 필요합니다."),
      }, { status: Number(decision?.status) || 402 });
    }
    const method = normalizeAccessMethod(decision);
    access = {
      verified: true,
      method,
      paymentId: method === "payment" ? clean(decision.matchedTransactionId || decision.transactionId || body.paymentId || body.purchaseId) || undefined : undefined,
      passId: method === "pass" ? clean(decision.passId || decision.entitlementId || decision.passTier) || undefined : undefined,
      verifiedAt: nowIso(),
      accessType: clean(decision.accessType || ""),
      featureKey: clean(decision.featureKey || SUKYO_PDF_FEATURE_KEY),
    };
  }

  const accessGrantId = createId("sukyo_access");
  accessGrants.set(accessGrantId, {
    id: accessGrantId,
    userId: auth.userId,
    inputHash,
    input,
    access,
    expiresAtMs: Date.now() + ACCESS_GRANT_TTL_MS,
  });

  return json({
    ok: true,
    accessGranted: true,
    accessGrantId,
    serviceType: SUKYO_PDF_SERVICE_TYPE,
    provider: "mock",
    tokensUsed: 0,
    cost: 0,
    isMock: true,
    access,
    chapters: selectChapters(input),
    totalChapters: selectChapters(input).length,
  });
}

async function handleCreateJob(request, env) {
  const body = await readJson(request);
  const auth = await requireAuthOrDebug(request, env);
  const input = normalizeSukyoPdfInput(body);
  const validation = validateSukyoPdfInput(input);
  if (!validation.ok) {
    return json({ ok: false, code: "SUKYO_PDF_INPUT_INVALID", message: validation.message, missing: validation.missing }, { status: 400 });
  }
  const inputHash = hashStable(input);
  const grant = verifyStoredAccessGrant({ accessGrantId: body.accessGrantId, userId: auth.userId, inputHash });
  if (!grant) {
    return json({
      ok: false,
      code: "SUKYO_PDF_ACCESS_NOT_VERIFIED",
      message: "verify-access API 검증이 완료된 뒤에만 숙요점 PDF Job을 만들 수 있습니다.",
    }, { status: 403 });
  }

  if (grant.jobId) {
    const existing = await readJob(env, grant.jobId, auth.userId);
    if (existing) return json(toStatusPayload(existing, request));
  }

  const createdAt = nowIso();
  const chapters = createChapters(input);
  const job = await saveJob(env, {
    id: createId("sukyo"),
    userId: auth.userId,
    serviceType: SUKYO_PDF_SERVICE_TYPE,
    status: "access_verified",
    inputHash,
    inputSnapshot: input,
    contextSnapshot: buildMockContext(input),
    access: grant.access,
    totalChapters: chapters.length,
    completedChapters: 0,
    currentChapterId: undefined,
    currentChapterTitle: undefined,
    progressPercent: 10,
    chapters,
    provider: "mock",
    tokensUsed: 0,
    cost: 0,
    isMock: true,
    createdAt,
    updatedAt: createdAt,
  });
  grant.jobId = job.id;
  accessGrants.set(grant.id, grant);

  return json({
    ...toStatusPayload(job, request),
    accessGrantId: grant.id,
  });
}

async function handleGenerateMock(request, env, ctx = null) {
  const body = await readJson(request);
  const auth = await requireAuthOrDebug(request, env);
  const jobId = clean(body.jobId || body.id, 160);
  if (!jobId) return json({ ok: false, code: "SUKYO_PDF_JOB_ID_REQUIRED", message: "jobId가 필요합니다." }, { status: 400 });

  let job = await readJob(env, jobId, auth.userId);
  if (!job) return json({ ok: false, code: "SUKYO_PDF_JOB_NOT_FOUND", message: "숙요점 PDF Job을 찾을 수 없습니다." }, { status: 404 });
  if (job.access?.verified !== true) {
    return json({ ok: false, code: "SUKYO_PDF_ACCESS_NOT_VERIFIED", message: "결제 또는 이용권 검증이 완료되지 않았습니다." }, { status: 403 });
  }
  if (job.status === "completed") return json(toStatusPayload(job, request, true));
  if (["generating", "chapter_generating", "rendering", "saving"].includes(job.status) || activeJobRuns.has(jobId)) {
    return json(toStatusPayload(job, request), { status: 202 });
  }

  job = await saveJob(env, { ...job, status: "queued" });
  if (ctx && typeof ctx.waitUntil === "function" && body.sync !== true) {
    ctx.waitUntil(runGenerateMockJob(env, request, jobId, auth.userId).catch(() => null));
    return json({
      ...toStatusPayload(job, request),
      accepted: true,
      pollAfterMs: 700,
    }, { status: 202 });
  }

  const completed = await runGenerateMockJob(env, request, jobId, auth.userId);
  return json(toStatusPayload(completed, request, true));
}

async function handleStatus(request, env, jobId) {
  const auth = await requireAuthOrDebug(request, env);
  const job = await readJob(env, jobId, auth.userId);
  if (!job) return json({ ok: false, code: "SUKYO_PDF_JOB_NOT_FOUND", message: "숙요점 PDF Job을 찾을 수 없습니다." }, { status: 404 });
  return json(toStatusPayload(job, request));
}

async function handleResult(request, env, jobId) {
  const auth = await requireAuthOrDebug(request, env);
  const job = await readJob(env, jobId, auth.userId);
  if (!job) return json({ ok: false, code: "SUKYO_PDF_JOB_NOT_FOUND", message: "숙요점 PDF Job을 찾을 수 없습니다." }, { status: 404 });
  if (job.status !== "completed") {
    return json({
      ok: true,
      jobId: job.id,
      status: job.status,
      pdfUrl: null,
      message: "아직 숙요점 PDF 생성이 완료되지 않았습니다.",
      provider: "mock",
      tokensUsed: 0,
      cost: 0,
      isMock: true,
    }, { status: 202 });
  }
  return json(toStatusPayload(job, request, true));
}

async function handleChapters(request) {
  const url = new URL(request.url);
  const readingType = clean(url.searchParams.get("readingType") || "relationship");
  const chapters = selectChapters({ readingType });
  return json({
    ok: true,
    serviceType: SUKYO_PDF_SERVICE_TYPE,
    chapters,
    totalChapters: chapters.length,
    provider: "mock",
    tokensUsed: 0,
    cost: 0,
    isMock: true,
  });
}

export async function handleSukyoPdfMockRoutes(request, env = {}, ctx = null) {
  try {
    const method = request.method.toUpperCase();
    const path = getRoutePath(request, "/api/pdf/sukyo");

    if (path === "/chapters") {
      if (method !== "GET") return methodNotAllowed();
      return await handleChapters(request);
    }
    if (path === "/verify-access") {
      if (method !== "POST") return methodNotAllowed();
      return await handleVerifyAccess(request, env);
    }
    if (path === "/create-job") {
      if (method !== "POST") return methodNotAllowed();
      return await handleCreateJob(request, env);
    }
    if (path === "/generate-mock") {
      if (method !== "POST") return methodNotAllowed();
      return await handleGenerateMock(request, env, ctx);
    }
    if (path.startsWith("/status/")) {
      if (method !== "GET") return methodNotAllowed();
      return await handleStatus(request, env, decodeURIComponent(path.slice("/status/".length)));
    }
    if (path.startsWith("/result/")) {
      if (method !== "GET") return methodNotAllowed();
      return await handleResult(request, env, decodeURIComponent(path.slice("/result/".length)));
    }

    if (["GET", "POST"].includes(method)) return notFound();
    return methodNotAllowed();
  } catch (error) {
    const status = Number(error?.status || 0);
    if (status >= 400 && status < 500) {
      return json({
        ok: false,
        code: clean(error?.code || "SUKYO_PDF_MOCK_REQUEST_FAILED"),
        message: clean(error?.message || "숙요점 PDF mock 요청을 처리하지 못했습니다."),
      }, { status });
    }
    return handleRouteError(error, { request, trace: { route: "api/pdf/sukyo", method: request.method } });
  }
}
