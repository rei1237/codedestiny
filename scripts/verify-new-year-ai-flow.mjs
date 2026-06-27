#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const root = process.cwd();

function read(relPath) {
  return fs.readFileSync(path.join(root, relPath), "utf8");
}

function exists(relPath) {
  return fs.existsSync(path.join(root, relPath));
}

function assert(condition, message) {
  if (!condition) {
    console.error(`[verify-new-year-ai-flow] FAIL: ${message}`);
    process.exitCode = 1;
  }
}

function assertIncludes(file, text, message = `${file} should include ${text}`) {
  assert(read(file).includes(text), message);
}

function assertExcludes(file, text, message = `${file} should not include ${text}`) {
  assert(!read(file).includes(text), message);
}

const oldAccessRetryCopy = Buffer.from(
  "6rKw7KCcIOq2jO2VnCDtmZXsnbgg7KSRIOusuOygnOqwgCDrsJzsg53tlojsirXri4jri6QuIOyLoOuFhOyatOyEuCBBSSDsg4Hri7Qg67Cb6riw66W8IOuLpOyLnCDriIzrn6wg6raM7ZWc7J2EIO2ZleyduO2VtCDso7zshLjsmpQu",
  "base64",
).toString("utf8");

const deletedPaths = [
  "app/pdf/new-year/page.js",
  "app/components/saju-new-year-pdf/NewYearCh1_Overview.tsx",
  "worker/lib/pdf-v2/saju-new-year/generate-saju-new-year-premium-report.js",
  "worker/lib/saju-new-year-constants.js",
  "scripts/verify-saju-new-year-flow.mjs",
  "__tests__/worker/saju-new-year.pipeline.test.js",
];

for (const relPath of deletedPaths) {
  assert(!exists(relPath), `${relPath} should be removed`);
}

assertIncludes("index.html", 'href="/new-year-ai-consultation"', "main new-year card should link to the consultation page");
assertIncludes("index.html", 'data-cd-marker="new-year-ai-card-v20260627"', "main new-year card marker should exist");
assertExcludes("index.html", 'data-action="openSajuNewYearModal"', "main shell should not open the old modal action");
assertExcludes("index.html", "/js/saju-new-year.js?v=", "main shell should not preload the old new-year client");
assertExcludes("index.html", "sajuNewYearModal", "old new-year modal should be removed from the main shell");
assertExcludes("index.html", oldAccessRetryCopy, "old access retry copy should be removed");

assertIncludes("app/new-year-ai-consultation/page.tsx", "/api/new-year-ai/ensure-access");
assertIncludes("app/new-year-ai-consultation/page.tsx", "/api/new-year-ai/start");
assertIncludes("app/new-year-ai-consultation/page.tsx", "/api/new-year-ai/message");
assertIncludes("app/new-year-ai-consultation/page.tsx", "runBillingCoinGate");
assertIncludes("app/new-year-ai-consultation/page.tsx", "상담을 준비하고 있습니다");
assertIncludes("app/new-year-ai-consultation/page.tsx", "결제창을 확인해 주세요");
assertIncludes("app/new-year-ai-consultation/page.tsx", "올해의 흐름을 읽고 있습니다");
assertExcludes("app/new-year-ai-consultation/page.tsx", "/api/saju-new-year");
assertExcludes("app/new-year-ai-consultation/page.tsx", "create-job");
assertExcludes("app/new-year-ai-consultation/page.tsx", "verify-access");
assertExcludes("app/new-year-ai-consultation/page.tsx", "requestPortOnePayment");

assertIncludes("worker/index.js", '"/api/new-year-ai"');
assertIncludes("worker/routes/new-year-ai.js", "handleEnsureAccess");
assertIncludes("worker/routes/new-year-ai.js", "handleStart");
assertIncludes("worker/routes/new-year-ai.js", "handleMessage");
assertIncludes("worker/routes/new-year-ai.js", "new-year-ai-consultation");
assertIncludes("worker/routes/new-year-ai.js", "PointHistory");
assertIncludes("worker/routes/new-year-ai.js", "billingMode: \"coin-gate\"");
assertExcludes("worker/routes/new-year-ai.js", "fetchPortOnePayment");
assertExcludes("worker/routes/new-year-ai.js", "getPortOnePublicConfig");
assertIncludes("worker/lib/models.js", "newYearAiConsultations");
assertIncludes("worker/lib/paid-feature-registry.js", '"new-year-ai-consultation"');
assertIncludes("worker/routes/saju-new-year.js", "NEW_YEAR_AI_REPLACED");
assertExcludes("js/saju-new-year.js", "/api/saju-new-year", "legacy client stub should not call old API");
assertExcludes("js/saju-new-year.js", oldAccessRetryCopy, "legacy client stub should not contain old retry copy");

const routeUrl = pathToFileURL(path.join(root, "worker/routes/new-year-ai.js")).href;
const oldRouteUrl = pathToFileURL(path.join(root, "worker/routes/saju-new-year.js")).href;
const route = await import(routeUrl);
const oldRoute = await import(oldRouteUrl);

const validInput = {
  year: 2026,
  birthInfo: {
    name: "테스트",
    gender: "female",
    birthDate: "1992-01-10",
    birthTime: "09:30",
    calendarType: "solar",
  },
  topic: "올해 일과 재물 흐름이 궁금합니다.",
  idempotencyKey: "nyai-test-key-20260627",
};

const normalized = route.__newYearAiTestUtils.normalizeConsultationInput(validInput);
assert(normalized.ok === true, "new-year-ai input should normalize successfully");

const ensureResponse = await route.handleNewYearAiRoutes(new Request("https://code-destiny.test/api/new-year-ai/ensure-access", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Idempotency-Key": validInput.idempotencyKey,
  },
  body: JSON.stringify(validInput),
}), {});
const ensureBody = await ensureResponse.json();
assert(ensureResponse.status === 401, "ensure-access should require login without auth");
assert(ensureBody.reason === "LOGIN_REQUIRED", "ensure-access should return LOGIN_REQUIRED");
assert(ensureBody.message === "상담을 시작하려면 로그인이 필요합니다. 로그인 후 다시 시도해 주세요.", "ensure-access should return the new login message");

const oldResponse = await oldRoute.handleSajuNewYearRoutes(new Request("https://code-destiny.test/api/saju-new-year/create-job", {
  method: "POST",
}));
const oldBody = await oldResponse.json();
assert(oldResponse.status === 410, "old saju-new-year route should be replaced");
assert(oldBody.code === "NEW_YEAR_AI_REPLACED", "old saju-new-year route should not create jobs");

if (!process.exitCode) {
  console.log("[verify-new-year-ai-flow] ok");
}
