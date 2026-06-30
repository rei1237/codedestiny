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

const pageSourcePath = exists("app/new-year-ai-consultation/NewYearAiClient.tsx")
  ? "app/new-year-ai-consultation/NewYearAiClient.tsx"
  : "app/new-year-ai-consultation/page.tsx";

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

assertIncludes(pageSourcePath, "/api/new-year-ai/ensure-access");
assertIncludes(pageSourcePath, "/api/new-year-ai/start");
assertIncludes(pageSourcePath, "runBillingCoinGate");
assertIncludes(pageSourcePath, "deferUsage: true", "new-year client should defer usage until generation succeeds");
assertIncludes(pageSourcePath, 'usagePolicy: "apply_after_success"', "new-year client should apply billing after success");
assertIncludes(pageSourcePath, "상담을 준비하고 있습니다");
assertIncludes(pageSourcePath, "결제창을 확인해 주세요");
assertIncludes(pageSourcePath, "새해의 기운을 읽는 중...");
assertIncludes(pageSourcePath, "targetYear");
assertIncludes(pageSourcePath, "focusArea");
assertIncludes(pageSourcePath, "더 깊게 보고 싶은 흐름");
assertIncludes(pageSourcePath, "nyai-category-chip");
assertIncludes(pageSourcePath, "nyai-consult-card");
assertIncludes(pageSourcePath, "handleDownloadPdf");
assertIncludes(pageSourcePath, "html2canvas");
assertIncludes(pageSourcePath, "jspdf");
assertIncludes(pageSourcePath, "PDF 저장");
assertIncludes(pageSourcePath, "data-pdf-section");
assertIncludes(pageSourcePath, "SajuProfilePanel");
assertIncludes(pageSourcePath, "기본 사주 명식");
assertIncludes(pageSourcePath, "sajuProfile");
assertIncludes(pageSourcePath, "pdf.addPage");
assertIncludes(pageSourcePath, "pdf.addImage");
assertIncludes(pageSourcePath, "pdf.save");
assertExcludes(pageSourcePath, "/api/new-year-ai/message");
assertExcludes(pageSourcePath, "handleFollowUp");
assertExcludes(pageSourcePath, "nyai-follow");
assertExcludes(pageSourcePath, "followUp");
assertExcludes(pageSourcePath, "/api/saju-new-year");
assertExcludes(pageSourcePath, "create-job");
assertExcludes(pageSourcePath, "verify-access");
assertExcludes(pageSourcePath, "requestPortOnePayment");

assertIncludes("worker/index.js", '"/api/new-year-ai"');
assertIncludes("worker/routes/new-year-ai.js", "handleEnsureAccess");
assertIncludes("worker/routes/new-year-ai.js", "handleStart");
assertIncludes("worker/routes/new-year-ai.js", "handleMessage");
assertIncludes("worker/routes/new-year-ai.js", "new-year-ai-consultation");
assertIncludes("worker/routes/new-year-ai.js", "PointHistory");
assertIncludes("worker/routes/new-year-ai.js", "PaidExecutionRecord");
assertIncludes("worker/routes/new-year-ai.js", "Payment");
assertIncludes("worker/routes/new-year-ai.js", "handleBillingRoutes");
assertIncludes("worker/routes/new-year-ai.js", "billingMode: \"coin-gate\"");
assertIncludes("worker/routes/new-year-ai.js", "runtimeGate");
assertIncludes("worker/routes/new-year-ai.js", "paymentAmount");
assertIncludes("worker/routes/new-year-ai.js", "calculateNewYearFortuneData");
assertIncludes("worker/routes/new-year-ai.js", "advancedSajuSummary");
assertIncludes("worker/routes/new-year-ai.js", "gyeokguk");
assertIncludes("worker/routes/new-year-ai.js", "yongshin");
assertIncludes("worker/routes/new-year-ai.js", "johu");
assertIncludes("worker/routes/new-year-ai.js", "daewoonSewoon");
assertIncludes("worker/routes/new-year-ai.js", "annualInteractions");
assertIncludes("worker/routes/new-year-ai.js", "NEW_YEAR_AI_MIN_TOTAL_CHARS = 10000");
assertIncludes("worker/routes/new-year-ai.js", "NEW_YEAR_AI_MAX_TOTAL_CHARS = 20000");
assertIncludes("worker/routes/new-year-ai.js", "validateConsultationQuality");
assertIncludes("worker/routes/new-year-ai.js", "buildMockConsultationText");
assertIncludes("worker/routes/new-year-ai.js", "buildConsultationCompressionPrompt");
assertIncludes("worker/routes/new-year-ai.js", "buildBasicSajuProfile");
assertIncludes("worker/routes/new-year-ai.js", "sajuProfile");
assertIncludes("worker/routes/new-year-ai.js", "path: \"apply\"");
assertIncludes("worker/routes/new-year-ai.js", "path: \"cancel\"");
assertIncludes("worker/routes/new-year-ai.js", "logNewYearAi(\"Prepare Start\"");
assertIncludes("worker/routes/new-year-ai.js", "logNewYearAi(\"Generate Success\"");
assertIncludes("worker/routes/new-year-ai.js", "providerReason");
assertIncludes("worker/routes/new-year-ai.js", "FOLLOW_UP_DISABLED");
assertExcludes("worker/routes/new-year-ai.js", "buildFollowUpPrompt");
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

