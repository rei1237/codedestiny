import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const root = process.cwd();
const read = (file) => readFileSync(resolve(root, file), "utf8");

const indexSource = read("index.html");
const pageSource = [
  read("app/karma-destiny-ai/page.tsx"),
  read("app/karma-destiny-ai/KarmaDestinyAiClient.tsx"),
  read("app/karma-destiny-ai/result/page.tsx"),
  read("app/karma-destiny-ai/result/KarmaDestinyAiResultClient.tsx"),
].join("\n");
const workerIndexSource = read("worker/index.js");
const routeSource = read("worker/routes/karma-destiny-ai.js");
const modelSource = read("worker/lib/models.js");
const registrySource = read("worker/lib/paid-feature-registry.js");

function assertIncludes(source, needle, label) {
  assert.ok(source.includes(needle), `${label}: missing ${needle}`);
}

function assertNotIncludes(source, needle, label) {
  assert.ok(!source.includes(needle), `${label}: unexpected ${needle}`);
}

assertIncludes(indexSource, 'href="/karma-destiny-ai"', "main entry");
assertIncludes(indexSource, 'data-feature-key="karma-destiny-ai-consultation"', "main entry feature key");
assertIncludes(indexSource, "/fuctionassets/soul-origin-cover.webp", "image asset preserved");
assertIncludes(indexSource, "AI Consultation · 50,000원", "price marker");
assertNotIncludes(indexSource, "openSoulOriginModal", "legacy modal action removed");
assertNotIncludes(indexSource, "soulOriginModal", "legacy modal removed");
assertNotIncludes(indexSource, "/js/soul-origin-book.js", "legacy client script removed");
assertNotIncludes(indexSource, "premium_pdf_soul_origin", "legacy feature key removed from main shell");

assertIncludes(pageSource, "runBillingCoinGate", "common billing gate");
assertIncludes(pageSource, "/api/karma-destiny-ai/ensure-access", "ensure access API");
assertIncludes(pageSource, "/api/karma-destiny-ai/start", "start API");
assertIncludes(pageSource, "/api/karma-destiny-ai/generate-batch", "generate batch API");
assertIncludes(pageSource, "/api/karma-destiny-ai/result", "result API");
assertIncludes(pageSource, "/api/karma-destiny-ai/message", "message API");
assertIncludes(pageSource, "운명의 기록을 펼치고 있습니다", "preparing copy");
assertIncludes(pageSource, "결제창을 확인해 주세요", "payment copy");
assertIncludes(pageSource, "삶의 반복 패턴과 업의 흐름을 읽고 있습니다", "reading copy");
assertIncludes(pageSource, "data-kdai-pdf-page", "PDF page split markers");
assertIncludes(pageSource, "querySelectorAll<HTMLElement>(\"[data-kdai-pdf-page]\")", "PDF split rendering");
assertIncludes(pageSource, "for (const [targetIndex, target] of targets.entries())", "PDF renders every split page");
assertIncludes(pageSource, "pdf.save(fileName)", "PDF download save call");
assertIncludes(pageSource, "상담에 사용된 차트 데이터", "PDF chart data page");
assertIncludes(pageSource, "buildChartDataBlocks(integratedResult)", "PDF chart data source");
assertIncludes(pageSource, "사주 원국 데이터", "saju chart data included");
assertIncludes(pageSource, "서양 점성술 차트 데이터", "western chart data included");
assertIncludes(pageSource, "베다 점성술 차트 데이터", "vedic chart data included");
assertIncludes(pageSource, "30,000자 이상으로 여는 운명의 업 리포트", "premium value copy");
assertIncludes(pageSource, "sticky", "sticky table of contents");
assertIncludes(pageSource, "이번 장의 핵심", "chapter core box");
assertIncludes(pageSource, "전체 복사", "copy all action");
assertIncludes(pageSource, "PDF 저장", "PDF action");
assertNotIncludes(pageSource, "/api/soul-origin", "old API not called");
assertNotIncludes(pageSource, "prepare", "old prepare copy not present");
assertNotIncludes(pageSource, "create-job", "old create API not present");
assertNotIncludes(pageSource, "generate-mock", "old mock API not present");
assertNotIncludes(pageSource, "soChapter", "old section UI not present");

