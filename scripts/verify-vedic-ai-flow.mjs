import { existsSync, readFileSync } from "node:fs";
import assert from "node:assert/strict";

function read(path) {
  return readFileSync(path, "utf8");
}

function assertIncludes(source, needle, label) {
  assert(source.includes(needle), `[verify:vedic-ai-flow] ${label} missing: ${needle}`);
}

function assertMissing(source, needles, label) {
  for (const needle of needles) {
    assert(!source.includes(needle), `[verify:vedic-ai-flow] ${label} still contains ${needle}`);
  }
}

assert(existsSync("app/vedic-ai/page.tsx"), "[verify:vedic-ai-flow] app/vedic-ai/page.tsx missing");
assert(existsSync("app/vedic-ai/VedicAiClient.tsx"), "[verify:vedic-ai-flow] VedicAiClient missing");
assert(existsSync("worker/routes/vedic-ai.js"), "[verify:vedic-ai-flow] worker route missing");

const html = read("index.html");
const markerIndex = html.indexOf('data-vedic-ai-card-marker="vedic-ai-direct-route-v20260627"');
assert(markerIndex >= 0, "[verify:vedic-ai-flow] direct route marker missing");
const cardSlice = html.slice(Math.max(0, markerIndex - 800), markerIndex + 1800);
assertIncludes(cardSlice, 'href="/vedic-ai"', "main card href");
assertIncludes(cardSlice, "AI 상담 · 30,000원", "main card price");
assertIncludes(html, "__cdVedicAiDirectClickGuard", "main card direct click guard");
assertMissing(cardSlice, ['data-action="gotoVedicPremium"', 'data-coin-cost="300"', "준비중"], "vedic card");
assertMissing(html, ["/js/vedic-ai-consultation.js?v="], "index legacy script include");

const page = read("app/vedic-ai/page.tsx");
assertIncludes(page, "나크샤트라와 행성의 흐름", "page metadata");

const client = read("app/vedic-ai/VedicAiClient.tsx");
[
  "/api/vedic-ai/ensure-access",
  "/api/vedic-ai/start",
  "/api/vedic-ai/message",
  "runBillingCoinGate",
  "serviceType: FEATURE_KEY",
  "consultationType: CONSULTATION_TYPE",
  "calendarType",
  "focusArea",
  "requestId",
  "birthTimeUnknown",
  "data-vedic-ai-page",
  "splitAssistantSections",
].forEach((needle) => assertIncludes(client, needle, "client contract"));
assertMissing(client, ["/api/vedic/ai-consultation", "/api/vedic/pdf", "premium_pdf_vedic", "create-job"], "client");

const css = read("app/vedic-ai/VedicAiClient.module.css");
["radial-gradient", "mandala", "loadingMandala"].forEach((needle) => {
  assertIncludes(css, needle, "css cosmic UI");
});

const route = read("worker/routes/vedic-ai.js");
[
  'FEATURE_KEY = "vedic-ai-consultation"',
  'SERVICE_KEY = "vedic-ai"',
  "/ensure-access",
  "/start",
  "/message",
  "calculateVedicAiChart",
  "callGeminiText",
  "[Vedic AI",
  "restorePrepaidAccessOnFailure",
  "birthTimeUnknown",
  "calendarType",
  "focusArea",
  "requestId",
  "LLM Payment Guard Passed",
].forEach((needle) => assertIncludes(route, needle, "worker route"));
assertMissing(route, ["/api/vedic/ai-consultation", "/api/vedic/pdf", "premium_pdf_vedic", "create-job", "generateChapter"], "worker route");

const workerIndex = read("worker/index.js");
assertIncludes(workerIndex, "/api/vedic-ai", "worker index route");

const registry = read("worker/lib/paid-feature-registry.js");
assertIncludes(registry, '"vedic-ai-consultation": { cost: 300, amountKRW: 30000', "pricing");
assertIncludes(registry, 'gotoVedicPremium: "vedic-ai-consultation"', "registry alias");

const bindings = read("js/core/uiBindings.js");
const runtime = read("js/core/index-inline-runtime.js");
assertIncludes(bindings, "window.location.assign('/vedic-ai')", "uiBindings navigation");
assertIncludes(runtime, "window.location.assign('/vedic-ai')", "runtime navigation");

const { handleVedicAiRoutes, __vedicAiTestUtils } = await import(new URL("../worker/routes/vedic-ai.js", import.meta.url).href);
const validPayload = {
  serviceType: "vedic-ai-consultation",
  consultationType: "vedic",
  userName: "테스트",
  gender: "female",
  birthDate: "1992-01-10",
  birthTime: "09:30",
  birthTimeUnknown: false,
  calendarType: "solar",
  birthPlace: "서울, 한국",
  latitude: 37.5665,
  longitude: 126.978,
  timezone: "Asia/Seoul",
  focusArea: "career",
  question: "올해 일의 흐름이 궁금합니다.",
  locale: "ko",
  requestId: "vedic-ai-test-key-20260627",
};

const normalized = __vedicAiTestUtils.normalizeConsultationInput(validPayload);
assert.equal(normalized.ok, true, "[verify:vedic-ai-flow] valid payload must normalize");
assert.equal(normalized.input.serviceType, "vedic-ai-consultation");
assert.equal(normalized.input.consultationType, "vedic");
assert.equal(normalized.input.birthInfo.calendarType, "solar");
assert.equal(normalized.input.focusArea, "career");
assert.equal(normalized.input.birthInfo.birthPlace.timezone, "Asia/Seoul");

const missingTime = __vedicAiTestUtils.normalizeConsultationInput({ ...validPayload, birthTime: "", birthTimeUnknown: false });
assert.equal(missingTime.ok, false, "[verify:vedic-ai-flow] missing birth time must fail");
assert(missingTime.errors.includes("birthTime"), "[verify:vedic-ai-flow] missing birth time error missing");

const customMissing = __vedicAiTestUtils.normalizeConsultationInput({ ...validPayload, focusArea: "custom", question: "" });
assert.equal(customMissing.ok, false, "[verify:vedic-ai-flow] custom question must be required");
assert(customMissing.errors.includes("question"), "[verify:vedic-ai-flow] custom question error missing");

const unauthenticated = await handleVedicAiRoutes(new Request("https://code-destiny.test/api/vedic-ai/ensure-access", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(validPayload),
}), { NODE_ENV: "test" });
assert.equal(unauthenticated.status, 401, "[verify:vedic-ai-flow] ensure-access without auth must require login");
const unauthenticatedJson = await unauthenticated.json();
assert.equal(unauthenticatedJson.reason, "LOGIN_REQUIRED", "[verify:vedic-ai-flow] login-required reason mismatch");

console.log("[verify:vedic-ai-flow] ok");