const workerSource = read("worker/routes/new-year-ai.js");
const ensureAccessSource = workerSource.slice(workerSource.indexOf("async function handleEnsureAccess"), workerSource.indexOf("async function resolveStartAccess"));
assert(!ensureAccessSource.includes("calculateNewYearFortuneData"), "ensure-access should not calculate fortune data before auth/payment checks");

const validInput = {
  serviceType: "new-year-ai-consultation",
  consultationType: "newYearFortune",
  userName: "테스트",
  gender: "female",
  birthDate: "1992-01-10",
  birthTime: "09:30",
  calendarType: "solar",
  targetYear: 2026,
  focusArea: "overall",
  question: "",
  locale: "ko",
  idempotencyKey: "nyai-test-key-20260627",
};

const normalized = route.__newYearAiTestUtils.normalizeConsultationInput(validInput);
assert(normalized.ok === true, "new-year-ai input should normalize successfully");
assert(normalized.input.targetYear === 2026, "new-year-ai targetYear should normalize successfully");
assert(normalized.input.focusArea === "overall", "new-year-ai focusArea should normalize successfully");
const fortuneData = route.__newYearAiTestUtils.calculateNewYearFortuneData(normalized.input);
assert(fortuneData?.saju?.dayMaster, "new-year-ai fortune data should include day master");
assert(fortuneData?.targetYear?.pillar, "new-year-ai fortune data should include target-year pillar");
assert(fortuneData?.advancedSajuSummary?.gyeokguk, "new-year-ai fortune data should include gyeokguk summary");
assert(fortuneData?.advancedSajuSummary?.yongshin, "new-year-ai fortune data should include yongshin summary");
assert(fortuneData?.advancedSajuSummary?.johu, "new-year-ai fortune data should include johu summary");
assert(fortuneData?.advancedSajuSummary?.daewoonSewoon, "new-year-ai fortune data should include daewoon-sewoon summary");
assert(Array.isArray(fortuneData?.advancedSajuSummary?.annualInteractions), "new-year-ai fortune data should include annual interactions");
assert(fortuneData?.monthlyFlow?.some((row) => row.timing === "기회" || row.timing === "주의"), "new-year-ai monthly flow should include timing labels");
const firstPrompt = route.__newYearAiTestUtils.buildFirstPrompt(normalized.input, fortuneData);
assert(firstPrompt.includes("[계산된 사주와 세운 데이터]"), "new-year-ai first prompt should include computed fortune data");
assert(firstPrompt.includes("처음 입력한 더 깊게 보고 싶은 흐름"), "new-year-ai first prompt should use the initial deep-flow question");
assert(firstPrompt.includes("새해 전체 운의 핵심 결론"), "new-year-ai first prompt should request consultation sections");
assert(firstPrompt.includes("격국, 용신·기신, 조후, 대운-세운 관계"), "new-year-ai first prompt should request advanced saju synthesis");
assert(firstPrompt.includes("전체 본문 합계는 공백을 제외하고 10,000자 이상 20,000자 이하"), "new-year-ai prompt should require 10k-20k total content chars");
assert(firstPrompt.includes("권장 분량은 12,000~18,000자"), "new-year-ai prompt should guide the rough expected length");
assert(firstPrompt.includes("각 항목마다 10,000자를 쓰지 말고"), "new-year-ai prompt should not require 10k chars per section");
assert(firstPrompt.includes("단순히 문장을 길게 늘이지 말고"), "new-year-ai prompt should require expert additions instead of filler");
const systemPrompt = route.__newYearAiTestUtils.buildSystemPrompt();
assert(systemPrompt.includes("최고 수준의 명리학자"), "new-year-ai system prompt should strengthen expert saju voice");
assert(systemPrompt.includes("격국과 용신·기신, 조후, 대운의 배경"), "new-year-ai system prompt should include advanced saju lenses");
assert(systemPrompt.includes("완성 상담문 전체 본문은 공백을 제외하고 10,000자 이상 20,000자 이하"), "new-year-ai system prompt should require 10k-20k total chars");
assert(systemPrompt.includes("명리 전문가로서 격국·월령"), "new-year-ai system prompt should require expert part additions");

