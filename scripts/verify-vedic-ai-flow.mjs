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
assertMissing(cardSlice, ['data-action="gotoVedicPremium"', 'data-coin-cost="300"'], "vedic card");
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
  "id=\"vedic-result-body\"",
  "aria-label=\"PDF로 저장\"",
  "window.print()",
  "graha_strength",
  "bhava_focus",
  "navamsa",
  "transit_remedy",
  "BasicVedicChartData",
  "기본 베다 차트 데이터",
  "planetRows",
].forEach((needle) => assertIncludes(client, needle, "client contract"));
assertMissing(client, ["/api/vedic/ai-consultation", "/api/vedic/pdf", "premium_pdf_vedic", "create-job"], "client");

const css = read("app/vedic-ai/VedicAiClient.module.css");
["radial-gradient", "mandala", "loadingMandala", "@media print", ".structuredHeader button", ".basicChartData", ".planetTable"].forEach((needle) => {
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
  "MIN_INITIAL_READING_CHARS = 10000",
  "MAX_INITIAL_READING_CHARS = 20000",
  "INITIAL_MAX_OUTPUT_TOKENS = 16000",
  "validateConsultationQuality",
  "maxTotalChars",
  "requireStructured: true",
  "graha_strength",
  "bhava_focus",
  "navamsa",
  "transit_remedy",
].forEach((needle) => assertIncludes(route, needle, "worker route"));
assertMissing(route, ["/api/vedic/ai-consultation", "/api/vedic/pdf", "premium_pdf_vedic", "create-job", "generateChapter"], "worker route");
assertMissing(route, ["3,500~5,000자", "500~700자", "600~800자", "400~500자"], "worker route length contract");
assertIncludes(route, "10,000~20,000자", "length range contract");
assertIncludes(route, "같은 뜻의 문장을 늘리지 말고", "expert depth guard");

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
const readingSectionKeys = [
  "lagna",
  "sun_nakshatra",
  "moon_nakshatra",
  "graha_strength",
  "bhava_focus",
  "navamsa",
  "dasha",
  "transit_remedy",
  "karma",
  "topic",
  "prescription",
];
const sectionTitles = {
  lagna: "拉格納 — 어센던트가 말하는 영혼의 입구",
  sun_nakshatra: "蘇利耶 — 태양이 머문 별자리의 빛",
  moon_nakshatra: "旃陀羅 — 달이 머문 별자리의 감정",
  graha_strength: "格羅哈 — 행성 강약과 숨은 기질",
  bhava_focus: "婆伐 — 바바가 여는 삶의 무대",
  navamsa: "那婆姆沙 — 나밤샤가 비추는 깊은 약속",
  dasha: "達薩 — 지금 이 행성의 계절",
  transit_remedy: "高遮羅 — 고차르와 업야야의 조율",
  karma: "業 — 이 생의 카르마적 과제",
  topic: "問 — 지금 질문에 대한 답",
  prescription: "方 — 별이 건네는 오늘의 처방",
};
function repeatedReading(seed, minChars) {
  let text = "";
  while (text.replace(/\s+/g, "").length < minChars) {
    text += `${seed} 라그나와 나크샤트라, 다샤의 흐름은 지금의 선택을 더 차분하게 비춥니다. 마음이 급하게 앞서기보다 이미 드러난 별의 리듬을 따라 책임과 관계, 일의 방향을 함께 살피면 길이 선명해집니다. `;
  }
  return text.trim();
}
const mockReading = JSON.stringify({
  scores: { dharma: 82, artha: 76, kama: 71, moksha: 88, overall: 81 },
  sections: Object.fromEntries(readingSectionKeys.map((key, index) => [
    key,
    { title: sectionTitles[key], body: repeatedReading(`${index + 1}번째 흐름은`, 1500) },
  ])),
});
const mockQuality = __vedicAiTestUtils.validateConsultationQuality(mockReading, { minTotalChars: 10000, maxTotalChars: 20000, requireStructured: true });
assert.equal(mockQuality.ok, true, "[verify:vedic-ai-flow] mock reading quality must pass");
assert(mockQuality.totalChars >= 10000, "[verify:vedic-ai-flow] mock reading must be 10000+ chars");
assert(mockQuality.totalChars <= 20000, "[verify:vedic-ai-flow] mock reading must be 20000 chars or less");
assert.equal(mockQuality.sectionCount, readingSectionKeys.length, "[verify:vedic-ai-flow] mock reading section count");
const shortMockQuality = __vedicAiTestUtils.validateConsultationQuality(JSON.stringify({
  scores: { dharma: 70, artha: 70, kama: 70, moksha: 70, overall: 70 },
  sections: Object.fromEntries(readingSectionKeys.map((key) => [key, { title: sectionTitles[key], body: "짧은 상담문입니다." }])),
}), { minTotalChars: 10000, maxTotalChars: 20000, requireStructured: true });
assert.equal(shortMockQuality.ok, false, "[verify:vedic-ai-flow] short mock reading must fail");
assert(shortMockQuality.issues.includes("total_body_too_short"), "[verify:vedic-ai-flow] short mock length issue missing");
const longMockQuality = __vedicAiTestUtils.validateConsultationQuality(JSON.stringify({
  scores: { dharma: 90, artha: 90, kama: 90, moksha: 90, overall: 90 },
  sections: Object.fromEntries(readingSectionKeys.map((key, index) => [
    key,
    { title: sectionTitles[key], body: repeatedReading(`${index + 1}번째 긴 흐름은`, 2200) },
  ])),
}), { minTotalChars: 10000, maxTotalChars: 20000, requireStructured: true });
assert.equal(longMockQuality.ok, false, "[verify:vedic-ai-flow] long mock reading must fail");
assert(longMockQuality.issues.includes("total_body_too_long"), "[verify:vedic-ai-flow] long mock length issue missing");
const sanitizedMock = __vedicAiTestUtils.sanitizeAssistantText("PDF 챕터 프롬프트 시스템");
assert.equal(/PDF|챕터|프롬프트|시스템/.test(sanitizedMock), false, "[verify:vedic-ai-flow] mechanical tokens must be sanitized");

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
