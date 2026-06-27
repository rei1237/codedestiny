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

const legacyLoveSecretSlug = ["love", "secret"].join("-");

for (const file of [
  `js/${legacyLoveSecretSlug}-v2.js`,
  `js/${legacyLoveSecretSlug}-service.js`,
  `app/_lib/${legacyLoveSecretSlug}/report-types.ts`,
  `worker/routes/saju-${legacyLoveSecretSlug}.js`,
  `worker/lib/pdf-v2/${legacyLoveSecretSlug}/create-${legacyLoveSecretSlug}-premium-pdf-job.js`,
  `worker/lib/pdf-v2/${legacyLoveSecretSlug}/generate-${legacyLoveSecretSlug}-premium-report.js`,
  `worker/lib/pdf-v2/${legacyLoveSecretSlug}/${legacyLoveSecretSlug}-premium.chapter-plan.js`,
  `worker/lib/pdf-v2/${legacyLoveSecretSlug}/${legacyLoveSecretSlug}-premium.prompt-pack.js`,
  `worker/lib/pdf-v2/${legacyLoveSecretSlug}/${legacyLoveSecretSlug}-premium.validator.js`,
  `scripts/verify-${legacyLoveSecretSlug}-llm-engine.mjs`,
]) {
  assert(!fs.existsSync(rel(file)), `retired file still exists: ${file}`);
}

const indexHtml = read("index.html");
const page = read("app/love-secret-ai/page.tsx");
const resultPage = read("app/love-secret-ai/result/page.tsx");
const route = read("worker/routes/love-secret-ai.js");
const workerIndex = read("worker/index.js");
const models = read("worker/lib/models.js");
const registry = read("worker/lib/paid-feature-registry.js");
const calc = read("worker/lib/love-secret-ai-calculation.js");
const prompt = read("worker/lib/love-secret-ai-prompt.js");
const appChrome = read("app/components/AppChrome.tsx");

assertIncludes("index.html", indexHtml, 'data-cd-marker="love-secret-ai-entry-v20260627"');
assertIncludes("index.html", indexHtml, 'data-action="goLoveSecretAi"');
assertIncludes("index.html", indexHtml, 'data-service-detail-href="/love-secret-ai"');
assertNotIncludes("index.html", indexHtml, `/js/${legacyLoveSecretSlug}-v2.js`);
assertNotIncludes("index.html", indexHtml, 'id="loveSecretModal"');
assertNotIncludes("index.html", indexHtml, "love-secret-pdf");

for (const marker of [
  "/api/love-secret-ai/prepare",
  "/api/love-secret-ai/generate",
  "runBillingCoinGate",
  "LoveSecretGeneratingCard",
  "연애 비책 상담 시작하기",
  "/love-secret-ai/result",
]) {
  assertIncludes("app/love-secret-ai/page.tsx", page, marker);
}
for (const marker of [
  "requestPortOnePayment",
  "loadPaidServiceRuntimeGate",
  "_cdChooseServicePaymentMode",
  "/api/love-secret/prepare",
  "create-job",
  "chapter",
]) {
  assertNotIncludes("app/love-secret-ai/page.tsx", page, marker);
}
for (const marker of [
  "/api/love-secret-ai/result",
  "PDF로 저장하기",
  "love-secret-reading-",
  "LoveSecretResultSection",
  "html2canvas",
  "jspdf",
]) {
  assertIncludes("app/love-secret-ai/result/page.tsx", resultPage, marker);
}

for (const marker of [
  "handleEnsureAccess",
  "handleStart",
  "handleResult",
  "handleMessage",
  'path === "/result"',
  'path.startsWith("/result/")',
  'path === "/prepare"',
  'path === "/generate"',
  'path === "/ensure-access"',
  'path === "/start"',
  "resolveBillingUsageEvidence",
  "refundBillingGateMonthlyCredit",
  "restoreBillingGateAccessOnFailure",
  "love-secret-ai-consultation",
  "attemptId",
]) {
  assertIncludes("worker/routes/love-secret-ai.js", route, marker);
}
for (const marker of [
  "generateLoveSecretPremiumPdfV2",
  "pdf-v2/love-secret",
  "/api/love-secret/prepare",
  "create-job",
]) {
  assertNotIncludes("worker/routes/love-secret-ai.js", route, marker);
}

assertIncludes("worker/index.js", workerIndex, '"/api/love-secret-ai"');
assertIncludes("worker/index.js", workerIndex, "handleLoveSecretAiRoutes");
assertNotIncludes("worker/index.js", workerIndex, "handleSajuLoveSecretRoutes");
assertNotIncludes("worker/index.js", workerIndex, "routes/saju-love-secret.js");

assertIncludes("worker/lib/models.js", models, "loveSecretAiConsultationSchema");
assertIncludes("worker/lib/models.js", models, 'collection: "loveSecretAiConsultations"');
assertIncludes("worker/lib/paid-feature-registry.js", registry, '"love-secret-ai-consultation"');
assertIncludes("worker/lib/love-secret-ai-calculation.js", calc, "buildSajuProfile");
assertIncludes("worker/lib/love-secret-ai-calculation.js", calc, "calculateLoveSecretAiSaju");
assertIncludes("worker/lib/love-secret-ai-calculation.js", calc, "속궁합과 친밀감 리듬");
assertNotIncludes("worker/lib/love-secret-ai-calculation.js", calc, "pdf-v2");
assertIncludes("worker/lib/love-secret-ai-prompt.js", prompt, "LOVE_SECRET_AI_SYSTEM_PROMPT");
assertIncludes("worker/lib/love-secret-ai-prompt.js", prompt, "parseFirstConsultationResponse");
assertIncludes("worker/lib/love-secret-ai-prompt.js", prompt, "johuIntimacyRhythm");
assertIncludes("worker/lib/love-secret-ai-prompt.js", prompt, "pdfSections");
assertIncludes("app/components/AppChrome.tsx", appChrome, '"/love-secret-ai"');

if (failures.length) {
  console.error("[verify-love-secret-ai-flow] FAIL");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("[verify-love-secret-ai-flow] PASS");
