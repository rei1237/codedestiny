import fs from "node:fs";

function read(path) {
  return fs.readFileSync(path, "utf8");
}

function expectContains(source, needle, label) {
  if (!source.includes(needle)) {
    throw new Error(`[verify-soul-origin-pdf-service-flow] missing ${label}: ${needle}`);
  }
  console.log(`[verify-soul-origin-pdf-service-flow] OK ${label}`);
}

function expectNotContains(source, needle, label) {
  if (source.includes(needle)) {
    throw new Error(`[verify-soul-origin-pdf-service-flow] unexpected ${label}: ${needle}`);
  }
  console.log(`[verify-soul-origin-pdf-service-flow] OK ${label}`);
}

const front = read("js/soul-origin-book.js");
const publicFront = read("public/js/soul-origin-book.js");
const worker = read("worker/routes/soul-origin.js");
const accessToken = read("worker/lib/premium-access-token.js");

for (const [label, source] of [
  ["frontend source", front],
  ["public frontend mirror", publicFront],
]) {
  expectContains(source, "var REPORT_TYPE = 'soulOriginKarma'", `${label} canonical report type`);
  expectContains(source, "var ARCHIVE_REPORT_TYPE = 'soul_origin_karma'", `${label} archive report type`);
  expectContains(source, "var EXPECTED_CHAPTER_COUNT = 12", `${label} expected chapter count`);
  expectContains(source, "var STATUS_API = '/api/soul-origin/status'", `${label} status API`);
  expectContains(source, "function pollSoulOriginStatus", `${label} status polling`);
  expectContains(source, "function shouldRecoverWithStatus", `${label} timeout recovery`);
  expectContains(source, "toneProfile: {", `${label} tone profile payload`);
  expectContains(source, "qualityStatus === 'passed'", `${label} quality readiness`);
  expectContains(source, "hasExpectedChapters", `${label} chapter readiness`);
  expectContains(source, "manuscriptSource === 'local-master-authored'", `${label} local master manuscript readiness`);
  expectContains(source, "chapterAuthoringSource === 'local-master-authored'", `${label} local master chapter readiness`);
  expectContains(source, "summarySource === 'local-master-authored'", `${label} local master summary readiness`);
  expectContains(source, "localAssembly.externalGeneration === false", `${label} local assembly external guard`);
  expectContains(source, "localAssembly.externalCallsAllowed === false", `${label} local assembly external call guard`);
  expectContains(source, "localAssembly.fallbackUsed !== true", `${label} local master fallback guard`);
  expectContains(source, "clean(localAssembly.authoringEngine) === 'local-master-counsel-engine'", `${label} local master engine readiness`);
  expectContains(source, "localAssembly.templateVersion", `${label} local assembly template readiness`);
  expectContains(source, "localAuthoringUsed && hasLocalAssembly", `${label} local authoring readiness`);
  expectContains(source, "function renderResultSummaryCards", `${label} result summary cards`);
  expectContains(source, "상담 검수 ·", `${label} customer quality label`);
  expectContains(source, "전체 세부 상담은 PDF에서 확인할 수 있습니다.", `${label} chapter preview pdf guidance`);
  expectContains(source, "중복 차감 없이 생성 권한", `${label} payment recovery reassurance`);
}

