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
  expectContains(source, "manuscriptSource === 'local-assembled'", `${label} local assembled manuscript readiness`);
  expectContains(source, "chapterAuthoringSource === 'local-assembled'", `${label} local assembled chapter readiness`);
  expectContains(source, "summarySource === 'local-assembled'", `${label} local assembled summary readiness`);
  expectContains(source, "localAssembly.externalGeneration === false", `${label} local assembly external guard`);
  expectContains(source, "localAssembly.externalCallsAllowed === false", `${label} local assembly external call guard`);
  expectContains(source, "localAssembly.templateVersion", `${label} local assembly template readiness`);
  expectContains(source, "localAuthoringUsed && hasLocalAssembly", `${label} local authoring readiness`);
}

expectContains(worker, 'import { getServiceExecution } from "../lib/service-execution-task.js"', "worker execution status import");
expectContains(worker, 'const SOUL_ORIGIN_REPORT_TYPE = "soulOriginKarma"', "worker canonical report type");
expectContains(worker, 'const SOUL_ORIGIN_ARCHIVE_REPORT_TYPE = "soul_origin_karma"', "worker archive report type");
expectContains(worker, 'templateVersion: "soul-origin-local-assembled-v2"', "worker local assembled template version");
expectContains(worker, "async function handleStatus", "worker status handler");
expectContains(worker, 'if (path === "/status")', "worker status route");
expectContains(worker, "loadSoulOriginReportPayload", "worker report payload helper");
expectContains(worker, 'status: "running"', "worker running state");
expectContains(worker, 'qualityStatus: "passed"', "worker quality status");
expectContains(worker, 'const localChapters = buildSoulOriginLocalChapters(localSeed, { requestId })', "worker local chapter authoring");
expectContains(worker, 'const manuscriptSource = SOUL_ORIGIN_PDF_CONFIG.generationMode', "worker local assembled manuscript source");
expectContains(worker, "summarySource: SOUL_ORIGIN_PDF_CONFIG.generationMode", "worker local assembled summary source");
expectContains(worker, "const summary = summarizeSignal(localSeed)", "worker local summary generation");
expectContains(worker, "localAuthoringUsed: true", "worker local authoring flag");
expectContains(worker, "localAssembly,", "worker local assembly payload");
expectContains(worker, "externalGeneration: false", "worker external generation blocked");
expectContains(worker, "externalCallsAllowed: false", "worker external calls blocked");
expectContains(worker, "validateSoulOriginPdfCompletionPayload", "worker PDF completion validation");
expectContains(worker, 'provider: "soul-origin-local-assembler"', "worker local assembler provider");
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
