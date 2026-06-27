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
const billingClient = read("app/_lib/billing-client.ts");
const billingRoute = read("worker/routes/billing.js");
const workerIndex = read("worker/index.js");
const models = read("worker/lib/models.js");
const saju = read("worker/lib/life-book-ai-saju.js");

for (const file of [
  "js/life-book.js",
  "worker/routes/saju-lifebook.js",
  "app/api/lifebook/session/route.js",
  "app/_lib/lifebook/canonical.js",
  "app/_lib/lifebook/state.js",
  "scripts/verify-lifebook-llm-only-flow.mjs",
  "__tests__/worker/saju-lifebook.pipeline-quality-soft-gate.test.js",
]) {
  assert(!fs.existsSync(rel(file)), `retired file still exists: ${file}`);
}

assertIncludes("index.html", indexHtml, 'href="/life-book-ai"');
assertIncludes("index.html", indexHtml, "인생의 책 AI 상담");
assertNotIncludes("index.html", indexHtml, 'data-action="openLifeBookModal"');
assertNotIncludes("index.html", indexHtml, 'id="lifeBookModal"');
assertNotIncludes("index.html", indexHtml, "/js/life-book.js");

for (const marker of [
  "/api/life-book-ai/ensure-access",
  "/api/life-book-ai/start",
  "/api/life-book-ai/message",
  "runBillingCoinGate",
  "deferUsage: true",
]) {
  assertIncludes("app/life-book-ai/LifeBookAiClient.tsx", client, marker);
}
assertIncludes("app/_lib/billing-client.ts", billingClient, "registerDeferredBillingUsage");
assertIncludes("worker/routes/billing.js", billingRoute, "handleDeferredUsageApply");
assertIncludes("worker/routes/billing.js", billingRoute, "handleDeferredUsageCancel");
assertIncludes("worker/routes/life-book-ai.js", route, "finalizeDeferredBillingUsage");
assertIncludes("worker/routes/life-book-ai.js", route, "cancelDeferredBillingUsage");
for (const marker of [
  "/api/premium/saju-lifebook",
  "/api/lifebook/prepare",
  "create-job",
  "generate-mock",
  "lbProgress",
  "lbChapterContent",
  "PortOne",
  "requestPayment",
  "portone_redirect",
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
  "calculateLifeBookAiSaju",
  "LifeBookAiConsultation",
  "PAYMENT_REQUIRED",
  "LOGIN_REQUIRED",
  "INVALID_INPUT",
]) {
  assertIncludes("worker/routes/life-book-ai.js", route, marker);
}
assertNotIncludes("worker/routes/life-book-ai.js", route, "/api/premium/saju-lifebook");
assertNotIncludes("worker/routes/life-book-ai.js", route, "create-job");
assertNotIncludes("worker/routes/life-book-ai.js", route, "generate-mock");
assertNotIncludes("worker/routes/life-book-ai.js", route, "fetchPortOnePayment");
assertNotIncludes("worker/routes/life-book-ai.js", route, "getPortOnePublicConfig");

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