expectContains(worker, 'import { getServiceExecution } from "../lib/service-execution-task.js"', "worker execution status import");
expectContains(worker, 'const SOUL_ORIGIN_REPORT_TYPE = "soulOriginKarma"', "worker canonical report type");
expectContains(worker, 'const SOUL_ORIGIN_ARCHIVE_REPORT_TYPE = "soul_origin_karma"', "worker archive report type");
expectContains(worker, 'generationMode: "local-master-authored"', "worker local master generation mode");
expectContains(worker, 'provider: "soul-origin-local-master-engine"', "worker local master provider");
expectContains(worker, 'templateVersion: "soul-origin-local-master-v3"', "worker local master template version");
expectContains(worker, 'const SOUL_ORIGIN_MASTER_AUTHORING_ENGINE = "local-master-counsel-engine"', "worker local master authoring engine");
expectContains(worker, "async function handleStatus", "worker status handler");
expectContains(worker, 'if (path === "/status")', "worker status route");
expectContains(worker, "loadSoulOriginReportPayload", "worker report payload helper");
expectContains(worker, 'status: "running"', "worker running state");
expectContains(worker, 'qualityStatus: clean(qualityReport.status) || "passed"', "worker generated quality status");
expectContains(worker, "archivedQualityReport?.status", "worker archived quality status");
expectContains(worker, 'quality_report.not_passed', "worker strict quality completion gate");
expectContains(worker, 'download_url.archive_pdf_format', "worker archive pdf format validation");
expectContains(worker, 'html_url.archive_html_format', "worker archive html format validation");
expectContains(worker, 'renderFormat) !== "pdf-archive"', "worker pdf archive render validation");
expectContains(worker, 'soul-origin:${auth.userId}:${reportId}', "worker report scoped session fallback");
expectContains(worker, "SOUL_ORIGIN_PRECISION_STYLES", "worker varied master counsel styles");
expectContains(worker, "buildSoulOriginTermBridge", "worker expert term customer translation");
expectContains(worker, "buildSoulOriginCategorySpecificBrief", "worker category specific counsel brief");
expectContains(worker, "buildSoulOriginTransformationLine", "worker varied transformation counsel");
expectContains(worker, "renderSoulOriginChapterHighlights", "worker PDF chapter highlights");
expectContains(worker, "12장 상담 하이라이트", "worker PDF highlight section");
expectContains(worker, "상담 검수: 장별 근거, 실천 처방, 상징 일관성을 모두 확인했습니다.", "worker PDF customer quality proof");
expectContains(worker, "category_specific_brief_missing", "worker category specific validation");
expectContains(worker, "term_translation_missing", "worker expert term translation validation");
expectContains(worker, 'const localChapters = buildSoulOriginLocalChapters(localSeed, { requestId })', "worker local chapter authoring");
expectContains(worker, "enhanceSoulOriginLocalMasterChapters(localChapters, localSeed", "worker local master chapter enhancement");
expectContains(worker, 'const manuscriptSource = SOUL_ORIGIN_PDF_CONFIG.generationMode', "worker local assembled manuscript source");
expectContains(worker, "summarySource: SOUL_ORIGIN_PDF_CONFIG.generationMode", "worker local assembled summary source");
expectContains(worker, "const summary = summarizeSignal(localSeed)", "worker local summary generation");
expectContains(worker, "localAuthoringUsed: true", "worker local authoring flag");
expectContains(worker, "localAssembly,", "worker local assembly payload");
expectContains(worker, "fallbackUsed: false", "worker fallback completion blocked");
expectContains(worker, "authoringEngine: SOUL_ORIGIN_MASTER_AUTHORING_ENGINE", "worker local master engine payload");
expectContains(worker, "externalGeneration: false", "worker external generation blocked");
expectContains(worker, "externalCallsAllowed: false", "worker external calls blocked");
expectContains(worker, "validateSoulOriginPdfCompletionPayload", "worker PDF completion validation");
expectContains(worker, "chapterCount: CHAPTER_BLUEPRINTS.length", "worker chapter count");
expectContains(worker, "pdfReady", "worker pdf ready payload");
expectNotContains(worker, "SOUL_ORIGIN_EXTERNAL_LLM_DISABLED", "worker external llm disabled code removed");
expectNotContains(worker, "chapters = await generateSoulOriginChaptersByLLM", "worker LLM chapter call");
expectNotContains(worker, "const summary = await generateSoulOriginSummaryByLLM", "worker LLM summary call");
expectNotContains(worker, 'import { callGeminiText } from "../lib/gemini.js"', "worker Gemini import");
expectNotContains(worker, "callGeminiText(", "worker Gemini text call");

expectContains(accessToken, '"premium_pdf_soul_origin": "soulOriginKarma"', "premium token feature mapping");
expectContains(accessToken, '"premium-soul-origin-report": "soulOriginKarma"', "premium token legacy mapping");
expectContains(accessToken, "soul_origin_karma: \"soulOriginKarma\"", "premium token archive mapping");

console.log("[verify-soul-origin-pdf-service-flow] PASS");