assertIncludes(workerIndexSource, "handleKarmaDestinyAiRoutes", "worker route handler wired");
assertIncludes(workerIndexSource, "/api/karma-destiny-ai", "worker dispatch wired");
assertIncludes(routeSource, "handleKarmaDestinyAiRoutes", "worker route exported");
assertIncludes(routeSource, "buildKarmaDestinyIntegratedResult", "calculation adapter wired");
assertIncludes(routeSource, "FEATURE_KEY = \"karma-destiny-ai-consultation\"", "feature key");
assertIncludes(routeSource, "PointHistory", "billing evidence verification");
assertIncludes(routeSource, "START_ACCESS_CONFIRMATION_REQUIRED", "start route requires pre-confirmed access");
assertIncludes(routeSource, "MONTHLY_CREDIT_GATE_REQUIRED", "monthly credit must use common billing gate");
assertIncludes(routeSource, "accessType: \"monthly_credit\"", "monthly credit is payment evidence, not entitlement");
assertIncludes(routeSource, "INITIAL_CONSULTATION_MIN_LENGTH = 30000", "premium consultation minimum length");
assertIncludes(routeSource, "PREMIUM_BATCH_SIZE = 4", "batch generation size");
assertIncludes(routeSource, "PREMIUM_REINFORCEMENT_MAX_ATTEMPTS = 2", "reinforcement attempts");
assertIncludes(routeSource, "handleGenerateBatch", "batch route handler");
assertIncludes(routeSource, "handleResult", "result route handler");
assertIncludes(routeSource, "같은 표현, 같은 조언, 같은 상징을 반복하지 않고", "quality anti-repetition instruction");
assertIncludes(routeSource, "사주/명리 기반 업의 구조", "saju premium chapter");
assertIncludes(routeSource, "전생적 상징 해석", "symbolic past-life chapter");
assertIncludes(routeSource, "최종 편지", "final letter chapter");
assertIncludes(routeSource, "validatePremiumReportQuality", "premium quality gate");
assertNotIncludes(routeSource, "function hasMonthlyCredit", "monthly credit balance must not grant direct access");
assertNotIncludes(routeSource, "return { ok: true, accessType: \"subscription\", paymentId: \"\", usageAlreadyApplied: false }", "monthly credit must not be direct entitlement");
assertNotIncludes(routeSource, "return resolveServerAccess({ auth, user, pricing, idempotencyKey, inputHash: normalized.inputHash, body });", "start route must not re-check entitlement without access token");
assertIncludes(modelSource, "karmaDestinyAiConsultations", "new collection");
assertIncludes(modelSource, "KarmaDestinyAiConsultation", "model export");
assertIncludes(modelSource, "chapters", "chapter storage");
assertIncludes(modelSource, "qualityCheck", "quality check storage");
assertIncludes(modelSource, "generationProgress", "generation progress storage");
assertIncludes(registrySource, "\"karma-destiny-ai-consultation\": { cost: 500, amountKRW: 50000", "pricing");

assert.ok(!existsSync(resolve(root, "js/soul-origin-book.js")), "legacy soul-origin client should be deleted");
assert.ok(!existsSync(resolve(root, "worker/lib/pdf-v2/soul-origin")), "legacy soul-origin service directory should be deleted");

const { handleSoulOriginRoutes } = await import(pathToFileURL(resolve(root, "worker/routes/soul-origin.js")).href);
const removedResponse = await handleSoulOriginRoutes(new Request("https://example.test/api/soul-origin/create-job", { method: "POST" }), {});
const removedJson = await removedResponse.json();
assert.equal(removedResponse.status, 410, "legacy soul-origin API should be disabled");
assert.equal(removedJson.next, "/karma-destiny-ai", "legacy API should point to new page");