const mockConsultationText = route.__newYearAiTestUtils.buildMockConsultationText();
const mockQuality = route.__newYearAiTestUtils.validateConsultationQuality(mockConsultationText);
assert(mockQuality.ok === true, `mock consultation should pass quality gate: ${mockQuality.issues.join(", ")}`);
assert(mockQuality.totalChars >= 10000, "mock consultation should be at least 10k total chars");
assert(mockQuality.totalChars <= 20000, "mock consultation should stay under 20k total chars");
assert(mockQuality.sectionCount >= 6, "mock consultation should include enough substantial sections");
assert(mockQuality.missingTopics.length === 0, "mock consultation should cover all required expert topics");

const mockSajuProfile = route.__newYearAiTestUtils.buildBasicSajuProfile({
  id: "nyai-test-session",
  accessType: "admin",
  status: "completed",
  year: normalized.input.targetYear,
  birthInfo: normalized.input.birthInfo,
  llmMeta: { fortuneData },
});
assert(mockSajuProfile?.pillars?.length === 4, "new-year-ai PDF saju profile should include four pillars");
assert(mockSajuProfile?.dayMaster, "new-year-ai PDF saju profile should include day master");
assert(mockSajuProfile?.targetYear?.pillar, "new-year-ai PDF saju profile should include target-year pillar");
assert(mockSajuProfile?.yongshin?.core, "new-year-ai PDF saju profile should include yongshin summary");

const messageHandlerSource = workerSource.slice(workerSource.indexOf("async function handleMessage"), workerSource.indexOf("export async function handleNewYearAiRoutes"));
assert(!messageHandlerSource.includes("generateConsultationText"), "new-year-ai message route should not generate follow-up LLM text");
assert(!messageHandlerSource.includes("callGeminiText"), "new-year-ai message route should not call the LLM gateway");

const missingYear = route.__newYearAiTestUtils.normalizeConsultationInput({ ...validInput, targetYear: "" });
assert(missingYear.ok === false && missingYear.message === "상담할 연도를 선택해 주세요.", "new-year-ai should reject missing targetYear");

const missingBirth = route.__newYearAiTestUtils.normalizeConsultationInput({ ...validInput, birthDate: "" });
assert(missingBirth.ok === false && missingBirth.message.includes("생년월일, 성별, 달력 기준"), "new-year-ai should reject missing birthDate before payment");

const customWithoutQuestion = route.__newYearAiTestUtils.normalizeConsultationInput({ ...validInput, focusArea: "custom", question: "" });
assert(customWithoutQuestion.ok === false && customWithoutQuestion.message.includes("직접 질문"), "new-year-ai should require question for custom focus");

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

const invalidResponse = await route.handleNewYearAiRoutes(new Request("https://code-destiny.test/api/new-year-ai/ensure-access", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Idempotency-Key": validInput.idempotencyKey,
  },
  body: JSON.stringify({ ...validInput, birthDate: "" }),
}), {});
const invalidBody = await invalidResponse.json();
assert(invalidResponse.status === 422, "ensure-access should reject invalid input before login/payment");
assert(invalidBody.reason === "INVALID_INPUT", "invalid ensure-access should return INVALID_INPUT");

const disabledMessageResponse = await route.handleNewYearAiRoutes(new Request("https://code-destiny.test/api/new-year-ai/message", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ sessionId: "nyai-test-session", message: "추가 질문 테스트" }),
}), {});
const disabledMessageBody = await disabledMessageResponse.json();
assert(disabledMessageResponse.status === 410, "message route should be disabled");
assert(disabledMessageBody.reason === "FOLLOW_UP_DISABLED", "message route should return FOLLOW_UP_DISABLED");

const oldResponse = await oldRoute.handleSajuNewYearRoutes(new Request("https://code-destiny.test/api/saju-new-year/create-job", {
  method: "POST",
}));
const oldBody = await oldResponse.json();
assert(oldResponse.status === 410, "old saju-new-year route should be replaced");
assert(oldBody.code === "NEW_YEAR_AI_REPLACED", "old saju-new-year route should not create jobs");

if (!process.exitCode) {
  console.log("[verify-new-year-ai-flow] ok");
}
