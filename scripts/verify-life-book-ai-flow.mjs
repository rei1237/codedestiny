#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const failures = [];

function rel(file) {
  return path.join(root, file);
}

function read(file) {
  const full = rel(file);
  if (!fs.existsSync(full)) {
    failures.push(`missing file: ${file}`);
    return "";
  }
  return fs.readFileSync(full, "utf8").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

function assert(condition, message) {
  if (!condition) failures.push(message);
}

function assertIncludes(file, text, marker) {
  assert(text.includes(marker), `${file} missing marker: ${marker}`);
}

function assertNotIncludes(file, text, marker) {
  assert(!text.includes(marker), `${file} contains retired marker: ${marker}`);
}

const indexHtml = read("index.html");
const client = read("app/life-book-ai/LifeBookAiClient.tsx");
const resultPage = read("app/life-book-ai/result/page.tsx");
const route = read("worker/routes/life-book-ai.js");
const workerIndex = read("worker/index.js");
const models = read("worker/lib/models.js");
const saju = read("worker/lib/life-book-ai-saju.js");

assertIncludes("index.html", indexHtml, 'href="/life-book-ai"');
assertIncludes("index.html", indexHtml, "cd-preparing-badge");
assertNotIncludes("index.html", indexHtml, 'data-action="openLifeBookModal"');
assertNotIncludes("index.html", indexHtml, 'id="lifeBookModal"');
assertNotIncludes("index.html", indexHtml, "/js/life-book.js");

for (const marker of [
  "/api/life-book-ai/prepare",
  "/api/life-book-ai/generate",
  'serviceType: FEATURE_KEY',
  'consultationType: "lifeBook"',
  "focusArea",
  "runBillingCoinGate",
  "deferUsage: true",
  "usagePolicy: \"apply_after_success\"",
  "buildResultUrl",
  "window.open(pendingUrl, \"_blank\")",
  "인생의 책 생성하기",
  "완성된 인생의 책 열기",
  "[LifeBook AI Page Enter]",
  "[LifeBook AI Initial Render Success]",
  "[LifeBook AI Submit Start]",
  "[LifeBook AI Payment Success]",
]) {
  assertIncludes("app/life-book-ai/LifeBookAiClient.tsx", client, marker);
}

for (const marker of [
  "/api/premium/saju-lifebook",
  "/api/lifebook/prepare",
  "create-job",
  "generate-mock",
  "lbProgress",
  "lbChapterContent",
  "requestPayment",
  "portone_redirect",
  "/api/life-book-ai/start\"",
  "/api/life-book-ai/ensure-access\"",
  "/api/life-book-ai/message",
  "openPaidFeatureGate",
  "paymentMode: \"pass\"",
  "sendFollowUp",
  "splitLifeBookSections",
  "question",
  "상담 주제",
  "자유 질문",
  "직접 질문",
]) {
  assertNotIncludes("app/life-book-ai/LifeBookAiClient.tsx", client, marker);
}

for (const marker of [
  "useSearchParams",
  "authFetch(`/api/life-book-ai/result?attemptId=",
  "pending",
  "html2canvas",
  "jspdf",
  "life-book-reading-",
  "CANONICAL_TEN_GODS",
  "PDF로 저장하기",
  "새로운 인생의 책 만들기",
]) {
  assertIncludes("app/life-book-ai/result/page.tsx", resultPage, marker);
}

assertIncludes("worker/index.js", workerIndex, '"/api/life-book-ai"');
assertIncludes("worker/index.js", workerIndex, "handleLifeBookAiRoutes");
assertNotIncludes("worker/index.js", workerIndex, "handleSajuLifebookRoutes");
assertNotIncludes("worker/index.js", workerIndex, "routes/saju-lifebook.js");

for (const marker of [
  "handleEnsureAccess",
  "handleStart",
  "handleResult",
  "path === \"/prepare\"",
  "path === \"/generate\"",
  "path === \"/ensure-access\"",
  "path === \"/start\"",
  "path === \"/result\"",
  "path.startsWith(\"/result/\")",
  "serviceType",
  "consultationType",
  "focusArea",
  "calculateLifeBookAiSaju",
  "callGeminiText",
  "extractReportJson",
  "reportJson",
  "CANONICAL_TEN_GODS",
  "리포트 강조 영역",
  "finalizeDeferredBillingUsage",
  "cancelDeferredBillingUsage",
  "restoreBillingGateAccessOnFailure",
  "applyUsageOnce",
  "PAYMENT_REQUIRED",
  "LOGIN_REQUIRED",
  "INVALID_INPUT",
  "[LifeBook AI ${marker}]",
  'logLifeBookAi("LLM Prepare Start"',
  'logLifeBookAi("LLM Payload Received"',
  'logLifeBookAi("LLM Payload Validated"',
  'logLifeBookAi("LLM Access Check Start"',
  'logLifeBookAi("LLM Access Check Success"',
  'logLifeBookAi("Payment Required"',
  'logLifeBookAi("LLM Generate Start"',
  'logLifeBookAi("LLM Provider Selected"',
  'logLifeBookAi("LLM Generate Success"',
  'logLifeBookAi("LLM Error"',
  'logLifeBookAi("Refund Or Restore"',
  'logLifeBookAi("Pass Consumed"',
]) {
  assertIncludes("worker/routes/life-book-ai.js", route, marker);
}

for (const marker of [
  "/api/premium/saju-lifebook",
  "/api/lifebook/prepare",
  "create-job",
  "generate-mock",
  "fetchPortOnePayment",
  "getPortOnePublicConfig",
  "requestPayment",
  "portone_redirect",
  "/api/life-book-ai/message",
  "handleMessage",
  "buildFollowUpPrompt",
  "question",
  "customQuestionRequired",
  "직접 질문",
]) {
  assertNotIncludes("worker/routes/life-book-ai.js", route, marker);
}

assertIncludes("worker/lib/models.js", models, "lifeBookAiConsultationSchema");
assertIncludes("worker/lib/models.js", models, 'collection: "lifeBookAiConsultations"');
assertIncludes("worker/lib/life-book-ai-saju.js", saju, "yearPillar");
assertIncludes("worker/lib/life-book-ai-saju.js", saju, "fiveElements");
assertIncludes("worker/lib/life-book-ai-saju.js", saju, "tenGods");
assertIncludes("worker/lib/life-book-ai-saju.js", saju, "majorLuck");

if (failures.length) {
  console.error("[verify-life-book-ai-flow] FAIL");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("[verify-life-book-ai-flow] PASS");