const { handleKarmaDestinyAiRoutes, __karmaDestinyAiTestUtils } = await import(pathToFileURL(resolve(root, "worker/routes/karma-destiny-ai.js")).href);
const {
  normalizeConsultationInput,
  resolveStartAccess,
  parseKarmaConsultationSections,
  validateInitialConsultationQuality,
  validatePremiumReportQuality,
  PREMIUM_CHAPTERS,
  buildKarmaDestinyAiMockConsultation,
} = __karmaDestinyAiTestUtils;
const mockConsultation = buildKarmaDestinyAiMockConsultation();
const mockSections = parseKarmaConsultationSections(mockConsultation);
const mockQuality = validateInitialConsultationQuality(mockConsultation);
assert.equal(PREMIUM_CHAPTERS.length, 16, "premium report should define 16 chapters");
assert.equal(mockSections.length, 16, "mock consultation should split into 16 sections");
assert.equal(mockQuality.ok, true, `mock consultation quality should pass: ${JSON.stringify(mockQuality)}`);
assert.ok(mockQuality.totalCharCount >= 30000, "mock consultation should be at least 30,000 visible chars");
assert.equal(mockQuality.chapterCount, 16, "mock consultation should have 16 chapters");
const leakQuality = validatePremiumReportQuality(PREMIUM_CHAPTERS.map((chapter) => ({
  ...chapter,
  content: "프롬프트 JSON debug providerReason " + "상담 문장 ".repeat(500),
  summary: "누출 검사",
  keyTakeaways: ["첫째", "둘째", "셋째"],
})));
assert.equal(leakQuality.ok, false, "prompt/debug leak should fail quality");
assert.equal(leakQuality.promptLeakDetected, true, "prompt leak flag");
const noLoginResponse = await handleKarmaDestinyAiRoutes(new Request("https://example.test/api/karma-destiny-ai/ensure-access", {
  method: "POST",
  headers: { "Content-Type": "application/json", "Idempotency-Key": "verify-kdai-123456" },
  body: JSON.stringify({
    idempotencyKey: "verify-kdai-123456",
    birthInfo: {
      name: "테스트",
      gender: "female",
      birthDate: "1990-01-01",
      birthTime: "12:00",
      birthTimeUnknown: false,
      calendarType: "solar",
      birthPlace: {
        city: "Seoul",
        country: "South Korea",
        latitude: 37.5665,
        longitude: 126.978,
        timezone: "Asia/Seoul",
      },
    },
    topic: "전체 운명의 업",
    userQuestion: "반복되는 관계 흐름이 궁금합니다.",
  }),
}), {});
const noLoginJson = await noLoginResponse.json();
assert.equal(noLoginResponse.status, 401, "unauthenticated ensure-access should require login");
assert.equal(noLoginJson.reason, "LOGIN_REQUIRED", "unauthenticated reason");
assert.equal(noLoginJson.message, "상담을 시작하려면 로그인이 필요합니다. 로그인 후 다시 시도해 주세요.", "login message");

const directStartBody = {
  idempotencyKey: "verify-kdai-direct-start",
  birthInfo: {
    name: "테스트",
    gender: "female",
    birthDate: "1990-01-01",
    birthTime: "12:00",
    birthTimeUnknown: false,
    calendarType: "solar",
    birthPlace: {
      city: "Seoul",
      country: "South Korea",
      latitude: 37.5665,
      longitude: 126.978,
      timezone: "Asia/Seoul",
    },
  },
  topic: "전체 운명의 업",
  userQuestion: "반복되는 관계 흐름이 궁금합니다.",
};
const directStartNormalized = normalizeConsultationInput(directStartBody);
assert.equal(directStartNormalized.ok, true, "direct start fixture should normalize");
const directStartAccess = await resolveStartAccess({
  request: new Request("https://example.test/api/karma-destiny-ai/start", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Idempotency-Key": directStartBody.idempotencyKey },
    body: JSON.stringify(directStartBody),
  }),
  env: {},
  auth: { userId: "verify-user-without-billing-evidence" },
  body: directStartBody,
  normalized: directStartNormalized,
  pricing: { coinPrice: 500, membershipCreditCost: 500, amountKRW: 50000 },
  idempotencyKey: directStartBody.idempotencyKey,
});
assert.equal(directStartAccess.ok, false, "direct start without confirmed billing must be blocked");
assert.equal(directStartAccess.reason, "PAYMENT_REQUIRED", "direct start block reason");
assert.equal(directStartAccess.code, "START_ACCESS_CONFIRMATION_REQUIRED", "direct start block code");

console.log("[verify-karma-destiny-ai-flow] ok");
