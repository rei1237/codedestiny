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
  "/api/life-book-ai/message",
  'serviceType: FEATURE_KEY',
  'consultationType: "lifeBook"',
  "focusArea",
  "question",
  "runBillingCoinGate",
  "deferUsage: true",
  "usagePolicy: \"apply_after_success\"",
  "[LifeBook AI Page Enter]",
  "[LifeBook AI Initial Render Success]",
  "[LifeBook AI Submit Start]",
  "[LifeBook AI Payment Success]",
  "splitLifeBookSections",
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
]) {
  assertNotIncludes("app/life-book-ai/LifeBookAiClient.tsx", client, marker);
}

assertIncludes("worker/index.js", workerIndex, '"/api/life-book-ai"');
assertIncludes("worker/index.js", workerIndex, "handleLifeBookAiRoutes");
assertNotIncludes("worker/index.js", workerIndex, "handleSajuLifebookRoutes");
assertNotIncludes("worker/index.js", workerIndex, "routes/saju-lifebook.js");

for (const marker of [
  "handleEnsureAccess",
  "handleStart",
  "handleMessage",
  "path === \"/prepare\"",
  "path === \"/generate\"",
  "path === \"/ensure-access\"",
  "path === \"/start\"",
  "serviceType",
  "consultationType",
  "focusArea",
  "question",
  "calculateLifeBookAiSaju",
  "callGeminiText",
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
